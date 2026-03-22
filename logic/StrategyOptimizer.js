import { Game } from '../engine/Game.js';
import { StrategyEngine } from './StrategyEngine.js';
import { Shoe } from '../engine/Shoe.js';
import { Hand } from '../engine/Hand.js';

// ======================================================
// STRATEGY OPTIMIZER
// Finds the highest-EV action for every strategy cell
// by Monte Carlo simulation with forced first actions.
// ======================================================

// All dealer upcards to test (2–10, Ace=11)
const DEALER_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Hard totals to test (5–20 — below 5 always hit, 21 always stand)
const HARD_TOTALS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// Soft totals: the non-ace card value (2–9 gives soft 13–20)
const SOFT_OTHERS = [2, 3, 4, 5, 6, 7, 8, 9];

// Pair values to test (2–10, Ace=11)
const PAIR_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

class StrategyOptimizer {
    // ======================================================
    // Main entry point
    // Returns a full optimal strategy table derived from simulation
    // ======================================================
    static async optimize({
        numDecks    = 6,
        S17         = true,
        DAS         = true,
        RSA         = false,
        payout      = 1.5,
        handsPerCell = 2000,
        onProgress  = null,
    } = {}) {
        const rules = {
            dealerHitsSoft17: S17,
            doubleAfterSplit: DAS,
            resplitAces:      RSA,
            lateSurrender:    false,
            blackjackPayout:  payout,
            minBet:           10,
        };

        // Build list of all cells to evaluate
        const cells = [];

        // Hard totals
        for (const total of HARD_TOTALS) {
            for (const dv of DEALER_VALUES) {
                cells.push({ type: 'hard', playerValue: total, dealerValue: dv });
            }
        }

        // Soft totals
        for (const other of SOFT_OTHERS) {
            for (const dv of DEALER_VALUES) {
                cells.push({ type: 'soft', playerValue: other + 11, dealerValue: dv, otherCard: other });
            }
        }

        // Pairs
        for (const pv of PAIR_VALUES) {
            for (const dv of DEALER_VALUES) {
                cells.push({ type: 'pair', playerValue: pv * 2, dealerValue: dv, pairCard: pv });
            }
        }

        const totalCells = cells.length;
        const results = {
            hard: {},   // key: `${total}_${dealerValue}` → { H, S, D, best }
            soft: {},   // key: `${softTotal}_${dealerValue}` → { H, S, D, best }
            pair: {},   // key: `${pairValue}_${dealerValue}` → { H, S, P, D, best }
        };

        // Process cells in async chunks to keep UI responsive
        const CHUNK = 5;
        for (let i = 0; i < cells.length; i += CHUNK) {
            const chunk = cells.slice(i, i + CHUNK);
            for (const cell of chunk) {
                const evs = this._evaluateCell(cell, rules, numDecks, handsPerCell, payout);
                const key = `${cell.type === 'pair' ? cell.pairCard : cell.playerValue}_${cell.dealerValue}`;
                results[cell.type][key] = evs;
            }
            if (onProgress) {
                onProgress(Math.round(((i + CHUNK) / totalCells) * 100));
                // Yield to browser
                await new Promise(r => setTimeout(r, 0));
            }
        }

        if (onProgress) onProgress(100);
        return results;
    }

    // ======================================================
    // Evaluate a single cell — returns EV for each legal action
    // ======================================================
    static _evaluateCell(cell, rules, numDecks, handsPerCell, payout) {
        const actions = this._legalActions(cell, rules);
        const evs = {};

        for (const action of actions) {
            evs[action] = this._simulateAction(cell, action, rules, numDecks, handsPerCell, payout);
        }

        // Find best action
        let bestAction = actions[0];
        let bestEV = evs[actions[0]];
        for (const a of actions) {
            if (evs[a] > bestEV) {
                bestEV = evs[a];
                bestAction = a;
            }
        }
        evs.best = bestAction;
        evs.bestEV = bestEV;

        return evs;
    }

    // ======================================================
    // Which actions are legal for a given cell
    // ======================================================
    static _legalActions(cell, rules) {
        const actions = ['H', 'S'];

        // Double allowed on any 2-card hand
        if (cell.type !== 'pair' || rules.doubleAfterSplit) {
            actions.push('D');
        } else {
            actions.push('D'); // always test double for hard/soft
        }

        // Split only for pairs
        if (cell.type === 'pair') {
            actions.push('P');
        }

        // Hard totals <= 8 can't stand profitably, but we still test
        // Hard 20/21 can't meaningfully double (just stand), still test
        return actions;
    }

    // ======================================================
    // Simulate N hands with a forced first action, then basic strategy
    // Returns EV as (net units won) / (hands played)
    // ======================================================
    static _simulateAction(cell, forcedAction, rules, numDecks, handsPerCell, payout) {
        const game = new Game(1, numDecks, 'automatic', rules.dealerHitsSoft17);
        game.rules = { ...rules, minBet: 10 };

        let totalPnl    = 0;
        let handsPlayed = 0;

        for (let i = 0; i < handsPerCell; i++) {
            // Set up a specific hand state instead of random deal
            const result = this._playForcedHand(cell, forcedAction, rules, numDecks, payout);
            totalPnl    += result.pnl;
            handsPlayed += result.hands;
        }

        return handsPlayed > 0 ? totalPnl / handsPlayed : 0;
    }

    // ======================================================
    // Play one hand with a specific starting configuration
    // and a forced first action, then basic strategy for the rest
    // ======================================================
    static _playForcedHand(cell, forcedAction, rules, numDecks, payout) {
        // Build a fresh shoe
        const shoe = new Shoe(numDecks);
        shoe.shuffle();

        // Build player hand
        const playerCards = this._buildPlayerHand(cell, shoe);
        const dealerUpCard = this._buildDealerCard(cell.dealerValue, shoe);

        // Deal dealer hole card
        const dealerHole = shoe.deal();

        // Build dealer hand object
        const dealerCards = [dealerUpCard, dealerHole];

        // Check for dealer blackjack immediately
        const dealerTotal = this._handValue(dealerCards);
        const dealerBJ = dealerCards.length === 2 && dealerTotal === 21;

        const bet = 10;
        let pnl = 0;
        let hands = 1;

        // --- Handle split action ---
        if (forcedAction === 'P' && cell.type === 'pair') {
            // Split into two hands, each gets a random second card
            const card1 = playerCards[0];
            const card2 = playerCards[1];
            const hand1 = [card1, shoe.deal()];
            const hand2 = [card2, shoe.deal()];

            const isAceSplit = card1.rank === 'Ace';

            let h1result, h2result;
            if (isAceSplit) {
                // Aces: no further action
                h1result = this._settleHand(hand1, dealerCards, dealerBJ, bet, payout, rules);
                h2result = this._settleHand(hand2, dealerCards, dealerBJ, bet, payout, rules);
            } else {
                // Play each split hand with basic strategy
                const finalH1 = this._playWithStrategy(hand1, dealerUpCard, rules, shoe, false);
                const finalH2 = this._playWithStrategy(hand2, dealerUpCard, rules, shoe, false);
                h1result = this._settleHand(finalH1, dealerCards, dealerBJ, bet, payout, rules);
                h2result = this._settleHand(finalH2, dealerCards, dealerBJ, bet, payout, rules);
            }

            pnl = h1result + h2result;
            hands = 2;
            return { pnl, hands };
        }

        // --- Handle double ---
        if (forcedAction === 'D') {
            const card = shoe.deal();
            playerCards.push(card);
            const result = this._settleHand(playerCards, dealerCards, dealerBJ, bet * 2, payout, rules);
            return { pnl: result - bet, hands: 1 };
            // -bet because we paid extra bet; result includes original+extra if win
        }

        // --- Handle stand ---
        if (forcedAction === 'S') {
            const result = this._settleHand(playerCards, dealerCards, dealerBJ, bet, payout, rules);
            return { pnl: result, hands: 1 };
        }

        // --- Handle hit (then basic strategy for remaining decisions) ---
        if (forcedAction === 'H') {
            playerCards.push(shoe.deal());
            if (this._handValue(playerCards) > 21) {
                return { pnl: -bet, hands: 1 };
            }
            // Continue with basic strategy
            const finalHand = this._playWithStrategy(playerCards, dealerUpCard, rules, shoe, true);
            const result = this._settleHand(finalHand, dealerCards, dealerBJ, bet, payout, rules);
            return { pnl: result, hands: 1 };
        }

        return { pnl: 0, hands: 1 };
    }

    // ======================================================
    // Play a hand to completion using basic strategy
    // ======================================================
    static _playWithStrategy(cards, dealerUpCard, rules, shoe, alreadyHit) {
        // Simple basic strategy continuation (no split on continuation)
        let hand = [...cards];
        let isSoft = this._isSoft(hand);
        let total  = this._handValue(hand);

        let maxIter = 10;
        while (total < 21 && maxIter-- > 0) {
            const action = this._basicStrategyAction(total, isSoft, dealerUpCard.getValue(), rules, hand.length, alreadyHit);
            if (action === 'S') break;
            if (action === 'D') {
                hand.push(shoe.deal());
                break;
            }
            if (action === 'H') {
                hand.push(shoe.deal());
                total  = this._handValue(hand);
                isSoft = this._isSoft(hand);
                alreadyHit = true;
                if (total > 21) break;
            } else {
                break;
            }
        }
        return hand;
    }

    // ======================================================
    // Settle a hand against the dealer (dealer plays to 17)
    // Returns net PnL in units (positive = win, negative = loss)
    // ======================================================
    static _settleHand(playerCards, dealerCardsIn, dealerBJ, bet, payout, rules) {
        const playerTotal = this._handValue(playerCards);
        const playerBJ    = playerCards.length === 2 && playerTotal === 21;

        if (playerTotal > 21) return -bet;

        if (dealerBJ) {
            if (playerBJ) return 0;  // push
            return -bet;
        }

        if (playerBJ) return Math.floor(bet * payout);

        // Dealer draws to 17
        const dealerCards = [...dealerCardsIn];
        while (this._shouldDealerHit(dealerCards, rules.dealerHitsSoft17)) {
            // We can't use the shoe here (it may be exhausted) so approximate with a random card
            dealerCards.push(this._randomCard());
        }
        const dealerTotal = this._handValue(dealerCards);

        if (dealerTotal > 21) return bet;
        if (playerTotal > dealerTotal) return bet;
        if (playerTotal < dealerTotal) return -bet;
        return 0; // push
    }

    // ======================================================
    // Dealer hit rule
    // ======================================================
    static _shouldDealerHit(cards, hitsSoft17) {
        const val  = this._handValue(cards);
        const soft = this._isSoft(cards);
        if (hitsSoft17) return val < 17 || (val === 17 && soft);
        return val < 17;
    }

    // ======================================================
    // Build specific player hand for a cell
    // ======================================================
    static _buildPlayerHand(cell, shoe) {
        if (cell.type === 'hard') {
            return this._makeHardHand(cell.playerValue, shoe);
        }
        if (cell.type === 'soft') {
            // Ace + other card
            return [
                this._cardOfValue(11, shoe), // Ace
                this._cardOfValue(cell.otherCard, shoe),
            ];
        }
        if (cell.type === 'pair') {
            return [
                this._cardOfValue(cell.pairCard, shoe),
                this._cardOfValue(cell.pairCard, shoe),
            ];
        }
        return [];
    }

    // ======================================================
    // Build a hard total from two cards (avoiding soft hands)
    // ======================================================
    static _makeHardHand(total, shoe) {
        // Use two cards: split as evenly as possible, avoid Aces
        if (total <= 11) {
            // Can't make hard <= 11 with 2 cards without an Ace, so use 2+rest
            const c1 = Math.min(2, total - 2);
            const c2 = total - c1;
            return [this._cardOfValue(Math.max(c1,2), shoe), this._cardOfValue(c2, shoe)];
        }
        // Split into two non-ace cards
        const c1 = Math.min(10, total - 2);
        const c2 = total - c1;
        if (c2 < 2) {
            return [this._cardOfValue(c1 - 1, shoe), this._cardOfValue(c2 + 1, shoe)];
        }
        return [this._cardOfValue(c1, shoe), this._cardOfValue(c2, shoe)];
    }

    // ======================================================
    // Build a card with a specific point value
    // ======================================================
    static _cardOfValue(value, shoe) {
        const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
        const suit  = suits[Math.floor(Math.random() * 4)];
        let rank;
        if (value === 11) rank = 'Ace';
        else if (value === 10) rank = ['10', 'Jack', 'Queen', 'King'][Math.floor(Math.random() * 4)];
        else rank = String(value);
        // Return a simple card-like object
        return {
            rank,
            suit,
            getValue() {
                if (this.rank === 'Ace') return 11;
                if (['Jack','Queen','King'].includes(this.rank)) return 10;
                return Number(this.rank);
            }
        };
    }

    static _buildDealerCard(value, shoe) {
        return this._cardOfValue(value, shoe);
    }

    static _randomCard() {
        const values = [2,3,4,5,6,7,8,9,10,10,10,10,11];
        const v = values[Math.floor(Math.random() * values.length)];
        return this._cardOfValue(v, null);
    }

    // ======================================================
    // Hand value calculator
    // ======================================================
    static _handValue(cards) {
        let total = 0, aces = 0;
        for (const c of cards) {
            total += c.getValue();
            if (c.rank === 'Ace') aces++;
        }
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return total;
    }

    static _isSoft(cards) {
        let total = 0, aces = 0;
        for (const c of cards) {
            total += c.getValue();
            if (c.rank === 'Ace') aces++;
        }
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return aces > 0;
    }

    // ======================================================
    // Simplified basic strategy for continuation play
    // (not the full table — just the most impactful rules)
    // ======================================================
    static _basicStrategyAction(total, isSoft, dealerVal, rules, cardCount, alreadyHit) {
        const canDouble = cardCount === 2 && !alreadyHit;

        if (isSoft) {
            if (total >= 19) return 'S';
            if (total === 18) {
                if (dealerVal >= 9) return 'H';
                if (dealerVal <= 8 && dealerVal >= 7) return 'S';
                if (canDouble) return 'D';
                return 'S';
            }
            if (total === 17) {
                if (canDouble && dealerVal >= 3 && dealerVal <= 6) return 'D';
                return 'H';
            }
            if (canDouble && dealerVal >= 4 && dealerVal <= 6) return 'D';
            return 'H';
        }

        // Hard totals
        if (total >= 17) return 'S';
        if (total >= 13 && dealerVal <= 6) return 'S';
        if (total === 12 && dealerVal >= 4 && dealerVal <= 6) return 'S';
        if (total === 11 && canDouble) return 'D';
        if (total === 10 && canDouble && dealerVal <= 9) return 'D';
        if (total === 9  && canDouble && dealerVal >= 3 && dealerVal <= 6) return 'D';
        return 'H';
    }
}

export { StrategyOptimizer, DEALER_VALUES, HARD_TOTALS, SOFT_OTHERS, PAIR_VALUES };
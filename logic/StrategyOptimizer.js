import { StrategyEngine } from './StrategyEngine.js';

// ======================================================
// STRATEGY OPTIMIZER
//
// For every strategy cell (player hand vs dealer upcard),
// we simulate N hands forced to each legal action and measure
// the EV of that action.
//
// EV is expressed as units won/lost per unit wagered:
//   EV = +0.15  →  win 15 cents per $1 bet on average
//   EV = -0.35  →  lose 35 cents per $1 bet on average
//
// For doubles we record EV per original bet unit so that
// D, H, and S are all on the same scale and directly comparable.
//
// The cell's optimal action is the one with the highest EV.
// ======================================================

export const DEALER_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const HARD_TOTALS   = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
export const SOFT_OTHERS   = [2, 3, 4, 5, 6, 7, 8, 9];   // Ace + this = soft 13–20
export const PAIR_VALUES   = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export class StrategyOptimizer {

    static async optimize({
        numDecks     = 6,
        S17          = true,
        DAS          = true,
        RSA          = false,
        payout       = 1.5,
        handsPerCell = 2000,
        onProgress   = null,
    } = {}) {
        const rules = {
            dealerHitsSoft17: S17,
            doubleAfterSplit: DAS,
            resplitAces:      RSA,
            blackjackPayout:  payout,
        };

        // Build all cells
        const cells = [];
        for (const total of HARD_TOTALS)
            for (const dv of DEALER_VALUES)
                cells.push({ type: 'hard', total, dv });
        for (const other of SOFT_OTHERS)
            for (const dv of DEALER_VALUES)
                cells.push({ type: 'soft', total: other + 11, other, dv });
        for (const pv of PAIR_VALUES)
            for (const dv of DEALER_VALUES)
                cells.push({ type: 'pair', total: pv * 2, pv, dv });

        const results = { hard: {}, soft: {}, pair: {} };
        const total   = cells.length;

        // Process in async chunks so UI stays responsive
        const CHUNK = 8;
        for (let i = 0; i < cells.length; i += CHUNK) {
            const chunk = cells.slice(i, i + CHUNK);
            for (const cell of chunk) {
                const evs  = this._evaluateCell(cell, rules, numDecks, handsPerCell);
                const key  = `${cell.type === 'pair' ? cell.pv : cell.total}_${cell.dv}`;
                results[cell.type][key] = evs;
            }
            if (onProgress) {
                onProgress(Math.round(Math.min(99, (i + CHUNK) / total * 100)));
                await new Promise(r => setTimeout(r, 0));
            }
        }
        if (onProgress) onProgress(100);
        return results;
    }

    // ──────────────────────────────────────────────
    // Evaluate one cell — returns { H, S, D?, P?, best, bestEV, secondEV }
    // All EV values are in units per original bet (range roughly -1 to +2)
    // ──────────────────────────────────────────────
    static _evaluateCell(cell, rules, numDecks, N) {
        const actions = ['H', 'S'];
        // Double: always test (even if suboptimal, we want to see its EV)
        actions.push('D');
        // Split: only for pairs
        if (cell.type === 'pair') actions.push('P');

        const evs = {};
        for (const a of actions) {
            evs[a] = this._measureEV(cell, a, rules, numDecks, N);
        }

        // Pick best action
        let best = actions[0], bestEV = evs[actions[0]];
        let secondEV = -Infinity;
        for (const a of actions) {
            if (evs[a] > bestEV) { secondEV = bestEV; bestEV = evs[a]; best = a; }
            else if (evs[a] > secondEV && a !== best) secondEV = evs[a];
        }
        evs.best     = best;
        evs.bestEV   = bestEV;
        evs.secondEV = secondEV === -Infinity ? bestEV : secondEV;
        return evs;
    }

    // ──────────────────────────────────────────────
    // Simulate N hands with forced first action.
    // Returns EV = mean(net_units_per_original_bet)
    //
    // Scale:  win normal  → +1.0
    //         lose        → -1.0
    //         push        → 0.0
    //         win BJ 3:2  → +1.5
    //         double win  → +2.0  (win 2 units on 1 unit original bet)
    //         double lose → -2.0
    // ──────────────────────────────────────────────
    static _measureEV(cell, forcedAction, rules, numDecks, N) {
        let totalNet = 0;
        for (let i = 0; i < N; i++) {
            totalNet += this._oneHand(cell, forcedAction, rules);
        }
        return totalNet / N;
    }

    // ──────────────────────────────────────────────
    // Play one hand, return net units on original bet
    // ──────────────────────────────────────────────
    static _oneHand(cell, forcedAction, rules) {
        // Build player and dealer hands
        const playerCards = this._makePlayerCards(cell);
        const dealerUp    = this._makeCard(cell.dv);
        const dealerHole  = this._randomCard();
        const dealerCards = [dealerUp, dealerHole];

        const dealerBJ = this._val(dealerCards) === 21 && dealerCards.length === 2;
        const playerBJ = this._val(playerCards) === 21 && playerCards.length === 2 && cell.type !== 'pair';

        // Natural blackjack resolution
        if (dealerBJ && playerBJ) return 0;
        if (playerBJ)              return rules.blackjackPayout;  // e.g. +1.5
        if (dealerBJ)              return -1;

        // ── SPLIT ──
        if (forcedAction === 'P') {
            // Each split hand: original card + one new card, then play with basic strategy
            const c1 = playerCards[0], c2 = playerCards[1];
            const isAces = c1.rank === 'Ace';
            const h1 = [c1, this._randomCard()];
            const h2 = [c2, this._randomCard()];
            const f1 = isAces ? h1 : this._continueBasic(h1, dealerUp, rules);
            const f2 = isAces ? h2 : this._continueBasic(h2, dealerUp, rules);
            // Return average EV across both hands (each is one unit bet)
            return (this._settle(f1, dealerCards, rules) + this._settle(f2, dealerCards, rules)) / 2;
        }

        // ── DOUBLE ──
        if (forcedAction === 'D') {
            const hand = [...playerCards, this._randomCard()];
            const outcome = this._settle(hand, dealerCards, rules);
            // Double bets 2 units; outcome is for 1-unit hand, scale to 2-unit
            return outcome * 2;
        }

        // ── STAND ──
        if (forcedAction === 'S') {
            return this._settle(playerCards, dealerCards, rules);
        }

        // ── HIT (then basic strategy) ──
        if (forcedAction === 'H') {
            const hand = [...playerCards, this._randomCard()];
            if (this._val(hand) > 21) return -1;
            const final = this._continueBasic(hand, dealerUp, rules);
            return this._settle(final, dealerCards, rules);
        }

        return 0;
    }

    // ──────────────────────────────────────────────
    // Continue playing a hand using basic strategy
    // ──────────────────────────────────────────────
    static _continueBasic(cards, dealerUp, rules) {
        let hand = [...cards];
        for (let iter = 0; iter < 10; iter++) {
            const total  = this._val(hand);
            const soft   = this._isSoft(hand);
            if (total >= 21) break;
            const action = this._basicAction(total, soft, dealerUp.getValue(), rules, hand.length);
            if (action === 'S') break;
            if (action === 'D') { hand.push(this._randomCard()); break; }
            if (action === 'H') { hand.push(this._randomCard()); }
            else break;
        }
        return hand;
    }

    // ──────────────────────────────────────────────
    // Settle player hand vs dealer — dealer plays to 17
    // Returns net units on a 1-unit bet: +1, -1, 0
    // ──────────────────────────────────────────────
    static _settle(playerCards, dealerCardsIn, rules) {
        const pv = this._val(playerCards);
        if (pv > 21) return -1;

        // Dealer draws
        const dc = [...dealerCardsIn];
        for (let i = 0; i < 10; i++) {
            const dv   = this._val(dc);
            const soft = this._isSoft(dc);
            const hit  = rules.dealerHitsSoft17
                ? (dv < 17 || (dv === 17 && soft))
                : dv < 17;
            if (!hit) break;
            dc.push(this._randomCard());
        }
        const dv = this._val(dc);

        if (dv > 21) return +1;
        if (pv > dv)  return +1;
        if (pv < dv)  return -1;
        return 0; // push
    }

    // ──────────────────────────────────────────────
    // Simplified basic strategy for continuation
    // ──────────────────────────────────────────────
    static _basicAction(total, soft, dealerVal, rules, cardCount) {
        const canDouble = cardCount === 2;
        if (soft) {
            if (total >= 19) return 'S';
            if (total === 18) {
                if (dealerVal >= 9) return 'H';
                if (canDouble && dealerVal <= 6) return 'D';
                return 'S';
            }
            if (total === 17) {
                if (canDouble && dealerVal >= 3 && dealerVal <= 6) return 'D';
                return 'H';
            }
            if (canDouble && dealerVal >= 4 && dealerVal <= 6) return 'D';
            return 'H';
        }
        if (total >= 17) return 'S';
        if (total >= 13 && dealerVal <= 6) return 'S';
        if (total === 12 && dealerVal >= 4 && dealerVal <= 6) return 'S';
        if (total === 11 && canDouble) return 'D';
        if (total === 10 && canDouble && dealerVal <= 9) return 'D';
        if (total === 9  && canDouble && dealerVal >= 3 && dealerVal <= 6) return 'D';
        return 'H';
    }

    // ──────────────────────────────────────────────
    // Hand builders
    // ──────────────────────────────────────────────
    static _makePlayerCards(cell) {
        if (cell.type === 'pair') {
            return [this._makeCard(cell.pv), this._makeCard(cell.pv)];
        }
        if (cell.type === 'soft') {
            return [this._makeCard(11), this._makeCard(cell.other)];
        }
        // Hard: split total into two non-ace cards
        return this._hardCards(cell.total);
    }

    static _hardCards(total) {
        // Split as evenly as possible avoiding aces
        const a = Math.max(2, Math.min(10, Math.floor(total / 2)));
        let   b = total - a;
        if (b < 2)  { return [this._makeCard(2), this._makeCard(Math.max(2, total - 2))]; }
        if (b > 10) { return [this._makeCard(10), this._makeCard(total - 10)]; }
        return [this._makeCard(a), this._makeCard(b)];
    }

    static _makeCard(value) {
        const rank = value === 11 ? 'Ace'
                   : value === 10 ? ['10','Jack','Queen','King'][Math.floor(Math.random()*4)]
                   : String(value);
        return { rank, getValue() { return this.rank==='Ace'?11:['Jack','Queen','King'].includes(this.rank)?10:Number(this.rank); } };
    }

    // Random card weighted by true deck composition (4 of each rank)
    static _randomCard() {
        const pool = [2,3,4,5,6,7,8,9,10,10,10,10,11];
        return this._makeCard(pool[Math.floor(Math.random() * pool.length)]);
    }

    static _val(cards) {
        let t = 0, a = 0;
        for (const c of cards) { t += c.getValue(); if (c.rank==='Ace') a++; }
        while (t > 21 && a > 0) { t -= 10; a--; }
        return t;
    }

    static _isSoft(cards) {
        let t = 0, a = 0;
        for (const c of cards) { t += c.getValue(); if (c.rank==='Ace') a++; }
        while (t > 21 && a > 0) { t -= 10; a--; }
        return a > 0;
    }
}
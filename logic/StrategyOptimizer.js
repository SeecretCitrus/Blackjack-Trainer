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
export const SOFT_OTHERS   = [2, 3, 4, 5, 6, 7, 8, 9];
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
        const CHUNK   = 8;

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
    // Evaluate one cell
    // ──────────────────────────────────────────────
    static _evaluateCell(cell, rules, numDecks, N) {
        const actions = ['H', 'S', 'D'];
        if (cell.type === 'pair') actions.push('P');

        const evs = {};
        for (const a of actions) {
            evs[a] = this._measureEV(cell, a, rules, N);
        }

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

    static _measureEV(cell, forcedAction, rules, N) {
        let totalNet = 0;
        for (let i = 0; i < N; i++) {
            totalNet += this._oneHand(cell, forcedAction, rules);
        }
        return totalNet / N;
    }

    // ──────────────────────────────────────────────
    // Play one hand with a forced first action.
    // All continuation play uses the FULL StrategyEngine
    // tables so decisions are accurate, not approximated.
    // ──────────────────────────────────────────────
    static _oneHand(cell, forcedAction, rules) {
        const playerCards = this._makePlayerCards(cell);
        const dealerUp    = this._makeCard(cell.dv);
        const dealerHole  = this._randomCard();
        const dealerCards = [dealerUp, dealerHole];

        const dealerBJ = this._val(dealerCards) === 21 && dealerCards.length === 2;
        const playerBJ = this._val(playerCards) === 21 && playerCards.length === 2 && cell.type !== 'pair';

        if (dealerBJ && playerBJ) return 0;
        if (playerBJ)              return rules.blackjackPayout;
        if (dealerBJ)              return -1;

        // ── SPLIT ──
        if (forcedAction === 'P') {
            const c1 = playerCards[0], c2 = playerCards[1];
            const isAces = c1.rank === 'Ace';

            // Each split hand gets one new card
            const h1 = [c1, this._randomCard()];
            const h2 = [c2, this._randomCard()];

            // Post-split rules: no blackjack payout, aces get one card only
            // Play each hand with full strategy (respecting post-split restrictions)
            const canDoubleAfterSplit = rules.doubleAfterSplit;

            const f1 = isAces ? h1 : this._playHandFull(h1, dealerUp, rules, canDoubleAfterSplit, true);
            const f2 = isAces ? h2 : this._playHandFull(h2, dealerUp, rules, canDoubleAfterSplit, true);

            const r1 = this._settle(f1, dealerCards, rules, false); // no BJ payout on split
            const r2 = this._settle(f2, dealerCards, rules, false);

            // Return total net across both hands relative to original single bet
            // (both hands bet 1 unit each, we spent 2 units total)
            return (r1 + r2) / 2;
        }

        // ── DOUBLE ──
        if (forcedAction === 'D') {
            const hand = [...playerCards, this._randomCard()];
            return this._settle(hand, dealerCards, rules, true) * 2;
        }

        // ── STAND ──
        if (forcedAction === 'S') {
            return this._settle(playerCards, dealerCards, rules, true);
        }

        // ── HIT then full strategy ──
        if (forcedAction === 'H') {
            const hand = [...playerCards, this._randomCard()];
            if (this._val(hand) > 21) return -1;
            // After forced hit, can no longer double (3+ cards)
            const final = this._playHandFull(hand, dealerUp, rules, false, false);
            return this._settle(final, dealerCards, rules, true);
        }

        return 0;
    }

    // ──────────────────────────────────────────────
    // Play a hand to completion using the FULL StrategyEngine.
    // This is the key accuracy improvement — uses the real tables
    // instead of the simplified approximation.
    //
    // canDouble: whether doubling is allowed on this hand
    // postSplit: whether this hand came from a split (affects BJ payout)
    // ──────────────────────────────────────────────
    static _playHandFull(cards, dealerUp, rules, canDouble = true, postSplit = false) {
        let hand = [...cards];

        for (let iter = 0; iter < 12; iter++) {
            const total = this._val(hand);
            const soft  = this._isSoft(hand);
            if (total >= 21) break;

            // Build a mock player/hand object for StrategyEngine
            const mockHand = {
                cards: hand.map(c => ({ rank: c.rank, getValue: c.getValue.bind(c) })),
                isFinished: false,
                isSplitAces: false,
            };
            const mockPlayer = {
                hands: [mockHand],
                getHandValue: () => total,
                isSoftHand:   () => soft,
                // Only allow double on 2-card hands when permitted
                canDouble: () => canDouble && hand.length === 2,
                // No re-splitting in continuation
                canSplit:  () => false,
            };
            const mockDealer = {
                getValue: () => dealerUp.getValue(),
                rank:     dealerUp.rank,
            };

            let action;
            try {
                action = StrategyEngine.getDecision(mockPlayer, 0, mockDealer, rules);
            } catch(e) {
                action = total >= 17 ? 'S' : 'H';
            }

            if (action === 'S') break;
            if (action === 'D') {
                hand.push(this._randomCard());
                break; // double: take exactly one card then done
            }
            if (action === 'H') {
                hand.push(this._randomCard());
                canDouble = false; // can't double after hitting
            } else {
                break;
            }
        }
        return hand;
    }

    // ──────────────────────────────────────────────
    // Settle player hand vs dealer.
    // allowBJ: false for post-split hands (no 3:2 bonus)
    // ──────────────────────────────────────────────
    static _settle(playerCards, dealerCardsIn, rules, allowBJ = true) {
        const pv = this._val(playerCards);
        if (pv > 21) return -1;

        // Dealer draws to 17
        const dc = [...dealerCardsIn];
        for (let i = 0; i < 12; i++) {
            const dv   = this._val(dc);
            const soft = this._isSoft(dc);
            const hit  = rules.dealerHitsSoft17
                ? (dv < 17 || (dv === 17 && soft))
                : dv < 17;
            if (!hit) break;
            dc.push(this._randomCard());
        }
        const dv = this._val(dc);

        // Blackjack pays bonus only if allowed (not post-split)
        if (allowBJ && playerCards.length === 2 && pv === 21) {
            if (dv !== 21) return rules.blackjackPayout; // player BJ, dealer no BJ
            return 0; // both BJ = push
        }

        if (dv > 21) return +1;
        if (pv > dv)  return +1;
        if (pv < dv)  return -1;
        return 0;
    }

    // ──────────────────────────────────────────────
    // Hand builders
    // ──────────────────────────────────────────────
    static _makePlayerCards(cell) {
        if (cell.type === 'pair') return [this._makeCard(cell.pv), this._makeCard(cell.pv)];
        if (cell.type === 'soft') return [this._makeCard(11), this._makeCard(cell.other)];
        return this._hardCards(cell.total);
    }

    static _hardCards(total) {
        const a = Math.max(2, Math.min(10, Math.floor(total / 2)));
        let   b = total - a;
        if (b < 2)  return [this._makeCard(2), this._makeCard(Math.max(2, total - 2))];
        if (b > 10) return [this._makeCard(10), this._makeCard(total - 10)];
        return [this._makeCard(a), this._makeCard(b)];
    }

    static _makeCard(value) {
        const rank = value === 11 ? 'Ace'
                   : value === 10 ? ['10','Jack','Queen','King'][Math.floor(Math.random()*4)]
                   : String(value);
        return {
            rank,
            getValue() {
                if (this.rank === 'Ace') return 11;
                if (['Jack','Queen','King'].includes(this.rank)) return 10;
                return Number(this.rank);
            }
        };
    }

    // Weighted random card — 10-value cards are 4x more likely (correct deck composition)
    static _randomCard() {
        // 52 cards: 4 each of 2-9 (8 ranks × 4 = 32), 16 ten-value, 4 aces
        const n = Math.floor(Math.random() * 13);
        // Ranks 0-7 → 2-9, ranks 8-11 → 10-value, rank 12 → Ace
        const value = n <= 7 ? n + 2 : n <= 11 ? 10 : 11;
        return this._makeCard(value);
    }

    static _val(cards) {
        let t = 0, a = 0;
        for (const c of cards) { t += c.getValue(); if (c.rank === 'Ace') a++; }
        while (t > 21 && a > 0) { t -= 10; a--; }
        return t;
    }

    static _isSoft(cards) {
        let t = 0, a = 0;
        for (const c of cards) { t += c.getValue(); if (c.rank === 'Ace') a++; }
        while (t > 21 && a > 0) { t -= 10; a--; }
        return a > 0;
    }
}
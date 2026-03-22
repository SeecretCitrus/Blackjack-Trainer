// ======================================================
// CARD COUNTING ENGINE
//
// Supports two systems:
//   Hi-Lo   — simple, most widely used
//   Omega II — complex, more accurate
//
// Both track running count and true count.
// Omega II also tracks an ace side count separately.
// ======================================================

const SYSTEMS = {
    hilo: {
        name: 'Hi-Lo',
        description: 'Simple — +1 for low cards (2–6), −1 for high cards (10–A), 0 for neutral (7–9)',
        values: {
            '2': +1, '3': +1, '4': +1, '5': +1, '6': +1,
            '7':  0, '8':  0, '9':  0,
            '10': -1, 'Jack': -1, 'Queen': -1, 'King': -1, 'Ace': -1,
        },
        useAceSideCount: false,
    },
    omega2: {
        name: 'Omega II',
        description: 'Complex — 2,3,7=+1 | 4,5,6=+2 | 9=−1 | 10–K=−2 | Ace=0 (tracked separately)',
        values: {
            '2': +1, '3': +1, '4': +2, '5': +2, '6': +2,
            '7': +1, '8':  0, '9': -1,
            '10': -2, 'Jack': -2, 'Queen': -2, 'King': -2,
            'Ace': 0,  // Aces counted in side count only
        },
        useAceSideCount: true,
    },
};

class CardCounter {
    constructor(numDecks = 6, system = 'hilo') {
        this.numDecks       = numDecks;
        this.system         = SYSTEMS[system] ?? SYSTEMS.hilo;
        this.runningCount   = 0;
        this.aceSideCount   = 0;   // Omega II only — tracks aces seen
        this.cardsDealt     = 0;
        this.totalCards     = numDecks * 52;
        this.active         = false;
    }

    // Called when a new shoe is shuffled
    reset() {
        this.runningCount = 0;
        this.aceSideCount = 0;
        this.cardsDealt   = 0;
    }

    // Count a single card
    countCard(card) {
        if (!card || !this.active) return;
        const val = this.system.values[card.rank];
        if (val !== undefined) this.runningCount += val;
        if (this.system.useAceSideCount && card.rank === 'Ace') {
            this.aceSideCount++;
        }
        this.cardsDealt++;
    }

    // True count = running count / decks remaining
    getTrueCount() {
        const decksRemaining = Math.max(0.5, (this.totalCards - this.cardsDealt) / 52);
        return this.runningCount / decksRemaining;
    }

    // Decks remaining
    getDecksRemaining() {
        return Math.max(0, (this.totalCards - this.cardsDealt) / 52);
    }

    // Ace surplus/deficit per remaining deck (Omega II)
    getAceSurplus() {
        const decksRemaining = this.getDecksRemaining();
        if (decksRemaining < 0.5) return 0;
        const expectedAces = decksRemaining * 4;
        const acesRemaining = (this.numDecks * 4) - this.aceSideCount;
        return acesRemaining - expectedAces;
    }

    // Bet recommendation based on true count
    // Returns a multiplier: 1x = min bet, up to 8x for high counts
    getBetMultiplier() {
        const tc = this.getTrueCount();
        if (tc <= 1)  return 1;
        if (tc <= 2)  return 2;
        if (tc <= 3)  return 4;
        if (tc <= 4)  return 6;
        return 8;
    }

    // Descriptive count interpretation
    getCountLabel() {
        const tc = this.getTrueCount();
        if (tc >= 4)  return { text: 'Very Favorable', color: '#6ddb8a', bet: 'Max bet' };
        if (tc >= 2)  return { text: 'Favorable',      color: '#b8e87c', bet: 'Raise bet' };
        if (tc >= 0)  return { text: 'Neutral',         color: 'rgba(255,255,220,0.6)', bet: 'Min bet' };
        if (tc >= -2) return { text: 'Unfavorable',     color: '#e8a870', bet: 'Min bet' };
        return           { text: 'Very Unfavorable', color: '#e07070', bet: 'Min bet / sit out' };
    }

    get systemName()           { return this.system.name; }
    get usesAceSideCount()     { return this.system.useAceSideCount; }
}

export { CardCounter, SYSTEMS };
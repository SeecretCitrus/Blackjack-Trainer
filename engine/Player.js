import { Hand } from './Hand.js';

// ======================================================
// Player class
// ======================================================
class Player {
    constructor(name, startingBalance = 100) {
        this.name            = name;
        this.balance         = startingBalance;
        this.startingBalance = startingBalance;
        this.currentBet      = 15;      // default bet
        this.hands           = [];
        this.sittingOut      = false;   // true when balance < minBet
    }

    resetHands() {
        this.hands = [new Hand()];
    }

    getCard(card, handIndex = 0) {
        if (!this.hands[handIndex]) {
            throw new Error("Invalid hand index for player " + this.name);
        }
        this.hands[handIndex].addCard(card);
    }

    getHandValue(handIndex = 0) {
        return this.hands[handIndex].getValue();
    }

    isSoftHand(handIndex = 0) {
        return this.hands[handIndex].isSoft();
    }

    // Deducts bet from balance at round start
    placeBet(amount, minBet) {
        const clamped = Math.max(amount, minBet);
        this.currentBet = Math.min(clamped, this.balance);
        this.balance -= this.currentBet;
        this.hands[0].bet = this.currentBet;
    }

    // Pays out after round based on result
    // result: "win" | "blackjack" | "push" | "loss"
    settleBet(handIndex, result, blackjackPayout = 1.5) {
        const bet = this.hands[handIndex].bet;
        if (result === "win") {
            this.balance += bet * 2;
        } else if (result === "blackjack") {
            this.balance += bet + bet * blackjackPayout;
        } else if (result === "push") {
            this.balance += bet;
        }
        // loss: nothing returned
    }

    // Resupply — adds funds and clears sit-out flag
    resupply(amount) {
        this.balance += amount;
        this.sittingOut = false;
    }

    canDouble(handIndex = 0, rules) {
        if (this.hands.length > 1 && !rules.doubleAfterSplit) return false;
        if (this.balance < this.hands[handIndex].bet) return false;
        return this.hands[handIndex].cards.length === 2;
    }

    canSplit(handIndex = 0, rules) {
        if (this.hands.length >= 4) return false;
        if (this.hands[handIndex].isSplitAces && !rules.resplitAces) return false;
        if (this.balance < this.hands[handIndex].bet) return false;
        const hand = this.hands[handIndex];
        return hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
    }

    sayHello() {
        console.log("Hello, I am " + this.name);
    }
}

export { Player };
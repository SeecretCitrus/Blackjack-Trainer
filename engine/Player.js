import { Hand } from './Hand.js';

// ======================================================
// Player class represents a player in the game, holding their name, hands, money, and current bet. It provides methods to manage the player's hands and bets, as well as to check if certain actions are allowed based on the game rules.
// ======================================================
class Player {
    constructor(name) {
        this.name = name;
        this.hands = [];
        this.money = 1000; // Starting money for betting
        this.currentBet = 0; // Current bet for the round
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

    sayHello() {
        console.log("Hello, I am " + this.name);
    }


    getHandValue(handIndex = 0) {
        return this.hands[handIndex].getValue();
    }

    isSoftHand(handIndex = 0) {
        return this.hands[handIndex].isSoft();
    }

    canDouble(handIndex = 0, rules) {
        if (this.hands.length > 1 && !rules.doubleAfterSplit) return false; // Cannot double if rules don't allow double after split and player has multiple hands
        return this.hands[handIndex].cards.length === 2;
    }
    //maybe change later if I want to include equal value cards that aren't pairs but for now this is fine
    canSplit(handIndex = 0, rules) {
        if (this.hands.length >= 4) return false; // Limit to 3 splits (4 hands total)
        if (this.hands[handIndex].isSplitAces && !rules.resplitAces) return false; // Cannot split if the hand was already split aces
        let hand = this.hands[handIndex];
        return hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
    }
}

export { Player };
import { Card } from './Card.js';

// ======================================================
// SHOE CLASS (renamed from Deck)
// ======================================================
class Shoe {
    constructor(numDecks = 1) {
        const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
        const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10",
                       "Jack", "Queen", "King", "Ace"];

        this.cards = [];

        for (let deck = 0; deck < numDecks; deck++) {
            for (let outer = 0; outer < suits.length; outer++) {
                for (let inner = 0; inner < ranks.length; inner++) {
                    this.cards.push(new Card(suits[outer], ranks[inner]));
                }
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        return this.cards.pop();
    }
}

export { Shoe };
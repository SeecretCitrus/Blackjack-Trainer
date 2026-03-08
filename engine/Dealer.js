import { Player } from './Player.js';
import { Card } from './Card.js';

// ======================================================
// Dealer class represents the dealer in a blackjack game. It inherits from the Player class and has specific behavior for hitting and showing the up card.
// ======================================================
class Dealer extends Player {
    constructor() {
        super("Dealer");
        this.resetHands();
    }

    shouldHit(dealerHitsSoft17) {
        if (dealerHitsSoft17) {
            return this.getHandValue() < 17 || (this.getHandValue() === 17 && this.isSoftHand());
        } else {
            return this.getHandValue() < 17;
        }
    }

    getUpCard() {
        if (!this.hands[0] || this.hands[0].cards.length === 0)
            return new Card("Spades", "2"); // safe fallback

        return this.hands[0].cards[0];
    }
}

export { Dealer };
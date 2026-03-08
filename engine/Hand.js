//---------------------- HAND CLASS
class Hand {
    constructor(bet = 0) {
        this.cards = [];
        this.bet = bet;
        this.isFinished = false;
        this.isDoubled = false;
        this.isSplitAces = false;
    }

    addCard(card) {
        this.cards.push(card);
    }

    getValue() {
        let total = 0;
        let aceCount = 0;

        for (let card of this.cards) {
            total += card.getValue();
            if (card.rank === "Ace") {
                aceCount++;
            }
        }

        while (total > 21 && aceCount > 0) {
            total -= 10;
            aceCount--;
        }

        return total;
    }

    isSoft() {
        let total = 0;
        let aceCount = 0;

        for (let card of this.cards) {
            total += card.getValue();
            if (card.rank === "Ace") aceCount++;
        }

        while (total > 21 && aceCount > 0) {
            total -= 10;
            aceCount--;
        }

        return aceCount > 0;
    }

    isBlackjack() {
        return this.cards.length === 2 && this.getValue() === 21;
    }

    isBust() {
        return this.getValue() > 21;
    }
}

export { Hand };
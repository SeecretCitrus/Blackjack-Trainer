// ======================================================
// Card class representing a single playing card with a suit and rank.
// ======================================================
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    getValue() {
        if (this.rank === "Jack" || this.rank === "Queen" || this.rank === "King") {
            return 10;
        }
        if (this.rank === "Ace") {
            return 11;
        }
        return Number(this.rank);
    }
}

export { Card }; 
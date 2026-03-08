//-------------the Card class i created
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
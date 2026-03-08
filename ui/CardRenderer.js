function suitSymbol(suit) {
    switch(suit) {
        case "Hearts": return "♥";
        case "Diamonds": return "♦";
        case "Clubs": return "♣";
        case "Spades": return "♠";
    }
}

function coloredCard(card) {
    let color = (card.suit === "Hearts" || card.suit === "Diamonds")
        ? "red"
        : "black";
    return `<span class="cardSymbol" style="color:${color}">
                ${card.rank}${suitSymbol(card.suit)}
            </span>`;
}

export { suitSymbol, coloredCard };
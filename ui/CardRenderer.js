function suitSymbol(suit) {
    switch (suit) {
        case "Hearts":   return "♥";
        case "Diamonds": return "♦";
        case "Clubs":    return "♣";
        case "Spades":   return "♠";
        default:         return "?";
    }
}

function renderCard(card) {
    if (!card) {
        return `<div class="card hole"></div>`;
    }
    const suit  = suitSymbol(card.suit);
    const rank  = card.rank ?? "?";
    const color = (card.suit === "Hearts" || card.suit === "Diamonds") ? "red" : "black";

    return `
        <div class="card ${color}">
            <div class="card-top">${rank}<br>${suit}</div>
            <div class="card-middle">${suit}</div>
            <div class="card-bottom">${rank}<br>${suit}</div>
        </div>
    `;
}

export { renderCard };
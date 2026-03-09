function suitSymbol(suit) {
    switch (suit) {
        case "Hearts": return "♥";
        case "Diamonds": return "♦";
        case "Clubs": return "♣";
        case "Spades": return "♠";
        default: return "?";
    }
}

function renderCard(card) {
    if (!card) {
        return `<div class="card">?</div>`;
    }
    const suit = suitSymbol(card.suit);
    const rank = card.rank ?? "?";
    const color =
        (card.suit === "Hearts" || card.suit === "Diamonds")
        ? "red"
        : "black";
    return `
        <div class="card" style="color:${color}">
            <div class="card-top">${rank}${suit}</div>
            <div class="card-middle">${suit}</div>
            <div class="card-bottom">${rank}${suit}</div>
        </div>
    `;
}

export { renderCard };
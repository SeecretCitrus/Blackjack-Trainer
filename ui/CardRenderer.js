function suitSymbol(suit) {
    switch(suit) {
        case "Hearts": return "♥";
        case "Diamonds": return "♦";
        case "Clubs": return "♣";
        case "Spades": return "♠";
    }
}

/* disabled and replaced with renderCard for better styling 
function coloredCard(card) {
    let color = (card.suit === "Hearts" || card.suit === "Diamonds")
        ? "red"
        : "black";
    return `<span class="cardSymbol" style="color:${color}">
                ${card.rank}${suitSymbol(card.suit)}
            </span>`;
}*/

function renderCard(card) {
    const color = (card.suit === "Hearts" || card.suit === "Diamonds") ? "red" : "black";

    return `
        <div class="card" style="color:${color}">
            <div class="card-top">${card.rank}${suitSymbol(card.suit)}</div>
            <div class="card-middle">${suitSymbol(card.suit)}</div>
            <div class="card-bottom">${card.rank}${suitSymbol(card.suit)}</div>
        </div>
    `;
}

export { suitSymbol, coloredCard };

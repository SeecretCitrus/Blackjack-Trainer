import { renderCard } from './CardRenderer.js';

function renderGame(game) {
    const gameDiv = document.getElementById("game");

    gameDiv.innerHTML = "";

    if (!game) return;

    //---------------- DEALER ----------------//

    let dealerHTML = `
        <div class="dealerArea">
            <h2>Dealer</h2>
            <div class="dealerBox">
    `;

    if (game.dealer.hands.length > 0 && game.dealer.hands[0].cards.length > 0) {
        const dealerHand = game.dealer.hands[0];

        for (let i = 0; i < dealerHand.cards.length; i++) {

            if (game.currentPlayer !== null && i === 1) {
                dealerHTML += "🂠 ";
            } else {
                dealerHTML += renderCard(dealerHand.cards[i]) + " ";
            }
        }

        if (game.currentPlayer === null) {
            dealerHTML += "<br>Total: " + dealerHand.getValue();
        }
        if (game.phase === "ROUND_OVER") {
            dealerHTML += "<br><strong>Round Finished</strong>";
        }
    }

    dealerHTML += "</div></div>";

    gameDiv.innerHTML += dealerHTML;

    //---------------- PLAYERS ----------------//

    for (let i = 0; i < game.players.length; i++) {

        let player = game.players[i];
        let isCurrent = player === game.currentPlayer;

        let seatClass = "player" + (i + 1);

        let playerHTML = `
            <div class="playerArea ${seatClass}">
                <h2>
                    ${player.name}
                    ${isCurrent ? "<br>YOUR TURN" : ""}
                </h2>

                <div class="playerHands">
        `;

        for (let h = 0; h < player.hands.length; h++) {

            let total = player.getHandValue(h);
            let isCurrentHand = isCurrent && h === game.currentHandIndex;

            playerHTML += `<div class="hand ${isCurrentHand ? "activeHand" : ""}">
                <strong>Hand ${h+1} (Value: ${total})</strong><br>
            `;

            for (let card of player.hands[h].cards) {
                playerHTML += renderCard(card) + "<br>";
            }

            playerHTML += "</div>";
        }

        playerHTML += `</div></div>`;

        gameDiv.innerHTML += playerHTML;
    }
}

export { renderGame };
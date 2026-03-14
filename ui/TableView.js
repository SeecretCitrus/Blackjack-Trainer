import { renderCard } from './CardRenderer.js';

// ======================================================
// Arc seat positions — bottom-center anchor (grows upward)
// Each entry maps player index (0–6) to a CSS left/top %
// Seats run left-to-right: index 0 = far left, index 6 = far right
// ======================================================
const SEAT_POSITIONS = [
    { left:  7, top: 88 },   // seat 1 — far left
    { left: 20, top: 96 },   // seat 2
    { left: 33, top: 99 },   // seat 3
    { left: 50, top: 100 },  // seat 4 — center (lowest point)
    { left: 67, top: 99 },   // seat 5
    { left: 80, top: 96 },   // seat 6
    { left: 93, top: 88 },   // seat 7 — far right
];

// Maximum players we support in the arc layout
const MAX_SEATS = 7;

function renderGame(game) {
    const tableEl = document.getElementById('bj-table');
    if (!tableEl) return;

    // Clear previous render
    tableEl.innerHTML = '';

    // ---- Rail inner border (decorative) ----
    const rail = document.createElement('div');
    rail.className = 'rail-inner';
    tableEl.appendChild(rail);

    // ---- Felt inscription ----
    const inscription = document.createElement('div');
    inscription.className = 'inscription';
    inscription.innerHTML = 'BLACKJACK PAYS 3 TO 2<br>DEALER MUST STAND ON ALL 17s';
    tableEl.appendChild(inscription);

    if (!game) return;

    // ---- Dealer ----
    tableEl.appendChild(buildDealerZone(game));

    // ---- Player seats ----
    // Fill up to MAX_SEATS; active players get their data, the rest show as empty
    for (let seatIndex = 0; seatIndex < MAX_SEATS; seatIndex++) {
        const player = game.players[seatIndex] ?? null;
        const pos = SEAT_POSITIONS[seatIndex];
        const seatEl = buildSeat(seatIndex, player, game);
        seatEl.style.left = pos.left + '%';
        seatEl.style.top  = pos.top  + '%';
        tableEl.appendChild(seatEl);
    }
}

// ======================================================
// Dealer zone
// ======================================================
function buildDealerZone(game) {
    const zone = document.createElement('div');
    zone.id = 'dealer-zone';

    const lbl = document.createElement('div');
    lbl.className = 'dealer-label';
    lbl.textContent = 'Dealer';
    zone.appendChild(lbl);

    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'dealer-cards';

    const dealerHand = game.dealer.hands[0];
    if (dealerHand && dealerHand.cards.length > 0) {
        dealerHand.cards.forEach((card, i) => {
            // Hide hole card while any player is still active
            if (game.currentPlayer !== null && i === 1) {
                const hole = document.createElement('div');
                hole.id = 'holeCard';
                hole.className = 'card hole';
                cardsDiv.appendChild(hole);
            } else {
                cardsDiv.innerHTML += renderCard(card);
            }
        });
    }

    zone.appendChild(cardsDiv);

    // Show dealer total once all players are done
    if (game.currentPlayer === null && dealerHand && dealerHand.cards.length > 0) {
        const total = document.createElement('div');
        total.className = 'dealer-total';
        total.textContent = dealerHand.getValue();
        zone.appendChild(total);
    }

    if (game.phase === 'ROUND_OVER') {
        const badge = document.createElement('div');
        badge.className = 'round-over-badge';
        badge.textContent = '— Round Over —';
        zone.appendChild(badge);
    }

    return zone;
}

// ======================================================
// Individual seat
// ======================================================
function buildSeat(seatIndex, player, game) {
    const seat = document.createElement('div');
    seat.className = 'seat s' + (seatIndex + 1);

    // Seat number label above the panel
    const nameEl = document.createElement('div');
    nameEl.className = 'seat-name';
    nameEl.textContent = player ? player.name : ('Seat ' + (seatIndex + 1));
    seat.appendChild(nameEl);

    const panel = document.createElement('div');

    if (!player) {
        // Empty seat
        panel.className = 'seat-panel empty';
        panel.innerHTML = `<div class="seat-label">Empty</div><div class="bet-ring dim"></div>`;
        seat.appendChild(panel);
        return seat;
    }

    const isCurrentPlayer = player === game.currentPlayer;
    panel.className = 'seat-panel' + (isCurrentPlayer ? ' active' : '');

    // Label row
    const labelEl = document.createElement('div');
    labelEl.className = 'seat-label' + (isCurrentPlayer ? ' your-turn' : '');
    labelEl.textContent = isCurrentPlayer ? '▶ Your Turn' : player.name;
    panel.appendChild(labelEl);

    // Betting ring
    const ring = document.createElement('div');
    ring.className = 'bet-ring';
    panel.appendChild(ring);

    // Hands row (supports multiple hands for splits)
    const handsRow = document.createElement('div');
    handsRow.className = 'playerHands';

    player.hands.forEach((hand, handIndex) => {
        const isActiveHand = isCurrentPlayer && handIndex === game.currentHandIndex;
        handsRow.appendChild(buildHand(hand, handIndex, isActiveHand));
    });

    panel.appendChild(handsRow);
    seat.appendChild(panel);
    return seat;
}

// ======================================================
// Individual hand block (one per split hand)
// ======================================================
function buildHand(hand, handIndex, isActive) {
    const block = document.createElement('div');

    let cls = 'hand';
    if (isActive)          cls += ' activeHand';
    else if (hand.isFinished) cls += ' finishedHand';
    block.className = cls;

    // Hand value header
    const header = document.createElement('div');
    header.className = 'handHeader';
    header.textContent = hand.getValue();
    block.appendChild(header);

    // Cards
    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'cards';
    hand.cards.forEach(card => {
        cardsDiv.innerHTML += renderCard(card);
    });
    block.appendChild(cardsDiv);

    return block;
}

export { renderGame };
import { renderCard } from './CardRenderer.js';

// ======================================================
// All 7 arc positions available, left to right.
// Players are always centered across the arc — we pick
// a symmetric subset of these positions based on player count.
// ======================================================
const ALL_POSITIONS = [
    { left:  7, top: 78 },   // 0 — far left
    { left: 20, top: 86 },   // 1
    { left: 33, top: 90 },   // 2
    { left: 50, top: 91 },   // 3 — center
    { left: 67, top: 90 },   // 4
    { left: 80, top: 86 },   // 5
    { left: 93, top: 78 },   // 6 — far right
];

// For each player count 1–7, which position indices to use.
// Always symmetric and centered around index 3 (50% left).
const SEAT_LAYOUTS = {
    1: [3],
    2: [2, 4],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [0, 1, 2, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
};

const MAX_SEATS = 7;

function renderGame(game) {
    const tableEl = document.getElementById('bj-table');
    if (!tableEl) return;

    tableEl.innerHTML = '';

    const rail = document.createElement('div');
    rail.className = 'rail-inner';
    tableEl.appendChild(rail);

    const inscription = document.createElement('div');
    inscription.className = 'inscription';
    inscription.innerHTML = 'BLACKJACK PAYS 3 TO 2<br>DEALER MUST STAND ON ALL 17s';
    tableEl.appendChild(inscription);

    if (!game) return;

    tableEl.appendChild(buildDealerZone(game));

    const numPlayers = game.players.length;
    const layout = SEAT_LAYOUTS[Math.min(numPlayers, MAX_SEATS)];

    // layout is ordered left-to-right visually.
    // Players are assigned right-to-left (Player 1 at far right = last layout entry).
    layout.forEach((posIndex, layoutSlot) => {
        // Reverse: slot 0 (leftmost visual) = highest player index
        const playerIndex = numPlayers - 1 - layoutSlot;
        const player = game.players[playerIndex] ?? null;
        const pos = ALL_POSITIONS[posIndex];
        const seatEl = buildSeat(posIndex, player, game);
        seatEl.style.left = pos.left + '%';
        seatEl.style.top  = pos.top  + '%';
        tableEl.appendChild(seatEl);
    });
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
function buildSeat(posIndex, player, game) {
    const seat = document.createElement('div');
    // Use posIndex+1 for the CSS class so it still maps to s1–s7
    seat.className = 'seat s' + (posIndex + 1);

    const nameEl = document.createElement('div');
    nameEl.className = 'seat-name';
    nameEl.textContent = player ? player.name : '';
    seat.appendChild(nameEl);

    const panel = document.createElement('div');

    if (!player) {
        panel.className = 'seat-panel empty';
        panel.innerHTML = `<div class="seat-label">Empty</div><div class="bet-ring dim"></div>`;
        seat.appendChild(panel);
        return seat;
    }

    const isCurrentPlayer = player === game.currentPlayer;
    panel.className = 'seat-panel' + (isCurrentPlayer ? ' active' : '');

    const labelEl = document.createElement('div');
    labelEl.className = 'seat-label' + (isCurrentPlayer ? ' your-turn' : '');
    labelEl.textContent = isCurrentPlayer ? '▶ Your Turn' : player.name;
    panel.appendChild(labelEl);

    const ring = document.createElement('div');
    ring.className = 'bet-ring';
    panel.appendChild(ring);

    const handsRow = document.createElement('div');
    handsRow.className = 'playerHands';

    player.hands.forEach((hand, handIndex) => {
        const isActiveHand = isCurrentPlayer && handIndex === game.currentHandIndex;
        handsRow.appendChild(buildHand(hand, isActiveHand));
    });

    panel.appendChild(handsRow);
    seat.appendChild(panel);
    return seat;
}

// ======================================================
// Individual hand block (one per split hand)
// ======================================================
function buildHand(hand, isActive) {
    const block = document.createElement('div');

    let cls = 'hand';
    if (isActive)             cls += ' activeHand';
    else if (hand.isFinished) cls += ' finishedHand';
    block.className = cls;

    const header = document.createElement('div');
    header.className = 'handHeader';
    header.textContent = hand.getValue();
    block.appendChild(header);

    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'cards';
    hand.cards.forEach(card => {
        cardsDiv.innerHTML += renderCard(card);
    });
    block.appendChild(cardsDiv);

    return block;
}

export { renderGame };
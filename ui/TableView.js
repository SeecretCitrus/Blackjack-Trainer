import { renderCard } from './CardRenderer.js';

const ALL_POSITIONS = [
    { left:  7, top: 78 },
    { left: 20, top: 86 },
    { left: 33, top: 90 },
    { left: 50, top: 91 },
    { left: 67, top: 90 },
    { left: 80, top: 86 },
    { left: 93, top: 78 },
];

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

function renderGame(game, botSeats = []) {
    const tableEl = document.getElementById('bj-table');
    if (!tableEl) return;

    tableEl.innerHTML = '';

    const rail = document.createElement('div');
    rail.className = 'rail-inner';
    tableEl.appendChild(rail);

    const inscription = document.createElement('div');
    inscription.className = 'inscription';
    const s17text = game.rules.dealerHitsSoft17 ? 'DEALER HITS SOFT 17' : 'DEALER STANDS ON ALL 17s';
    inscription.innerHTML = `BLACKJACK PAYS 3 TO 2<br>${s17text}`;
    tableEl.appendChild(inscription);

    if (!game) return;

    tableEl.appendChild(buildDealerZone(game));

    const numPlayers = game.players.length;
    const layout = SEAT_LAYOUTS[Math.min(numPlayers, MAX_SEATS)];

    layout.forEach((posIndex, layoutSlot) => {
        const playerIndex = numPlayers - 1 - layoutSlot;
        const player = game.players[playerIndex] ?? null;
        const isBot  = botSeats[playerIndex] === true;
        const pos    = ALL_POSITIONS[posIndex];
        const seatEl = buildSeat(posIndex, player, playerIndex, game, isBot);
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
function buildSeat(posIndex, player, playerIndex, game, isBot) {
    const seat = document.createElement('div');
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

    // Sitting out state
    if (player.sittingOut) {
        panel.className = 'seat-panel sitting-out';
        panel.innerHTML = `
            <div class="seat-label">${player.name}</div>
            <div class="sitout-badge">Sitting Out — ${Math.round(player.balance)}</div>
        `;
        seat.appendChild(panel);
        return seat;
    }

    const isCurrentPlayer = player === game.currentPlayer;
    panel.className = 'seat-panel' + (isCurrentPlayer ? ' active' : '');

    // Label
    const labelEl = document.createElement('div');
    if (isBot) {
        labelEl.className = 'seat-label is-bot';
        labelEl.textContent = isCurrentPlayer ? '⚙ Playing...' : player.name;
    } else {
        labelEl.className = 'seat-label' + (isCurrentPlayer ? ' your-turn' : '');
        labelEl.textContent = isCurrentPlayer ? '▶ Your Turn' : player.name;
    }
    panel.appendChild(labelEl);

    if (isBot) {
        const badge = document.createElement('div');
        badge.className = 'bot-badge';
        badge.textContent = 'BOT';
        panel.appendChild(badge);
    }

    // Hands
    const handsRow = document.createElement('div');
    handsRow.className = 'playerHands';

    player.hands.forEach((hand, handIndex) => {
        const isActiveHand = isCurrentPlayer && handIndex === game.currentHandIndex;
        handsRow.appendChild(buildHand(hand, isActiveHand, game.phase, player.balance));
    });

    panel.appendChild(handsRow);
    seat.appendChild(panel);
    return seat;
}

// ======================================================
// Individual hand block
// ======================================================
function buildHand(hand, isActive, phase, playerBalance) {
    const block = document.createElement('div');

    let cls = 'hand';
    if (isActive)             cls += ' activeHand';
    else if (hand.isFinished) cls += ' finishedHand';
    block.className = cls;

    // Result badge (shown after round)
    if (phase === 'ROUND_OVER' && hand.result) {
        const badge = document.createElement('div');
        badge.className = 'result-badge result-' + hand.result;
        const labels = { win: '✓ Win', loss: '✗ Loss', push: '= Push', blackjack: '★ BJ' };
        badge.textContent = labels[hand.result] ?? hand.result;
        block.appendChild(badge);
    }

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

    // Bet and balance shown under the cards
    if (hand.bet > 0) {
        const betEl = document.createElement('div');
        betEl.className = 'hand-bet';
        betEl.textContent = `Bet: $${hand.bet}`;
        block.appendChild(betEl);
    }
    if (isActive && playerBalance !== undefined) {
        const balEl = document.createElement('div');
        balEl.className = 'seat-balance';
        balEl.textContent = `Bank: $${Math.round(playerBalance)}`;
        block.appendChild(balEl);
    }

    return block;
}

export { renderGame };
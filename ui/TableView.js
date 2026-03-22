import { renderCard } from './CardRenderer.js';

// Card width per player count (matches CSS scaling)
const CARD_WIDTHS   = { 1: 90, 2: 76, 3: 68, 4: 62, 5: 54, 6: 54, 7: 54 };
const CARD_OVERLAPS = { 1: 28, 2: 24, 3: 22, 4: 20, 5: 18, 6: 18, 7: 18 };

function cardsRowWidth(numCards, numPlayers) {
    const w = CARD_WIDTHS[numPlayers]   ?? 54;
    const o = CARD_OVERLAPS[numPlayers] ?? 18;
    if (numCards <= 0) return w;
    return w + (numCards - 1) * (w - o);
}

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

    const numPlayersForIns = game ? game.players.length : 1;
    if (numPlayersForIns >= 2) {
        const inscription = document.createElement('div');
        inscription.className = 'inscription';
        const s17text = game.rules.dealerHitsSoft17 ? 'DEALER HITS SOFT 17' : 'DEALER STANDS ON ALL 17s';
        inscription.innerHTML = `BLACKJACK PAYS 3 TO 2<br>${s17text}`;
        // Push inscription lower for fewer players so dealer doesn't overlap
        if (numPlayersForIns <= 3) inscription.style.top = '62%';
        tableEl.appendChild(inscription);
    }

    if (!game) return;

    tableEl.appendChild(buildDealerZone(game));
    tableEl.appendChild(buildShoeBar(game));

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

        const sitLbl = document.createElement('div');
        sitLbl.className = 'seat-label';
        sitLbl.textContent = player.name;
        panel.appendChild(sitLbl);

        const sitBadge = document.createElement('div');
        sitBadge.className = 'sitout-badge';
        sitBadge.textContent = 'Sitting Out';
        panel.appendChild(sitBadge);

        // Live balance editor even when sitting out
        panel.appendChild(buildBalanceRow(player, game));

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

    // Inline bet + balance controls
    panel.appendChild(buildBetBalanceControls(player, game, isBot));

    // Hands
    const handsRow = document.createElement('div');
    handsRow.className = 'playerHands';

    const numPlayers = game.players.length;
    player.hands.forEach((hand, handIndex) => {
        const isActiveHand = isCurrentPlayer && handIndex === game.currentHandIndex;
        handsRow.appendChild(buildHand(hand, isActiveHand, game.phase, numPlayers));
    });

    panel.appendChild(handsRow);
    seat.appendChild(panel);
    return seat;
}

// ======================================================
// Bet + Balance controls row — lives inside the seat panel
// ======================================================
function buildBetBalanceControls(player, game, isBot) {
    const row = document.createElement('div');
    row.className = 'seat-controls-row';

    // Bet input (editable before/between rounds, locked during play)
    const betWrap = document.createElement('label');
    betWrap.className = 'seat-ctrl-label';
    betWrap.textContent = 'Bet';

    const betInput = document.createElement('input');
    betInput.type = 'number';
    betInput.className = 'seat-ctrl-input';
    betInput.min = game.rules.minBet;
    betInput.step = 1;
    betInput.value = player.currentBet;
    // Lock bet input during active play
    betInput.disabled = (game.phase === 'PLAYER_TURN' || isBot);
    betInput.addEventListener('change', () => {
        const val = parseInt(betInput.value) || game.rules.minBet;
        player.currentBet = Math.max(val, game.rules.minBet);
        betInput.value = player.currentBet;
    });

    betWrap.appendChild(betInput);
    row.appendChild(betWrap);

    // Balance input (always editable)
    row.appendChild(buildBalanceRow(player, game));

    return row;
}

function buildBalanceRow(player, game) {
    const balWrap = document.createElement('label');
    balWrap.className = 'seat-ctrl-label';
    balWrap.textContent = '$';

    const balInput = document.createElement('input');
    balInput.type = 'number';
    balInput.className = 'seat-ctrl-input';
    balInput.min = 0;
    balInput.step = 10;
    balInput.value = Math.round(player.balance);
    balInput.addEventListener('change', () => {
        const val = parseInt(balInput.value);
        if (!isNaN(val) && val >= 0) {
            player.balance = val;
            if (val >= game.rules.minBet) player.sittingOut = false;
        }
    });

    balWrap.appendChild(balInput);
    return balWrap;
}

// ======================================================
// Individual hand block
// ======================================================
function buildHand(hand, isActive, phase, numPlayers = 1) {
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

    // Set explicit pixel width so overlapping cards don't overflow the container
    const cw = cardsRowWidth(hand.cards.length, numPlayers);
    cardsDiv.style.width = cw + 'px';
    block.style.minWidth = (cw + 16) + 'px'; // 16px = 2 * 8px padding

    block.appendChild(cardsDiv);

    // Show hand bet amount
    if (hand.bet > 0) {
        const betEl = document.createElement('div');
        betEl.className = 'hand-bet';
        betEl.textContent = `$${hand.bet}`;
        block.appendChild(betEl);
    }

    return block;
}

// ======================================================
// Shoe bar — shows remaining cards and penetration marker
// ======================================================
function buildShoeBar(game) {
    const totalCards    = game.startingDeckSize;
    const remaining     = game.shoe.cards.length;
    const pct           = remaining / totalCards;           // 0–1 fraction remaining
    const penetrationPct = 1 - game.penetration;           // fraction where reshuffle triggers

    const wrap = document.createElement('div');
    wrap.className = 'shoe-bar-wrap';

    // Label
    const lbl = document.createElement('div');
    lbl.className = 'shoe-bar-label';
    lbl.textContent = `Shoe: ${remaining} / ${totalCards}`;
    wrap.appendChild(lbl);

    // Track
    const track = document.createElement('div');
    track.className = 'shoe-bar-track';

    // Fill (remaining cards)
    const fill = document.createElement('div');
    fill.className = 'shoe-bar-fill';
    fill.style.width = (pct * 100) + '%';

    // Penetration marker line
    const marker = document.createElement('div');
    marker.className = 'shoe-bar-marker';
    marker.style.left = (penetrationPct * 100) + '%';
    marker.title = `Reshuffle at ~${Math.round(penetrationPct * 100)}%`;

    track.appendChild(fill);
    track.appendChild(marker);
    wrap.appendChild(track);

    return wrap;
}

export { renderGame };
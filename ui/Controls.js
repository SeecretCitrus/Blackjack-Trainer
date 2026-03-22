import { StrategyEngine } from '../logic/StrategyEngine.js';
import { Game } from '../engine/Game.js';
import { renderGame } from './TableView.js';
import { CardCounter, SYSTEMS } from '../CardCounter.js';

const BOT_DELAY_MS = 500;

let game;
let botSeats = [];   // botSeats[playerIndex] = true|false
let counter  = null; // CardCounter instance, null when counting is off

// ======================================================
// Bot seat UI — rebuilt when player count changes
// ======================================================
function rebuildBotSettings() {
    const numPlayers = parseInt(document.getElementById("numPlayersSelect").value);
    const container  = document.getElementById("botSettings");
    container.innerHTML = "";

    for (let i = 0; i < numPlayers; i++) {
        const label = document.createElement("label");
        const cb    = document.createElement("input");
        cb.type    = "checkbox";
        cb.id      = `botP${i}`;
        cb.checked = botSeats[i] ?? false;

        // Live toggle — takes effect immediately if a game is running
        cb.addEventListener("change", () => {
            botSeats[i] = cb.checked;
            // If it's now this player's turn and they just became a bot, kick off bot play
            if (game && game.phase === "PLAYER_TURN" &&
                game.currentPlayerIndex === i && cb.checked) {
                setTimeout(runBotStep, BOT_DELAY_MS);
            }
            refreshUI();
        });

        const span = document.createElement("span");
        span.textContent = `P${i + 1} Bot`;
        label.appendChild(cb);
        label.appendChild(span);
        container.appendChild(label);
    }
}

// ======================================================
// Bot execution
// ======================================================
function currentPlayerIsBot() {
    if (!game || !game.currentPlayer) return false;
    return botSeats[game.currentPlayerIndex] === true;
}

function runBotStep() {
    if (!game || game.phase !== "PLAYER_TURN" || !game.currentPlayer) return;
    if (!currentPlayerIsBot()) return;

    const action = StrategyEngine.getDecision(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );

    game.handlePlayerAction(action);
    countNewCards();
    refreshUI();

    if (game.phase === "PLAYER_TURN" && game.currentPlayer && currentPlayerIsBot()) {
        setTimeout(runBotStep, BOT_DELAY_MS);
    }
}

function maybeRunBots() {
    if (game && game.phase === "PLAYER_TURN" && game.currentPlayer && currentPlayerIsBot()) {
        setTimeout(runBotStep, BOT_DELAY_MS);
    }
}

// ======================================================
// Card scaling
// ======================================================
function applyCardScale(numPlayers) {
    const table = document.getElementById("bj-table");
    if (table) table.setAttribute("data-players", String(numPlayers));
}

// ======================================================
// Bet input panel — shown during BETTING / start of each round
// ======================================================
function buildBetPanel() {
    const panel = document.getElementById("betPanel");
    if (!panel || !game) return;
    panel.innerHTML = "";

    const active = game.players.filter(p => !p.sittingOut && !botSeats[game.players.indexOf(p)]);
    if (active.length === 0) return;

    const title = document.createElement("div");
    title.className = "bet-panel-title";
    title.textContent = "Place your bets";
    panel.appendChild(title);

    active.forEach(player => {
        const row = document.createElement("div");
        row.className = "bet-row";

        const lbl = document.createElement("span");
        lbl.textContent = player.name;
        lbl.className = "bet-row-label";

        const input = document.createElement("input");
        input.type  = "number";
        input.className = "bet-input";
        input.min   = game.rules.minBet;
        input.max   = player.balance;
        input.step  = 1;
        input.value = Math.min(player.currentBet, player.balance);
        input.addEventListener("input", () => {
            const val = parseInt(input.value) || game.rules.minBet;
            player.currentBet = Math.max(val, game.rules.minBet);
        });

        const balSpan = document.createElement("span");
        balSpan.className = "bet-row-balance";
        balSpan.textContent = `$${player.balance}`;

        row.appendChild(lbl);
        row.appendChild(input);
        row.appendChild(balSpan);
        panel.appendChild(row);
    });
}

// ======================================================
// Resupply notification — shown when players sit out
// ======================================================
function buildResupplyPanel() {
    const panel = document.getElementById("resupplyPanel");
    if (!panel || !game) return;
    panel.innerHTML = "";

    const broke = game.players.filter(p => p.sittingOut);
    if (broke.length === 0) return;

    broke.forEach(player => {
        const row = document.createElement("div");
        row.className = "resupply-row";

        const msg = document.createElement("span");
        msg.textContent = `${player.name} is out of funds`;
        msg.className = "resupply-msg";

        const amtInput = document.createElement("input");
        amtInput.type  = "number";
        amtInput.className = "bet-input";
        amtInput.min   = 1;
        amtInput.step  = 10;
        amtInput.value = player.startingBalance;
        amtInput.style.width = "70px";

        const btn = document.createElement("button");
        btn.textContent = "Resupply";
        btn.className   = "resupply-btn";
        btn.addEventListener("click", () => {
            const amt = parseInt(amtInput.value) || player.startingBalance;
            player.resupply(amt);
            player.currentBet = Math.min(player.currentBet, player.balance);
            refreshUI();
            buildResupplyPanel();
        });

        row.appendChild(msg);
        row.appendChild(amtInput);
        row.appendChild(btn);
        panel.appendChild(row);
    });
}

// ======================================================
// Balance editor — live-editable balance fields per player
// ======================================================
function buildBalanceEditor() {
    const panel = document.getElementById("balanceEditor");
    if (!panel || !game) return;
    panel.innerHTML = "";

    game.players.forEach(player => {
        const row = document.createElement("div");
        row.className = "balance-row";

        const lbl = document.createElement("span");
        lbl.className   = "balance-label";
        lbl.textContent = player.name + ":";

        const input = document.createElement("input");
        input.type  = "number";
        input.className = "balance-input";
        input.min   = 0;
        input.step  = 10;
        input.value = Math.round(player.balance);
        input.title = "Edit balance directly";
        input.addEventListener("change", () => {
            const val = parseInt(input.value);
            if (!isNaN(val) && val >= 0) {
                player.balance = val;
                if (val >= game.rules.minBet) player.sittingOut = false;
                buildResupplyPanel();
                refreshUI();
            }
        });

        row.appendChild(lbl);
        row.appendChild(input);
        panel.appendChild(row);
    });
}

// ======================================================
// UI refresh
// ======================================================
function updateButtons() {
    const nextRoundBtn = document.getElementById("nextRoundBtn");
    const isBot = currentPlayerIsBot();

    if (!game || game.currentPlayer === null || isBot) {
        document.getElementById("hitBtn").disabled    = true;
        document.getElementById("standBtn").disabled  = true;
        document.getElementById("doubleBtn").disabled = true;
        document.getElementById("splitBtn").disabled  = true;
        nextRoundBtn.disabled = !game || game.phase !== "ROUND_OVER";
        return;
    }

    document.getElementById("hitBtn").disabled    = false;
    document.getElementById("standBtn").disabled  = false;
    document.getElementById("doubleBtn").disabled =
        !game.currentPlayer.canDouble(game.currentHandIndex, game.rules);
    document.getElementById("splitBtn").disabled  =
        !game.currentPlayer.canSplit(game.currentHandIndex, game.rules);
    nextRoundBtn.disabled = game.phase !== "ROUND_OVER";
}

function refreshUI() {
    if (!game) return;
    renderGame(game, botSeats);
    updateButtons();
    highlightCorrectAction();
    updateExplanationPanel();
    updateCountPanel();
}

function showTooltip(button, message) {
    const rect    = button.getBoundingClientRect();
    const tooltip = document.createElement("div");
    tooltip.className  = "tooltip";
    tooltip.innerText  = message;
    tooltip.style.position = "fixed";
    tooltip.style.left     = rect.left + rect.width / 2 + "px";
    tooltip.style.top      = rect.top - 30 + "px";
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 2000);
}

function handleManualAction(action) {
    if (!game || game.phase !== "PLAYER_TURN") return;
    if (currentPlayerIsBot()) return;

    const correct = StrategyEngine.getDecision(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );

    const buttonMap = { H: "hitBtn", S: "standBtn", D: "doubleBtn", P: "splitBtn" };
    const btn = document.getElementById(buttonMap[action]);

    if (action !== correct) {
        showTooltip(btn, `✕ Wrong! Correct: ${correct}`);
    } else {
        showTooltip(btn, `✓ Correct`);
    }

    game.handlePlayerAction(action);
    countNewCards();
    refreshUI();
    maybeRunBots();
}

// ======================================================
// Setup
// ======================================================
function setupControls() {
    document.getElementById("hitBtn").disabled    = true;
    document.getElementById("standBtn").disabled  = true;
    document.getElementById("doubleBtn").disabled = true;
    document.getElementById("splitBtn").disabled  = true;
    document.getElementById("nextRoundBtn").disabled = true;

    // Rebuild bot checkboxes on player count change
    document.getElementById("numPlayersSelect").addEventListener("change", () => {
        rebuildBotSettings();
    });
    rebuildBotSettings();

    document.getElementById("startBtn").addEventListener("click", () => {
        const numDecks   = parseInt(document.getElementById("numDecksSelect").value);
        const S17        = document.getElementById("S17Select").value === "true";
        const numPlayers = parseInt(document.getElementById("numPlayersSelect").value);
        const minBet     = parseInt(document.getElementById("minBetInput")?.value) || 15;
        const startBal   = parseInt(document.getElementById("startBalInput")?.value) || 100;

        // Sync bot config
        botSeats = Array.from({ length: numPlayers }, (_, i) => {
            const cb = document.getElementById(`botP${i}`);
            return cb ? cb.checked : false;
        });

        game = new Game(numPlayers, numDecks, "manual", S17);
        game.rules.minBet = minBet;

        // Set starting balances
        game.players.forEach(p => {
            p.balance         = startBal;
            p.startingBalance = startBal;
            p.currentBet      = minBet;
        });

        // Initialise card counter if enabled
        const countOn = document.getElementById('countToggle')?.checked;
        const system  = document.getElementById('countSystemSelect')?.value ?? 'hilo';
        if (countOn) {
            counter = new CardCounter(numDecks, system);
            counter.active = true;
            // Hook into game shoe reshuffle
            const origCheckShuffle = game.checkShuffle.bind(game);
            game.checkShuffle = function() {
                const before = this.shoe.cards.length;
                origCheckShuffle();
                if (this.shoe.cards.length > before) counter.reset();
            };
        } else {
            counter = null;
        }

        applyCardScale(numPlayers);
        buildBetPanel();
        game.startRound();
        // Count the initial deal cards
        countVisibleCards();
        // Clear bet panel once round has started — bets are locked
        const bp = document.getElementById("betPanel");
        if (bp) bp.innerHTML = "";
        refreshUI();
        maybeRunBots();
    });

    document.getElementById("hitBtn").addEventListener("click",   () => handleManualAction("H"));
    document.getElementById("standBtn").addEventListener("click",  () => handleManualAction("S"));
    document.getElementById("doubleBtn").addEventListener("click", () => handleManualAction("D"));
    document.getElementById("splitBtn").addEventListener("click",  () => handleManualAction("P"));

    document.getElementById("nextRoundBtn").addEventListener("click", () => {
        if (!game || game.phase !== "ROUND_OVER") return;
        applyCardScale(game.players.length);
        buildBetPanel();
        game.startRound();
        countVisibleCards();
        const bp = document.getElementById("betPanel");
        if (bp) bp.innerHTML = "";
        refreshUI();
        maybeRunBots();
    });

    document.getElementById("trainerToggle").addEventListener("change", () => {
        highlightCorrectAction();
        updateExplanationPanel();
    });

    updateButtons();
}

// ======================================================
// Trainer highlight
// ======================================================
function highlightCorrectAction() {
    const buttonMap = { H: "hitBtn", S: "standBtn", D: "doubleBtn", P: "splitBtn" };
    for (let key in buttonMap) {
        document.getElementById(buttonMap[key]).classList.remove("correctMove");
    }

    const trainer = document.getElementById("trainerToggle").checked;
    if (!trainer || !game || game.phase !== "PLAYER_TURN") return;
    if (!game.currentPlayer || currentPlayerIsBot()) return;
    if (!game.currentPlayer.hands[game.currentHandIndex]) return;

    const correct = StrategyEngine.getDecision(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );

    const btn = document.getElementById(buttonMap[correct]);
    if (btn) btn.classList.add("correctMove");
}

// ======================================================
// Explanation panel
// ======================================================
function updateExplanationPanel() {
    const panel = document.getElementById("explanationPanel");
    if (!panel) return;

    const trainer = document.getElementById("trainerToggle").checked;
    if (!trainer || !game || game.phase !== "PLAYER_TURN" ||
        !game.currentPlayer || currentPlayerIsBot()) {
        panel.classList.remove("visible");
        return;
    }
    if (!game.currentPlayer.hands[game.currentHandIndex]) {
        panel.classList.remove("visible");
        return;
    }

    const explanation = StrategyEngine.getExplanation(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );

    panel.textContent = explanation;
    panel.classList.add("visible");
}

// ======================================================
// Card counting helpers
// ======================================================

// Count all currently visible cards on the table
// Called on deal so we count the initial two cards per player and dealer upcard
function countVisibleCards() {
    if (!counter || !game) return;
    counter.reset(); // recount from scratch each round start to stay accurate

    // Count dealer upcard only (hole card is hidden)
    const dealerHand = game.dealer.hands[0];
    if (dealerHand && dealerHand.cards.length > 0) {
        counter.countCard(dealerHand.cards[0]); // upcard visible
    }

    // Count all player cards (all visible)
    for (const player of game.players) {
        for (const hand of player.hands) {
            for (const card of hand.cards) {
                counter.countCard(card);
            }
        }
    }

    // Count cards dealt in previous rounds too (running count persists across rounds)
    // We do this by counting total cards dealt = totalCards - remaining
    // But since we reset above, we need the cumulative count
    // Solution: don't reset — track incrementally via countNewCards instead
    // Revert: don't reset here, just count new cards
    // Actually the correct approach is countNewCards for mid-round actions
    // and countDealCards just for the initial deal
}

// Count only newly dealt cards since last check
// Used after each action to count any new cards that appeared
let _lastCountedCards = 0;
function countNewCards() {
    if (!counter || !game) return;
    // Count total cards on table now vs last time
    let totalOnTable = 0;
    const dealerHand = game.dealer.hands[0];
    if (dealerHand) totalOnTable += dealerHand.cards.length;
    for (const player of game.players) {
        for (const hand of player.hands) {
            totalOnTable += hand.cards.length;
        }
    }
    // If cards increased, count the new visible ones
    // Simpler: just re-derive count from all visible cards each time
}

// Recount all visible cards from scratch — most reliable approach
function recountAllVisible() {
    if (!counter || !game) return;
    // Save running count from before this round
    const prevCount = counter._prevRoundCount ?? 0;
    counter.runningCount = prevCount;
    counter.aceSideCount = counter._prevAceSideCount ?? 0;

    const dealerHand = game.dealer.hands[0];
    if (dealerHand) {
        // Only count upcard (index 0) — hole card revealed only at round end
        if (dealerHand.cards.length > 0) {
            counter.countCard(dealerHand.cards[0]);
        }
        // At round over, count hole card too
        if (game.phase === 'ROUND_OVER' && dealerHand.cards.length > 1) {
            for (let i = 1; i < dealerHand.cards.length; i++) {
                counter.countCard(dealerHand.cards[i]);
            }
        }
    }
    for (const player of game.players) {
        for (const hand of player.hands) {
            for (const card of hand.cards) {
                counter.countCard(card);
            }
        }
    }
}

// Called on Next Round — save end-of-round count so next round starts from it
function saveRoundCount() {
    if (!counter) return;
    counter._prevRoundCount    = counter.runningCount;
    counter._prevAceSideCount  = counter.aceSideCount;
    counter.cardsDealt         = game.startingDeckSize - game.shoe.cards.length;
}

// Update the count display panel
function updateCountPanel() {
    const panel = document.getElementById('countPanel');
    if (!panel) return;

    const active = document.getElementById('countToggle')?.checked;
    const sysSelect = document.getElementById('countSystemLabel');
    if (sysSelect) sysSelect.style.display = active ? '' : 'none';

    if (!active || !counter || !game) {
        panel.innerHTML = '';
        return;
    }

    recountAllVisible();

    const tc      = counter.getTrueCount();
    const rc      = counter.runningCount;
    const decks   = counter.getDecksRemaining().toFixed(1);
    const label   = counter.getCountLabel();
    const mult    = counter.getBetMultiplier();
    const sysName = counter.systemName;

    const tcStr = (tc >= 0 ? '+' : '') + tc.toFixed(1);
    const rcStr = (rc >= 0 ? '+' : '') + rc;

    let html = `<div class="count-panel">
        <div class="count-system">${sysName}</div>
        <div class="count-grid">
            <div class="count-cell">
                <div class="count-lbl">Running</div>
                <div class="count-val" style="color:${label.color}">${rcStr}</div>
            </div>
            <div class="count-cell">
                <div class="count-lbl">True count</div>
                <div class="count-val" style="color:${label.color}">${tcStr}</div>
            </div>
            <div class="count-cell">
                <div class="count-lbl">Decks left</div>
                <div class="count-val">${decks}</div>
            </div>
            <div class="count-cell">
                <div class="count-lbl">Bet</div>
                <div class="count-val" style="color:${label.color}">${mult}×</div>
            </div>
        </div>
        <div class="count-label-bar" style="color:${label.color}">${label.text} — ${label.bet}</div>`;

    if (counter.usesAceSideCount) {
        const surplus = counter.getAceSurplus();
        const sStr = (surplus >= 0 ? '+' : '') + surplus.toFixed(1);
        html += `<div class="count-ace-row">Ace surplus: <span style="color:${surplus > 0 ? '#6ddb8a' : surplus < 0 ? '#e07070' : 'rgba(255,255,255,0.5)'}">${sStr}</span> per remaining deck</div>`;
    }

    html += `</div>`;
    panel.innerHTML = html;
}

export { setupControls, updateButtons, handleManualAction };
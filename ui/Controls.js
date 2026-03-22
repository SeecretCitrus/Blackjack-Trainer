import { StrategyEngine } from '../logic/StrategyEngine.js';
import { Game } from '../engine/Game.js';
import { renderGame } from './TableView.js';

const BOT_DELAY_MS = 500;

let game;
let botSeats = [];   // botSeats[playerIndex] = true|false

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
    buildResupplyPanel();
    buildBalanceEditor();
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

        applyCardScale(numPlayers);
        buildBetPanel();
        game.startRound();
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
        // Clear bet panel once round has started — bets are now locked in
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

export { setupControls, updateButtons, handleManualAction };
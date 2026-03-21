import { StrategyEngine } from '../logic/StrategyEngine.js';
import { Game } from '../engine/Game.js';
import { renderGame } from './TableView.js';
import { Simulator } from '../logic/Simulator.js';

const BOT_DELAY_MS = 500;

let game;

// botSeats[i] = true means player i (0-indexed) is a bot
let botSeats = [];

// ======================================================
// Bot seat UI — rebuild checkboxes whenever player count changes
// ======================================================
function rebuildBotSettings() {
    const numPlayers = parseInt(document.getElementById("numPlayersSelect").value);
    const container  = document.getElementById("botSettings");
    container.innerHTML = "";

    for (let i = 0; i < numPlayers; i++) {
        const label = document.createElement("label");
        const cb    = document.createElement("input");
        cb.type  = "checkbox";
        cb.id    = `botP${i}`;
        cb.checked = botSeats[i] ?? false;
        cb.addEventListener("change", () => { botSeats[i] = cb.checked; });

        const span = document.createElement("span");
        span.textContent = `P${i + 1} Bot`;

        label.appendChild(cb);
        label.appendChild(span);
        container.appendChild(label);
    }
}

// ======================================================
// Check whether the current player is a bot
// ======================================================
function currentPlayerIsBot() {
    if (!game || !game.currentPlayer) return false;
    return botSeats[game.currentPlayerIndex] === true;
}

// ======================================================
// Play one bot action, then schedule the next if still a bot
// ======================================================
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

    // If there is still a current player and it's still a bot, keep going
    if (game.phase === "PLAYER_TURN" && game.currentPlayer && currentPlayerIsBot()) {
        setTimeout(runBotStep, BOT_DELAY_MS);
    }
}

// ======================================================
// After any action, kick off bot play if next player is a bot
// ======================================================
function maybeRunBots() {
    if (game.phase === "PLAYER_TURN" && game.currentPlayer && currentPlayerIsBot()) {
        setTimeout(runBotStep, BOT_DELAY_MS);
    }
}

// ======================================================
// Card size scaling via data-players attribute on #bj-table
// ======================================================
function applyCardScale(numPlayers) {
    const table = document.getElementById("bj-table");
    if (table) table.setAttribute("data-players", String(numPlayers));
}

// ======================================================
// UI refresh
// ======================================================
function updateButtons() {
    const nextRoundBtn = document.getElementById("nextRoundBtn");

    // Disable action buttons when it's a bot's turn or no current player
    const isBot = currentPlayerIsBot();

    if (!game || game.currentPlayer === null || isBot) {
        document.getElementById("hitBtn").disabled = true;
        document.getElementById("standBtn").disabled = true;
        document.getElementById("doubleBtn").disabled = true;
        document.getElementById("splitBtn").disabled = true;
        nextRoundBtn.disabled = !game || game.phase !== "ROUND_OVER";
        return;
    }

    document.getElementById("hitBtn").disabled = false;
    document.getElementById("standBtn").disabled = false;
    document.getElementById("doubleBtn").disabled =
        !game.currentPlayer.canDouble(game.currentHandIndex, game.rules);
    document.getElementById("splitBtn").disabled =
        !game.currentPlayer.canSplit(game.currentHandIndex, game.rules);
    nextRoundBtn.disabled = game.phase !== "ROUND_OVER";
}

function refreshUI() {
    if (!game) return;
    renderGame(game, botSeats);
    updateButtons();
    highlightCorrectAction();
    updateExplanationPanel();
}

function showTooltip(button, message) {
    const rect    = button.getBoundingClientRect();
    const tooltip = document.createElement("div");
    tooltip.className  = "tooltip";
    tooltip.innerText  = message;
    tooltip.style.position = "fixed";
    tooltip.style.left = rect.left + rect.width / 2 + "px";
    tooltip.style.top  = rect.top - 30 + "px";
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 2000);
}

function handleManualAction(action) {
    if (!game || game.phase !== "PLAYER_TURN") return;
    if (currentPlayerIsBot()) return; // ignore button clicks during bot turn

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
    document.getElementById("hitBtn").disabled = true;
    document.getElementById("standBtn").disabled = true;
    document.getElementById("doubleBtn").disabled = true;
    document.getElementById("splitBtn").disabled = true;
    document.getElementById("nextRoundBtn").disabled = true;

    // Rebuild bot checkboxes whenever player count changes
    document.getElementById("numPlayersSelect").addEventListener("change", () => {
        rebuildBotSettings();
    });
    rebuildBotSettings(); // build on load

    document.getElementById("startBtn").addEventListener("click", () => {
        const numDecks   = parseInt(document.getElementById("numDecksSelect").value);
        const S17        = document.getElementById("S17Select").value === "true";
        const numPlayers = parseInt(document.getElementById("numPlayersSelect").value);

        // Sync botSeats array length to numPlayers
        botSeats = Array.from({ length: numPlayers }, (_, i) => {
            const cb = document.getElementById(`botP${i}`);
            return cb ? cb.checked : false;
        });

        game = new Game(numPlayers, numDecks, "manual", S17);
        applyCardScale(numPlayers);
        game.startRound();
        refreshUI();
        maybeRunBots(); // in case player 1 (rightmost, played last) is human
                        // but earlier players are bots — start the chain
    });

    document.getElementById("hitBtn").addEventListener("click",   () => handleManualAction("H"));
    document.getElementById("standBtn").addEventListener("click",  () => handleManualAction("S"));
    document.getElementById("doubleBtn").addEventListener("click", () => handleManualAction("D"));
    document.getElementById("splitBtn").addEventListener("click",  () => handleManualAction("P"));

    document.getElementById("simulateBtn").addEventListener("click", () => {
        Simulator.runSimulation();
    });

    document.getElementById("nextRoundBtn").addEventListener("click", () => {
        if (!game || game.phase !== "ROUND_OVER") return;
        game.startRound();
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
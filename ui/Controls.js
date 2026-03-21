import { StrategyEngine } from '../logic/StrategyEngine.js';
import { Game } from '../engine/Game.js';
import { renderGame } from './TableView.js';
import { Simulator } from '../logic/Simulator.js';

let game;

function updateButtons() {
    const nextRoundBtn = document.getElementById("nextRoundBtn");

    if (!game || game.currentPlayer === null) {
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
    renderGame(game);
    updateButtons();
    highlightCorrectAction();
    updateExplanationPanel();
}

function showTooltip(button, message) {
    const rect = button.getBoundingClientRect();
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.innerText = message;
    tooltip.style.position = "fixed";
    tooltip.style.left = rect.left + rect.width / 2 + "px";
    tooltip.style.top = rect.top - 30 + "px";
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 2000);
}

function handleManualAction(action) {
    if (!game || game.phase !== "PLAYER_TURN") return;

    const correct = StrategyEngine.getDecision(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );

    const buttonMap = { H: "hitBtn", S: "standBtn", D: "doubleBtn", P: "splitBtn" };
    const btn = document.getElementById(buttonMap[action]);

    if (action !== correct) {
        console.log("✕ Mistake! Correct play was:", correct);
        showTooltip(btn, `✕ Wrong! Correct: ${correct}`);
    } else {
        console.log("✓ Correct play.");
        showTooltip(btn, `✓ Correct`);
    }

    game.handlePlayerAction(action);
    refreshUI();
}

function setupControls() {
    document.getElementById("hitBtn").disabled = true;
    document.getElementById("standBtn").disabled = true;
    document.getElementById("doubleBtn").disabled = true;
    document.getElementById("splitBtn").disabled = true;
    document.getElementById("nextRoundBtn").disabled = true;

    document.getElementById("startBtn").addEventListener("click", () => {
        const numDecks  = parseInt(document.getElementById("numDecksSelect").value);
        const S17       = document.getElementById("S17Select").value === "true";
        const numPlayers = parseInt(document.getElementById("numPlayersSelect").value);

        game = new Game(numPlayers, numDecks, "manual", S17);
        game.startRound();
        refreshUI();
    });

    document.getElementById("hitBtn").addEventListener("click",    () => handleManualAction("H"));
    document.getElementById("standBtn").addEventListener("click",   () => handleManualAction("S"));
    document.getElementById("doubleBtn").addEventListener("click",  () => handleManualAction("D"));
    document.getElementById("splitBtn").addEventListener("click",   () => handleManualAction("P"));

    document.getElementById("simulateBtn").addEventListener("click", () => {
        Simulator.runSimulation();
    });

    document.getElementById("nextRoundBtn").addEventListener("click", () => {
        if (!game || game.phase !== "ROUND_OVER") return;
        game.startRound();
        refreshUI();
    });

    document.getElementById("trainerToggle").addEventListener("change", () => {
        highlightCorrectAction();
        updateExplanationPanel();
    });

    updateButtons();
}

function highlightCorrectAction() {
    const buttonMap = { H: "hitBtn", S: "standBtn", D: "doubleBtn", P: "splitBtn" };

    for (let key in buttonMap) {
        document.getElementById(buttonMap[key]).classList.remove("correctMove");
    }

    const trainer = document.getElementById("trainerToggle").checked;
    if (!trainer || !game || game.phase !== "PLAYER_TURN") return;
    if (!game.currentPlayer) return;
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

function updateExplanationPanel() {
    const panel = document.getElementById("explanationPanel");
    if (!panel) return;

    const trainer = document.getElementById("trainerToggle").checked;

    // Hide panel if trainer is off, game hasn't started, or round is over
    if (!trainer || !game || game.phase !== "PLAYER_TURN" || !game.currentPlayer) {
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
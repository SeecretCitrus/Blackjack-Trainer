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
}

function handleManualAction(action) {
    if (!game || game.phase !== "PLAYER_TURN") return;
    const correct = StrategyEngine.getDecision(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );
    if (action !== correct) {
        console.log("✕ Mistake! Correct play was:", correct);
    } else {
        console.log("✓ Correct play.");
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
        console.log("Start button clicked");

        game = new Game(4, 6, "manual", false);

        game.startRound();

        console.log("Game phase:", game.phase);
        console.log("Current player:", game.currentPlayer);

        refreshUI();
    });

    document.getElementById("hitBtn").addEventListener("click", () => {
        handleManualAction("H");
    });

    document.getElementById("standBtn").addEventListener("click", () => {
        handleManualAction("S");
    });

    document.getElementById("doubleBtn").addEventListener("click", () => {
        handleManualAction("D");
    });

    document.getElementById("splitBtn").addEventListener("click", () => {
        handleManualAction("P");
    });

    document.getElementById("simulateBtn").addEventListener("click", () => {
        Simulator.runSimulation();
    });

    document.getElementById("nextRoundBtn").addEventListener("click", () => {
        if (!game || game.phase !== "ROUND_OVER") return;
        game.startRound();
        refreshUI();

    });






    updateButtons();
}

export { setupControls, updateButtons, handleManualAction };
import { StrategyEngine } from '../logic/StrategyEngine.js';
import { Game } from '../engine/Game.js';
import { renderGame } from './TableView.js';
import { Simulator } from '../logic/Simulator.js';

let game;

function updateButtons() {
    const noPlayer = !game || game.currentPlayer === null;

    document.getElementById("hitBtn").disabled = noPlayer;
    document.getElementById("standBtn").disabled = noPlayer;

    document.getElementById("doubleBtn").disabled =
        noPlayer || !game.currentPlayer.canDouble(game.currentHandIndex);

    document.getElementById("splitBtn").disabled =
        noPlayer || !game.currentPlayer.canSplit(game.currentHandIndex);

    document.getElementById("nextRoundBtn").disabled =
        !game || !game.phase == "ROUND_OVER";
}

function refreshUI() {
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


}

export { setupControls, updateButtons, handleManualAction };
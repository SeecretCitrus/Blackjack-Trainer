import { StrategyEngine } from '../logic/StrategyEngine.js';
import { Game } from '../engine/Game.js';
import { renderGame } from './TableView.js';
import { Simulator } from '../logic/Simulator.js';

let game;

function updateButtons() {
    const disabled = game.currentPlayer === null;
    document.getElementById("hitBtn").disabled = disabled;
    document.getElementById("standBtn").disabled = disabled;
    document.getElementById("doubleBtn").disabled = disabled;
    document.getElementById("splitBtn").disabled = disabled;
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
    updateButtons();
}

function setupControls() {
    document.getElementById("startBtn").addEventListener("click", () => {
        console.log("Start button clicked");

        game = new Game(4, 6, "manual", false);

        game.startRound();

        console.log("Game phase:", game.phase);
        console.log("Current player:", game.currentPlayer);

        renderGame(game);
        updateButtons();
    });

    document.getElementById("hitBtn").addEventListener("click", () => {
        handleManualAction("H");
        renderGame(game);
        updateButtons();
    });

    document.getElementById("standBtn").addEventListener("click", () => {
        handleManualAction("S");
        renderGame(game);
        updateButtons();
    });

    document.getElementById("doubleBtn").addEventListener("click", () => {
        handleManualAction("D");
        renderGame(game);
        updateButtons();
    });

    document.getElementById("splitBtn").addEventListener("click", () => {
        handleManualAction("P");
        renderGame(game);
        updateButtons();
    });

    document.getElementById("simulateBtn").addEventListener("click", () => {
        Simulator.runSimulation();
    });

    document.getElementById("nextRoundBtn").addEventListener("click", () => {

        if (!game) return;

        game.startRound();

        renderGame(game);
        updateButtons();
    });
}

export { setupControls, updateButtons, handleManualAction };
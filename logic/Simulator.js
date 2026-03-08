import { Game } from '../engine/Game.js';
import { StrategyEngine } from './StrategyEngine.js';

class Simulator {
    static runSimulation(numRounds = 100000, numPlayers = 1, numDecks = 6, S17 = true) {
        const game = new Game(numPlayers, numDecks, "automatic", S17);

        for (let i = 0; i < numRounds; i++) {
            game.playFullRound(StrategyEngine);
        }

        console.log("Simulation complete");
        console.log("Rounds Played:", game.stats.roundsPlayed);
        console.log("Hands:", game.stats.handsPlayed);
        console.log("Wins:", game.stats.wins);
        console.log("Losses:", game.stats.losses);
        console.log("Pushes:", game.stats.pushes);

        let winRate = game.stats.wins / game.stats.handsPlayed;
        console.log("Win Rate:", winRate);
        console.log("Win Rate (excluding pushes):", game.stats.wins / (game.stats.handsPlayed - game.stats.pushes));

        return game.stats;
    }
}

export { Simulator };
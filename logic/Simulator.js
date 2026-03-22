import { Game } from '../engine/Game.js';
import { StrategyEngine } from './StrategyEngine.js';

class Simulator {
    // ======================================================
    // Basic simulation (used by console / legacy calls)
    // ======================================================
    static runSimulation(numRounds = 100000, numPlayers = 1, numDecks = 6, S17 = true) {
        const stats = this.runDetailed({ numRounds, numPlayers, numDecks, S17 });
        console.log("Simulation complete");
        console.log("Rounds Played:", stats.roundsPlayed);
        console.log("Hands:", stats.handsPlayed);
        console.log("Wins:", stats.wins);
        console.log("Losses:", stats.losses);
        console.log("Pushes:", stats.pushes);
        console.log("Win Rate:", (stats.wins / stats.handsPlayed).toFixed(4));
        console.log("House Edge (EV):", (stats.ev * 100).toFixed(3) + "%");
        return stats;
    }

    // ======================================================
    // Detailed simulation — returns rich stats object
    // Accepts optional onProgress(pct) callback for UI updates
    // ======================================================
    static runDetailed({
        numRounds   = 100000,
        numPlayers  = 1,
        numDecks    = 6,
        S17         = true,
        DAS         = true,
        RSA         = false,
        payout      = 1.5,
        onProgress  = null,
        chunkSize   = 5000,  // rounds per progress tick (ignored in sync mode)
    } = {}) {
        const rules = {
            dealerHitsSoft17: S17,
            doubleAfterSplit: DAS,
            resplitAces: RSA,
            lateSurrender: true,
            blackjackPayout: payout,
        };

        const game = new Game(numPlayers, numDecks, "automatic", S17);
        // Override rules with full config
        game.rules = rules;

        // Per-starting-hand breakdown: key = "hard_12" | "soft_18" | "pair_8"
        const handBreakdown = {};

        const getBreakdownKey = (hand) => {
            const cards = hand.cards;
            if (cards.length === 2 && cards[0].rank === cards[1].rank) {
                return `pair_${cards[0].getValue()}`;
            }
            const isSoft = hand.isSoft();
            const val    = hand.getValue();
            return (isSoft ? "soft_" : "hard_") + val;
        };

        const ensureKey = (key) => {
            if (!handBreakdown[key]) {
                handBreakdown[key] = { hands: 0, wins: 0, losses: 0, pushes: 0, busts: 0 };
            }
        };

        let totalWagered = 0;
        let totalPnl     = 0;
        let totalHandValue = 0;
        let playerBusts  = 0;
        let dealerBusts  = 0;
        let handsTracked = 0;

        // Track hand shuffle intervals
        let handsSinceReshuffle   = 0;
        let reshuffleIntervals    = [];
        let lastReshuffleHands    = 0;

        const origCheckShuffle = game.checkShuffle.bind(game);
        game.checkShuffle = function() {
            const before = this.shoe.cards.length;
            origCheckShuffle();
            const after = this.shoe.cards.length;
            if (after > before) {
                // A reshuffle occurred
                const interval = game.stats.handsPlayed - lastReshuffleHands;
                if (interval > 0) reshuffleIntervals.push(interval);
                lastReshuffleHands = game.stats.handsPlayed;
            }
        };

        for (let i = 0; i < numRounds; i++) {
            // Capture hand states BEFORE the round for breakdown tracking
            game.startRound();

            // Record starting hands
            const startingHands = game.players.map(p => ({
                key: getBreakdownKey(p.hands[0]),
                bet: p.hands[0].bet,
            }));

            // Play out via strategy engine
            while (game.phase === "PLAYER_TURN") {
                const action = StrategyEngine.getDecision(
                    game.currentPlayer,
                    game.currentHandIndex,
                    game.dealer.getUpCard(),
                    game.rules
                );
                game.handlePlayerAction(action);
            }

            // Dealer bust tracking
            if (game.dealer.getHandValue() > 21) dealerBusts++;

            // Per-player outcome tracking
            const dealerVal = game.dealer.getHandValue();
            game.players.forEach((player, pi) => {
                const startKey = startingHands[pi].key;
                ensureKey(startKey);

                player.hands.forEach(hand => {
                    const val = hand.getValue();
                    const bet = hand.bet;
                    totalWagered += bet;
                    totalHandValue += val;
                    handsTracked++;

                    handBreakdown[startKey].hands++;

                    if (val > 21) {
                        handBreakdown[startKey].busts++;
                        handBreakdown[startKey].losses++;
                        totalPnl -= bet;
                        playerBusts++;
                    } else if (hand.isBlackjack() && dealerVal !== 21) {
                        handBreakdown[startKey].wins++;
                        totalPnl += bet * payout;
                    } else if (dealerVal > 21) {
                        handBreakdown[startKey].wins++;
                        totalPnl += bet;
                    } else if (val > dealerVal) {
                        handBreakdown[startKey].wins++;
                        totalPnl += bet;
                    } else if (val < dealerVal) {
                        handBreakdown[startKey].losses++;
                        totalPnl -= bet;
                    } else {
                        handBreakdown[startKey].pushes++;
                    }
                });
            });

            if (onProgress && (i % chunkSize === 0)) {
                onProgress(Math.round((i / numRounds) * 100));
            }
        }

        if (onProgress) onProgress(100);

        const s = game.stats;
        const avgHandsPerDeck = reshuffleIntervals.length
            ? Math.round(reshuffleIntervals.reduce((a, b) => a + b, 0) / reshuffleIntervals.length)
            : s.handsPlayed;

        // EV as fraction of one unit bet: (wins - losses) / hands
        // This is the standard house edge calculation assuming flat unit bets
        const ev = s.handsPlayed > 0 ? (s.wins - s.losses) / s.handsPlayed : 0;

        // Sort breakdown by total hand count descending
        const breakdownArray = Object.entries(handBreakdown)
            .map(([key, data]) => {
                const [type, val] = key.split("_");
                return {
                    label: type === "pair"
                        ? `Pair of ${val}s`
                        : `${type === "soft" ? "Soft" : "Hard"} ${val}`,
                    sortKey: (type === "soft" ? 100 : type === "pair" ? 200 : 0) + parseInt(val),
                    ...data,
                    winPct:  data.hands > 0 ? (data.wins   / data.hands * 100) : 0,
                    lossPct: data.hands > 0 ? (data.losses / data.hands * 100) : 0,
                    pushPct: data.hands > 0 ? (data.pushes / data.hands * 100) : 0,
                    bustPct: data.hands > 0 ? (data.busts  / data.hands * 100) : 0,
                };
            })
            .sort((a, b) => a.sortKey - b.sortKey);

        return {
            roundsPlayed:    s.roundsPlayed,
            handsPlayed:     s.handsPlayed,
            wins:            s.wins,
            losses:          s.losses,
            pushes:          s.pushes,
            winRate:         s.handsPlayed > 0 ? s.wins   / s.handsPlayed : 0,
            lossRate:        s.handsPlayed > 0 ? s.losses / s.handsPlayed : 0,
            pushRate:        s.handsPlayed > 0 ? s.pushes / s.handsPlayed : 0,
            ev,
            avgHandValue:    handsTracked > 0 ? totalHandValue / handsTracked : 0,
            playerBustRate:  handsTracked > 0 ? playerBusts / handsTracked : 0,
            dealerBustRate:  s.roundsPlayed > 0 ? dealerBusts / s.roundsPlayed : 0,
            avgHandsPerDeck,
            handBreakdown:   breakdownArray,
        };
    }
}

export { Simulator };
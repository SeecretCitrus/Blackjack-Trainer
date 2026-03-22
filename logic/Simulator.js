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

    // ======================================================
    // Counting simulation — compares flat betting vs bet spreading
    // Returns stats with true count distribution
    // ======================================================
    static runCountingDetailed({
        numRounds    = 500000,
        numDecks     = 6,
        S17          = true,
        payout       = 1.5,
        countSystem  = 'hilo',
        spread       = 8,
        onProgress   = null,
    } = {}) {
        const rules = {
            dealerHitsSoft17: S17,
            doubleAfterSplit: true,
            resplitAces:      false,
            lateSurrender:    false,
            blackjackPayout:  payout,
        };

        // Card values for each system
        const HILO = { '2':1,'3':1,'4':1,'5':1,'6':1,'7':0,'8':0,'9':0,
                       '10':-1,'Jack':-1,'Queen':-1,'King':-1,'Ace':-1 };
        const OMEGA2 = { '2':1,'3':1,'4':2,'5':2,'6':2,'7':1,'8':0,'9':-1,
                         '10':-2,'Jack':-2,'Queen':-2,'King':-2,'Ace':0 };
        const cardVals = countSystem === 'omega2' ? OMEGA2 : HILO;

        // Bet spread function: true count → bet multiplier
        function getBetMult(tc) {
            const maxMult = spread;
            if (tc <= 1)  return 1;
            if (tc <= 2)  return Math.min(2, maxMult);
            if (tc <= 3)  return Math.min(Math.round(maxMult * 0.5), maxMult);
            if (tc <= 4)  return Math.min(Math.round(maxMult * 0.75), maxMult);
            return maxMult;
        }

        const game = new Game(1, numDecks, 'automatic', S17);
        game.rules = { ...rules, minBet: 1 };

        let runningCount = 0;
        let totalNet     = 0;
        let totalWagered = 0;
        let wins = 0, losses = 0, pushes = 0;
        let handsPlayed  = 0;

        // True count distribution: key = floored TC, value = { hands, wins, losses, net }
        const tcDist = {};

        // Hook shoe to track count
        const origDeal = game.shoe.deal.bind(game.shoe);
        game.shoe.deal = function() {
            const card = origDeal();
            if (card) {
                const v = cardVals[card.rank] ?? 0;
                runningCount += v;
            }
            return card;
        };

        const origCheck = game.checkShuffle.bind(game);
        game.checkShuffle = function() {
            const before = this.shoe.cards.length;
            origCheck();
            if (this.shoe.cards.length > before) {
                runningCount = 0;
                // Re-hook after new shoe
                const od = this.shoe.deal.bind(this.shoe);
                this.shoe.deal = function() {
                    const card = od();
                    if (card) runningCount += (cardVals[card.rank] ?? 0);
                    return card;
                };
            }
        };

        const CHUNK = 5000;
        for (let i = 0; i < numRounds; i++) {
            // Calculate true count before this hand
            const cardsLeft    = game.shoe.cards.length;
            const decksLeft    = Math.max(0.5, cardsLeft / 52);
            const trueCount    = runningCount / decksLeft;
            const tcBucket     = Math.max(-5, Math.min(6, Math.floor(trueCount)));
            const betMult      = getBetMult(trueCount);
            const bet          = betMult; // unit bets

            // Force player bet
            game.players[0].currentBet = bet;
            game.players[0].balance    = bet + 1000; // always enough

            game.startRound();

            while (game.phase === 'PLAYER_TURN') {
                const action = StrategyEngine.getDecision(
                    game.currentPlayer, game.currentHandIndex,
                    game.dealer.getUpCard(), game.rules
                );
                game.handlePlayerAction(action);
            }

            // Tally results
            for (const player of game.players) {
                for (const hand of player.hands) {
                    handsPlayed++;
                    totalWagered += hand.bet;
                    if (!tcDist[tcBucket]) tcDist[tcBucket] = { hands: 0, net: 0 };
                    tcDist[tcBucket].hands++;

                    let net = 0;
                    if (hand.result === 'win')       { net = +hand.bet; wins++;   }
                    if (hand.result === 'blackjack') { net = +Math.floor(hand.bet * payout); wins++; }
                    if (hand.result === 'loss')      { net = -hand.bet; losses++; }
                    if (hand.result === 'push')      { pushes++; }
                    totalNet += net;
                    tcDist[tcBucket].net += net;
                }
            }

            if (onProgress && i % CHUNK === 0) {
                onProgress(Math.round(i / numRounds * 100));
            }
        }

        if (onProgress) onProgress(100);

        // Compute EV per bucket
        for (const k of Object.keys(tcDist)) {
            const d = tcDist[k];
            d.ev = d.hands > 0 ? d.net / d.hands : 0;
        }

        const ev = totalWagered > 0 ? totalNet / totalWagered : 0;
        return {
            handsPlayed, wins, losses, pushes,
            totalNet, totalWagered,
            winRate:  handsPlayed > 0 ? wins   / handsPlayed : 0,
            lossRate: handsPlayed > 0 ? losses / handsPlayed : 0,
            pushRate: handsPlayed > 0 ? pushes / handsPlayed : 0,
            ev,
            tcDistribution: tcDist,
            numDecks,
        };
    }
}

export { Simulator };
import { Shoe } from './Shoe.js';
import { Player } from './Player.js';
import { Dealer } from './Dealer.js';
import { Hand } from './Hand.js';
import { defaultRules } from './Rules.js';

// ======================================================
// GAME ENGINE
// ======================================================
class Game {
    constructor(numPlayers, numDecks, mode = "automatic", S17 = false) {
        this.numDecks  = numDecks;
        this.shoe      = new Shoe(numDecks);
        this.shoe.shuffle();
        this.players   = [];
        for (let i = 0; i < numPlayers; i++) {
            this.players.push(new Player("Player " + (i + 1)));
        }
        this.dealer  = new Dealer();
        this.mode    = mode;
        this.silent  = mode === "automatic";
        this.maxSplits = 3;

        this.penetrationMax = 75;
        this.penetrationMin = 60;
        this.penetration    = (Math.random() * (this.penetrationMax - this.penetrationMin + 1) + this.penetrationMin) / 100;
        this.startingDeckSize = numDecks * 52;

        this.currentHandIndex   = 0;
        this.currentPlayerIndex = 0;
        this.currentPlayer      = null;

        this.phase = "BETTING";

        this.rules = {
            ...defaultRules,
            dealerHitsSoft17: S17,
            minBet: 15,
        };

        this.stats = {
            roundsPlayed: 0,
            handsPlayed:  0,
            wins:         0,
            losses:       0,
            pushes:       0,
        };
    }

    // ======================================================
    // Full automatic round (simulation mode)
    // ======================================================
    playFullRound(strategyEngine = null) {
        this.startRound();
        while (this.phase === "PLAYER_TURN") {
            const action = strategyEngine
                ? strategyEngine.getDecision(this.currentPlayer, this.currentHandIndex, this.dealer.getUpCard(), this.rules)
                : (() => { throw new Error("No strategy engine provided"); })();
            this.handlePlayerAction(action);
        }
        this.stats.roundsPlayed++;
        return this.buildRoundResult();
    }

    buildRoundResult() {
        return {
            dealerTotal:  this.dealer.getHandValue(),
            playerTotals: this.players.map(p => p.hands.map((_, i) => p.getHandValue(i))),
        };
    }

    // Active (non-sitting-out) players
    activePlayers() {
        return this.players.filter(p => !p.sittingOut);
    }

    // ======================================================
    // Initial deal
    // ======================================================
    initialDeal() {
        for (let round = 0; round < 2; round++) {
            for (const player of this.activePlayers()) {
                player.getCard(this.shoe.deal());
            }
            const dealerCard = this.shoe.deal();
            this.dealer.getCard(dealerCard);
            if (!this.silent) console.log("Dealer dealt: " + dealerCard.rank + " of " + dealerCard.suit);
        }
    }

    // ======================================================
    // Naturals check
    // ======================================================
    checkNaturals() {
        const dealerBJ = this.dealer.hands[0].cards.length === 2 && this.dealer.getHandValue() === 21;

        for (const player of this.activePlayers()) {
            const hand     = player.hands[0];
            const playerBJ = hand.cards.length === 2 && player.getHandValue(0) === 21;

            if (dealerBJ && playerBJ) {
                if (!this.silent) console.log("Push: both have blackjack");
                hand.isFinished = true;
                hand.result     = "push";
                this.stats.pushes++;
                this.stats.handsPlayed++;
            } else if (playerBJ) {
                if (!this.silent) console.log(player.name + " has blackjack!");
                hand.isFinished = true;
                hand.result     = "blackjack";
                this.stats.wins++;
                this.stats.handsPlayed++;
            } else if (dealerBJ) {
                if (!this.silent) console.log("Dealer has blackjack.");
                hand.isFinished = true;
                hand.result     = "loss";
                this.stats.losses++;
                this.stats.handsPlayed++;
            }
        }

        if (dealerBJ) this.phase = "ROUND_OVER";
    }

    // ======================================================
    // Reset hands between rounds
    // ======================================================
    resetHands() {
        for (const player of this.players) {
            player.resetHands();
        }
        this.dealer.resetHands();
    }

    // ======================================================
    // Start a round
    // ======================================================
    startRound() {
        this.phase              = "BETTING";
        this.currentHandIndex   = 0;
        this.currentPlayerIndex = 0;

        this.checkShuffle();
        this.resetHands();

        // Place bets and check sit-out
        for (const player of this.players) {
            if (player.balance < this.rules.minBet) {
                player.sittingOut = true;
            } else {
                player.sittingOut = false;
                // In automatic mode use fixed $10 bet for simulation purity
                const betAmount = this.mode === "automatic" ? 10 : player.currentBet;
                player.placeBet(betAmount, this.rules.minBet);
            }
        }

        const active = this.activePlayers();
        if (active.length === 0) {
            this.phase = "ROUND_OVER";
            return;
        }

        this.initialDeal();
        this.checkNaturals();

        if (this.phase === "ROUND_OVER") {
            this.settleAllBets();
            return;
        }

        // Find first active player
        this.currentPlayerIndex = 0;
        while (
            this.currentPlayerIndex < this.players.length &&
            this.players[this.currentPlayerIndex].sittingOut
        ) {
            this.currentPlayerIndex++;
        }

        if (this.currentPlayerIndex >= this.players.length) {
            this.currentPlayer = null;
            this.phase = "ROUND_OVER";
            return;
        }

        this.currentPlayer = this.players[this.currentPlayerIndex];
        this.phase = "PLAYER_TURN";
    }

    // ======================================================
    // Advance to next hand / player
    // Find the next hand that hasn't been played yet.
    // We scan all hands so right-first split order works correctly.
    // ======================================================
    nextTurn() {
        const player = this.currentPlayer;

        // Find next unfinished hand (any index, not just currentHandIndex+1)
        const nextIndex = player.hands.findIndex(
            (h, i) => i !== this.currentHandIndex && !h.isFinished && h.cards.length > 0
        );

        // Also check for hands with only 1 card (waiting for second card after split)
        const pendingIndex = player.hands.findIndex(
            (h, i) => i !== this.currentHandIndex && h.cards.length === 1
        );

        const targetIndex = pendingIndex !== -1 ? pendingIndex :
                            nextIndex    !== -1 ? nextIndex    : -1;

        if (targetIndex !== -1) {
            this.currentHandIndex = targetIndex;
            const targetHand = player.hands[targetIndex];
            // Deal second card if this hand only has one (came from a split)
            if (targetHand.cards.length === 1) {
                const newCard = this.shoe.deal();
                targetHand.addCard(newCard);
                if (!this.silent) console.log(player.name + " hand " + (targetIndex + 1) + " receives: " + newCard.rank);
                if (targetHand.isSplitAces) {
                    targetHand.isFinished = true;
                    this.nextTurn();
                }
            }
            return;
        }

        // All hands for this player are done — advance to next active player
        this.currentHandIndex = 0;
        this.currentPlayerIndex++;
        while (
            this.currentPlayerIndex < this.players.length &&
            this.players[this.currentPlayerIndex].sittingOut
        ) {
            this.currentPlayerIndex++;
        }

        if (this.currentPlayerIndex < this.players.length) {
            this.currentPlayer = this.players[this.currentPlayerIndex];
        } else {
            this.currentPlayer = null;
            this.finishDealerTurn();
            this.checkWinner();
            this.settleAllBets();
            this.phase = "ROUND_OVER";
        }
    }

    // ======================================================
    // Handle a player action
    // ======================================================
    handlePlayerAction(action) {
        if (this.phase !== "PLAYER_TURN") return;

        const player    = this.currentPlayer;
        const handIndex = this.currentHandIndex;

        if (action === "H") {
            this.hit(player, handIndex);
            if (player.getHandValue(handIndex) >= 21) {
                player.hands[handIndex].isFinished = true;
            }
            if (!player.hands[handIndex].isFinished) return;
        }

        if (action === "S") {
            player.hands[handIndex].isFinished = true;
        }

        if (action === "D") {
            if (player.canDouble(handIndex, this.rules)) {
                const extraBet = player.hands[handIndex].bet;
                player.balance -= extraBet;
                player.hands[handIndex].bet *= 2;
                player.hands[handIndex].isDoubled = true;
                this.hit(player, handIndex);
                player.hands[handIndex].isFinished = true;
            }
        }

        if (action === "P") {
            if (player.canSplit(handIndex, this.rules)) {
                this.split(handIndex);
                return;
            }
        }

        this.nextTurn();
    }

    // ======================================================
    // Dealer plays out
    // ======================================================
    finishDealerTurn() {
        while (this.dealer.shouldHit(this.rules.dealerHitsSoft17)) {
            if (!this.silent) console.log("Dealer hits. Value: " + this.dealer.getHandValue());
            this.hit(this.dealer);
        }
    }

    // ======================================================
    // Determine winners and record stats
    // ======================================================
    checkWinner() {
        const dealerValue = this.dealer.getHandValue();
        if (!this.silent) console.log("Dealer final: " + dealerValue);

        for (const player of this.activePlayers()) {
            for (let h = 0; h < player.hands.length; h++) {
                const hand  = player.hands[h];
                const value = player.getHandValue(h);

                if (hand.result) {
                    // Already resolved (naturals)
                    this.stats.handsPlayed++;
                    continue;
                }

                if (value > 21) {
                    hand.result = "loss";   this.stats.losses++;
                } else if (dealerValue > 21) {
                    hand.result = "win";    this.stats.wins++;
                } else if (value > dealerValue) {
                    hand.result = "win";    this.stats.wins++;
                } else if (value < dealerValue) {
                    hand.result = "loss";   this.stats.losses++;
                } else {
                    hand.result = "push";   this.stats.pushes++;
                }

                this.stats.handsPlayed++;
            }
        }
    }

    // ======================================================
    // Settle bets after round
    // ======================================================
    settleAllBets() {
        for (const player of this.activePlayers()) {
            for (let h = 0; h < player.hands.length; h++) {
                const result = player.hands[h].result;
                if (result) player.settleBet(h, result, this.rules.blackjackPayout);
            }
        }
    }

    // ======================================================
    // Hit
    // ======================================================
    hit(player, handIndex = 0) {
        const newCard = this.shoe.deal();
        player.getCard(newCard, handIndex);
        if (!this.silent) console.log(player.name + " hits: " + newCard.rank + " of " + newCard.suit);
        if (player.getHandValue(handIndex) > 21 && !this.silent) {
            console.log(player.name + " busts with " + player.getHandValue(handIndex));
        }
        if (player.hands[handIndex].isSplitAces && !this.rules.resplitAces) {
            player.hands[handIndex].isFinished = true;
        }
    }

    // ======================================================
    // Split
    // ======================================================
    split(handIndex) {
        const player = this.currentPlayer;
        if (player.hands.length >= this.maxSplits + 1) return;

        const handToSplit = player.hands[handIndex];
        const cardToMove  = handToSplit.cards.pop();
        const newHand     = new Hand(handToSplit.bet);
        newHand.addCard(cardToMove);

        // Deduct extra stake for split hand
        player.balance -= newHand.bet;

        const isAceSplit = cardToMove.rank === "Ace";
        handToSplit.addCard(this.shoe.deal());

        if (isAceSplit) {
            handToSplit.isSplitAces = true;
            newHand.isSplitAces     = true;
            handToSplit.isFinished  = true;
        }

        player.hands.splice(handIndex + 1, 0, newHand);

        if (!this.silent) console.log(player.name + " splits.");

        if (isAceSplit) {
            this.nextTurn();
        } else {
            // Advance to the RIGHT (new) hand first — play right hand before left
            this.currentHandIndex = handIndex + 1;
            // Deal second card to the right hand now
            const rightHand = player.hands[this.currentHandIndex];
            if (rightHand.cards.length === 1) {
                rightHand.addCard(this.shoe.deal());
            }
        }
    }

    // ======================================================
    // Shuffle check
    // ======================================================
    checkShuffle() {
        const remaining = this.shoe.cards.length;
        if (remaining / this.startingDeckSize < (1 - this.penetration)) {
            if (!this.silent) console.log("Reshuffling shoe...");
            this.shoe = new Shoe(this.numDecks);
            this.shoe.shuffle();
        }
    }
}

export { Game };
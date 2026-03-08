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
        this.numDecks = numDecks;
        this.shoe = new Shoe(numDecks);
        this.shoe.shuffle();
        this.players = [];
        for (let i = 0; i < numPlayers; i++) {
            this.players.push(new Player("Player " + (i + 1)));
        }   
        this.dealer = new Dealer();
        this.mode = mode;
        this.silent = mode === "automatic"; // If true, suppresses console logs for card dealings and actions
        this.maxSplits = 3; // Limit to 3 splits (4 hands total)
        this.penetrationMax = 75;
        this.penetrationMin = 60;
        this.penetration = (Math.random() * (this.penetrationMax - this.penetrationMin + 1) + this.penetrationMin) / 100; // Average deck size before reshuffling
        this.startingDeckSize = numDecks * 52;

        this.currentHandIndex = 0;
        this.currentPlayerIndex = 0;

        this.phase = "BETTING";

        this.rules = { ...defaultRules, dealerHitsSoft17: S17 };

        this.stats = {
            roundsPlayed: 0,
            handsPlayed: 0,
            wins: 0,
            losses: 0,
            pushes: 0
        };
    }

    playFullRound(strategyEngine = null) {
        this.startRound();
        //play all player hands
        while (this.phase === "PLAYER_TURN") {
            let player = this.currentPlayer;
            let action;
            if (strategyEngine) {
                action = strategyEngine.getDecision(player, this.currentHandIndex, this.dealer.getUpCard(), this.rules);
            } else {
                throw new Error("No strategy engine provided for autoplay");
            }
            this.handlePlayerAction(action);
        }
        //dealer plays and round finishes automatically after last player hand is done
        this.stats.roundsPlayed++;
        return this.buildRoundResult();
    }

    buildRoundResult() {
        return {
            dealerTotal: this.dealer.getHandValue(),
            playerTotals: this.players.map(p => p.hands.map((_, i) => p.getHandValue(i))),
        };
    }

    initialDeal() {
        for (let round = 0; round < 2; round++) {
            for (let player of this.players) {
                let card = this.shoe.deal();
                player.getCard(card);
            }
            // Dealer gets a card but only shows the first one
            let dealerCard = this.shoe.deal();
            this.dealer.getCard(dealerCard);
            if (!this.silent) {
                console.log("Dealer was dealt: " + dealerCard.rank + " of " + dealerCard.suit);
            }
        }
    }

    checkNaturals() {
        const dealerBlackjack =
            this.dealer.hands[0].cards.length === 2 &&
            this.dealer.getHandValue() === 21;

        for (let player of this.players) {
            const playerHand = player.hands[0];
            const playerBlackjack =
                playerHand.cards.length === 2 &&
                player.getHandValue(0) === 21;

            if (dealerBlackjack && playerBlackjack && !this.silent) {
                console.log("Push: both have blackjack");
                playerHand.isFinished = true;
                this.stats.pushes++;
                this.stats.handsPlayed++;
            } else if (playerBlackjack && !this.silent) {
                console.log(player.name + " has blackjack!");
                playerHand.isFinished = true;
                this.stats.wins++;
                this.stats.handsPlayed++;
            } else if (dealerBlackjack && !this.silent) {
                console.log("Dealer has blackjack.");
                playerHand.isFinished = true;
                this.stats.losses++;
                this.stats.handsPlayed++;
            }
        }

        if (dealerBlackjack) {
            this.phase = "ROUND_OVER";
        }
    }

    resetHands() {
        for (let player of this.players) {
            player.resetHands();
        }
        this.dealer.resetHands();
    }

    /*checkPlays() {
    }*/

    startRound() {
        this.phase = "BETTING";
        this.currentHandIndex = 0;
        this.currentPlayerIndex = 0;
        this.currentPlayer = this.players[0];

        this.checkShuffle();
        this.resetHands();
        for (let player of this.players) {
            player.currentBet = 10; // temporary fixed bet
            player.hands[0].bet = player.currentBet;
        }
        this.initialDeal();
            // Check for dealer blackjack immediately after the initial deal
        this.checkNaturals();
        if (this.phase === "ROUND_OVER") {
            this.checkWinner();   // settle the round
            return;
        }
        this.phase = "PLAYER_TURN";
    }

    nextTurn() {
        let player = this.currentPlayer;
        //move to next hand first
        if (this.currentHandIndex < player.hands.length - 1) {
            this.currentHandIndex++;
            return;
        }
        //reset hand index and move to next player
        this.currentHandIndex = 0;
        this.currentPlayerIndex++;
        if (this.currentPlayerIndex < this.players.length) {
            this.currentPlayer = this.players[this.currentPlayerIndex];
        } else {
            this.currentPlayer = null;
            this.finishDealerTurn();
            this.checkWinner();
            this.phase = "ROUND_OVER";
        }
    }

    handlePlayerAction(action) {
        if (this.phase !== "PLAYER_TURN") return;

        const player = this.currentPlayer;
        const handIndex = this.currentHandIndex;

        if (action === "H") {
            this.hit(player, handIndex);
            if (player.getHandValue(handIndex) > 21) {
                player.hands[handIndex].isFinished = true;
            }
            if (!player.hands[handIndex].isFinished) return;
        }

        if (action === "S") {
            player.hands[handIndex].isFinished = true;
        }

        if (action === "D") {
            if (player.canDouble(handIndex, this.rules)) {
                player.hands[handIndex].bet *= 2;
                player.hands[handIndex].isDoubled = true;
                this.hit(player, handIndex);
                player.hands[handIndex].isFinished = true;
            }
        }

        if (action === "P") {
            if (player.canSplit(handIndex, this.rules)) {
                this.split(handIndex);
                return; // stay on same player
            }
        }

        this.nextTurn();
    }

    finishDealerTurn() {
        let dealer = this.dealer;
        while (dealer.shouldHit(this.rules.dealerHitsSoft17)) {
            if (!this.silent) {
                console.log("Dealer's hand value: " + dealer.getHandValue() + ". Dealer hits.");
            }
            this.hit(dealer);
        }
    }

    checkWinner() {
        let dealer = this.dealer;
        let dealerValue = dealer.getHandValue();
        if (!this.silent) {
            console.log("Dealer's hand value: " + dealerValue);
        }

        for (let player of this.players) {
            for (let h = 0; h < player.hands.length; h++) {
                let value = player.getHandValue(h);

                if (value > 21) {
                    this.stats.losses++;
                }
                else if (dealerValue > 21) {
                    this.stats.wins++;
                }
                else if (value > dealerValue) {
                    this.stats.wins++;
                }
                else if (value < dealerValue) {
                    this.stats.losses++;
                }
                else {
                    this.stats.pushes++;
                }

                this.stats.handsPlayed++;
            }
        }
    }

    hit(player, handIndex = 0) {
        let newCard = this.shoe.deal();
        player.getCard(newCard, handIndex);
        if (!this.silent) {
            console.log(player.name + " hits and gets: " + newCard.rank + " of " + newCard.suit);
        }
        if (player.getHandValue(handIndex) > 21 && !this.silent) {
            console.log(player.name + " busts with a hand value of " + player.getHandValue(handIndex));
        }
        if (player.hands[handIndex].isSplitAces && !this.rules.resplitAces) {
            player.hands[handIndex].isFinished = true; // Automatically finish the hand if it was split aces
        }
    }

    split(handIndex) {
        const player = this.currentPlayer;
        if (player.hands.length >= this.maxSplits + 1) {
            if (!this.silent) {
                console.log(player.name + " cannot split further.");
            }
            return;
        }
        const handToSplit = player.hands[handIndex];
        const cardToMove = handToSplit.cards.pop();

        const newHand = new Hand(handToSplit.bet);
        newHand.addCard(cardToMove);

        const isAceSplit = cardToMove.rank === "Ace";
        handToSplit.addCard(this.shoe.deal());
        newHand.addCard(this.shoe.deal());
        if (isAceSplit) {
            handToSplit.isSplitAces = true;
            newHand.isSplitAces = true;

            handToSplit.isFinished = true;
            newHand.isFinished = true;
        }
        player.hands.splice(handIndex + 1, 0, newHand);
        if (!this.silent) {
            console.log(player.name + " splits. First hand: " + player.hands[handIndex].cards[0].rank + " of " + player.hands[handIndex].cards[0].suit + ". New hand: " + newHand.cards[0].rank + " of " + newHand.cards[0].suit);
        }
    }

    checkShuffle() {
        const remaining = this.shoe.cards.length;
        if (remaining / this.startingDeckSize < (1 - this.penetration)) {
            console.log("Reshuffling shoe...");
            this.shoe = new Shoe(this.numDecks);
            this.shoe.shuffle();
        }
    }
}

export { Game };
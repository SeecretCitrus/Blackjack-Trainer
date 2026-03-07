console.log("JavaScript is connected!");
//---------------------Array managing
/*let numbers = [5, 10, 15, 20, 25];

for (let i = 0; i < numbers.length; i++) {
    console.log("Index:", i, "Value:", numbers[i]);
}*/
//--------------------classes
class Player {
    constructor(name) {
        this.name = name;
        this.hands = [];
        this.money = 1000; // Starting money for betting
        this.currentBet = 0; // Current bet for the round
    }

    resetHands() {
        this.hands = [new Hand()];
    }

    getCard(card, handIndex = 0) {
        if (!this.hands[handIndex]) {
            throw new Error("Invalid hand index for player " + this.name);
        }

        this.hands[handIndex].addCard(card);
    }

    sayHello() {
        console.log("Hello, I am " + this.name);
    }


    getHandValue(handIndex = 0) {
        return this.hands[handIndex].getValue();
    }

    isSoftHand(handIndex = 0) {
        return this.hands[handIndex].isSoft();
    }

    canDouble(handIndex = 0, rules) {
        if (this.hands.length > 1 && !rules.doubleAfterSplit) return false; // Cannot double if rules don't allow double after split and player has multiple hands
        return this.hands[handIndex].cards.length === 2;
    }
    //maybe change later if I want to include equal value cards that aren't pairs but for now this is fine
    canSplit(handIndex = 0, rules) {
        if (this.hands.length >= 4) return false; // Limit to 3 splits (4 hands total)
        if (this.hands[handIndex].isSplitAces && !rules.resplitAces) return false; // Cannot split if the hand was already split aces
        let hand = this.hands[handIndex];
        return hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank;
    }
}

//----------------------end of part 1
//-------------the Card class i created
class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    getValue() {
        if (this.rank === "Jack" || this.rank === "Queen" || this.rank === "King") {
            return 10;
        }
        if (this.rank === "Ace") {
            return 11;
        }
        return Number(this.rank);
    }
}
//--------------------------end of part 2
//---------------------- HAND CLASS
class Hand {
    constructor(bet = 0) {
        this.cards = [];
        this.bet = bet;
        this.isFinished = false;
        this.isDoubled = false;
        this.isSplitAces = false;
    }

    addCard(card) {
        this.cards.push(card);
    }

    getValue() {
        let total = 0;
        let aceCount = 0;

        for (let card of this.cards) {
            total += card.getValue();
            if (card.rank === "Ace") {
                aceCount++;
            }
        }

        while (total > 21 && aceCount > 0) {
            total -= 10;
            aceCount--;
        }

        return total;
    }

    isSoft() {
        let total = 0;
        let aceCount = 0;

        for (let card of this.cards) {
            total += card.getValue();
            if (card.rank === "Ace") aceCount++;
        }

        while (total > 21 && aceCount > 0) {
            total -= 10;
            aceCount--;
        }

        return aceCount > 0;
    }

    isBlackjack() {
        return this.cards.length === 2 && this.getValue() === 21;
    }

    isBust() {
        return this.getValue() > 21;
    }
}
// ======================================================
// DECK CLASS
// ======================================================
class Deck {
    constructor(numDecks = 1) {
        const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
        const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10",
                       "Jack", "Queen", "King", "Ace"];

        this.cards = [];

        for (let deck = 0; deck < numDecks; deck++) {
            for (let outer = 0; outer < suits.length; outer++) {
                for (let inner = 0; inner < ranks.length; inner++) {
                    this.cards.push(new Card(suits[outer], ranks[inner]));
                }
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        return this.cards.pop();
    }
}
//------------------end of part 4
// ======================================================
// GAME ENGINE
// ======================================================
class Game {
    constructor(numPlayers, numDecks, mode = "automatic", S17 = false) {
        this.numDecks = numDecks;
        this.deck = new Deck(numDecks);
        this.deck.shuffle();
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

        this.phase = "BETTING";

        this.rules = {
            dealerHitsSoft17: S17,
            doubleAfterSplit: true,
            resplitAces: false,
            lateSurrender: true,
            blackjackPayout: 1.5
        };

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
                let card = this.deck.deal();
                player.getCard(card);
            }
            // Dealer gets a card but only shows the first one
            let dealerCard = this.deck.deal();
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
        let newCard = this.deck.deal();
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
        handToSplit.addCard(this.deck.deal());
        newHand.addCard(this.deck.deal());
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
        const remaining = this.deck.cards.length;
        if (remaining / this.startingDeckSize < (1 - this.penetration)) {
            console.log("Reshuffling shoe...");
            this.deck = new Deck(this.numDecks);
            this.deck.shuffle();
        }
    }
}

//-----------------------end of part 5------END GAME
//dealer class which i need to finish later but i just want to get it in here for now
class Dealer extends Player {
    constructor() {
        super("Dealer");
        this.resetHands();
    }

    shouldHit(dealerHitsSoft17) {
        if (dealerHitsSoft17) {
            return this.getHandValue() < 17 || (this.getHandValue() === 17 && this.isSoftHand());
        } else {
            return this.getHandValue() < 17;
        }
    }

    getUpCard() {
        return this.hands[0].cards[0]; // Assuming the dealer's hand is always at index 0 and the first card is the up card
    }
}

const S17HardTable = {
    16 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    12 : {2: "H", 3: "H", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    11 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "D", 11: "H"},
    10 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "H", 11: "H"},
    9 : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};
const H17HardTable = {//only {11 : 11} is different
    16 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "S", 3: "S", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    12 : {2: "H", 3: "H", 4: "S", 5: "S", 6: "S", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    11 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "D", 11: "D"},
    10 : {2: "D", 3: "D", 4: "D", 5: "D", 6: "D", 7: "D", 8: "D", 9: "D", 10: "H", 11: "H"},
    9 : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};
const S17SoftTable = {
    18 : {2: "S", 3: "Ds", 4: "Ds", 5: "Ds", 6: "Ds", 7: "S", 8: "S", 9: "H", 10: "H", 11: "H"},
    17 : {2: "H", 3: "D", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    16 : {2: "H", 3: "H", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    15 : {2: "H", 3: "H", 4: "D", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    14 : {2: "H", 3: "H", 4: "H", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    13 : {2: "H", 3: "H", 4: "H", 5: "D", 6: "D", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
};

const SplitTable = {
    11 : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "Y", 9: "Y", 10: "Y", 11: "Y"},
    10 : {2: "N", 3: "N", 4: "N", 5: "N", 6: "N", 7: "N", 8: "N", 9: "N", 10: "N", 11: "N"},
    9 : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "N", 8: "Y", 9: "Y", 10: "N", 11: "N"},
    8 : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "Y", 9: "Y", 10: "Y", 11: "Y"},
    7 : {2: "Y", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "H", 9: "H", 10: "H", 11: "H"},
    6 : {2: "Y/n", 3: "Y", 4: "Y", 5: "Y", 6: "Y", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    5 : {2: "N", 3: "N", 4: "N", 5: "N", 6: "N", 7: "N", 8: "N", 9: "N", 10: "H", 11: "H"},
    4 : {2: "N", 3: "N", 4: "N", 5: "Y/n", 6: "Y/n", 7: "H", 8: "H", 9: "H", 10: "H", 11: "H"},
    3 : {2: "Y/n", 3: "Y/n", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "H", 9: "H", 10: "H", 11: "H"},
    2 : {2: "Y/n", 3: "Y/n", 4: "Y", 5: "Y", 6: "Y", 7: "Y", 8: "H", 9: "H", 10: "H", 11: "H"},
};


class StrategyEngine {
    static getDecision(player, handIndex, dealerUpCard, rules) {
        let playerTotal = player.getHandValue(handIndex);
        let dealerValue = dealerUpCard.getValue();
        let isSoft = player.isSoftHand(handIndex);
        if (player.hands[handIndex].isFinished) {
            return "S"; // If the hand is already finished (e.g., split aces), always stand
        }

        if (player.canSplit(handIndex, rules)) {
            const pairValue = player.hands[handIndex].cards[0].getValue();
            if (SplitTable[pairValue]) {
                const decision = SplitTable[pairValue][dealerValue];
                if (decision === "Y" || decision === "Y/n") return "P";
            }
        }

        let tableDecision;

        if (isSoft) {
            if (S17SoftTable[playerTotal]) {
                tableDecision = S17SoftTable[playerTotal][dealerValue];
            }
        } else {
            const hardTable = rules.dealerHitsSoft17 ? H17HardTable : S17HardTable;
            if (hardTable[playerTotal]) {
                tableDecision = hardTable[playerTotal][dealerValue];
            }
        }
        if (tableDecision === "D" || tableDecision === "Ds") {
            if (player.canDouble(handIndex, rules)) {
                return "D";
            } else if (tableDecision === "Ds") {
                return "S"; // If double is recommended but not allowed, stand if it's a "Ds" decision, otherwise hit
            }
        }

        if (isSoft && playerTotal >= 19) return "S";
        if (!isSoft && playerTotal >= 17) return "S";
        if (!isSoft && playerTotal <= 8) return "H";

        return "H"; // Default to hit if no specific strategy is found
    }
}


let game;

document.getElementById("startBtn").addEventListener("click", () => {
    game = new Game(4, 6, "manual", false);
    game.startRound();
    renderGame();
});

document.getElementById("hitBtn").addEventListener("click", () => {
    handleManualAction("H");
    renderGame();
});

document.getElementById("standBtn").addEventListener("click", () => {
    handleManualAction("S");
    renderGame();
});

document.getElementById("doubleBtn").addEventListener("click", () => {
    handleManualAction("D");
    renderGame();
});

document.getElementById("splitBtn").addEventListener("click", () => {
    handleManualAction("P");
    renderGame();
});


function updateButtons() {
    const disabled = game.currentPlayer === null;
    document.getElementById("hitBtn").disabled = disabled;
    document.getElementById("standBtn").disabled = disabled;
    document.getElementById("doubleBtn").disabled = disabled;
    document.getElementById("splitBtn").disabled = disabled;
}

// function manualHit() {
//     game.handlePlayerAction("H");
//     renderGame();
// }
function suitSymbol(suit) {
    if (suit === "Hearts") return "♥";
    if (suit === "Diamonds") return "♦";
    if (suit === "Clubs") return "♣";
    if (suit === "Spades") return "♠";
}

function renderGame() {
    const gameDiv = document.getElementById("game");
    gameDiv.innerHTML = "";
    //dealer
    let dealerHTML = "<h2>Dealer's Hand:</h2>";
    if (game.dealer.hands.length > 0 && game.dealer.hands[0].cards.length > 0) {
        // If round is still active → hide dealer hole card
        if (game.currentPlayer !== null) {
            dealerHTML += "<div class='hand'>";
            dealerHTML += game.dealer.hands[0].cards[0].rank + " " +
                        suitSymbol(game.dealer.hands[0].cards[0].suit) +
                        "<br>🂠 Hidden Card";
            dealerHTML += "</div>";
        }
        else {
            // Round over → show dealer full hand + total
            dealerHTML += "<div class='hand'>";
            dealerHTML += "Total: " + game.dealer.getHandValue() + "<br>";
            for (let card of game.dealer.hands[0].cards) {
                dealerHTML += card.rank + " " +
                            suitSymbol(card.suit) + "<br>";
            }
            dealerHTML += "</div>";
        }
    }

    gameDiv.innerHTML += dealerHTML;

    //players
    for (let i = 0; i < game.players.length; i++) {
        let player = game.players[i];
        let isCurrent = player === game.currentPlayer;

        let playerHTML = "<div class='playerArea'><h2>" + player.name;
        if (isCurrent) playerHTML += " <===== YOUR TURN";
        playerHTML += "</h2>";

        for (let h = 0; h < player.hands.length; h++) {

            let total = player.getHandValue(h);
            let isCurrentHand = isCurrent && h === game.currentHandIndex;
            playerHTML += "<div class='hand";
            if (isCurrentHand) {
                playerHTML += " activeHand";
            }
            playerHTML += "'>";
            playerHTML += "<strong>Hand " + (h + 1) + " (Value: " + total + ")</strong><br>";
            if (isCurrentHand) {
                playerHTML += "ACTIVE HAND<br>";
            }
            for (let card of player.hands[h].cards) {
                playerHTML += card.rank + " " + suitSymbol(card.suit) + "<br>";
            }
            playerHTML += "</div>";
        }
        playerHTML += "</div>";
        gameDiv.innerHTML += playerHTML;
    }
    // Update button states based on current player
    updateButtons();
}

function handleManualAction(action) {
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
    renderGame();
}

document.getElementById("simulateBtn").addEventListener("click", () => {
    game = new Game(1, 6, "automatic", true);

    for (let i = 0; i < 100000; i++) {
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
});











# ♠️ Blackjack Trainer & Simulator

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

A comprehensive blackjack training tool and simulator for learning perfect strategy and analyzing gameplay through statistical simulation.

## Features

- **Interactive Training Mode** - Play hands with real-time feedback on your decisions against basic strategy
- **Automatic Simulation** - Run thousands of hands to analyze statistics and strategy effectiveness
- **Configurable Rules** - Toggle dealer hits on soft 17 (S17/H17)
- **Multi-Hand Support** - Practice splitting, doubling, and complex hand management
- **Visual Table Layout** - Clean casino-style interface with colored cards

## Directory Structure:
```
Blackjack-Trainer/
├── README.md
├── engine/
│   ├── Card.js
│   ├── Dealer.js
│   ├── Game.js
│   ├── Hand.js
│   ├── Player.js
│   ├── Rules.js
│   └── Shoe.js
├── index.html
├── logic/
│   ├── Simulator.js
│   └── StrategyEngine.js
├── script.js
├── style.css
└── ui/
    ├── CardRenderer.js
    ├── Controls.js
    └── TableView.js
```


## GitHub Website:

https://seecretcitrus.github.io/Blackjack-Trainer/



## How to Use
Interactive Mode
Click Start Game to begin a new round

The interface highlights your current hand in gold

Make decisions using the buttons:

Hit - Take another card

Stand - Keep your current hand

Double - Double your bet and receive one card

Split - Split pairs into separate hands

Check the browser console (F12) for feedback on whether your play matches basic strategy

Simulation Mode
Click Simulation to run 100,000 hands automatically. Results display in the console.

Strategy Tables
The simulator includes basic strategy for:

Hard Totals - Separate tables for S17 and H17

Soft Totals - Hands containing an Ace counted as 11

Pair Splitting - When to split paired cards

Customization
Game Rules
Modify engine/Rules.js to adjust:

javascript
const defaultRules = {
    dealerHitsSoft17: false,  // Set to true for H17 games
    doubleAfterSplit: true,
    resplitAces: false,
    lateSurrender: true,
    blackjackPayout: 1.5
};
Current Limitations
Fixed bet amount of $10 per hand

No surrender option

Basic strategy feedback only shows in console

Card counting features planned but not implemented
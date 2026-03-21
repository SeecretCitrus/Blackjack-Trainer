# ♠️ Blackjack Trainer & Simulator

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

A browser-based blackjack training tool and simulator for learning perfect basic strategy and analyzing gameplay through statistical simulation.

🔗 **[Live Demo](https://seecretcitrus.github.io/Blackjack-Trainer/)**

---

## Features

### 🃏 Gameplay
- **Interactive Training Mode** — Play full rounds of blackjack against a dealer with realistic casino rules
- **Multi-Player Support** — 1–7 players at the table simultaneously
- **Full Action Set** — Hit, Stand, Double Down, and Split (up to 3 splits, 4 hands total)
- **Realistic Split Behaviour** — After splitting, the first hand is played out fully before the second hand receives its second card
- **Split Aces Rule** — Split aces automatically receive one card each and cannot be played further
- **Dealer Hole Card** — Dealer's second card stays hidden until all players have acted

### 🧠 Strategy Trainer
- **Real-Time Strategy Feedback** — Toggle "Show Correct Move" to highlight the optimal button on every decision
- **Strategy Explanation Panel** — Displays a plain-English explanation of *why* a move is correct (e.g. "You should HIT — with 14 against the dealer's 9, you need to improve")
- **Mistake Detection** — Wrong plays show a tooltip indicating the correct action
- **Correct Move Highlighting** — The optimal button glows gold when the trainer is active
- **Basic Strategy Tables** — Covers hard totals, soft totals, and pair splitting for both S17 and H17 rule sets

### 🎲 Simulation
- **Auto-Simulation** — Runs 100,000 hands automatically using perfect basic strategy
- **Statistics Output** — Reports rounds played, hands played, wins, losses, pushes, and win rate (overall and excluding pushes) to the console

### ⚙️ Configurable Rules
- **Number of Decks** — 1–8 decks
- **Dealer Soft 17** — Toggle between Stand on Soft 17 (S17) and Hit on Soft 17 (H17)
- **Double After Split** — Configurable in `Rules.js`
- **Resplit Aces** — Configurable in `Rules.js`
- **Late Surrender** — Configurable in `Rules.js`
- **Shoe Penetration** — Randomised between 60–75% before reshuffling

### 🎨 UI & Table Layout
- **Casino-Style Arc Table** — Realistic felt table with players arranged along a curved arc
- **Centered Seat Distribution** — Players are always centered symmetrically on the arc regardless of player count (2 players sit at the 1/3 and 2/3 positions, not crammed to one side)
- **Empty Seat Placeholders** — Unused seats shown as faded "Empty" panels
- **Split Hand Display** — Split hands appear side-by-side within the same seat panel; the active hand is highlighted in gold, finished hands are dimmed
- **Card Deal Animation** — Cards fade in smoothly on deal
- **Hole Card Visual** — Dealer's face-down card shown with a crosshatch pattern
- **Player Turn Indicator** — Active player and active hand highlighted with a gold border

---

## Planned Features

- **Simulation Results UI** — Tables displaying win/loss breakdowns and hand statistics
- **Side Bets** — Lucky Lucky, Buster Blackjack, etc.
- **Bot Players** — Configurable AI players that play automatically at any seat
- **Seat Selection** — Choose which seats are human vs. bot vs. empty
- **Money & Betting** — Bankroll tracking with configurable bet sizes and 3:2 / 6:5 payout toggle
- **Card Counting Trainer** — Running count and true count practice mode
- **Surrender Option** — Late surrender action button

---

## Directory Structure

```
Blackjack-Trainer/
├── index.html
├── script.js
├── style.css
├── README.md
├── engine/
│   ├── Card.js          # Card representation and point value
│   ├── Dealer.js        # Dealer behaviour (hit rules, up card)
│   ├── Game.js          # Core game loop, actions, round management
│   ├── Hand.js          # Hand value calculation, soft/bust detection
│   ├── Player.js        # Player state, split/double eligibility
│   ├── Rules.js         # Configurable rule set
│   └── Shoe.js          # Multi-deck shoe with shuffle and penetration
├── logic/
│   ├── StrategyEngine.js  # Basic strategy tables + plain-English explanations
│   └── Simulator.js       # High-volume automated simulation
└── ui/
    ├── CardRenderer.js    # Card HTML generation
    ├── Controls.js        # Button wiring, trainer feedback, explanation panel
    └── TableView.js       # Arc table layout, seat centering, hand rendering
```

---

## How to Use

### Interactive Mode
1. Configure your game settings (decks, dealer soft 17 rule, number of players)
2. Click **Start Game** to deal a new round
3. Your active hand is highlighted in gold — use the action buttons to play:
   - **Hit** — Take another card
   - **Stand** — End your turn
   - **Double** — Double your bet and receive exactly one more card
   - **Split** — Split a pair into two separate hands
4. After all players act, the dealer reveals their hole card and plays out their hand
5. Click **Next Round** to deal again

### Trainer Mode
- Check **Show Correct Move** at any point during a game
- The correct button glows gold and an explanation panel appears below the controls explaining the reasoning
- If you make a wrong move a tooltip appears showing what the correct play was

### Simulation Mode
- Click **Simulate** to run 100,000 hands with perfect basic strategy
- Open the browser console (F12) to view the results

---

## Rules Configuration

Edit `engine/Rules.js` to adjust default rules:

```javascript
const defaultRules = {
    dealerHitsSoft17: false,  // false = S17, true = H17
    doubleAfterSplit: true,
    resplitAces: false,
    lateSurrender: true,
    blackjackPayout: 1.5       // 1.5 = 3:2, 1.2 = 6:5
};
```

---

## Current Limitations

- Fixed bet of $10 per hand (no bankroll or betting UI yet)
- No surrender button in the UI (rule exists in config but is not yet wired up)
- Simulation results display in the console only
- No bot/AI players at the table in interactive mode
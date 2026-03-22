# ♠️ Blackjack Trainer & Simulator

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

A browser-based blackjack training tool, simulator, and strategy optimizer for learning perfect basic strategy, analyzing gameplay statistics, and discovering optimal play through Monte Carlo simulation.

🔗 **[Live Demo](https://seecretcitrus.github.io/Blackjack-Trainer/)**

---

## Development

This project was built collaboratively with **[Claude](https://claude.ai)** (Anthropic's AI assistant). The architecture, engine logic, UI, simulation framework, and strategy optimizer were all developed through an iterative conversation spanning dozens of sessions. Claude designed and wrote the majority of the code; the human contributor directed the feature roadmap, tested the implementation, and made design decisions.

If you're curious how a project like this gets built with AI assistance, the full conversation history is a good example of iterative, specification-driven development.

---

## Features

### 🃏 Gameplay
- **Interactive Training Mode** — Play full rounds of blackjack against a dealer with realistic casino rules
- **1–7 Players** — Up to 7 players seated along a realistic arc table layout
- **Full Action Set** — Hit, Stand, Double Down, and Split (up to 3 splits, 4 hands total)
- **Realistic Split Behaviour** — Right hand played first; second hand receives its card when play reaches it
- **Split Aces Rule** — Split aces receive one card each and cannot be played further
- **Dealer Hole Card** — Hidden until all players have acted
- **Betting & Bankroll** — Each player has an editable balance and bet, set directly on the felt inside their seat panel
- **Sit-Out Logic** — Players with insufficient funds sit out; resupply at any time
- **Bot Players** — Any seat can be set to auto-play perfect basic strategy with a 0.5s delay between actions; bots can be toggled live mid-game

### 🧠 Strategy Trainer
- **Real-Time Strategy Feedback** — Toggle "Show Correct Move" to highlight the optimal action on every decision
- **Strategy Explanation Panel** — Plain-English explanation of *why* a move is correct (e.g. "You should HIT — with 14 against the dealer's 9, you need to improve")
- **Mistake Detection** — Wrong plays show a tooltip with the correct action
- **Basic Strategy Tables** — Full hard totals, soft totals, and pair splitting tables for both S17 and H17

### 🎲 Simulation
- **High-Volume Simulation** — Run up to 10,000,000 hands automatically using perfect basic strategy
- **Detailed Statistics** — Win/loss/push rates, player EV, bust rates, average hand value, hands per deck before shuffle
- **Color-Coded Hand Breakdown** — Starting hand performance table with win % colored green→red for instant readability
- **Async Chunked Execution** — Large simulations run without freezing the browser

### 🔬 Strategy Optimizer
- **Monte Carlo EV Optimization** — For every strategy cell (player total × dealer upcard × hand type), simulates thousands of hands forced to each legal action and picks the highest EV play — no lookup tables used
- **Side-by-Side Comparison** — Optimal actions compared against basic strategy; cells that differ are highlighted red
- **EV Display** — Each cell shows the best action's EV and the margin over the second-best action
- **Configurable Precision** — 500 to 25,000 hands per cell (fast preview to research-grade accuracy)
- **Copy for Analysis** — "Copy results for Claude" button generates formatted plain-text output you can paste directly into a conversation to analyze deviations or build custom strategy tables
- **Covers all hand types** — Hard totals (5–20), soft totals (A+2 through A+9), pairs (2,2 through A,A)

### ⚙️ Configurable Rules
- Number of decks (1–8)
- Dealer Soft 17 (S17 / H17)
- Double After Split
- Resplit Aces
- Blackjack payout (3:2 / 6:5 / 1:1)
- Minimum bet and buy-in amount
- Shoe penetration: 65–80% (randomised per shoe)

### 🎨 UI & Table
- **Casino arc table** with players centered symmetrically regardless of count
- **Card scaling** — bigger cards for fewer players, down to compact at 7 players
- **Shoe bar** — visual progress bar showing remaining cards with a gold penetration marker
- **Win/loss badges** — coloured result and net dollar amount shown per hand after round over
- **Card deal animation** — cards fade in on deal
- **Empty seat placeholders**, **bot badges**, **sitting-out indicators**

---

## Planned Features

- **Custom Strategy Tables** — apply optimizer results as the active strategy and simulate against them
- **Card Counting Trainer** — Hi-Lo running count, true count, bet-spread recommendations
- **Surrender** — Late surrender action wired to the UI
- **Side Bets** — Lucky Lucky, Buster Blackjack, etc.
- **Strategy Reference Overlay** — collapsible full strategy table for current rules

---

## Directory Structure

```
Blackjack-Trainer/
├── index.html              Main trainer page
├── script.js               Entry point
├── style.css               Main stylesheet
├── simulation.html         Simulator & optimizer page
├── simulation.js           Simulator & optimizer logic
├── simulation.css          Simulation page styles
├── README.md
├── engine/
│   ├── Card.js             Card representation and point value
│   ├── Dealer.js           Dealer behaviour (hit rules, up card)
│   ├── Game.js             Core game loop, actions, round management
│   ├── Hand.js             Hand value calculation, soft/bust detection
│   ├── Player.js           Player state, balance, bet, split/double eligibility
│   ├── Rules.js            Configurable rule set
│   └── Shoe.js             Multi-deck shoe with shuffle and penetration
├── logic/
│   ├── StrategyEngine.js   Basic strategy tables + plain-English explanations
│   ├── StrategyOptimizer.js Monte Carlo EV optimizer
│   └── Simulator.js        High-volume automated simulation with detailed stats
└── ui/
    ├── CardRenderer.js     Card HTML generation
    ├── Controls.js         Button wiring, trainer feedback, bot logic, bet panel
    └── TableView.js        Arc table layout, seat centering, shoe bar, hand rendering
```

---

## How to Use

### Interactive Mode
1. Configure settings (decks, dealer soft 17, players, min bet, buy-in)
2. Check any player checkboxes to make them bots
3. Click **Start Game**
4. Your active hand is highlighted in gold — use the action buttons to play
5. The bet and balance inputs inside each seat panel are live-editable at any time
6. Click **Next Round** to deal again

### Trainer Mode
Check **Show Correct Move** at any point. The correct button glows gold and an explanation panel appears below the controls.

### Simulation
Click **Simulator ↗** → configure rules and hand count → click **Run Simulation**.

### Strategy Optimizer
On the simulator page, switch to the **Strategy Optimizer** tab. Configure rules and hands-per-cell precision, then click **Run Optimizer**. After completion, click **Copy results for Claude** to paste the full EV table into an AI conversation for analysis.

---

## Rules Configuration

Edit `engine/Rules.js` to change defaults:

```javascript
const defaultRules = {
    dealerHitsSoft17: false,   // false = S17, true = H17
    doubleAfterSplit: true,
    resplitAces:      false,
    lateSurrender:    true,
    blackjackPayout:  1.5,     // 1.5 = 3:2, 1.2 = 6:5
    minBet:           15,
    startingBalance:  100,
};
```

---

## Current Limitations

- No surrender button in the UI (rule exists in config)
- No card counting mode yet
- Simulation results show overall stats only (no per-player breakdown for multi-player runs)
- Custom strategy tables from the optimizer cannot yet be applied directly to the trainer or simulator
import { StrategyEngine } from '../logic/StrategyEngine.js';
import { Game } from '../engine/Game.js';
import { renderGame } from './TableView.js';
import { CardCounter, SYSTEMS } from '../CardCounter.js';

const BOT_DELAY_MS   = 500;
const DEALER_DELAY_MS = 500;

let game;
let botSeats = [];   // botSeats[playerIndex] = true|false
let counter  = null; // CardCounter instance, null when counting is off

// ======================================================
// Bot seat UI — rebuilt when player count changes
// ======================================================
function rebuildBotSettings() {
    const numPlayers = parseInt(document.getElementById("numPlayersSelect").value);
    const container  = document.getElementById("botSettings");
    container.innerHTML = "";

    for (let i = 0; i < numPlayers; i++) {
        const label = document.createElement("label");
        const cb    = document.createElement("input");
        cb.type    = "checkbox";
        cb.id      = `botP${i}`;
        cb.checked = botSeats[i] ?? false;

        // Live toggle — takes effect immediately if a game is running
        cb.addEventListener("change", () => {
            botSeats[i] = cb.checked;
            // If it's now this player's turn and they just became a bot, kick off bot play
            if (game && game.phase === "PLAYER_TURN" &&
                game.currentPlayerIndex === i && cb.checked) {
                setTimeout(runBotStep, BOT_DELAY_MS);
            }
            refreshUI();
        });

        const span = document.createElement("span");
        span.textContent = `P${i + 1} Bot`;
        label.appendChild(cb);
        label.appendChild(span);
        container.appendChild(label);
    }
}

// ======================================================
// Bot execution
// ======================================================
function currentPlayerIsBot() {
    if (!game || !game.currentPlayer) return false;
    return botSeats[game.currentPlayerIndex] === true;
}

function runBotStep() {
    if (!game || game.phase !== "PLAYER_TURN" || !game.currentPlayer) return;
    if (!currentPlayerIsBot()) return;

    const action = StrategyEngine.getDecision(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );

    game.handlePlayerAction(action);
    countNewCards();
    refreshUI();

    if (game.phase === 'DEALER_TURN') {
        runDealerSequence();
    } else if (game.phase === "PLAYER_TURN" && game.currentPlayer && currentPlayerIsBot()) {
        setTimeout(runBotStep, BOT_DELAY_MS);
    }
}

function maybeRunBots() {
    if (game && game.phase === "PLAYER_TURN" && game.currentPlayer && currentPlayerIsBot()) {
        setTimeout(runBotStep, BOT_DELAY_MS);
    }
}

// ======================================================
// Card scaling
// ======================================================
function applyCardScale(numPlayers) {
    const table = document.getElementById("bj-table");
    if (table) table.setAttribute("data-players", String(numPlayers));
}

// ======================================================
// Bet input panel — shown during BETTING / start of each round
// ======================================================
function buildBetPanel() {
    const panel = document.getElementById("betPanel");
    if (!panel || !game) return;
    panel.innerHTML = "";

    const active = game.players.filter(p => !p.sittingOut && !botSeats[game.players.indexOf(p)]);
    if (active.length === 0) return;

    const title = document.createElement("div");
    title.className = "bet-panel-title";
    title.textContent = "Place your bets";
    panel.appendChild(title);

    active.forEach(player => {
        const row = document.createElement("div");
        row.className = "bet-row";

        const lbl = document.createElement("span");
        lbl.textContent = player.name;
        lbl.className = "bet-row-label";

        const input = document.createElement("input");
        input.type  = "number";
        input.className = "bet-input";
        input.min   = game.rules.minBet;
        input.max   = player.balance;
        input.step  = 1;
        input.value = Math.min(player.currentBet, player.balance);
        input.addEventListener("input", () => {
            const val = parseInt(input.value) || game.rules.minBet;
            player.currentBet = Math.max(val, game.rules.minBet);
        });

        const balSpan = document.createElement("span");
        balSpan.className = "bet-row-balance";
        balSpan.textContent = `$${player.balance}`;

        row.appendChild(lbl);
        row.appendChild(input);
        row.appendChild(balSpan);
        panel.appendChild(row);
    });
}

// ======================================================
// Resupply notification — shown when players sit out
// ======================================================
function buildResupplyPanel() {
    const panel = document.getElementById("resupplyPanel");
    if (!panel || !game) return;
    panel.innerHTML = "";

    const broke = game.players.filter(p => p.sittingOut);
    if (broke.length === 0) return;

    broke.forEach(player => {
        const row = document.createElement("div");
        row.className = "resupply-row";

        const msg = document.createElement("span");
        msg.textContent = `${player.name} is out of funds`;
        msg.className = "resupply-msg";

        const amtInput = document.createElement("input");
        amtInput.type  = "number";
        amtInput.className = "bet-input";
        amtInput.min   = 1;
        amtInput.step  = 10;
        amtInput.value = player.startingBalance;
        amtInput.style.width = "70px";

        const btn = document.createElement("button");
        btn.textContent = "Resupply";
        btn.className   = "resupply-btn";
        btn.addEventListener("click", () => {
            const amt = parseInt(amtInput.value) || player.startingBalance;
            player.resupply(amt);
            player.currentBet = Math.min(player.currentBet, player.balance);
            refreshUI();
            buildResupplyPanel();
        });

        row.appendChild(msg);
        row.appendChild(amtInput);
        row.appendChild(btn);
        panel.appendChild(row);
    });
}

// ======================================================
// Balance editor — live-editable balance fields per player
// ======================================================
function buildBalanceEditor() {
    const panel = document.getElementById("balanceEditor");
    if (!panel || !game) return;
    panel.innerHTML = "";

    game.players.forEach(player => {
        const row = document.createElement("div");
        row.className = "balance-row";

        const lbl = document.createElement("span");
        lbl.className   = "balance-label";
        lbl.textContent = player.name + ":";

        const input = document.createElement("input");
        input.type  = "number";
        input.className = "balance-input";
        input.min   = 0;
        input.step  = 10;
        input.value = Math.round(player.balance);
        input.title = "Edit balance directly";
        input.addEventListener("change", () => {
            const val = parseInt(input.value);
            if (!isNaN(val) && val >= 0) {
                player.balance = val;
                if (val >= game.rules.minBet) player.sittingOut = false;
                buildResupplyPanel();
                refreshUI();
            }
        });

        row.appendChild(lbl);
        row.appendChild(input);
        panel.appendChild(row);
    });
}

// ======================================================
// UI refresh
// ======================================================
function updateButtons() {
    const nextRoundBtn = document.getElementById("nextRoundBtn");
    const isBot = currentPlayerIsBot();

    if (!game || game.currentPlayer === null || isBot) {
        document.getElementById("hitBtn").disabled    = true;
        document.getElementById("standBtn").disabled  = true;
        document.getElementById("doubleBtn").disabled = true;
        document.getElementById("splitBtn").disabled  = true;
        nextRoundBtn.disabled = !game || game.phase !== "ROUND_OVER";
        return;
    }

    document.getElementById("hitBtn").disabled    = false;
    document.getElementById("standBtn").disabled  = false;
    document.getElementById("doubleBtn").disabled =
        !game.currentPlayer.canDouble(game.currentHandIndex, game.rules);
    document.getElementById("splitBtn").disabled  =
        !game.currentPlayer.canSplit(game.currentHandIndex, game.rules);
    nextRoundBtn.disabled = game.phase !== "ROUND_OVER";
}

function refreshUI() {
    if (!game) return;
    renderGame(game, botSeats);
    updateButtons();
    highlightCorrectAction();
    updateExplanationPanel();
    updateCountPanel();
}

function showTooltip(button, message, correct = null) {
    const rect    = button.getBoundingClientRect();
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.innerText = message;
    if (correct === true)  tooltip.classList.add("tooltip-correct");
    if (correct === false) tooltip.classList.add("tooltip-wrong");
    tooltip.style.position = "fixed";
    tooltip.style.left     = rect.left + rect.width / 2 + "px";
    tooltip.style.top      = rect.top - 36 + "px";
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), correct === true ? 1200 : 2000);
}

function handleManualAction(action) {
    if (!game || game.phase !== "PLAYER_TURN") return;
    if (currentPlayerIsBot()) return;

    const correct = StrategyEngine.getDecision(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );

    const buttonMap = { H: "hitBtn", S: "standBtn", D: "doubleBtn", P: "splitBtn" };
    const btn = document.getElementById(buttonMap[action]);

    if (action !== correct) {
        showTooltip(btn, `✕  Correct: ${correct}`, false);
    } else {
        showTooltip(btn, `✓`, true);
    }

    game.handlePlayerAction(action);
    countNewCards();
    refreshUI();

    if (game.phase === 'DEALER_TURN') {
        runDealerSequence();
    } else {
        maybeRunBots();
    }
}

// ======================================================
// Setup
// ======================================================
function setupControls() {
    document.getElementById("hitBtn").disabled    = true;
    document.getElementById("standBtn").disabled  = true;
    document.getElementById("doubleBtn").disabled = true;
    document.getElementById("splitBtn").disabled  = true;
    document.getElementById("nextRoundBtn").disabled = true;

    // Rebuild bot checkboxes on player count change
    document.getElementById("numPlayersSelect").addEventListener("change", () => {
        rebuildBotSettings();
    });
    rebuildBotSettings();

    document.getElementById("startBtn").addEventListener("click", () => {
        const numDecks   = parseInt(document.getElementById("numDecksSelect").value);
        const S17        = document.getElementById("S17Select").value === "true";
        const numPlayers = parseInt(document.getElementById("numPlayersSelect").value);
        const minBet     = parseInt(document.getElementById("minBetInput")?.value) || 15;
        const startBal   = parseInt(document.getElementById("startBalInput")?.value) || 100;

        // Sync bot config
        botSeats = Array.from({ length: numPlayers }, (_, i) => {
            const cb = document.getElementById(`botP${i}`);
            return cb ? cb.checked : false;
        });

        game = new Game(numPlayers, numDecks, "manual", S17);
        game.rules.minBet = minBet;

        // Set starting balances
        game.players.forEach(p => {
            p.balance         = startBal;
            p.startingBalance = startBal;
            p.currentBet      = minBet;
        });

        // Initialise card counter if enabled
        const countOn = document.getElementById('countToggle')?.checked;
        const system  = document.getElementById('countSystemSelect')?.value ?? 'hilo';
        if (countOn) {
            counter = new CardCounter(numDecks, system);
            counter.active = true;
            game.shoe.counter = counter;
            // Hook deal() so every card is counted as it leaves the shoe
            hookCounterIntoShoe();

            // Wrap initialDeal to flag the hole card before it's dealt.
            // Deal order: [P1..PN, Dealer] × 2 rounds.
            // The hole card is the LAST card of the second round = dealer's 2nd card.
            const origInitialDeal = game.initialDeal.bind(game);
            game.initialDeal = function() {
                const activePlayers = this.activePlayers().length;
                // Total cards in initial deal = (activePlayers + 1) * 2
                // The hole card is the very last one dealt
                // We flag it by counting deals within this call
                let dealsThisCall = 0;
                const totalCards  = (activePlayers + 1) * 2;
                const holeCardPos = totalCards; // last card
                const origDeal    = this.shoe.deal.bind(this.shoe);
                this.shoe.deal    = function() {
                    dealsThisCall++;
                    if (dealsThisCall === holeCardPos) {
                        // Flag: next deal call from this position is the hole card
                        this._nextDealerCardIsHole = true;
                    }
                    return origDeal();
                };
                origInitialDeal();
                // Restore the counting-aware deal (hookCounterIntoShoe already set it,
                // but we replaced it above — re-hook to restore counting behaviour)
                hookCounterIntoShoe();
            };

            // Re-hook after reshuffles (checkShuffle creates a new Shoe object)
            const origCheckShuffle = game.checkShuffle.bind(game);
            game.checkShuffle = function() {
                const oldCounter = this.shoe.counter;
                const before = this.shoe.cards.length;
                origCheckShuffle();
                if (this.shoe.cards.length > before) {
                    if (oldCounter) {
                        oldCounter.reset();
                        this.shoe.counter = oldCounter;
                    }
                    // Re-hook onto the new Shoe object created by checkShuffle
                    hookCounterIntoShoe();
                }
            };
        } else {
            counter = null;
        }

        applyCardScale(numPlayers);
        buildBetPanel();
        const bp = document.getElementById("betPanel");
        if (bp) bp.innerHTML = "";
        animatedStartRound();
    });

    document.getElementById("hitBtn").addEventListener("click",   () => handleManualAction("H"));
    document.getElementById("standBtn").addEventListener("click",  () => handleManualAction("S"));
    document.getElementById("doubleBtn").addEventListener("click", () => handleManualAction("D"));
    document.getElementById("splitBtn").addEventListener("click",  () => handleManualAction("P"));

    document.getElementById("nextRoundBtn").addEventListener("click", () => {
        if (!game || game.phase !== "ROUND_OVER") return;
        applyCardScale(game.players.length);
        buildBetPanel();
        const bp = document.getElementById("betPanel");
        if (bp) bp.innerHTML = "";
        animatedStartRound();
    });

    document.getElementById("trainerToggle").addEventListener("change", () => {
        highlightCorrectAction();
        updateExplanationPanel();
    });

    // Card counting toggle — update panel immediately when toggled mid-game
    document.getElementById("countToggle").addEventListener("change", () => {
        const countOn = document.getElementById("countToggle").checked;
        const sysLabel = document.getElementById("countSystemLabel");
        if (sysLabel) sysLabel.style.display = countOn ? "" : "none";
        if (!countOn) {
            if (game && game.shoe) game.shoe.counter = null;
            counter = null;
            document.getElementById("countPanel").innerHTML = "";
            return;
        }
        if (game) {
            const system   = document.getElementById("countSystemSelect")?.value ?? "hilo";
            const numDecks = parseInt(document.getElementById("numDecksSelect").value);
            // Preserve existing counter state if it exists (just reactivate it)
            if (game.shoe.counter && game.shoe.counter.numDecks === numDecks && game.shoe.counter.system.name === SYSTEMS[system]?.name) {
                // Same game, same shoe — just re-enable
                game.shoe.counter.active = true;
                counter = game.shoe.counter;
            } else {
                // New counter — set cardsDealt from shoe position for accurate true count
                counter = new CardCounter(numDecks, system);
                counter.active = true;
                counter.cardsDealt = game.startingDeckSize - game.shoe.cards.length;
                game.shoe.counter = counter;
            }
            hookCounterIntoShoe();
        }
        updateCountPanel();
    });

    // System select change — reinitialise counter
    document.getElementById("countSystemSelect")?.addEventListener("change", () => {
        if (!game || !document.getElementById("countToggle").checked) return;
        const system   = document.getElementById("countSystemSelect").value;
        const numDecks = parseInt(document.getElementById("numDecksSelect").value);
        // Preserve cardsDealt so true count denominator stays correct
        const prevDealt = game.shoe.counter ? game.shoe.counter.cardsDealt : (game.startingDeckSize - game.shoe.cards.length);
        counter = new CardCounter(numDecks, system);
        counter.active = true;
        counter.cardsDealt = prevDealt;
        game.shoe.counter = counter;
        hookCounterIntoShoe();
        updateCountPanel();
    });

    // Collapsible rules panel — collapses to a thin tab
    const rulesPanel     = document.getElementById("rulesPanel");
    const rulesPanelInner = document.getElementById("rulesPanelInner");
    const rulesPanelHeader = document.getElementById("rulesPanelHeader");
    const rulesPanelTab  = document.getElementById("rulesPanelTab");
    const closeBtn       = document.getElementById("rulesPanelToggle");
    const openBtn        = document.getElementById("rulesPanelOpen");
    let rulesPanelOpen   = true;

    function setRulesPanel(open) {
        rulesPanelOpen = open;
        if (open) {
            rulesPanel.classList.remove("collapsed");
            rulesPanelInner.style.display  = "";
            rulesPanelHeader.style.display = "";
            if (rulesPanelTab) rulesPanelTab.style.display = "none";
        } else {
            rulesPanel.classList.add("collapsed");
            rulesPanelInner.style.display  = "none";
            rulesPanelHeader.style.display = "none";
            if (rulesPanelTab) rulesPanelTab.style.display = "flex";
        }
    }

    if (closeBtn) closeBtn.addEventListener("click", () => setRulesPanel(false));
    if (openBtn)  openBtn.addEventListener("click",  () => setRulesPanel(true));

    updateButtons();
}

// ======================================================
// Trainer highlight
// ======================================================
function highlightCorrectAction() {
    const buttonMap = { H: "hitBtn", S: "standBtn", D: "doubleBtn", P: "splitBtn" };
    for (let key in buttonMap) {
        document.getElementById(buttonMap[key]).classList.remove("correctMove");
    }

    const trainer = document.getElementById("trainerToggle").checked;
    if (!trainer || !game || game.phase !== "PLAYER_TURN") return;
    if (!game.currentPlayer || currentPlayerIsBot()) return;
    if (!game.currentPlayer.hands[game.currentHandIndex]) return;

    const correct = StrategyEngine.getDecision(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );

    const btn = document.getElementById(buttonMap[correct]);
    if (btn) btn.classList.add("correctMove");
}

// ======================================================
// Explanation panel
// ======================================================
function updateExplanationPanel() {
    const panel = document.getElementById("explanationPanel");
    if (!panel) return;

    const trainer = document.getElementById("trainerToggle").checked;
    if (!trainer || !game || game.phase !== "PLAYER_TURN" ||
        !game.currentPlayer || currentPlayerIsBot()) {
        panel.classList.remove("visible");
        return;
    }
    if (!game.currentPlayer.hands[game.currentHandIndex]) {
        panel.classList.remove("visible");
        return;
    }

    const explanation = StrategyEngine.getExplanation(
        game.currentPlayer,
        game.currentHandIndex,
        game.dealer.getUpCard(),
        game.rules
    );

    panel.textContent = explanation;
    panel.classList.add("visible");
}

// ======================================================
// Animated dealer sequence
// ======================================================
function runDealerSequence() {
    if (!game || game.phase !== 'DEALER_TURN') return;

    // Brief pause before flipping hole card, then reveal it
    setTimeout(() => {
        countHoleCard();
        refreshUI(); // show hole card flipped
        // Then pause again before hitting
        setTimeout(dealerHitNext, DEALER_DELAY_MS);
    }, DEALER_DELAY_MS);
}

function dealerHitNext() {
    if (!game || game.phase !== 'DEALER_TURN') return;

    const shouldHit = game.dealerHitOnce();
    refreshUI();

    if (shouldHit && game.dealer.shouldHit(game.rules.dealerHitsSoft17)) {
        // More cards needed
        setTimeout(dealerHitNext, DEALER_DELAY_MS);
    } else {
        // Dealer is done — resolve round
        setTimeout(() => {
            game.checkWinner();
            game.settleAllBets();
            game.phase = 'ROUND_OVER';
            refreshUI();
            updateButtons();
        }, DEALER_DELAY_MS);
    }
}

// ======================================================
// Card counting helpers
// ======================================================
// The counter works by intercepting the shoe's deal() method
// so every card dealt — whether to a player, dealer, or as a
// hole card — is counted immediately and automatically.
// The running count therefore persists correctly across the
// whole shoe with no manual tracking needed.

function hookCounterIntoShoe() {
    if (!game) return;
    const shoe = game.shoe;
    // Always re-hook — use a getter so the deal closure always reads the
    // CURRENT counter variable, not a snapshot captured at hook time.
    // This means toggling the counter mid-game works correctly.
    const origDeal = shoe._origDeal ?? shoe.deal.bind(shoe);
    shoe._origDeal = origDeal; // save original so we can re-hook safely

    shoe._nextDealerCardIsHole = shoe._nextDealerCardIsHole ?? false;
    shoe.deal = function() {
        const card = origDeal();
        if (card && this.counter && this.counter.active) {
            if (this._nextDealerCardIsHole) {
                this.counter._holeCard = card;
                this._nextDealerCardIsHole = false;
            } else {
                this.counter.countCard(card);
            }
        }
        return card;
    };
}

// Count the hole card when it's revealed (called at start of dealer sequence)
function countHoleCard() {
    if (game && game.shoe.counter && game.shoe.counter._holeCard) {
        game.shoe.counter.countCard(game.shoe.counter._holeCard);
        game.shoe.counter._holeCard = null;
    }
}

// Re-hook when shoe reshuffles (new Shoe object created in checkShuffle)
function rehookAfterShuffle() {
    if (!counter || !game) return;
    hookCounterIntoShoe();
}

// No-op stubs — kept so existing call sites don't break
function countVisibleCards() {}
function countNewCards() {}

// Update the count display panel
function updateCountPanel() {
    const panel = document.getElementById('countPanel');
    if (!panel) return;

    const active = document.getElementById('countToggle')?.checked;
    const sysSelect = document.getElementById('countSystemLabel');
    if (sysSelect) sysSelect.style.display = active ? '' : 'none';

    if (!active || !game || !game.shoe.counter) {
        panel.innerHTML = '';
        return;
    }

    const counter = game.shoe.counter;
    const tc      = counter.getTrueCount();
    const rc      = counter.runningCount;
    const decks   = counter.getDecksRemaining().toFixed(1);
    const label   = counter.getCountLabel();
    const mult    = counter.getBetMultiplier();
    const sysName = counter.systemName;

    const tcStr = (tc >= 0 ? '+' : '') + tc.toFixed(1);
    const rcStr = (rc >= 0 ? '+' : '') + rc;

    const aceHtml = counter.usesAceSideCount ? (() => {
        const surplus = counter.getAceSurplus();
        const sStr = (surplus >= 0 ? '+' : '') + surplus.toFixed(1);
        const col = surplus > 0 ? '#6ddb8a' : surplus < 0 ? '#e07070' : 'rgba(255,255,255,0.5)';
        return `<div class="count-ace-row">Ace surplus: <span style="color:${col}">${sStr}</span> per deck remaining</div>`;
    })() : '';

    const guideHtml = counter.usesAceSideCount ? `
        <details class="count-guide">
            <summary>How to use Omega II</summary>
            <div class="count-guide-body">
                <b>Card values:</b><br>
                2, 3, 7 → <span style="color:#6ddb8a">+1</span> &nbsp;
                4, 5, 6 → <span style="color:#6ddb8a">+2</span> &nbsp;
                9 → <span style="color:#e07070">−1</span> &nbsp;
                10–K → <span style="color:#e07070">−2</span> &nbsp;
                Ace → 0 (side count)<br><br>
                <b>Running count:</b> Add/subtract as each card is dealt.<br>
                <b>True count:</b> Running ÷ decks remaining. More accurate at depth.<br>
                <b>Ace side count:</b> Count aces seen separately. Positive surplus = more aces left = good for player.<br>
                <b>Bet spread:</b> Bet 1× at TC ≤1, 2× at TC 2, 4× at TC 3, 6× at TC 4, 8× at TC ≥5.<br>
                <b>Expected edge:</b> ~+1% per true count point above 0.
            </div>
        </details>` : `
        <details class="count-guide">
            <summary>How to use Hi-Lo</summary>
            <div class="count-guide-body">
                <b>Card values:</b><br>
                2–6 → <span style="color:#6ddb8a">+1</span> (low cards, good for dealer) &nbsp;
                7–9 → 0 (neutral) &nbsp;
                10–A → <span style="color:#e07070">−1</span> (high cards, good for player)<br><br>
                <b>Running count:</b> Start at 0. Add/subtract as each card is dealt.<br>
                <b>True count:</b> Running count ÷ decks remaining. Always use true count for decisions.<br>
                <b>Bet spread:</b> Bet 1× at TC ≤1, 2× at TC 2, 4× at TC 3, 6× at TC 4, 8× at TC ≥5.<br>
                <b>Why it works:</b> High cards (10s, Aces) favor the player — blackjacks pay 3:2 and the dealer busts more. A positive count means more high cards remain.<br>
                <b>Expected edge:</b> ~+0.5% per true count point above 0.
            </div>
        </details>`;

    let html = `<div class="count-panel">
        <div class="count-system">${sysName}</div>
        <div class="count-grid">
            <div class="count-cell">
                <div class="count-lbl">Running</div>
                <div class="count-val" style="color:${label.color}">${rcStr}</div>
            </div>
            <div class="count-cell">
                <div class="count-lbl">True count</div>
                <div class="count-val" style="color:${label.color}">${tcStr}</div>
            </div>
            <div class="count-cell">
                <div class="count-lbl">Decks left</div>
                <div class="count-val">${decks}</div>
            </div>
            <div class="count-cell">
                <div class="count-lbl">Bet ×</div>
                <div class="count-val" style="color:${label.color}">${mult}</div>
            </div>
        </div>
        <div class="count-label-bar" style="color:${label.color}">${label.text} — ${label.bet}</div>
        ${aceHtml}
        ${guideHtml}
    </div>`;

    panel.innerHTML = html;
}

// ======================================================
// Animated initial deal
// Deals cards one at a time: P1c1, P2c1...Dealer(up), P1c2, P2c2...Dealer(hole)
// After all cards are dealt, continues normal game flow.
// ======================================================
const DEAL_DELAY_MS = 220; // ms between each card during initial deal

function animatedStartRound() {
    // Run all the round-start logic EXCEPT the actual deal
    game.phase            = "BETTING";
    game.currentHandIndex = 0;
    game.currentPlayerIndex = 0;
    game.checkShuffle();
    game.resetHands();

    // Place bets
    for (const player of game.players) {
        if (player.balance < game.rules.minBet) {
            player.sittingOut = true;
        } else {
            player.sittingOut = false;
            const betAmount = player.currentBet;
            player.placeBet(betAmount, game.rules.minBet);
        }
    }

    const active = game.activePlayers();
    if (active.length === 0) {
        game.phase = "ROUND_OVER";
        refreshUI();
        return;
    }

    // Build the deal sequence: [P1, P2...PN, Dealer] x2
    // but dealer's second card is hole card (don't count until revealed)
    const dealSteps = [];
    for (let round = 0; round < 2; round++) {
        for (const player of active) {
            dealSteps.push({ target: player, isDealer: false, isHole: false });
        }
        dealSteps.push({ target: game.dealer, isDealer: true, isHole: round === 1 });
    }

    // Flag the hole card in the shoe hook
    if (game.shoe._nextDealerCardIsHole !== undefined) {
        // will be set step by step below
    }

    let stepIndex = 0;
    function dealNext() {
        if (stepIndex >= dealSteps.length) {
            // All cards dealt — run naturals check and continue
            game.phase = "PLAYER_TURN"; // temporary so checkNaturals works
            game.checkNaturals();
            if (game.phase === "ROUND_OVER") {
                game.settleAllBets();
                refreshUI();
                updateButtons();
                return;
            }
            // Find first active player
            game.currentPlayerIndex = 0;
            while (
                game.currentPlayerIndex < game.players.length &&
                game.players[game.currentPlayerIndex].sittingOut
            ) game.currentPlayerIndex++;

            if (game.currentPlayerIndex >= game.players.length) {
                game.currentPlayer = null;
                game.phase = "ROUND_OVER";
            } else {
                game.currentPlayer = game.players[game.currentPlayerIndex];
                game.phase = "PLAYER_TURN";
            }
            refreshUI();
            updateButtons();
            maybeRunBots();
            return;
        }

        const step = dealSteps[stepIndex++];

        // Mark hole card so counter skips it
        if (step.isHole && game.shoe) {
            game.shoe._nextDealerCardIsHole = true;
        }

        const card = game.shoe.deal();
        if (!card) { dealNext(); return; }

        step.target.getCard(card, 0);
        refreshUI();

        setTimeout(dealNext, DEAL_DELAY_MS);
    }

    refreshUI(); // show empty table first
    setTimeout(dealNext, DEAL_DELAY_MS);
}

export { setupControls, updateButtons, handleManualAction };
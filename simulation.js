import { Simulator } from './logic/Simulator.js';

// ======================================================
// Custom strategy decision using optimizer EV results
// Falls back to basic strategy for any cell not in the optimizer output
// ======================================================
function getCustomDecision(player, handIndex, dealerUpCard, rules, optResults) {
    const hand        = player.hands[handIndex];
    const playerTotal = player.getHandValue(handIndex);
    const dealerValue = dealerUpCard.getValue();
    const isSoft      = player.isSoftHand(handIndex);

    if (hand.isFinished) return 'S';

    // Check pairs first
    if (player.canSplit(handIndex, rules)) {
        const pv  = hand.cards[0].getValue();
        const key = `${pv}_${dealerValue}`;
        const d   = optResults.pair[key];
        if (d && d.best === 'P') return 'P';
    }

    // Soft totals
    if (isSoft) {
        const other = playerTotal - 11;
        const key   = `${playerTotal}_${dealerValue}`;
        const d     = optResults.soft[key];
        if (d) {
            if (d.best === 'D' && player.canDouble(handIndex, rules)) return 'D';
            if (d.best === 'D') return 'S'; // Ds fallback
            return d.best;
        }
    }

    // Hard totals
    if (!isSoft) {
        const key = `${playerTotal}_${dealerValue}`;
        const d   = optResults.hard[key];
        if (d) {
            if (d.best === 'D' && player.canDouble(handIndex, rules)) return 'D';
            if (d.best === 'D') return 'H'; // can't double, hit instead
            return d.best;
        }
    }

    // Fallback to basic strategy
    return StrategyEngine.getDecision(player, handIndex, dealerUpCard, rules);
}

const runBtn       = document.getElementById("runSimBtn");
const progress     = document.getElementById("simProgress");
const progressFill = document.getElementById("simProgressFill");
const progressLbl  = document.getElementById("simProgressLabel");
const placeholder  = document.getElementById("simPlaceholder");
const resultsInner = document.getElementById("simResultsInner");

runBtn.addEventListener("click", runSim);

async function runSim() {
    const numRounds = parseInt(document.getElementById("simHands").value);
    const numPlayers = parseInt(document.getElementById("simPlayers").value);
    const numDecks  = parseInt(document.getElementById("simDecks").value);
    const S17       = document.getElementById("simS17").value === "true";
    const DAS       = document.getElementById("simDAS").value === "true";
    const RSA       = document.getElementById("simRSA").value === "true";
    const payout    = parseFloat(document.getElementById("simPayout").value);

    // Show progress
    runBtn.disabled = true;
    placeholder.classList.add("hidden");
    resultsInner.classList.add("hidden");
    progress.classList.remove("hidden");
    progressFill.style.width = "0%";
    progressLbl.textContent = "Running...";

    // Run in chunks using setTimeout so the browser can repaint
    const stats = await runInChunks({
        numRounds, numPlayers, numDecks, S17, DAS, RSA, payout,
        onProgress: (pct) => {
            progressFill.style.width = pct + "%";
            progressLbl.textContent = `${pct}% — ${Math.round(numRounds * pct / 100).toLocaleString()} hands`;
        },
    });

    progress.classList.add("hidden");
    runBtn.disabled = false;
    renderResults(stats);
}

// Run simulation in async chunks so UI stays responsive
// Chunk size scales with total — bigger runs use larger chunks for efficiency
function runInChunks(config) {
    return new Promise((resolve) => {
        const CHUNK = config.numRounds <= 100000 ? config.numRounds
                    : config.numRounds <= 1000000 ? 50000
                    : 200000;

        if (config.numRounds <= CHUNK) {
            const stats = Simulator.runDetailed(config);
            resolve(stats);
            return;
        }

        let completed = 0;
        const allStats = [];

        function doChunk() {
            const chunkRounds = Math.min(CHUNK, config.numRounds - completed);
            const partial = Simulator.runDetailed({ ...config, numRounds: chunkRounds });
            allStats.push(partial);
            completed += chunkRounds;
            config.onProgress?.(Math.round(completed / config.numRounds * 100));

            if (completed < config.numRounds) {
                requestAnimationFrame(doChunk);
            } else {
                resolve(mergeStats(allStats));
            }
        }
        requestAnimationFrame(doChunk);
    });
}

// Merge multiple partial stat objects into one
function mergeStats(parts) {
    const merged = {
        roundsPlayed: 0, handsPlayed: 0,
        wins: 0, losses: 0, pushes: 0,
        totalPnl: 0, totalWagered: 0,
        totalHandValue: 0, handsTracked: 0,
        playerBusts: 0, dealerBusts: 0,
        avgHandsPerDeck: 0,
        handBreakdown: [],
    };

    const breakdownMap = {};

    parts.forEach(p => {
        merged.roundsPlayed  += p.roundsPlayed;
        merged.handsPlayed   += p.handsPlayed;
        merged.wins          += p.wins;
        merged.losses        += p.losses;
        merged.pushes        += p.pushes;
        merged.avgHandsPerDeck += p.avgHandsPerDeck;

        p.handBreakdown.forEach(row => {
            if (!breakdownMap[row.label]) {
                breakdownMap[row.label] = { ...row };
            } else {
                const b = breakdownMap[row.label];
                b.hands   += row.hands;
                b.wins    += row.wins;
                b.losses  += row.losses;
                b.pushes  += row.pushes;
                b.busts   += row.busts;
            }
        });
    });

    merged.winRate  = merged.handsPlayed > 0 ? merged.wins   / merged.handsPlayed : 0;
    merged.lossRate = merged.handsPlayed > 0 ? merged.losses / merged.handsPlayed : 0;
    merged.pushRate = merged.handsPlayed > 0 ? merged.pushes / merged.handsPlayed : 0;

    // Recompute rates for breakdown
    merged.handBreakdown = Object.values(breakdownMap).map(b => ({
        ...b,
        winPct:  b.hands > 0 ? b.wins   / b.hands * 100 : 0,
        lossPct: b.hands > 0 ? b.losses / b.hands * 100 : 0,
        pushPct: b.hands > 0 ? b.pushes / b.hands * 100 : 0,
        bustPct: b.hands > 0 ? b.busts  / b.hands * 100 : 0,
    })).sort((a, b) => a.sortKey - b.sortKey);

    // EV computed from merged totals (weighted, not averaged)
    merged.ev = merged.handsPlayed > 0 ? (merged.wins - merged.losses) / merged.handsPlayed : 0;
    merged.avgHandValue    = parts.reduce((s, p) => s + p.avgHandValue, 0) / parts.length;
    merged.playerBustRate  = parts.reduce((s, p) => s + p.playerBustRate, 0) / parts.length;
    merged.dealerBustRate  = parts.reduce((s, p) => s + p.dealerBustRate, 0) / parts.length;
    merged.avgHandsPerDeck = Math.round(merged.avgHandsPerDeck / parts.length);

    return merged;
}

// ======================================================
// Render results into the DOM
// ======================================================
function renderResults(s) {
    const evPct      = (s.ev * 100).toFixed(3);
    const evPositive = s.ev >= 0;
    const inner      = document.getElementById("simResultsInner");

    // Build full HTML for results
    let html = '';

    // Summary strip
    html += `<div class="sim-summary-strip">
        <div class="sum-card ${evPositive ? 'sum-pos' : 'sum-neg'}">
            <div class="sum-label">Player EV</div>
            <div class="sum-value">${evPositive ? '+' : ''}${evPct}%</div>
            <div class="sum-sub">${evPositive ? 'player edge' : 'house edge: ' + Math.abs(parseFloat(evPct)).toFixed(3) + '%'}</div>
        </div>
        <div class="sum-card">
            <div class="sum-label">Hands</div>
            <div class="sum-value">${s.handsPlayed.toLocaleString()}</div>
            <div class="sum-sub">${s.roundsPlayed.toLocaleString()} rounds</div>
        </div>
        <div class="sum-card">
            <div class="sum-label">Win rate</div>
            <div class="sum-value">${(s.winRate * 100).toFixed(1)}%</div>
            <div class="sum-sub">${s.wins.toLocaleString()} wins</div>
        </div>
        <div class="sum-card">
            <div class="sum-label">Loss rate</div>
            <div class="sum-value">${(s.lossRate * 100).toFixed(1)}%</div>
            <div class="sum-sub">${s.losses.toLocaleString()} losses</div>
        </div>
        <div class="sum-card">
            <div class="sum-label">Push rate</div>
            <div class="sum-value">${(s.pushRate * 100).toFixed(1)}%</div>
            <div class="sum-sub">${s.pushes.toLocaleString()} pushes</div>
        </div>
        <div class="sum-card">
            <div class="sum-label">Bust rate (P)</div>
            <div class="sum-value">${(s.playerBustRate * 100).toFixed(1)}%</div>
            <div class="sum-sub">dealer: ${(s.dealerBustRate * 100).toFixed(1)}%</div>
        </div>
        <div class="sum-card">
            <div class="sum-label">Avg hand</div>
            <div class="sum-value">${s.avgHandValue.toFixed(1)}</div>
            <div class="sum-sub">player final total</div>
        </div>
        <div class="sum-card">
            <div class="sum-label">Hands/deck</div>
            <div class="sum-value">${s.avgHandsPerDeck.toLocaleString()}</div>
            <div class="sum-sub">before reshuffle</div>
        </div>
    </div>`;

    // Starting hand breakdown — split by hand type, matching optimizer table style
    const bdHard = s.handBreakdown.filter(r => r.label.startsWith('Hard'));
    const bdSoft = s.handBreakdown.filter(r => r.label.startsWith('Soft'));
    const bdPair = s.handBreakdown.filter(r => r.label.startsWith('Pair'));

    function bdSection(title, rows) {
        if (!rows.length) return '';
        let t = `<div class="opt-section">`;
        t += `<div class="opt-section-title">${title}</div>`;
        t += `<table class="sim-breakdown-table" style="width:100%"><thead><tr>
            <th style="text-align:left;min-width:52px">Hand</th>
            <th style="min-width:70px">Hands</th>
            <th style="min-width:60px">Win %</th>
            <th style="min-width:60px">Loss %</th>
            <th style="min-width:60px">Push %</th>
            <th style="min-width:60px">Bust %</th>
        </tr></thead><tbody>`;
        for (const row of rows) {
            const wc = winRateColor(row.winPct);
            // Shorten label for display: "Hard 16" → "16", "Soft 18" → "A+8", "Pair of 8s" → "8,8"
            let lbl = row.label;
            if (lbl.startsWith('Hard '))      lbl = lbl.replace('Hard ', '');
            else if (lbl.startsWith('Soft ')) lbl = 'A+' + (parseInt(lbl.replace('Soft ','')) - 11);
            else if (lbl.startsWith('Pair of ')) {
                const v = lbl.replace('Pair of ','').replace('s','');
                lbl = v === '11' ? 'A,A' : v + ',' + v;
            }
            t += `<tr>
                <td class="opt-row-label">${lbl}</td>
                <td class="bd-num">${row.hands.toLocaleString()}</td>
                <td class="bd-win" style="background:${wc}" title="${row.label}: W${row.winPct.toFixed(1)} L${row.lossPct.toFixed(1)} P${row.pushPct.toFixed(1)} B${row.bustPct.toFixed(1)}">${row.winPct.toFixed(1)}%</td>
                <td class="bd-num">${row.lossPct.toFixed(1)}%</td>
                <td class="bd-num">${row.pushPct.toFixed(1)}%</td>
                <td class="bd-num">${row.bustPct.toFixed(1)}%</td>
            </tr>`;
        }
        t += `</tbody></table></div>`;
        return t;
    }

    html += `<div style="margin-top:16px">`;
    html += bdSection('Hard totals', bdHard);
    html += bdSection('Soft totals', bdSoft);
    html += bdSection('Pairs', bdPair);
    html += `</div>`;


    html += `<div style="margin-top:14px;text-align:right">
        <button id="copySimBtn" class="copy-btn">Copy results for Claude</button>
    </div>`;

    inner.innerHTML = html;
    inner.classList.remove("hidden");

    // Wire up copy button via addEventListener (onclick in innerHTML fails in modules)
    document.getElementById('copySimBtn').addEventListener('click', copySimResults);

    // Store stats for copy function
    window._lastSimStats = s;
}

// Color scale: red (low win%) → green (high win%)
function winRateColor(pct) {
    const t = Math.max(0, Math.min(1, (pct - 25) / 30)); // 25%=red, 55%=green
    const r = Math.round(120 - t * 80);
    const g = Math.round(40  + t * 80);
    return `rgba(${r},${g},40,0.35)`;
}

function copySimResults() {
    const s = window._lastSimStats;
    if (!s) return;
    const lines = [];
    lines.push('=== SIMULATION RESULTS ===');
    lines.push(`EV: ${(s.ev*100).toFixed(3)}% | Win: ${(s.winRate*100).toFixed(2)}% | Loss: ${(s.lossRate*100).toFixed(2)}% | Push: ${(s.pushRate*100).toFixed(2)}%`);
    lines.push(`Hands: ${s.handsPlayed.toLocaleString()} | Player bust: ${(s.playerBustRate*100).toFixed(1)}% | Dealer bust: ${(s.dealerBustRate*100).toFixed(1)}%`);
    lines.push('');
    lines.push('Starting hand breakdown:');
    lines.push('Hand          Hands    Win%   Loss%  Push%  Bust%');
    for (const r of s.handBreakdown) {
        lines.push(
            r.label.padEnd(14) +
            String(r.hands).padStart(7) +
            r.winPct.toFixed(1).padStart(7) +
            r.lossPct.toFixed(1).padStart(7) +
            r.pushPct.toFixed(1).padStart(7) +
            r.bustPct.toFixed(1).padStart(7)
        );
    }
    showCopyTextarea(lines.join('\n'));
}

// Shared helper — fixed modal overlay, always visible, no DOM insertion issues
function showCopyTextarea(text) {
    const existing = document.getElementById('_copyModal');
    if (existing) existing.remove();

    // Dark backdrop
    const backdrop = document.createElement('div');
    backdrop.id = '_copyModal';
    backdrop.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:rgba(0,0,0,0.72)',
        'z-index:9999',
        'display:flex',
        'align-items:center',
        'justify-content:center',
    ].join(';');

    // Modal box
    const box = document.createElement('div');
    box.style.cssText = [
        'background:#1a3a2a',
        'border:1px solid rgba(255,215,0,0.45)',
        'border-radius:10px',
        'padding:20px',
        'width:min(680px,90vw)',
        'display:flex',
        'flex-direction:column',
        'gap:10px',
        'box-shadow:0 8px 40px rgba(0,0,0,0.7)',
    ].join(';');

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;color:rgba(255,215,0,0.85);letter-spacing:1px;font-weight:bold;';
    title.textContent = 'Copy for Claude';

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.55);';
    hint.textContent = 'Click inside the box, then Ctrl+A to select all, then Ctrl+C to copy.';

    const ta = document.createElement('textarea');
    ta.readOnly = true;
    ta.value = text;
    ta.style.cssText = [
        'width:100%',
        'height:260px',
        'background:rgba(0,0,0,0.55)',
        'color:rgba(255,255,220,0.92)',
        'border:1px solid rgba(255,255,255,0.2)',
        'border-radius:6px',
        'font-size:11px',
        'font-family:monospace',
        'padding:10px',
        'resize:vertical',
        'line-height:1.5',
        'cursor:text',
    ].join(';');

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy to clipboard';
    copyBtn.style.cssText = 'font-size:12px;padding:5px 16px;border:1px solid rgba(255,215,0,0.5);background:rgba(255,215,0,0.15);color:gold;border-radius:5px;cursor:pointer;';
    const textToCopy = text;

    function markCopied() {
        copyBtn.textContent = '✓ Copied!';
        copyBtn.style.background = 'rgba(80,200,100,0.2)';
        copyBtn.style.borderColor = 'rgba(80,200,100,0.6)';
        copyBtn.style.color = '#6ddb8a';
        setTimeout(() => {
            copyBtn.textContent = 'Copy to clipboard';
            copyBtn.style.background = 'rgba(255,215,0,0.15)';
            copyBtn.style.borderColor = 'rgba(255,215,0,0.5)';
            copyBtn.style.color = 'gold';
        }, 2500);
    }

    function markFallback() {
        ta.focus();
        ta.select();
        copyBtn.textContent = 'Ctrl+C to copy';
        setTimeout(() => copyBtn.textContent = 'Copy to clipboard', 3000);
    }

    copyBtn.onclick = () => {
        // Step 1: select the textarea text — this works regardless of focus state
        // and is required for the execCommand fallback
        ta.focus();
        ta.select();

        // Step 2: try modern clipboard API (works on HTTPS when page is focused)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(markCopied)
                .catch(() => {
                    // Clipboard API failed (e.g. focus issue) — fall back to
                    // execCommand on the already-selected textarea, which doesn't
                    // have the same focus requirement
                    try {
                        const ok = document.execCommand('copy');
                        if (ok) markCopied();
                        else markFallback();
                    } catch(e) {
                        markFallback();
                    }
                });
        } else {
            // No clipboard API — execCommand on selected textarea
            try {
                const ok = document.execCommand('copy');
                if (ok) markCopied();
                else markFallback();
            } catch(e) {
                markFallback();
            }
        }
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'font-size:12px;padding:5px 16px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);border-radius:5px;cursor:pointer;';
    closeBtn.onclick = () => backdrop.remove();
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

    btnRow.appendChild(copyBtn);
    btnRow.appendChild(closeBtn);
    box.appendChild(title);
    box.appendChild(hint);
    box.appendChild(ta);
    box.appendChild(btnRow);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);

    // Select all text immediately
    setTimeout(() => { ta.focus(); ta.select(); }, 40);
}

function pct(val) {
    return (val * 100).toFixed(2) + "%";
}

// ======================================================
// OPTIMIZER TAB
// ======================================================
import { StrategyOptimizer, DEALER_VALUES, HARD_TOTALS, SOFT_OTHERS, PAIR_VALUES } from './logic/StrategyOptimizer.js';
import { StrategyEngine } from './logic/StrategyEngine.js';

// Track whether an optimized strategy is currently applied
let _optimizedStrategyActive = false;

// Tab switching
document.querySelectorAll('.sim-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sim-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
});

const runOptBtn    = document.getElementById('runOptBtn');
const optProgress  = document.getElementById('optProgress');
const optFill      = document.getElementById('optProgressFill');
const optLbl       = document.getElementById('optProgressLabel');
const optPlaceholder = document.getElementById('optPlaceholder');
const optInner     = document.getElementById('optResultsInner');
const optTableWrap = document.getElementById('optTableWrap');
const optLegend    = document.getElementById('optLegend');

runOptBtn.addEventListener('click', async () => {
    const handsPerCell = parseInt(document.getElementById('optHands').value);
    const numDecks     = parseInt(document.getElementById('optDecks').value);
    const S17          = document.getElementById('optS17').value === 'true';
    const DAS          = document.getElementById('optDAS').value === 'true';
    const RSA          = document.getElementById('optRSA').value === 'true';
    const payout       = parseFloat(document.getElementById('optPayout').value);

    runOptBtn.disabled = true;
    optPlaceholder.classList.add('hidden');
    optInner.classList.add('hidden');
    optLegend.classList.add('hidden');
    optProgress.classList.remove('hidden');
    optFill.style.width = '0%';
    optLbl.textContent = 'Optimizing...';

    const totalCells = HARD_TOTALS.length * DEALER_VALUES.length
                     + SOFT_OTHERS.length * DEALER_VALUES.length
                     + PAIR_VALUES.length  * DEALER_VALUES.length;

    const results = await StrategyOptimizer.optimize({
        numDecks, S17, DAS, RSA, payout, handsPerCell,
        onProgress: pct => {
            optFill.style.width = pct + '%';
            const done = Math.round(totalCells * pct / 100);
            optLbl.textContent = `${pct}% — ${done} / ${totalCells} cells`;
        }
    });

    optProgress.classList.add('hidden');
    runOptBtn.disabled = false;

    renderOptTables(results, { S17, DAS, RSA, payout });
});

// Basic strategy action for a given cell (for comparison)
function basicAction(type, playerValue, dealerValue, pairCard, rules) {
    // Build a mock player object for StrategyEngine
    const hand = {
        cards: type === 'pair'
            ? [mockCard(pairCard), mockCard(pairCard)]
            : type === 'soft'
                ? [mockCard(11), mockCard(playerValue - 11)]
                : mockHardCards(playerValue),
        isFinished: false,
        isSplitAces: false,
    };
    const mockPlayer = {
        hands: [hand],
        getHandValue: (i) => {
            let t = 0, a = 0;
            for (const c of hand.cards) { t += c.getValue(); if (c.rank === 'Ace') a++; }
            while (t > 21 && a > 0) { t -= 10; a--; }
            return t;
        },
        isSoftHand: (i) => {
            let t = 0, a = 0;
            for (const c of hand.cards) { t += c.getValue(); if (c.rank === 'Ace') a++; }
            while (t > 21 && a > 0) { t -= 10; a--; }
            return a > 0;
        },
        canDouble: (i, r) => hand.cards.length === 2,
        canSplit:  (i, r) => type === 'pair' && hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank,
    };
    const mockDealer = { getValue: () => dealerValue, rank: dealerValue === 11 ? 'Ace' : String(Math.min(dealerValue, 10)) };
    try {
        return StrategyEngine.getDecision(mockPlayer, 0, mockDealer, rules);
    } catch(e) {
        return '?';
    }
}

function mockCard(value) {
    return {
        rank: value === 11 ? 'Ace' : value === 10 ? 'King' : String(value),
        suit: 'Spades',
        getValue() { return this.rank === 'Ace' ? 11 : this.rank === 'King' ? 10 : Number(this.rank); }
    };
}

function mockHardCards(total) {
    const a = Math.min(10, Math.floor(total / 2));
    const b = total - a;
    return [mockCard(Math.max(2, a)), mockCard(Math.max(2, b))];
}

function renderOptTables(results, rules) {
    const mockRules = {
        dealerHitsSoft17: rules.S17,
        doubleAfterSplit: rules.DAS,
        resplitAces:      rules.RSA,
        blackjackPayout:  rules.payout,
    };

    const dealerLabels = ['2','3','4','5','6','7','8','9','10','A'];
    let html = '';

    // EV explainer box
    html += `<div class="ev-explainer">
        <div class="ev-exp-title">What is EV?</div>
        <div class="ev-exp-body">
            EV (Expected Value) is the average amount you win or lose per $1 bet when making a specific action repeatedly.
            <br><br>
            <strong>EV = (total net winnings) / (hands played)</strong>
            <br><br>
            Examples: EV <span class="ev-pos">+0.15</span> means win 15¢ per $1 bet.
            EV <span class="ev-neg">-0.35</span> means lose 35¢ per $1 bet.
            A double win scores <span class="ev-pos">+2.0</span> (win 2× the original bet).
            <br><br>
            The edge shown in each cell is the EV difference between the best and second-best action —
            a small edge (±0.01) means the two actions are nearly equal; a large edge (0.3+) means
            the best action is clearly superior.
        </div>
    </div>`;

    // Helper: render one strategy table
    function tableHTML(title, rows, getCellData) {
        let t = `<div class="opt-section"><div class="opt-section-title">${title}</div>`;
        t += `<table class="opt-table"><thead><tr><th>Player</th>`;
        for (const dl of dealerLabels) t += `<th>${dl}</th>`;
        t += `</tr></thead><tbody>`;

        for (const row of rows) {
            t += `<tr><td class="opt-row-label">${row.label}</td>`;
            for (const dv of DEALER_VALUES) {
                const d = getCellData(row, dv);
                if (!d) { t += `<td>—</td>`; continue; }

                const same  = d.sim === d.basic;
                const edge  = (d.bestEV - d.secondEV);
                const edgeStr = (edge >= 0 ? '+' : '') + edge.toFixed(3);
                // EV of best action formatted to 2dp
                const evStr = (d.bestEV >= 0 ? '+' : '') + d.bestEV.toFixed(2);

                const tooltip = `Sim best: ${d.sim} (EV ${evStr}) | Basic: ${d.basic} | Edge over 2nd: ${edgeStr}`;

                t += `<td class="opt-cell ${same ? 'cell-same' : 'cell-diff'}" title="${tooltip}">`;
                t += `<span class="cell-action">${d.sim}</span>`;
                if (!same) t += `<span class="cell-basic">${d.basic}</span>`;
                t += `<span class="cell-ev ${d.bestEV >= 0 ? 'ev-pos-small' : 'ev-neg-small'}">${evStr}</span>`;
                t += `</td>`;
            }
            t += `</tr>`;
        }
        t += `</tbody></table></div>`;
        return t;
    }

    // Hard totals
    const hardRows = HARD_TOTALS.slice().reverse().map(tot => ({ label: String(tot), total: tot }));
    html += tableHTML('Hard totals', hardRows, (row, dv) => {
        const key  = `${row.total}_${dv}`;
        const data = results.hard[key];
        if (!data) return null;
        const basic = basicAction('hard', row.total, dv, null, mockRules);
        return { sim: data.best, basic, bestEV: data.bestEV, secondEV: data.secondEV };
    });

    // Soft totals
    const softRows = SOFT_OTHERS.slice().reverse().map(o => ({ label: `A+${o}`, other: o, total: o + 11 }));
    html += tableHTML('Soft totals', softRows, (row, dv) => {
        const key  = `${row.total}_${dv}`;
        const data = results.soft[key];
        if (!data) return null;
        const basic = basicAction('soft', row.total, dv, null, mockRules);
        return { sim: data.best, basic, bestEV: data.bestEV, secondEV: data.secondEV };
    });

    // Pairs
    const pairRows = PAIR_VALUES.slice().reverse().map(pv => ({
        label: pv === 11 ? 'A,A' : `${pv},${pv}`,
        pairCard: pv,
    }));
    html += tableHTML('Pairs', pairRows, (row, dv) => {
        const key  = `${row.pairCard}_${dv}`;
        const data = results.pair[key];
        if (!data) return null;
        const basic = basicAction('pair', row.pairCard * 2, dv, row.pairCard, mockRules);
        return { sim: data.best, basic, bestEV: data.bestEV, secondEV: data.secondEV };
    });


    optTableWrap.innerHTML = html;
    optInner.classList.remove('hidden');
    optLegend.classList.remove('hidden');
    optPlaceholder.classList.add('hidden');

    // Wire up copy button via addEventListener (onclick attr fails in modules)
    const copyOptBtnEl = document.getElementById('copyOptBtn');
    if (copyOptBtnEl) {
        copyOptBtnEl.replaceWith(copyOptBtnEl.cloneNode(true));
        document.getElementById('copyOptBtn').addEventListener('click', copyOptResults);
    }

    // Wire up Apply/Clear strategy button
    const applyBtnEl = document.getElementById('applyStrategyBtn');
    if (applyBtnEl) {
        applyBtnEl.replaceWith(applyBtnEl.cloneNode(true));
        document.getElementById('applyStrategyBtn').addEventListener('click', () => {
            toggleOptimizedStrategy(results);
        });
    }

    window._lastOptResults = results;
    window._lastOptRules   = rules;
    updateApplyButton();
}

// Convert optimizer results object into override table format for StrategyEngine
function buildOverrideTable(results) {
    const overrides = { hard: {}, soft: {}, pair: {} };
    for (const [key, data] of Object.entries(results.hard)) overrides.hard[key] = data.best;
    for (const [key, data] of Object.entries(results.soft)) overrides.soft[key] = data.best;
    for (const [key, data] of Object.entries(results.pair)) overrides.pair[key] = data.best;
    return overrides;
}

function toggleOptimizedStrategy(results) {
    if (_optimizedStrategyActive) {
        StrategyEngine.clearOverrides();
        _optimizedStrategyActive = false;
    } else {
        const overrides = buildOverrideTable(results);
        StrategyEngine.applyOptimizedStrategy(overrides);
        _optimizedStrategyActive = true;
    }
    updateApplyButton();
    updateStrategyBanner();
}

function updateApplyButton() {
    const btn = document.getElementById('applyStrategyBtn');
    if (!btn) return;
    if (_optimizedStrategyActive) {
        btn.textContent = '✓ Optimized strategy active — Click to revert';
        btn.style.background = 'rgba(80,200,100,0.15)';
        btn.style.borderColor = 'rgba(80,200,100,0.5)';
        btn.style.color = '#6ddb8a';
    } else {
        btn.textContent = '▶ Apply as active strategy';
        btn.style.background = 'rgba(255,215,0,0.12)';
        btn.style.borderColor = 'rgba(255,215,0,0.4)';
        btn.style.color = 'gold';
    }
}

function updateStrategyBanner() {
    let banner = document.getElementById('strategyBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'strategyBanner';
        banner.style.cssText = [
            'position:fixed', 'bottom:16px', 'right:16px',
            'padding:8px 16px', 'border-radius:6px',
            'font-size:12px', 'font-weight:bold', 'letter-spacing:0.5px',
            'z-index:1000', 'transition:opacity 0.3s',
            'pointer-events:none',
        ].join(';');
        document.body.appendChild(banner);
    }
    if (_optimizedStrategyActive) {
        banner.textContent = '⚡ Optimized strategy active';
        banner.style.background = 'rgba(20,80,40,0.95)';
        banner.style.border = '1px solid rgba(80,200,100,0.5)';
        banner.style.color = '#6ddb8a';
        banner.style.opacity = '1';
    } else {
        banner.style.opacity = '0';
    }
}

// ======================================================
// Apply optimizer results as active strategy + run comparison sim
// ======================================================
function applyOptStrategy() {
    const results = window._lastOptResults;
    const rules   = window._lastOptRules;
    if (!results) return;

    window._customStrategy = results;
    window._customRules    = rules;

    const btn = document.getElementById('applyStrategyBtn');
    if (btn) {
        btn.textContent = '✓ Applied — Running comparison...';
        btn.style.borderColor = 'rgba(80,200,100,0.6)';
        btn.style.color = '#6ddb8a';
    }

    // Run two simulations: basic strategy vs custom strategy, same rules
    runStrategyComparison(results, rules);
}

async function runStrategyComparison(optResults, rules) {
    const numRounds = 500000;
    const numDecks  = parseInt(document.getElementById('optDecks').value);
    const S17       = rules.S17;
    const DAS       = rules.DAS;
    const RSA       = rules.RSA;
    const payout    = rules.payout;

    const compPanel = document.getElementById('comparisonPanel');
    if (compPanel) {
        compPanel.innerHTML = `<div style="color:rgba(255,215,0,0.7);font-size:12px;letter-spacing:1px;margin-bottom:8px">RUNNING COMPARISON (500k hands each)...</div>
            <div class="sim-progress-inline"><div id="compFill" style="height:4px;background:gold;width:0%;border-radius:2px;transition:width 0.1s"></div></div>`;
        compPanel.classList.remove('hidden');
    }

    // Basic strategy sim
    const basicStats = await runInChunks({
        numRounds, numDecks, S17, DAS, RSA, payout, numPlayers: 1,
        onProgress: pct => {
            const fill = document.getElementById('compFill');
            if (fill) fill.style.width = (pct / 2) + '%';
        }
    });

    // Custom strategy sim — uses optimizer-derived decisions
    const customStats = await runInChunks({
        numRounds, numDecks, S17, DAS, RSA, payout, numPlayers: 1,
        customStrategy: optResults,
        onProgress: pct => {
            const fill = document.getElementById('compFill');
            if (fill) fill.style.width = (50 + pct / 2) + '%';
        }
    });

    renderComparison(basicStats, customStats, compPanel);

    const btn = document.getElementById('applyStrategyBtn');
    if (btn) {
        btn.textContent = '▶ Apply as Strategy & Compare';
        btn.style.borderColor = 'rgba(255,215,0,0.4)';
        btn.style.color = 'rgba(255,215,0,0.8)';
    }
}

function renderComparison(basic, custom, panel) {
    if (!panel) return;
    const basicEV  = (basic.ev  * 100).toFixed(3);
    const customEV = (custom.ev * 100).toFixed(3);
    const diff     = ((custom.ev - basic.ev) * 100).toFixed(3);
    const better   = custom.ev > basic.ev;

    panel.innerHTML = `
        <div class="opt-section-title" style="margin-bottom:10px">Strategy comparison — 500k hands each</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">
            <div class="sum-card">
                <div class="sum-label">Basic strategy EV</div>
                <div class="sum-value ${basic.ev >= 0 ? 'sum-pos' : ''}" style="font-size:20px">${basic.ev >= 0 ? '+' : ''}${basicEV}%</div>
            </div>
            <div class="sum-card">
                <div class="sum-label">Optimized strategy EV</div>
                <div class="sum-value ${custom.ev >= 0 ? 'sum-pos' : ''}" style="font-size:20px">${custom.ev >= 0 ? '+' : ''}${customEV}%</div>
            </div>
            <div class="sum-card ${better ? 'sum-pos' : 'sum-neg'}">
                <div class="sum-label">EV difference</div>
                <div class="sum-value" style="font-size:20px;color:${better ? '#6ddb8a' : '#e07070'}">${better ? '+' : ''}${diff}%</div>
                <div class="sum-sub">${better ? 'optimized is better' : 'basic is better'}</div>
            </div>
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);text-align:center">
            Both simulations use identical rules. EV difference reflects purely the strategy table changes.
        </div>`;
}

function copyOptResults() {
    const results = window._lastOptResults;
    const rules   = window._lastOptRules;
    if (!results) return;

    const dLabels = ['2','3','4','5','6','7','8','9','10','A'];
    const dvs     = DEALER_VALUES;
    const lines   = [];

    lines.push('=== STRATEGY OPTIMIZER RESULTS ===');
    if (rules) lines.push(`Rules: ${rules.S17 ? 'H17' : 'S17'} | DAS:${rules.DAS} | RSA:${rules.RSA} | Payout:${rules.payout}`);
    lines.push('Format per cell: ACTION  EV  (edge over 2nd best)');
    lines.push('');

    function section(title, rows, getKey, type) {
        lines.push(title);
        lines.push('Player  ' + dLabels.join('       '));
        for (const row of rows) {
            const cells = dvs.map(dv => {
                const data = results[type][getKey(row, dv)];
                if (!data) return '?      ';
                const ev   = (data.bestEV   >= 0 ? '+' : '') + data.bestEV.toFixed(2);
                const edge = (data.bestEV - data.secondEV);
                const edgeStr = (edge >= 0 ? '+' : '') + edge.toFixed(2);
                return `${data.best}${ev}(${edgeStr})`;
            });
            lines.push(row.label.padEnd(7) + cells.join(' '));
        }
        lines.push('');
    }

    section('Hard totals',
        HARD_TOTALS.slice().reverse().map(t => ({ label: String(t), total: t })),
        (r,dv) => r.total+'_'+dv, 'hard');
    section('Soft totals',
        SOFT_OTHERS.slice().reverse().map(o => ({ label: 'A+'+o, total: o+11 })),
        (r,dv) => r.total+'_'+dv, 'soft');
    section('Pairs',
        PAIR_VALUES.slice().reverse().map(pv => ({ label: pv===11?'A,A':pv+','+pv, pairCard: pv })),
        (r,dv) => r.pairCard+'_'+dv, 'pair');

    showCopyTextarea(lines.join('\n'));
}
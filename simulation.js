import { Simulator } from './logic/Simulator.js';

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
function runInChunks(config) {
    return new Promise((resolve) => {
        // For smaller runs just go synchronous
        if (config.numRounds <= 100000) {
            const stats = Simulator.runDetailed(config);
            resolve(stats);
            return;
        }

        // For large runs, break into chunks with requestAnimationFrame pauses
        const CHUNK = 20000;
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

    // Starting hand breakdown table — color-coded by win rate
    html += `<div class="opt-section-title" style="margin-top:16px">Starting hand breakdown</div>`;
    html += `<p class="sim-note">Win % colored green→red. Hover a cell for full stats.</p>`;
    html += `<table class="sim-breakdown-table"><thead>
        <tr>
            <th>Starting hand</th>
            <th>Hands</th>
            <th>Win %</th>
            <th>Loss %</th>
            <th>Push %</th>
            <th>Bust %</th>
        </tr></thead><tbody>`;

    for (const row of s.handBreakdown) {
        const winColor = winRateColor(row.winPct);
        html += `<tr>
            <td class="bd-label">${row.label}</td>
            <td class="bd-num">${row.hands.toLocaleString()}</td>
            <td class="bd-win" style="background:${winColor}" title="${row.label}: W${row.winPct.toFixed(1)} L${row.lossPct.toFixed(1)} P${row.pushPct.toFixed(1)} B${row.bustPct.toFixed(1)}">${row.winPct.toFixed(1)}%</td>
            <td class="bd-num">${row.lossPct.toFixed(1)}%</td>
            <td class="bd-num">${row.pushPct.toFixed(1)}%</td>
            <td class="bd-num">${row.bustPct.toFixed(1)}%</td>
        </tr>`;
    }
    html += `</tbody></table>`;

    // Copy-paste export button
    html += `<div style="margin-top:16px;text-align:right">
        <button class="copy-btn" onclick="copySimResults()">Copy results for Claude</button>
    </div>`;

    inner.innerHTML = html;
    inner.classList.remove("hidden");

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
    let text = `Simulation Results\n`;
    text += `EV: ${(s.ev*100).toFixed(3)}% | Win: ${(s.winRate*100).toFixed(2)}% | Loss: ${(s.lossRate*100).toFixed(2)}% | Push: ${(s.pushRate*100).toFixed(2)}%\n`;
    text += `Hands: ${s.handsPlayed.toLocaleString()} | Player bust: ${(s.playerBustRate*100).toFixed(1)}% | Dealer bust: ${(s.dealerBustRate*100).toFixed(1)}%\n\n`;
    text += `Starting hand breakdown:\n`;
    text += `${'Hand'.padEnd(12)}${'Hands'.padStart(8)}${'Win%'.padStart(7)}${'Loss%'.padStart(7)}${'Push%'.padStart(7)}${'Bust%'.padStart(7)}\n`;
    for (const r of s.handBreakdown) {
        text += `${r.label.padEnd(12)}${String(r.hands).padStart(8)}${r.winPct.toFixed(1).padStart(7)}${r.lossPct.toFixed(1).padStart(7)}${r.pushPct.toFixed(1).padStart(7)}${r.bustPct.toFixed(1).padStart(7)}\n`;
    }
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy results for Claude', 2000);
    });
}

function pct(val) {
    return (val * 100).toFixed(2) + "%";
}

// ======================================================
// OPTIMIZER TAB
// ======================================================
import { StrategyOptimizer, DEALER_VALUES, HARD_TOTALS, SOFT_OTHERS, PAIR_VALUES } from './logic/StrategyOptimizer.js';
import { StrategyEngine } from './logic/StrategyEngine.js';

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

    html += `<div style="margin-top:16px;text-align:right">
        <button class="copy-btn" onclick="copyOptResults()">Copy optimizer table for Claude</button>
    </div>`;

    optTableWrap.innerHTML = html;
    optInner.classList.remove('hidden');
    optLegend.classList.remove('hidden');
    optPlaceholder.classList.add('hidden');

    window._lastOptResults = results;
    window._lastOptRules   = rules;
}

function copyOptResults() {
    const results = window._lastOptResults;
    if (!results) return;
    const dLabels = ['2','3','4','5','6','7','8','9','10','A'];
    const dvs     = DEALER_VALUES;
    let text = '';

    function section(title, rows, getKey, getType) {
        text += title + '\n';
        text += 'Player\t' + dLabels.join('\t') + '\n';
        for (const row of rows) {
            text += row.label + '\t';
            text += dvs.map(dv => {
                const key  = getKey(row, dv);
                const data = results[getType(row)][key];
                if (!data) return '--';
                const ev = (data.bestEV >= 0 ? '+' : '') + data.bestEV.toFixed(2);
                return data.best + ev;
            }).join('\t');
            text += '\n';
        }
        text += '\n';
    }

    const hardRows = HARD_TOTALS.slice().reverse().map(t => ({ label: String(t), total: t }));
    const softRows = SOFT_OTHERS.slice().reverse().map(o => ({ label: 'A+' + o, other: o, total: o + 11 }));
    const pairRows = PAIR_VALUES.slice().reverse().map(pv => ({ label: pv === 11 ? 'A,A' : pv+','+pv, pairCard: pv }));

    section('Hard totals', hardRows, (r,dv) => r.total+'_'+dv, () => 'hard');
    section('Soft totals', softRows, (r,dv) => r.total+'_'+dv, () => 'soft');
    section('Pairs',       pairRows, (r,dv) => r.pairCard+'_'+dv, () => 'pair');

    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('#optTableWrap ~ div .copy-btn') || document.querySelector('.copy-btn');
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = orig, 2000);
    });
}
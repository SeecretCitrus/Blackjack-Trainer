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
    // Summary cards
    const summaryGrid = document.getElementById("summaryGrid");
    const evPct = (s.ev * 100).toFixed(3);
    const evPositive = s.ev >= 0;

    summaryGrid.innerHTML = `
        <div class="metric-card highlight ${evPositive ? 'positive' : 'negative'}">
            <div class="metric-label">Player EV per hand</div>
            <div class="metric-value">${evPositive ? '+' : ''}${evPct}%</div>
            <div class="metric-sub">${evPositive ? 'Player edge' : 'House edge: ' + Math.abs(parseFloat(evPct)).toFixed(3) + '%'}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Hands Played</div>
            <div class="metric-value">${s.handsPlayed.toLocaleString()}</div>
            <div class="metric-sub">across ${s.roundsPlayed.toLocaleString()} rounds</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Win Rate</div>
            <div class="metric-value">${(s.winRate * 100).toFixed(1)}%</div>
            <div class="metric-sub">${s.wins.toLocaleString()} wins</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Avg Hand Value</div>
            <div class="metric-value">${s.avgHandValue.toFixed(1)}</div>
            <div class="metric-sub">player final total</div>
        </div>
    `;

    // Rates table
    const ratesTbody = document.querySelector("#ratesTable tbody");
    ratesTbody.innerHTML = `
        <tr><td>Win rate</td><td>${pct(s.winRate)}</td></tr>
        <tr><td>Loss rate</td><td>${pct(s.lossRate)}</td></tr>
        <tr><td>Push rate</td><td>${pct(s.pushRate)}</td></tr>
        <tr><td>Win rate (excl. pushes)</td><td>${pct(s.wins / (s.handsPlayed - s.pushes))}</td></tr>
        <tr><td>Player bust rate</td><td>${pct(s.playerBustRate)}</td></tr>
        <tr><td>Dealer bust rate</td><td>${pct(s.dealerBustRate)}</td></tr>
        <tr><td>Avg hands per deck before shuffle</td><td>${s.avgHandsPerDeck.toLocaleString()}</td></tr>
    `;

    // Starting hand breakdown
    const breakTbody = document.querySelector("#handBreakdownTable tbody");
    breakTbody.innerHTML = s.handBreakdown.map(row => `
        <tr>
            <td>${row.label}</td>
            <td>${row.hands.toLocaleString()}</td>
            <td>${row.winPct.toFixed(1)}%</td>
            <td>${row.lossPct.toFixed(1)}%</td>
            <td>${row.pushPct.toFixed(1)}%</td>
            <td>${row.bustPct.toFixed(1)}%</td>
        </tr>
    `).join('');

    resultsInner.classList.remove("hidden");
}

function pct(val) {
    return (val * 100).toFixed(2) + "%";
}
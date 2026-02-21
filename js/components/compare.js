/**
 * Comparison Component
 * Head-to-head player comparison with voting screen aesthetic
 */

import { generateCrewmateSVG, formatPercent, getEloTier } from '../data.js';

/**
 * Render player in voting panel
 * @param {HTMLElement} container - Panel container
 * @param {Object} player - Player data
 */
export function renderVotingPlayer(container, player) {
    if (!container) return;

    if (!player) {
        container.innerHTML = `
            <div class="voting-placeholder">
                <span>?</span>
                <p>Select a player</p>
            </div>
        `;
        return;
    }

    const tier = getEloTier(player.elo?.elo || 1000);

    container.innerHTML = `
        <div class="voting-player-content">
            <div class="voting-avatar">
                ${generateCrewmateSVG(player.color, 1.2)}
            </div>
            <h3 style="color: ${player.color}; margin: 0.5rem 0;">${player.name}</h3>
            <div class="voting-elo" style="color: ${tier.color};">
                ${player.elo?.elo || '---'} ELO
            </div>
            <div class="voting-tier" style="color: ${tier.color}; font-size: 0.85rem;">
                ${tier.name} Tier
            </div>
            <div class="voting-quick-stats" style="margin-top: 1rem; font-size: 0.85rem; color: rgba(255,255,255,0.7);">
                <div>${player.games_played} games</div>
                <div>${formatPercent(player.win_pct)} win rate</div>
            </div>
        </div>
    `;
}

/**
 * Render comparison statistics
 * @param {HTMLElement} container - Stats container
 * @param {Object} player1 - First player
 * @param {Object} player2 - Second player
 */
export function renderComparisonStats(container, player1, player2) {
    if (!container || !player1 || !player2) {
        if (container) container.hidden = true;
        return;
    }

    container.hidden = false;

    const metrics = [
        { label: 'ELO Rating', key: 'elo.elo', format: (v) => v || 0 },
        { label: 'Games Played', key: 'games_played', format: (v) => v },
        { label: 'Win Rate', key: 'win_pct', format: (v) => formatPercent(v), higherBetter: true },
        { label: 'K/D Ratio', key: 'kdr', format: (v) => v.toFixed(2), higherBetter: true },
        { label: 'Imposter Win%', key: 'imposter_win_pct', format: (v) => formatPercent(v), higherBetter: true },
        { label: 'Crewmate Win%', key: 'crewmate_win_pct', format: (v) => formatPercent(v), higherBetter: true },
        { label: 'Kills/Imp Game', key: 'kills_per_imposter_game', format: (v) => v.toFixed(2), higherBetter: true },
        { label: 'Task Completion', key: 'task_completion_pct', format: (v) => formatPercent(v), higherBetter: true },
        { label: 'Survivability', key: 'derived.survivability', format: (v) => formatPercent((v || 0) * 100), higherBetter: true },
        { label: 'Sus Index', key: 'derived.sus_index', format: (v) => formatPercent((v || 0) * 100), higherBetter: false },
    ];

    const getValue = (player, key) => {
        const keys = key.split('.');
        let val = player;
        for (const k of keys) val = val?.[k];
        return val || 0;
    };

    const rows = metrics.map(metric => {
        const val1 = getValue(player1, metric.key);
        const val2 = getValue(player2, metric.key);

        let winner = null;
        if (metric.higherBetter !== undefined) {
            if (val1 > val2) winner = 1;
            else if (val2 > val1) winner = 2;
        }

        const class1 = winner === 1 ? 'winner' : (winner === 2 ? 'loser' : '');
        const class2 = winner === 2 ? 'winner' : (winner === 1 ? 'loser' : '');

        // Calculate bar widths
        const max = Math.max(val1, val2);
        const width1 = max > 0 ? (val1 / max * 100) : 0;
        const width2 = max > 0 ? (val2 / max * 100) : 0;

        return `
            <div class="comparison-row">
                <div class="comparison-value left ${class1}">
                    ${metric.format(val1)}
                    <div class="comparison-bar">
                        <div class="comparison-bar-fill left" style="width: ${width1}%; float: right;"></div>
                    </div>
                </div>
                <div class="comparison-label">${metric.label}</div>
                <div class="comparison-value right ${class2}">
                    ${metric.format(val2)}
                    <div class="comparison-bar">
                        <div class="comparison-bar-fill right" style="width: ${width2}%;"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add header with player names
    container.innerHTML = `
        <div class="comparison-header" style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid rgba(56, 254, 220, 0.2);">
            <div style="text-align: right;">
                <span style="color: ${player1.color}; font-weight: bold; font-size: 1.2rem;">${player1.name}</span>
            </div>
            <div style="color: rgba(255,255,255,0.5);">vs</div>
            <div>
                <span style="color: ${player2.color}; font-weight: bold; font-size: 1.2rem;">${player2.name}</span>
            </div>
        </div>
        ${rows}
        <div class="comparison-summary" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid rgba(56, 254, 220, 0.2); text-align: center;">
            ${getSummary(player1, player2)}
        </div>
    `;
}

/**
 * Generate comparison summary
 * @param {Object} player1 - First player
 * @param {Object} player2 - Second player
 * @returns {string} Summary HTML
 */
function getSummary(player1, player2) {
    const elo1 = player1.elo?.elo || 1000;
    const elo2 = player2.elo?.elo || 1000;
    const diff = Math.abs(elo1 - elo2);

    let verdict, color;
    if (diff < 20) {
        verdict = 'Evenly matched!';
        color = '#f5f557';
    } else if (elo1 > elo2) {
        verdict = `${player1.name} has the edge`;
        color = player1.color;
    } else {
        verdict = `${player2.name} has the edge`;
        color = player2.color;
    }

    return `
        <div style="font-size: 1.1rem; color: ${color}; font-weight: bold;">
            ${verdict}
        </div>
        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.5); margin-top: 0.5rem;">
            ELO difference: ${diff} points
        </div>
    `;
}

/**
 * Initialize comparison page
 * @param {Array} players - All players
 */
export function initCompare(players) {
    const select1 = document.getElementById('comparePlayer1');
    const select2 = document.getElementById('comparePlayer2');

    if (!select1 || !select2) return;

    // Populate selects
    const options = players.map(p =>
        `<option value="${p.id}">${p.name}</option>`
    ).join('');

    select1.innerHTML = '<option value="">Select Player 1</option>' + options;
    select2.innerHTML = '<option value="">Select Player 2</option>' + options;

    // Event listeners
    const updateComparison = () => {
        const p1 = players.find(p => p.id === select1.value);
        const p2 = players.find(p => p.id === select2.value);

        renderVotingPlayer(document.getElementById('compareDisplay1'), p1);
        renderVotingPlayer(document.getElementById('compareDisplay2'), p2);
        renderComparisonStats(document.getElementById('comparisonStats'), p1, p2);

        // Update panel selection state
        document.getElementById('votingLeft')?.classList.toggle('selected', !!p1);
        document.getElementById('votingRight')?.classList.toggle('selected', !!p2);
    };

    select1.addEventListener('change', updateComparison);
    select2.addEventListener('change', updateComparison);
}

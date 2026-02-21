/**
 * Player Detail Component
 * Renders detailed player information and stats
 */

import { generateCrewmateSVG, formatPercent, getRankSuffix, getEloTier, formatNumber } from '../data.js';
import { initRadarChart } from '../charts/radar.js';

/**
 * Render player detail header
 * @param {HTMLElement} container - Header container
 * @param {Object} player - Player data
 */
export function renderPlayerHeader(container, player) {
    if (!container || !player) return;

    const tier = getEloTier(player.elo?.elo || 1000);

    container.innerHTML = `
        <div class="player-header-avatar">
            ${generateCrewmateSVG(player.color, 1.5)}
        </div>
        <div class="player-header-info">
            <h2 style="color: ${player.color}">${player.name}</h2>
            <div class="player-header-meta">
                <div class="player-meta-item">
                    <span class="player-meta-label">Rank</span>
                    <span class="player-meta-value">#${player.elo?.rank || '-'}</span>
                </div>
                <div class="player-meta-item">
                    <span class="player-meta-label">ELO</span>
                    <span class="player-meta-value" style="color: ${tier.color}">${player.elo?.elo || '-'}</span>
                </div>
                <div class="player-meta-item">
                    <span class="player-meta-label">Tier</span>
                    <span class="player-meta-value" style="color: ${tier.color}">${tier.name}</span>
                </div>
                <div class="player-meta-item">
                    <span class="player-meta-label">Games</span>
                    <span class="player-meta-value">${player.games_played}</span>
                </div>
            </div>
            ${player.is_sidemen ? '<span class="player-tag sidemen" style="margin-top: 1rem;">Sidemen</span>' : ''}
        </div>
    `;
}

/**
 * Render player statistics grid
 * @param {HTMLElement} container - Stats container
 * @param {Object} player - Player data
 */
export function renderPlayerStats(container, player) {
    if (!container || !player) return;

    const stats = [
        { label: 'Win Rate', value: formatPercent(player.win_pct), sub: `${player.wins} W / ${player.losses} L` },
        { label: 'K/D Ratio', value: player.kdr.toFixed(2), sub: `${player.kills} K / ${player.deaths} D` },
        { label: 'Imposter Win%', value: formatPercent(player.imposter_win_pct), sub: `${player.imposter_games} games` },
        { label: 'Crewmate Win%', value: formatPercent(player.crewmate_win_pct), sub: `${player.crewmate_games} games` },
        { label: 'Kills/Imp Game', value: player.kills_per_imposter_game.toFixed(2), sub: `${player.kills_as_imposter} total kills` },
        { label: 'Task Completion', value: formatPercent(player.task_completion_pct), sub: `${player.tasks_completed} tasks` },
        { label: 'Bodies Reported', value: player.bodies_reported, sub: `${(player.derived?.detective_score || 0).toFixed(2)}/game` },
        { label: 'Emergency Meetings', value: player.emergency_meetings, sub: `${(player.derived?.aggression || 0).toFixed(2)}/game` },
        { label: 'Voted Out', value: player.voted_out, sub: `${formatPercent((player.derived?.sus_index || 0) * 100)} of games` },
        { label: 'First Deaths', value: player.first_death, sub: `${formatPercent((player.derived?.first_death_rate || 0) * 100)} of games` },
        { label: 'Survivability', value: formatPercent((player.derived?.survivability || 0) * 100), sub: 'Not dying first' },
        { label: 'Threat Level', value: (player.derived?.threat_level || 0).toFixed(2), sub: 'KDR x Imp Win%' },
    ];

    container.innerHTML = stats.map(stat => `
        <div class="player-stat-card">
            <h4>${stat.label}</h4>
            <div class="value">${stat.value}</div>
            <div class="sub">${stat.sub}</div>
        </div>
    `).join('');
}

/**
 * Initialize player detail page
 * @param {Object} player - Player data
 */
export function initPlayerDetail(player) {
    if (!player) return;

    // Render header
    const headerEl = document.getElementById('playerHeader');
    renderPlayerHeader(headerEl, player);

    // Render stats grid
    const statsEl = document.getElementById('playerStats');
    renderPlayerStats(statsEl, player);

    // Initialize radar chart
    const radarEl = document.getElementById('playerRadar');
    initRadarChart(radarEl, player);

    // Initialize metrics chart (simple bar chart for key stats)
    initMetricsChart(player);
}

/**
 * Initialize metrics bar chart
 * @param {Object} player - Player data
 */
function initMetricsChart(player) {
    const container = document.getElementById('playerMetrics');
    if (!container || !window.echarts) return;

    const chart = echarts.init(container, null, { renderer: 'canvas' });

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            borderColor: 'rgba(56, 254, 220, 0.3)',
            textStyle: { color: '#fff' }
        },
        grid: {
            left: '5%',
            right: '5%',
            top: '10%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['Imposter', 'Crewmate', 'General'],
            axisLabel: { color: 'rgba(255,255,255,0.7)' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }
        },
        yAxis: {
            type: 'value',
            max: 1,
            axisLabel: {
                color: 'rgba(255,255,255,0.6)',
                formatter: (val) => (val * 100).toFixed(0) + '%'
            },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        },
        series: [{
            type: 'bar',
            data: [
                {
                    value: player.elo?.imposter_score || 0,
                    itemStyle: { color: '#c51111' }
                },
                {
                    value: player.elo?.crewmate_score || 0,
                    itemStyle: { color: '#38fedc' }
                },
                {
                    value: player.elo?.general_score || 0,
                    itemStyle: { color: '#ed54ba' }
                }
            ],
            barWidth: '50%',
            itemStyle: {
                borderRadius: [4, 4, 0, 0]
            },
            label: {
                show: true,
                position: 'top',
                color: 'rgba(255,255,255,0.8)',
                formatter: (params) => (params.value * 100).toFixed(0) + '%'
            }
        }],
        animationDuration: 800
    };

    chart.setOption(option);
    window.addEventListener('resize', () => chart?.resize());
}

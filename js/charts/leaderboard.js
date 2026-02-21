/**
 * Leaderboard Chart Module
 * ECharts horizontal bar chart for ELO rankings
 */

import { getEloTier } from '../data.js';

let chart = null;

/**
 * Initialize the leaderboard chart
 * @param {HTMLElement} container - Container element
 * @param {Array} players - Player data
 * @param {string} metric - Metric to display
 */
export function initLeaderboardChart(container, players, metric = 'elo') {
    if (!container || !window.echarts) return;

    // Dispose existing chart
    if (chart) {
        chart.dispose();
    }

    chart = echarts.init(container, null, { renderer: 'canvas' });

    updateChart(players, metric);

    // Handle resize
    window.addEventListener('resize', () => {
        chart?.resize();
    });

    return chart;
}

/**
 * Update chart with new data
 * @param {Array} players - Player data
 * @param {string} metric - Metric to display
 */
export function updateChart(players, metric = 'elo') {
    if (!chart || !players?.length) return;

    // Limit to top 20 for readability
    const displayPlayers = players.slice(0, 20);

    // Get values based on metric
    const getValue = (player) => {
        switch (metric) {
            case 'elo': return player.elo?.elo || 0;
            case 'imposter': return (player.elo?.imposter_score || 0) * 100;
            case 'crewmate': return (player.elo?.crewmate_score || 0) * 100;
            case 'games': return player.games_played || 0;
            case 'winrate': return player.win_pct || 0;
            case 'kdr': return player.kdr || 0;
            default: return player.elo?.elo || 0;
        }
    };

    const getLabel = () => {
        switch (metric) {
            case 'elo': return 'ELO Rating';
            case 'imposter': return 'Imposter Score';
            case 'crewmate': return 'Crewmate Score';
            case 'games': return 'Games Played';
            case 'winrate': return 'Win Rate (%)';
            case 'kdr': return 'K/D Ratio';
            default: return 'ELO Rating';
        }
    };

    // Prepare data (reversed for horizontal bar)
    const names = displayPlayers.map(p => p.name).reverse();
    const values = displayPlayers.map(getValue).reverse();
    const colors = displayPlayers.map(p => p.color).reverse();

    // Calculate max for axis
    const maxValue = Math.max(...values);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            borderColor: 'rgba(56, 254, 220, 0.3)',
            borderWidth: 1,
            textStyle: { color: '#fff' },
            formatter: (params) => {
                const data = params[0];
                const playerIndex = displayPlayers.length - 1 - data.dataIndex;
                const player = displayPlayers[playerIndex];
                const tier = getEloTier(player.elo?.elo || 0);

                return `
                    <div style="padding: 8px;">
                        <div style="font-weight: bold; font-size: 14px; color: ${player.color};">
                            ${player.name}
                        </div>
                        <div style="color: ${tier.color}; font-size: 12px; margin: 4px 0;">
                            ${tier.name} Tier
                        </div>
                        <div style="margin-top: 8px;">
                            <div>${getLabel()}: <strong>${data.value.toFixed(metric === 'kdr' ? 2 : 0)}</strong></div>
                            <div>Games: ${player.games_played}</div>
                            <div>Win Rate: ${player.win_pct.toFixed(1)}%</div>
                        </div>
                    </div>
                `;
            }
        },
        grid: {
            left: '15%',
            right: '10%',
            top: '5%',
            bottom: '5%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            max: Math.ceil(maxValue * 1.1),
            axisLabel: {
                color: 'rgba(255,255,255,0.6)',
                fontSize: 11
            },
            axisLine: { show: false },
            splitLine: {
                lineStyle: {
                    color: 'rgba(255,255,255,0.1)'
                }
            }
        },
        yAxis: {
            type: 'category',
            data: names,
            axisLabel: {
                color: '#fff',
                fontSize: 12,
                formatter: (value, index) => {
                    const rank = displayPlayers.length - index;
                    return `{rank|#${rank}} ${value}`;
                },
                rich: {
                    rank: {
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 10
                    }
                }
            },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        series: [{
            type: 'bar',
            data: values.map((value, index) => ({
                value,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: colors[index] },
                        { offset: 1, color: adjustBrightness(colors[index], 0.3) }
                    ]),
                    borderRadius: [0, 4, 4, 0]
                }
            })),
            barWidth: '60%',
            label: {
                show: true,
                position: 'right',
                color: '#fff',
                fontSize: 11,
                formatter: (params) => {
                    if (metric === 'kdr') return params.value.toFixed(2);
                    return Math.round(params.value);
                }
            },
            animationDelay: (idx) => idx * 50
        }],
        animationDuration: 800,
        animationEasing: 'cubicOut'
    };

    chart.setOption(option, true);
}

/**
 * Adjust color brightness
 * @param {string} hex - Hex color
 * @param {number} factor - Brightness factor
 * @returns {string} Adjusted color
 */
function adjustBrightness(hex, factor) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.round(((num >> 16) & 0xff) * (1 + factor)));
    const g = Math.min(255, Math.round(((num >> 8) & 0xff) * (1 + factor)));
    const b = Math.min(255, Math.round((num & 0xff) * (1 + factor)));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Destroy chart instance
 */
export function destroyChart() {
    if (chart) {
        chart.dispose();
        chart = null;
    }
}

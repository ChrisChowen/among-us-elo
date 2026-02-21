/**
 * Radar Chart Module
 * Player role performance radar visualization
 */

let chart = null;

/**
 * Initialize radar chart for player detail
 * @param {HTMLElement} container - Container element
 * @param {Object} player - Player data
 */
export function initRadarChart(container, player) {
    if (!container || !window.echarts || !player) return;

    if (chart) {
        chart.dispose();
    }

    chart = echarts.init(container, null, { renderer: 'canvas' });

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            borderColor: 'rgba(56, 254, 220, 0.3)',
            textStyle: { color: '#fff' }
        },
        radar: {
            shape: 'polygon',
            center: ['50%', '55%'],
            radius: '70%',
            indicator: [
                { name: 'Win Rate', max: 100 },
                { name: 'Imposter', max: 1 },
                { name: 'Crewmate', max: 1 },
                { name: 'K/D Ratio', max: 2 },
                { name: 'Survivability', max: 1 },
                { name: 'Tasks', max: 100 }
            ],
            axisName: {
                color: 'rgba(255,255,255,0.8)',
                fontSize: 11
            },
            axisLine: {
                lineStyle: { color: 'rgba(56, 254, 220, 0.2)' }
            },
            splitLine: {
                lineStyle: { color: 'rgba(56, 254, 220, 0.1)' }
            },
            splitArea: {
                areaStyle: {
                    color: ['rgba(56, 254, 220, 0.02)', 'rgba(56, 254, 220, 0.05)']
                }
            }
        },
        series: [{
            type: 'radar',
            data: [{
                value: [
                    player.win_pct || 0,
                    player.elo?.imposter_score || 0,
                    player.elo?.crewmate_score || 0,
                    Math.min(player.kdr || 0, 2),
                    player.derived?.survivability || 0,
                    player.task_completion_pct || 0
                ],
                name: player.name,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: {
                    color: player.color,
                    width: 2
                },
                areaStyle: {
                    color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                        { offset: 0, color: hexToRgba(player.color, 0.4) },
                        { offset: 1, color: hexToRgba(player.color, 0.1) }
                    ])
                },
                itemStyle: {
                    color: player.color
                }
            }]
        }],
        animationDuration: 800
    };

    chart.setOption(option);

    window.addEventListener('resize', () => chart?.resize());

    return chart;
}

/**
 * Convert hex to rgba
 * @param {string} hex - Hex color
 * @param {number} alpha - Alpha value
 * @returns {string} RGBA string
 */
function hexToRgba(hex, alpha) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function destroyRadarChart() {
    if (chart) {
        chart.dispose();
        chart = null;
    }
}

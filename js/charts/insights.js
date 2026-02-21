/**
 * Insights Charts Module
 * Various charts for the insights page
 */

let scatterChart = null;
let comparisonChart = null;
let kdrChart = null;

/**
 * Initialize win rate scatter plot
 * @param {HTMLElement} container - Container element
 * @param {Array} players - Player data
 */
export function initWinRateScatter(container, players) {
    if (!container || !window.echarts || !players) return;

    if (scatterChart) scatterChart.dispose();
    scatterChart = echarts.init(container, null, { renderer: 'canvas' });

    // Prepare data: x = games, y = win%, size = ELO
    const data = players
        .filter(p => p.games_played >= 5)
        .map(p => ({
            name: p.name,
            value: [
                p.games_played,
                p.win_pct,
                (p.elo?.elo || 1000) / 30,  // Scale for bubble size
                p.elo?.elo || 1000
            ],
            color: p.color,
            isSidemen: p.is_sidemen
        }));

    const sidemenData = data.filter(d => d.isSidemen);
    const guestData = data.filter(d => !d.isSidemen);

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            borderColor: 'rgba(56, 254, 220, 0.3)',
            textStyle: { color: '#fff' },
            formatter: (params) => {
                const d = params.data;
                return `
                    <div style="font-weight: bold; color: ${d.color};">${d.name}</div>
                    <div>Games: ${d.value[0]}</div>
                    <div>Win Rate: ${d.value[1].toFixed(1)}%</div>
                    <div>ELO: ${d.value[3]}</div>
                `;
            }
        },
        legend: {
            data: ['Sidemen', 'Guests'],
            textStyle: { color: 'rgba(255,255,255,0.7)' },
            top: 10
        },
        grid: {
            left: '10%',
            right: '10%',
            top: '15%',
            bottom: '15%'
        },
        xAxis: {
            type: 'value',
            name: 'Games Played',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: { color: 'rgba(255,255,255,0.7)' },
            axisLabel: { color: 'rgba(255,255,255,0.6)' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        },
        yAxis: {
            type: 'value',
            name: 'Win Rate (%)',
            nameLocation: 'middle',
            nameGap: 40,
            nameTextStyle: { color: 'rgba(255,255,255,0.7)' },
            axisLabel: { color: 'rgba(255,255,255,0.6)' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        },
        series: [
            {
                name: 'Sidemen',
                type: 'scatter',
                data: sidemenData,
                symbolSize: (data) => data[2],
                itemStyle: {
                    color: '#c51111',
                    opacity: 0.8
                }
            },
            {
                name: 'Guests',
                type: 'scatter',
                data: guestData,
                symbolSize: (data) => data[2],
                itemStyle: {
                    color: '#38fedc',
                    opacity: 0.8
                }
            }
        ],
        animationDuration: 1000
    };

    scatterChart.setOption(option);
    window.addEventListener('resize', () => scatterChart?.resize());

    return scatterChart;
}

/**
 * Initialize Sidemen vs Guests comparison chart
 * @param {HTMLElement} container - Container element
 * @param {Object} globalStats - Global statistics
 * @param {Array} players - Player data
 */
export function initComparisonChart(container, globalStats, players) {
    if (!container || !window.echarts) return;

    if (comparisonChart) comparisonChart.dispose();
    comparisonChart = echarts.init(container, null, { renderer: 'canvas' });

    const sidemen = players.filter(p => p.is_sidemen);
    const guests = players.filter(p => !p.is_sidemen);

    // Calculate averages
    const avgValue = (arr, key) => {
        const vals = arr.map(p => {
            const keys = key.split('.');
            let val = p;
            for (const k of keys) val = val?.[k];
            return val || 0;
        });
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const categories = ['Win Rate', 'Imposter WR', 'Crewmate WR', 'Avg ELO'];
    const sidemenValues = [
        avgValue(sidemen, 'win_pct'),
        avgValue(sidemen, 'imposter_win_pct'),
        avgValue(sidemen, 'crewmate_win_pct'),
        avgValue(sidemen, 'elo.elo') - 900  // Offset for display
    ];
    const guestValues = [
        avgValue(guests, 'win_pct'),
        avgValue(guests, 'imposter_win_pct'),
        avgValue(guests, 'crewmate_win_pct'),
        avgValue(guests, 'elo.elo') - 900
    ];

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            borderColor: 'rgba(56, 254, 220, 0.3)',
            textStyle: { color: '#fff' }
        },
        legend: {
            data: ['Sidemen', 'Guests'],
            textStyle: { color: 'rgba(255,255,255,0.7)' },
            top: 10
        },
        grid: {
            left: '10%',
            right: '10%',
            top: '20%',
            bottom: '10%'
        },
        xAxis: {
            type: 'category',
            data: categories,
            axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: 'rgba(255,255,255,0.6)' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        },
        series: [
            {
                name: 'Sidemen',
                type: 'bar',
                data: sidemenValues,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#c51111' },
                        { offset: 1, color: '#8a0c0c' }
                    ]),
                    borderRadius: [4, 4, 0, 0]
                }
            },
            {
                name: 'Guests',
                type: 'bar',
                data: guestValues,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#38fedc' },
                        { offset: 1, color: '#1a9a86' }
                    ]),
                    borderRadius: [4, 4, 0, 0]
                }
            }
        ],
        animationDuration: 800
    };

    comparisonChart.setOption(option);
    window.addEventListener('resize', () => comparisonChart?.resize());

    return comparisonChart;
}

/**
 * Initialize KDR distribution chart
 * @param {HTMLElement} container - Container element
 * @param {Array} players - Player data
 */
export function initKDRChart(container, players) {
    if (!container || !window.echarts || !players) return;

    if (kdrChart) kdrChart.dispose();
    kdrChart = echarts.init(container, null, { renderer: 'canvas' });

    // Create distribution buckets
    const buckets = [
        { min: 0, max: 0.5, label: '0-0.5' },
        { min: 0.5, max: 1, label: '0.5-1' },
        { min: 1, max: 1.5, label: '1-1.5' },
        { min: 1.5, max: 2, label: '1.5-2' },
        { min: 2, max: 10, label: '2+' }
    ];

    const data = buckets.map(bucket => {
        const count = players.filter(p =>
            p.kdr >= bucket.min && p.kdr < bucket.max
        ).length;
        return count;
    });

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            borderColor: 'rgba(56, 254, 220, 0.3)',
            textStyle: { color: '#fff' }
        },
        grid: {
            left: '10%',
            right: '10%',
            top: '10%',
            bottom: '15%'
        },
        xAxis: {
            type: 'category',
            data: buckets.map(b => b.label),
            name: 'K/D Ratio',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: { color: 'rgba(255,255,255,0.7)' },
            axisLabel: { color: 'rgba(255,255,255,0.7)' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } }
        },
        yAxis: {
            type: 'value',
            name: 'Players',
            nameTextStyle: { color: 'rgba(255,255,255,0.7)' },
            axisLabel: { color: 'rgba(255,255,255,0.6)' },
            axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
        },
        series: [{
            type: 'bar',
            data: data,
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#ed54ba' },
                    { offset: 1, color: '#6b2fbc' }
                ]),
                borderRadius: [4, 4, 0, 0]
            },
            label: {
                show: true,
                position: 'top',
                color: 'rgba(255,255,255,0.7)'
            }
        }],
        animationDuration: 800
    };

    kdrChart.setOption(option);
    window.addEventListener('resize', () => kdrChart?.resize());

    return kdrChart;
}

/**
 * Destroy all insight charts
 */
export function destroyInsightCharts() {
    if (scatterChart) { scatterChart.dispose(); scatterChart = null; }
    if (comparisonChart) { comparisonChart.dispose(); comparisonChart = null; }
    if (kdrChart) { kdrChart.dispose(); kdrChart = null; }
}

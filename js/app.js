/**
 * Among Us Analytics Dashboard
 * Main Application Entry Point
 */

import router from './router.js';
import {
    loadData,
    getPlayers,
    getPlayer,
    getGlobalStats,
    getAwards,
    generateCrewmateSVG,
    formatNumber,
    formatPercent,
    searchPlayers,
    sortPlayers,
    filterPlayers
} from './data.js';

import { initLeaderboardChart, updateChart } from './charts/leaderboard.js';
import { initWinRateScatter, initComparisonChart, initKDRChart } from './charts/insights.js';
import { renderPlayerCards } from './components/playerCard.js';
import { initPlayerDetail } from './components/playerDetail.js';
import { initCompare, renderVotingPlayer, renderComparisonStats } from './components/compare.js';
import { renderAwards, renderTrends } from './components/awards.js';

// State
let currentPlayers = [];
let currentSort = 'elo';
let currentFilters = { minGames: 0, type: 'all' };

/**
 * Initialize the application
 */
async function init() {
    try {
        // Load data
        await loadData();
        currentPlayers = getPlayers();

        // Setup routes
        setupRoutes();

        // Setup event listeners
        setupEventListeners();

        // Hide loading screen
        document.getElementById('loadingScreen')?.classList.add('hidden');

        // Initial route
        router.handleHashChange();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        document.getElementById('loadingScreen').innerHTML = `
            <div class="loading-content">
                <p style="color: #c51111;">Failed to load data. Please refresh the page.</p>
                <p style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-top: 0.5rem;">
                    ${error.message}
                </p>
            </div>
        `;
    }
}

/**
 * Setup route handlers
 */
function setupRoutes() {
    router.register('home', showHome);
    router.register('leaderboard', showLeaderboard);
    router.register('players', showPlayers);
    router.register('player/:id', showPlayerDetail);
    router.register('compare', showCompare);
    router.register('insights', showInsights);
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
    // Emergency navigation button
    const emergencyBtn = document.getElementById('emergencyButton');
    const emergencyNav = document.getElementById('emergencyNav');

    emergencyBtn?.addEventListener('click', () => {
        emergencyNav.classList.toggle('open');
        emergencyBtn.setAttribute('aria-expanded',
            emergencyNav.classList.contains('open'));
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!emergencyNav?.contains(e.target)) {
            emergencyNav?.classList.remove('open');
            emergencyBtn?.setAttribute('aria-expanded', 'false');
        }
    });

    // Close menu when navigating
    document.querySelectorAll('.radial-item').forEach(item => {
        item.addEventListener('click', () => {
            emergencyNav?.classList.remove('open');
            emergencyBtn?.setAttribute('aria-expanded', 'false');
        });
    });

    // Leaderboard controls
    document.getElementById('sortMetric')?.addEventListener('change', handleLeaderboardSort);
    document.getElementById('filterGames')?.addEventListener('change', handleLeaderboardFilter);
    document.getElementById('filterType')?.addEventListener('change', handleLeaderboardFilter);

    // Player search
    document.getElementById('playerSearch')?.addEventListener('input', handlePlayerSearch);

    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', handleViewToggle);
    });
}

// ============================================
// Route Handlers
// ============================================

/**
 * Show home page
 */
function showHome() {
    const page = document.getElementById('home');
    if (!page) return;
    page.hidden = false;

    const stats = getGlobalStats();
    const players = getPlayers();

    // Render hero stats
    const heroStats = document.getElementById('heroStats');
    if (heroStats) {
        heroStats.innerHTML = `
            <div class="hero-stat">
                <span class="hero-stat-value">${stats.total_players || 0}</span>
                <span class="hero-stat-label">Players</span>
            </div>
            <div class="hero-stat">
                <span class="hero-stat-value">~${formatNumber(stats.total_games_tracked || 0)}</span>
                <span class="hero-stat-label">Games</span>
            </div>
            <div class="hero-stat">
                <span class="hero-stat-value">${stats.sidemen_count || 7}</span>
                <span class="hero-stat-label">Sidemen</span>
            </div>
        `;
    }

    // Render quick stats
    const quickStats = document.getElementById('quickStats');
    if (quickStats) {
        const topPlayer = players[0];
        const mostKills = players.reduce((max, p) => p.kills > max.kills ? p : max, players[0]);
        const bestImposter = [...players]
            .filter(p => p.imposter_games >= 10)
            .sort((a, b) => (b.elo?.imposter_score || 0) - (a.elo?.imposter_score || 0))[0];

        quickStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-card-icon">👑</div>
                <div class="stat-card-value" style="color: ${topPlayer?.color || '#38fedc'}">${topPlayer?.name || '-'}</div>
                <div class="stat-card-label">#1 Ranked Player</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">🔪</div>
                <div class="stat-card-value">${formatNumber(mostKills?.kills || 0)}</div>
                <div class="stat-card-label">Total Kills by ${mostKills?.name || '-'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">😈</div>
                <div class="stat-card-value" style="color: ${bestImposter?.color || '#c51111'}">${bestImposter?.name || '-'}</div>
                <div class="stat-card-label">Best Imposter</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">📊</div>
                <div class="stat-card-value">${formatPercent(stats.avg_win_pct || 0)}</div>
                <div class="stat-card-label">Average Win Rate</div>
            </div>
        `;
    }

    // Render crewmate showcase
    const showcase = document.getElementById('crewmateShowcase');
    if (showcase) {
        const sidemen = players.filter(p => p.is_sidemen).slice(0, 7);
        showcase.innerHTML = sidemen.map((p, i) => `
            <div class="showcase-crewmate" style="
                position: absolute;
                left: ${20 + (i % 4) * 22}%;
                top: ${i < 4 ? 10 : 50}%;
                animation: float 3s ease-in-out infinite;
                animation-delay: ${i * 0.3}s;
            ">
                ${generateCrewmateSVG(p.color, 0.8)}
            </div>
        `).join('');
    }
}

/**
 * Show leaderboard page
 */
function showLeaderboard() {
    const page = document.getElementById('leaderboard');
    if (!page) return;
    page.hidden = false;

    // Apply current filters and sort
    updateLeaderboard();
}

/**
 * Update leaderboard with current filters/sort
 */
function updateLeaderboard() {
    let players = getPlayers();

    // Apply filters
    players = filterPlayers(players, currentFilters);

    // Apply sort
    players = sortPlayers(players, currentSort);

    currentPlayers = players;

    // Update chart
    const chartContainer = document.getElementById('leaderboardChart');
    initLeaderboardChart(chartContainer, players, currentSort);

    // Update table
    renderLeaderboardTable(players);
}

/**
 * Render leaderboard table
 * @param {Array} players - Player data
 */
function renderLeaderboardTable(players) {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    tbody.innerHTML = players.slice(0, 30).map((p, i) => `
        <tr style="animation-delay: ${i * 30}ms">
            <td>#${p.elo?.rank || i + 1}</td>
            <td>
                <a href="#player/${p.id}" style="color: ${p.color}; font-weight: 600;">
                    ${p.name}
                </a>
                ${p.is_sidemen ? '<span class="player-tag sidemen" style="margin-left: 0.5rem; font-size: 0.65rem;">S</span>' : ''}
            </td>
            <td><strong>${p.elo?.elo || '-'}</strong></td>
            <td>${p.games_played}</td>
            <td>${formatPercent(p.win_pct)}</td>
            <td>${(p.elo?.imposter_score * 100 || 0).toFixed(0)}%</td>
            <td>${(p.elo?.crewmate_score * 100 || 0).toFixed(0)}%</td>
        </tr>
    `).join('');
}

/**
 * Handle leaderboard sort change
 */
function handleLeaderboardSort(e) {
    currentSort = e.target.value;
    updateLeaderboard();
}

/**
 * Handle leaderboard filter change
 */
function handleLeaderboardFilter(e) {
    if (e.target.id === 'filterGames') {
        currentFilters.minGames = parseInt(e.target.value) || 0;
    } else if (e.target.id === 'filterType') {
        currentFilters.type = e.target.value;
    }
    updateLeaderboard();
}

/**
 * Show players page
 */
function showPlayers() {
    const page = document.getElementById('players');
    if (!page) return;
    page.hidden = false;

    const grid = document.getElementById('playersGrid');
    const players = getPlayers();

    renderPlayerCards(grid, players);
}

/**
 * Handle player search
 */
function handlePlayerSearch(e) {
    const query = e.target.value;
    const players = searchPlayers(query);
    const grid = document.getElementById('playersGrid');
    renderPlayerCards(grid, players);
}

/**
 * Handle view toggle
 */
function handleViewToggle(e) {
    const view = e.currentTarget.dataset.view;
    const grid = document.getElementById('playersGrid');

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    grid?.classList.toggle('list-view', view === 'list');
}

/**
 * Show player detail page
 */
function showPlayerDetail(params) {
    const page = document.getElementById('player');
    if (!page) return;
    page.hidden = false;

    const player = getPlayer(params.id);
    if (!player) {
        page.innerHTML = `
            <div class="page-header">
                <a href="#players" class="back-link">&larr; All Players</a>
                <h2>Player not found</h2>
            </div>
        `;
        return;
    }

    initPlayerDetail(player);
}

/**
 * Show compare page
 */
function showCompare() {
    const page = document.getElementById('compare');
    if (!page) return;
    page.hidden = false;

    initCompare(getPlayers());
}

/**
 * Show insights page
 */
function showInsights() {
    const page = document.getElementById('insights');
    if (!page) return;
    page.hidden = false;

    const players = getPlayers();
    const stats = getGlobalStats();
    const awards = getAwards();

    // Render awards
    const awardsGrid = document.getElementById('awardsGrid');
    renderAwards(awardsGrid, awards);

    // Render charts
    const scatterContainer = document.getElementById('winRateScatter');
    const comparisonContainer = document.getElementById('sidemenVsGuests');
    const kdrContainer = document.getElementById('kdrDistribution');

    // Small delay to ensure containers are visible
    setTimeout(() => {
        initWinRateScatter(scatterContainer, players);
        initComparisonChart(comparisonContainer, stats, players);
        initKDRChart(kdrContainer, players);
    }, 100);

    // Render trends
    const trendsContainer = document.getElementById('trendCards');
    renderTrends(trendsContainer, stats, players);
}

// ============================================
// Initialize
// ============================================

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

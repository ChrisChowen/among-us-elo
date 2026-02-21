/**
 * Data Module
 * Handles loading player data and generating Among Us crewmate SVG avatars
 */

// Store for loaded data
let playerData = null;

/**
 * Load player data from JSON
 * @returns {Promise<Object>} Player data
 */
export async function loadData() {
    if (playerData) {
        return playerData;
    }

    try {
        const response = await fetch('data/players.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        playerData = await response.json();
        return playerData;
    } catch (error) {
        console.error('Failed to load player data:', error);
        throw error;
    }
}

/**
 * Get all players
 * @returns {Array} Array of players
 */
export function getPlayers() {
    return playerData?.players || [];
}

/**
 * Get a single player by ID
 * @param {string} id - Player ID (lowercase, hyphenated name)
 * @returns {Object|null} Player data or null
 */
export function getPlayer(id) {
    return playerData?.players.find(p => p.id === id) || null;
}

/**
 * Get player by name
 * @param {string} name - Player name
 * @returns {Object|null} Player data or null
 */
export function getPlayerByName(name) {
    return playerData?.players.find(p =>
        p.name.toLowerCase() === name.toLowerCase()
    ) || null;
}

/**
 * Get global stats
 * @returns {Object} Global statistics
 */
export function getGlobalStats() {
    return playerData?.global_stats || {};
}

/**
 * Get awards
 * @returns {Array} Awards array
 */
export function getAwards() {
    return playerData?.awards || [];
}

/**
 * Generate Among Us crewmate SVG avatar
 * @param {string} color - Hex color for the crewmate
 * @param {number} size - Size multiplier (default 1)
 * @returns {string} SVG string
 */
export function generateCrewmateSVG(color, size = 1) {
    const width = 100 * size;
    const height = 120 * size;

    // Calculate visor color (lighter version of main color)
    const visorColor = lightenColor(color, 0.4);

    return `
    <svg width="${width}" height="${height}" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Shadow -->
        <ellipse cx="50" cy="115" rx="35" ry="5" fill="rgba(0,0,0,0.3)"/>

        <!-- Backpack -->
        <rect x="75" y="35" width="18" height="40" rx="5" fill="${darkenColor(color, 0.2)}"/>

        <!-- Body -->
        <path d="M25 45 Q25 20, 50 20 Q75 20, 75 45 L75 85 Q75 100, 60 100 L60 110 Q60 115, 55 115 L45 115 Q40 115, 40 110 L40 100 Q25 100, 25 85 Z" fill="${color}"/>

        <!-- Left leg -->
        <path d="M30 85 L30 110 Q30 115, 35 115 L42 115 Q45 115, 45 110 L45 95" fill="${color}"/>

        <!-- Right leg -->
        <path d="M55 95 L55 110 Q55 115, 58 115 L65 115 Q70 115, 70 110 L70 85" fill="${color}"/>

        <!-- Visor -->
        <ellipse cx="55" cy="45" rx="22" ry="15" fill="${visorColor}"/>
        <ellipse cx="55" cy="45" rx="22" ry="15" fill="url(#visorGradient${color.replace('#', '')})"/>

        <!-- Visor shine -->
        <ellipse cx="48" cy="40" rx="8" ry="5" fill="rgba(255,255,255,0.4)"/>

        <!-- Gradient definitions -->
        <defs>
            <linearGradient id="visorGradient${color.replace('#', '')}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:rgba(150,200,255,0.6)"/>
                <stop offset="100%" style="stop-color:rgba(100,150,200,0.3)"/>
            </linearGradient>
        </defs>
    </svg>`;
}

/**
 * Generate mini crewmate SVG (for icons/small displays)
 * @param {string} color - Hex color
 * @returns {string} SVG string
 */
export function generateMiniCrewmateSVG(color) {
    return `
    <svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="18" y="8" width="4" height="10" rx="1" fill="${darkenColor(color, 0.2)}"/>
        <path d="M6 10 Q6 4, 12 4 Q18 4, 18 10 L18 20 Q18 24, 14 24 L14 27 L10 27 L10 24 Q6 24, 6 20 Z" fill="${color}"/>
        <ellipse cx="13" cy="10" rx="5" ry="4" fill="rgba(150,200,255,0.5)"/>
    </svg>`;
}

/**
 * Lighten a hex color
 * @param {string} hex - Hex color
 * @param {number} amount - Amount to lighten (0-1)
 * @returns {string} Lightened hex color
 */
function lightenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Darken a hex color
 * @param {string} hex - Hex color
 * @param {number} amount - Amount to darken (0-1)
 * @returns {string} Darkened hex color
 */
function darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
    const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
    const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Format a number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
    return num?.toLocaleString() || '0';
}

/**
 * Format percentage
 * @param {number} num - Number to format as percentage
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted percentage
 */
export function formatPercent(num, decimals = 1) {
    return `${(num || 0).toFixed(decimals)}%`;
}

/**
 * Get rank suffix (1st, 2nd, 3rd, etc.)
 * @param {number} rank - Rank number
 * @returns {string} Rank with suffix
 */
export function getRankSuffix(rank) {
    const j = rank % 10;
    const k = rank % 100;

    if (j === 1 && k !== 11) return rank + 'st';
    if (j === 2 && k !== 12) return rank + 'nd';
    if (j === 3 && k !== 13) return rank + 'rd';
    return rank + 'th';
}

/**
 * Get ELO tier based on rating
 * @param {number} elo - ELO rating
 * @returns {Object} Tier info with name and color
 */
export function getEloTier(elo) {
    if (elo >= 1100) return { name: 'Elite', color: '#ffd700' };
    if (elo >= 1050) return { name: 'Diamond', color: '#38fedc' };
    if (elo >= 1020) return { name: 'Platinum', color: '#a0d8ef' };
    if (elo >= 1000) return { name: 'Gold', color: '#ffa500' };
    if (elo >= 980) return { name: 'Silver', color: '#c0c0c0' };
    if (elo >= 950) return { name: 'Bronze', color: '#cd7f32' };
    return { name: 'Iron', color: '#71717a' };
}

/**
 * Search players by name
 * @param {string} query - Search query
 * @param {Array} players - Players array (optional, uses loaded data if not provided)
 * @returns {Array} Matching players
 */
export function searchPlayers(query, players = null) {
    const list = players || getPlayers();
    if (!query) return list;

    const q = query.toLowerCase();
    return list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.id.includes(q)
    );
}

/**
 * Sort players by a metric
 * @param {Array} players - Players array
 * @param {string} metric - Metric to sort by
 * @param {boolean} ascending - Sort direction
 * @returns {Array} Sorted players
 */
export function sortPlayers(players, metric, ascending = false) {
    const sorted = [...players];

    const getValue = (player) => {
        switch (metric) {
            case 'elo': return player.elo?.elo || 0;
            case 'imposter': return player.elo?.imposter_score || 0;
            case 'crewmate': return player.elo?.crewmate_score || 0;
            case 'games': return player.games_played || 0;
            case 'winrate': return player.win_pct || 0;
            case 'kdr': return player.kdr || 0;
            case 'rank': return player.elo?.rank || 999;
            default: return player.elo?.elo || 0;
        }
    };

    sorted.sort((a, b) => {
        const aVal = getValue(a);
        const bVal = getValue(b);
        return ascending ? aVal - bVal : bVal - aVal;
    });

    return sorted;
}

/**
 * Filter players
 * @param {Array} players - Players array
 * @param {Object} filters - Filter options
 * @returns {Array} Filtered players
 */
export function filterPlayers(players, filters = {}) {
    let filtered = [...players];

    if (filters.minGames) {
        filtered = filtered.filter(p => p.games_played >= filters.minGames);
    }

    if (filters.type === 'sidemen') {
        filtered = filtered.filter(p => p.is_sidemen);
    } else if (filters.type === 'guests') {
        filtered = filtered.filter(p => !p.is_sidemen);
    }

    return filtered;
}

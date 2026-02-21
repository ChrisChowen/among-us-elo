/**
 * Awards Component
 * Renders fun awards and achievements
 */

import { generateMiniCrewmateSVG } from '../data.js';

/**
 * Render awards grid
 * @param {HTMLElement} container - Awards container
 * @param {Array} awards - Awards data
 */
export function renderAwards(container, awards) {
    if (!container || !awards?.length) return;

    container.innerHTML = awards.map(award => `
        <article class="award-card" data-award="${award.id}">
            <div class="award-icon">${award.icon}</div>
            <h4 class="award-title">${award.title}</h4>
            <div class="award-winner" style="color: ${award.winner_color}">
                ${award.winner}
            </div>
            <div class="award-stat">${award.stat}</div>
            <p class="award-description">${award.description}</p>
        </article>
    `).join('');
}

/**
 * Render trend cards
 * @param {HTMLElement} container - Trends container
 * @param {Object} globalStats - Global statistics
 * @param {Array} players - Player data
 */
export function renderTrends(container, globalStats, players) {
    if (!container) return;

    const sidemen = players.filter(p => p.is_sidemen);
    const guests = players.filter(p => !p.is_sidemen);

    // Calculate additional insights
    const avgSidemenElo = sidemen.reduce((sum, p) => sum + (p.elo?.elo || 1000), 0) / sidemen.length;
    const avgGuestElo = guests.reduce((sum, p) => sum + (p.elo?.elo || 1000), 0) / guests.length;

    const mostGames = players.reduce((max, p) => p.games_played > max.games_played ? p : max, players[0]);
    const highestKdr = players.filter(p => p.games_played >= 10).reduce((max, p) => p.kdr > max.kdr ? p : max, players[0]);

    const trends = [
        {
            title: 'Most Experienced',
            value: `${mostGames.games_played} games`,
            description: `${mostGames.name} has played the most Among Us games.`
        },
        {
            title: 'Deadliest Player',
            value: `${highestKdr.kdr.toFixed(2)} K/D`,
            description: `${highestKdr.name} has the highest K/D ratio (min 10 games).`
        },
        {
            title: 'Sidemen Average ELO',
            value: Math.round(avgSidemenElo),
            description: `The 7 Sidemen average ${Math.round(avgSidemenElo)} ELO across ${sidemen.reduce((s, p) => s + p.games_played, 0)} combined games.`
        },
        {
            title: 'Guest Average ELO',
            value: Math.round(avgGuestElo),
            description: `${guests.length} guests average ${Math.round(avgGuestElo)} ELO rating.`
        },
        {
            title: 'Newcomer Effect',
            value: `+${globalStats.newcomer_advantage?.toFixed(1) || 0}%`,
            description: `Guests have a ${globalStats.newcomer_advantage?.toFixed(1) || 0}% higher weighted win rate, possibly due to being less "read" by regulars.`
        },
        {
            title: 'Total Games Tracked',
            value: `~${globalStats.total_games_tracked?.toLocaleString() || 0}`,
            description: 'Approximate number of unique Among Us games in this dataset.'
        },
    ];

    container.innerHTML = trends.map(trend => `
        <div class="trend-card">
            <h4>${trend.title}</h4>
            <div class="trend-value">${trend.value}</div>
            <p>${trend.description}</p>
        </div>
    `).join('');
}

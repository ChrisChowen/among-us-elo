/**
 * Player Card Component
 * Renders player cards with 3D flip effect
 */

import { generateCrewmateSVG, formatPercent, getRankSuffix, getEloTier } from '../data.js';

/**
 * Create a player card element
 * @param {Object} player - Player data
 * @returns {HTMLElement} Player card element
 */
export function createPlayerCard(player) {
    const card = document.createElement('article');
    card.className = 'player-card';
    card.dataset.playerId = player.id;

    const tier = getEloTier(player.elo?.elo || 1000);

    card.innerHTML = `
        <div class="player-card-inner">
            <div class="player-card-front">
                <div class="player-avatar">
                    ${generateCrewmateSVG(player.color)}
                </div>
                <h3 class="player-name" style="color: ${player.color}">${player.name}</h3>
                <div class="player-elo" style="color: ${tier.color}">
                    ${player.elo?.elo || '---'}
                </div>
                <div class="player-rank">${getRankSuffix(player.elo?.rank || 0)}</div>
                <div class="player-tags">
                    ${player.is_sidemen ? '<span class="player-tag sidemen">Sidemen</span>' : ''}
                    <span class="player-tag" style="background: ${tier.color}20; color: ${tier.color}">${tier.name}</span>
                </div>
            </div>
            <div class="player-card-back">
                <h4 style="color: ${player.color}; margin-bottom: 0.75rem;">${player.name}</h4>
                <div class="card-stats">
                    <div class="card-stat">
                        <span class="card-stat-label">Games</span>
                        <span class="card-stat-value">${player.games_played}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-label">Win Rate</span>
                        <span class="card-stat-value">${formatPercent(player.win_pct)}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-label">K/D Ratio</span>
                        <span class="card-stat-value">${player.kdr.toFixed(2)}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-label">Imp Win%</span>
                        <span class="card-stat-value">${formatPercent(player.imposter_win_pct)}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-label">Crew Win%</span>
                        <span class="card-stat-value">${formatPercent(player.crewmate_win_pct)}</span>
                    </div>
                    <div class="card-stat">
                        <span class="card-stat-label">Tasks</span>
                        <span class="card-stat-value">${formatPercent(player.task_completion_pct)}</span>
                    </div>
                </div>
                <div class="card-action">
                    <a href="#player/${player.id}">View Full Profile &rarr;</a>
                </div>
            </div>
        </div>
    `;

    // Touch support for flip
    let touchStartX = 0;
    card.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 50) {
            card.classList.toggle('flipped');
        }
    }, { passive: true });

    return card;
}

/**
 * Render player cards grid
 * @param {HTMLElement} container - Container element
 * @param {Array} players - Array of player data
 */
export function renderPlayerCards(container, players) {
    if (!container) return;

    container.innerHTML = '';

    if (!players?.length) {
        container.innerHTML = `
            <div class="no-results">
                <p>No players found</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    players.forEach(player => {
        const card = createPlayerCard(player);
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

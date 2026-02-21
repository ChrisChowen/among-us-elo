#!/usr/bin/env python3
"""
Build player data JSON from CSV for the Among Us Analytics Dashboard.
Includes raw stats, ELO data, and derived metrics.
"""

import csv
import json
import math
from pathlib import Path


# Sidemen get specific Among Us colors
SIDEMEN_COLORS = {
    'Josh': '#117f2d',      # Green
    'Ethan': '#c51111',     # Red
    'Simon': '#d6e0f0',     # White
    'Harry': '#38fedc',     # Cyan
    'JJ': '#ed54ba',        # Pink
    'Tobi': '#3f474e',      # Black
    'Vik': '#6b2fbc',       # Purple
}

# All Among Us colors for guests (assigned by name hash)
AU_COLORS = [
    '#c51111',  # Red
    '#132ed1',  # Blue
    '#117f2d',  # Green
    '#ed54ba',  # Pink
    '#ef7d0d',  # Orange
    '#f5f557',  # Yellow
    '#3f474e',  # Black
    '#d6e0f0',  # White
    '#6b2fbc',  # Purple
    '#71491e',  # Brown
    '#38fedc',  # Cyan
    '#50ef39',  # Lime
    '#6b2f7b',  # Maroon (darker purple)
    '#ec7578',  # Rose/Coral
    '#928776',  # Tan/Banana
    '#758cba',  # Gray
]


def hash_color(name: str) -> str:
    """Generate consistent color from name hash."""
    h = 0
    for char in name:
        h = ord(char) + ((h << 5) - h)
    return AU_COLORS[abs(h) % len(AU_COLORS)]


def get_player_color(name: str) -> str:
    """Get player's Among Us color."""
    return SIDEMEN_COLORS.get(name, hash_color(name))


def safe_float(val, default=0.0):
    """Safely convert to float."""
    if val is None or val == '':
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    """Safely convert to int."""
    if val is None or val == '':
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def calculate_derived_metrics(player: dict) -> dict:
    """Calculate derived metrics for fun insights."""
    games = player['games_played']
    crew_games = player['crewmate_games']
    imp_games = player['imposter_games']

    derived = {}

    # Sus Index: How often they get voted out (higher = more sus)
    voted_out = player['voted_out']
    derived['sus_index'] = round(voted_out / games, 3) if games > 0 else 0

    # Detective Score: Bodies reported per crewmate game
    bodies = player['bodies_reported']
    derived['detective_score'] = round(bodies / crew_games, 3) if crew_games > 0 else 0

    # Survivability: How often they avoid being first death
    first_death = player['first_death']
    derived['survivability'] = round(1 - (first_death / games), 3) if games > 0 else 0

    # Threat Level: KDR × imposter win rate (how dangerous as imposter)
    kdr = player['kdr']
    imp_win_pct = player['imposter_win_pct'] / 100 if player['imposter_win_pct'] else 0
    derived['threat_level'] = round(kdr * imp_win_pct, 3)

    # Aggression: Emergency meetings per crewmate game
    meetings = player['emergency_meetings']
    derived['aggression'] = round(meetings / crew_games, 3) if crew_games > 0 else 0

    # Kill efficiency: Kills per imposter game
    derived['kill_efficiency'] = player['kills_per_imposter_game']

    # Task dedication: Task completion percentage (already have this)
    derived['task_dedication'] = player['task_completion_pct']

    # First death rate
    derived['first_death_rate'] = round(first_death / games, 3) if games > 0 else 0

    # Voted out first rate (as imposter, indicates poor deception)
    voted_first = player['voted_out_first']
    derived['caught_first_rate'] = round(voted_first / imp_games, 3) if imp_games > 0 else 0

    return derived


def load_elo_data(elo_path: Path) -> dict:
    """Load ELO rankings from CSV."""
    elo_map = {}
    with open(elo_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row['Name']
            elo_map[name] = {
                'rank': safe_int(row['Rank']),
                'elo': safe_int(row['ELO']),
                'imposter_score': safe_float(row['Imposter Score']),
                'crewmate_score': safe_float(row['Crewmate Score']),
                'general_score': safe_float(row['General Score']),
                'composite': safe_float(row['Composite']),
                'confidence': safe_float(row['Confidence']),
            }
    return elo_map


def process_player(row: dict, elo_data: dict) -> dict:
    """Process a single player row into structured data."""
    name = row['Name']

    player = {
        'id': name.lower().replace(' ', '-'),
        'name': name,
        'color': get_player_color(name),
        'is_sidemen': name in SIDEMEN_COLORS,

        # Games
        'games_played': safe_int(row['Games Played']),
        'wins': safe_int(row['Wins']),
        'losses': safe_int(row['Losses']),
        'win_pct': safe_float(row['Win %']),

        # Combat
        'kills': safe_int(row['Kills']),
        'deaths': safe_int(row['Deaths']),
        'kdr': safe_float(row['KDR']),
        'kills_as_imposter': safe_int(row['Kills as Imposter']),
        'kills_per_imposter_game': safe_float(row['Kills Per Imposter Game']),

        # Imposter
        'imposter_games': safe_int(row['Imposter Games']),
        'imposter_wins': safe_int(row['Imposter Wins']),
        'imposter_win_pct': safe_float(row['Imposter Win %']),

        # Crewmate
        'crewmate_games': safe_int(row['Crewmate Games']),
        'crewmate_wins': safe_int(row['Crewmate Wins']),
        'crewmate_win_pct': safe_float(row['Crewmate Win %']),

        # Neutral
        'neutral_games': safe_int(row['Neutral Games']),
        'neutral_wins': safe_int(row['Neutral Wins']),
        'neutral_win_pct': safe_float(row['Neutral Win %']),

        # Lover
        'lover_games': safe_int(row['Lover Games']),
        'lover_wins': safe_int(row['Lover Wins']),
        'lover_win_pct': safe_float(row['Lover Win %']),

        # Tasks
        'total_tasks': safe_int(row['Total Tasks']),
        'tasks_completed': safe_int(row['Tasks Completed']),
        'task_completion_pct': safe_float(row['Task Completion %']),
        'all_tasks_completed': safe_int(row['All Tasks Completed']),

        # Events
        'voted_out': safe_int(row['Voted out']),
        'emergency_meetings': safe_int(row['Emergency Meetings']),
        'bodies_reported': safe_int(row['Bodies Reported']),
        'voted_out_first': safe_int(row['Voted out First']),
        'first_death': safe_int(row['First Death of Game']),
        'death_in_first_round': safe_int(row['Death in First Round']),

        # Behavior
        'disconnected': safe_int(row['Disconnected']),
        'rage_quit': safe_int(row['Rage Quit']),
    }

    # Add ELO data
    if name in elo_data:
        player['elo'] = elo_data[name]
    else:
        player['elo'] = {
            'rank': 999,
            'elo': 1000,
            'imposter_score': 0,
            'crewmate_score': 0,
            'general_score': 0,
            'composite': 0,
            'confidence': 0,
        }

    # Add derived metrics
    player['derived'] = calculate_derived_metrics(player)

    return player


def calculate_global_stats(players: list) -> dict:
    """Calculate global/aggregate statistics."""
    total_games = sum(p['games_played'] for p in players)
    total_kills = sum(p['kills'] for p in players)
    total_deaths = sum(p['deaths'] for p in players)

    sidemen = [p for p in players if p['is_sidemen']]
    guests = [p for p in players if not p['is_sidemen']]

    # Average win rates
    sidemen_win_pct = sum(p['win_pct'] for p in sidemen) / len(sidemen) if sidemen else 0
    guests_win_pct = sum(p['win_pct'] for p in guests) / len(guests) if guests else 0

    # Weighted average (by games played)
    sidemen_games = sum(p['games_played'] for p in sidemen)
    guests_games = sum(p['games_played'] for p in guests)

    sidemen_wins = sum(p['wins'] for p in sidemen)
    guests_wins = sum(p['wins'] for p in guests)

    sidemen_weighted_win = (sidemen_wins / sidemen_games * 100) if sidemen_games > 0 else 0
    guests_weighted_win = (guests_wins / guests_games * 100) if guests_games > 0 else 0

    return {
        'total_players': len(players),
        'sidemen_count': len(sidemen),
        'guest_count': len(guests),
        'total_games_tracked': total_games // 2,  # Approximate unique games
        'total_kills': total_kills,
        'total_deaths': total_deaths,
        'avg_win_pct': sum(p['win_pct'] for p in players) / len(players),
        'sidemen_avg_win_pct': round(sidemen_win_pct, 2),
        'guests_avg_win_pct': round(guests_win_pct, 2),
        'sidemen_weighted_win_pct': round(sidemen_weighted_win, 2),
        'guests_weighted_win_pct': round(guests_weighted_win, 2),
        'newcomer_advantage': round(guests_weighted_win - sidemen_weighted_win, 2),
    }


def calculate_awards(players: list) -> list:
    """Calculate fun awards based on player stats."""
    # Filter to players with enough games
    min_games = 5
    eligible = [p for p in players if p['games_played'] >= min_games]

    awards = []

    # Most Likely to Die First
    first_death_sorted = sorted(eligible, key=lambda p: p['derived']['first_death_rate'], reverse=True)
    if first_death_sorted:
        winner = first_death_sorted[0]
        awards.append({
            'id': 'first-death',
            'title': 'Most Likely to Die First',
            'icon': '💀',
            'winner': winner['name'],
            'winner_color': winner['color'],
            'stat': f"{winner['derived']['first_death_rate'] * 100:.1f}% of games",
            'description': 'First to fall in the most games'
        })

    # Trust Issues (most emergency meetings called)
    meetings_sorted = sorted(eligible, key=lambda p: p['derived']['aggression'], reverse=True)
    if meetings_sorted:
        winner = meetings_sorted[0]
        awards.append({
            'id': 'trust-issues',
            'title': 'Trust Issues',
            'icon': '🚨',
            'winner': winner['name'],
            'winner_color': winner['color'],
            'stat': f"{winner['derived']['aggression']:.2f} meetings/game",
            'description': 'Most emergency meetings called'
        })

    # Silent Killer (high kills, low sus)
    imp_eligible = [p for p in eligible if p['imposter_games'] >= 5]
    if imp_eligible:
        # Score: kills/game * (1 - caught_first_rate)
        for p in imp_eligible:
            p['_silent_score'] = p['kills_per_imposter_game'] * (1 - p['derived']['caught_first_rate'])
        silent_sorted = sorted(imp_eligible, key=lambda p: p['_silent_score'], reverse=True)
        winner = silent_sorted[0]
        awards.append({
            'id': 'silent-killer',
            'title': 'Silent Killer',
            'icon': '🔪',
            'winner': winner['name'],
            'winner_color': winner['color'],
            'stat': f"{winner['kills_per_imposter_game']:.1f} kills/game, {winner['derived']['caught_first_rate'] * 100:.0f}% caught",
            'description': 'High kills with low suspicion'
        })

    # Dedicated Worker (highest task completion)
    task_eligible = [p for p in eligible if p['task_completion_pct'] > 0]
    if task_eligible:
        task_sorted = sorted(task_eligible, key=lambda p: p['task_completion_pct'], reverse=True)
        winner = task_sorted[0]
        awards.append({
            'id': 'dedicated-worker',
            'title': 'Dedicated Worker',
            'icon': '📋',
            'winner': winner['name'],
            'winner_color': winner['color'],
            'stat': f"{winner['task_completion_pct']:.1f}% completion",
            'description': 'Highest task completion rate'
        })

    # Detective (most bodies found)
    detective_sorted = sorted(eligible, key=lambda p: p['derived']['detective_score'], reverse=True)
    if detective_sorted:
        winner = detective_sorted[0]
        awards.append({
            'id': 'detective',
            'title': 'Detective',
            'icon': '🔍',
            'winner': winner['name'],
            'winner_color': winner['color'],
            'stat': f"{winner['derived']['detective_score']:.2f} bodies/game",
            'description': 'Most bodies reported per game'
        })

    # Sus Lord (most voted out)
    sus_sorted = sorted(eligible, key=lambda p: p['derived']['sus_index'], reverse=True)
    if sus_sorted:
        winner = sus_sorted[0]
        awards.append({
            'id': 'sus-lord',
            'title': 'Sus Lord',
            'icon': '👀',
            'winner': winner['name'],
            'winner_color': winner['color'],
            'stat': f"{winner['derived']['sus_index'] * 100:.1f}% ejected",
            'description': 'Gets voted out the most'
        })

    # Survivor (best survivability)
    survivor_sorted = sorted(eligible, key=lambda p: p['derived']['survivability'], reverse=True)
    if survivor_sorted:
        winner = survivor_sorted[0]
        awards.append({
            'id': 'survivor',
            'title': 'Survivor',
            'icon': '🛡️',
            'winner': winner['name'],
            'winner_color': winner['color'],
            'stat': f"{winner['derived']['survivability'] * 100:.1f}% survival",
            'description': 'Avoids being first death'
        })

    # Threat Level (most dangerous imposter)
    if imp_eligible:
        threat_sorted = sorted(imp_eligible, key=lambda p: p['derived']['threat_level'], reverse=True)
        winner = threat_sorted[0]
        awards.append({
            'id': 'threat-level',
            'title': 'Maximum Threat',
            'icon': '⚠️',
            'winner': winner['name'],
            'winner_color': winner['color'],
            'stat': f"Threat: {winner['derived']['threat_level']:.2f}",
            'description': 'Highest KDR × imposter win rate'
        })

    return awards


def main():
    """Main entry point."""
    base_path = Path(__file__).parent.parent
    csv_path = base_path / '2026-02-03T06-59_export.csv'
    elo_path = base_path / 'elo_rankings.csv'
    output_path = base_path / 'data' / 'players.json'

    print(f"Loading data from {csv_path}...")

    # Load ELO data
    elo_data = load_elo_data(elo_path)
    print(f"Loaded ELO data for {len(elo_data)} players")

    # Process player data
    players = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('Name'):
                player = process_player(row, elo_data)
                players.append(player)

    print(f"Processed {len(players)} players")

    # Sort by ELO rank
    players.sort(key=lambda p: p['elo']['rank'])

    # Calculate global stats
    global_stats = calculate_global_stats(players)
    print(f"Global stats: {global_stats['total_players']} players, ~{global_stats['total_games_tracked']} games")

    # Calculate awards
    awards = calculate_awards(players)
    print(f"Generated {len(awards)} awards")

    # Build final output
    output = {
        'generated': '2026-02-03',
        'version': '1.0',
        'global_stats': global_stats,
        'awards': awards,
        'players': players,
    }

    # Write JSON
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)

    print(f"Written to {output_path}")
    print("Done!")


if __name__ == '__main__':
    main()

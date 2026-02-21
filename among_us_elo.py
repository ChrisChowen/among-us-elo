#!/usr/bin/env python3
"""
Among Us Sidemen ELO Rating System

A comprehensive skill rating system for Among Us players based on
performance metrics from Sidemen games.

Usage:
    python among_us_elo.py
"""

import pandas as pd
import numpy as np
import math
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
from pathlib import Path


@dataclass
class PlayerRating:
    """Complete rating data for a single player"""
    name: str
    games_played: int

    # Sub-scores (0-1 scale)
    imposter_score: float
    crewmate_score: float
    general_score: float
    composite_score: float

    # Role-specific data
    imposter_games: int = 0
    crewmate_games: int = 0
    imposter_win_pct: float = 0.0
    crewmate_win_pct: float = 0.0
    kills_per_imp_game: float = 0.0
    task_completion_pct: float = 0.0

    # Confidence and final rating
    confidence: float = 0.0
    final_elo: int = 1000
    rank: int = 0

    # Strengths/weaknesses for player cards
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)


class AmongUsELOSystem:
    """
    Comprehensive ELO rating system for Among Us players.

    Calculates ratings based on:
    - Imposter performance (kills, wins, deception)
    - Crewmate performance (tasks, detection, survival)
    - General metrics (overall wins, consistency, behavior)
    """

    # ELO Configuration
    BASE_ELO = 1000
    ELO_RANGE = 1000  # Produces 500-1500 range

    # Component weights
    ROLE_WEIGHTS = {
        'imposter': 0.35,
        'crewmate': 0.35,
        'general': 0.30
    }

    # Imposter sub-weights
    IMPOSTER_WEIGHTS = {
        'win_rate': 0.35,
        'kills_per_game': 0.25,
        'kdr': 0.15,
        'not_voted_first': 0.15,
        'deception_bonus': 0.10
    }

    # Crewmate sub-weights
    CREWMATE_WEIGHTS = {
        'win_rate': 0.30,
        'task_completion': 0.25,
        'all_tasks_rate': 0.15,
        'bodies_reported': 0.15,
        'survival': 0.10,
        'emergency_meetings': 0.05
    }

    # General sub-weights (minimal behavior penalty per user preference)
    GENERAL_WEIGHTS = {
        'overall_win_rate': 0.45,
        'consistency': 0.30,
        'first_death_avoidance': 0.20,
        'behavior': 0.05
    }

    def __init__(self, csv_path: str):
        """Initialize with path to the data CSV"""
        self.csv_path = Path(csv_path)
        self.df = None
        self.results: List[PlayerRating] = []
        self._load_and_preprocess()

    def _load_and_preprocess(self):
        """Load CSV and preprocess data"""
        self.df = pd.read_csv(self.csv_path)

        # Convert percentage columns to numeric
        pct_cols = [col for col in self.df.columns if '%' in col]
        for col in pct_cols:
            self.df[col] = pd.to_numeric(self.df[col], errors='coerce')

        # Convert other numeric columns
        numeric_cols = ['Games Played', 'Wins', 'Losses', 'Kills', 'Deaths', 'KDR',
                       'Kills as Imposter', 'Kills Per Imposter Game',
                       'Imposter Games', 'Imposter Wins', 'Crewmate Games', 'Crewmate Wins',
                       'Neutral Games', 'Neutral Wins', 'Lover Games', 'Lover Wins',
                       'Total Tasks', 'Tasks Completed', 'All Tasks Completed',
                       'Voted out', 'Emergency Meetings', 'Bodies Reported',
                       'Voted out First', 'First Death of Game', 'Death in First Round',
                       'Disconnected', 'Rage Quit']

        for col in numeric_cols:
            if col in self.df.columns:
                self.df[col] = pd.to_numeric(self.df[col], errors='coerce').fillna(0)

        # Impute missing task completion percentages
        self._impute_task_data()

    def _impute_task_data(self):
        """Impute missing task data using cohort medians"""
        if 'Task Completion %' not in self.df.columns:
            return

        # Create games quartiles for grouping
        self.df['games_quartile'] = pd.qcut(
            self.df['Games Played'].rank(method='first'),
            q=4,
            labels=['Q1', 'Q2', 'Q3', 'Q4']
        )

        # Fill missing task completion with quartile median
        for quartile in ['Q1', 'Q2', 'Q3', 'Q4']:
            mask = self.df['games_quartile'] == quartile
            median_val = self.df.loc[mask, 'Task Completion %'].median()
            if pd.isna(median_val):
                median_val = 30.0  # Default fallback

            fill_mask = mask & self.df['Task Completion %'].isna()
            self.df.loc[fill_mask, 'Task Completion %'] = median_val

    def _safe_get(self, row: pd.Series, col: str, default: float = 0.0) -> float:
        """Safely get a value from a row, returning default if NaN"""
        val = row.get(col, default)
        return default if pd.isna(val) else float(val)

    def _calculate_confidence(self, games: int, half_conf: int = 30) -> float:
        """
        Calculate confidence multiplier based on games played.
        Uses sigmoid curve: low games = pulled toward average.
        """
        MIN_MULTIPLIER = 0.5
        MAX_GAMES = 100

        if games >= MAX_GAMES:
            return 1.0

        if games <= 0:
            return MIN_MULTIPLIER

        # Sigmoid function
        k = 0.1
        confidence = 1 / (1 + math.exp(-k * (games - half_conf)))

        # Scale to [MIN_MULTIPLIER, 1.0]
        return MIN_MULTIPLIER + (1 - MIN_MULTIPLIER) * confidence

    def _calculate_imposter_score(self, row: pd.Series) -> Tuple[float, float, dict]:
        """
        Calculate imposter sub-score.
        Returns: (score, confidence, metrics_dict)
        """
        imp_games = int(self._safe_get(row, 'Imposter Games'))

        if imp_games == 0:
            return 0.0, 0.0, {}

        # Win rate (0-1)
        win_rate = self._safe_get(row, 'Imposter Win %') / 100

        # Kills per game normalized to 3.0 as excellent
        kills_per_game = self._safe_get(row, 'Kills Per Imposter Game')
        kills_norm = min(kills_per_game / 3.0, 1.0)

        # KDR normalized to 2.0 as excellent
        kdr = self._safe_get(row, 'KDR')
        kdr_norm = min(kdr / 2.0, 1.0)

        # Not voted out first rate
        voted_first = self._safe_get(row, 'Voted out First')
        not_voted_first = max(1 - (voted_first / imp_games), 0)

        # Deception bonus (base value)
        deception = 0.5

        score = (
            self.IMPOSTER_WEIGHTS['win_rate'] * win_rate +
            self.IMPOSTER_WEIGHTS['kills_per_game'] * kills_norm +
            self.IMPOSTER_WEIGHTS['kdr'] * kdr_norm +
            self.IMPOSTER_WEIGHTS['not_voted_first'] * not_voted_first +
            self.IMPOSTER_WEIGHTS['deception_bonus'] * deception
        )

        confidence = self._calculate_confidence(imp_games, half_conf=15)

        metrics = {
            'win_rate': win_rate,
            'kills_per_game': kills_per_game,
            'kdr': kdr,
            'not_voted_first': not_voted_first
        }

        return score, confidence, metrics

    def _calculate_crewmate_score(self, row: pd.Series) -> Tuple[float, float, dict]:
        """
        Calculate crewmate sub-score.
        Returns: (score, confidence, metrics_dict)
        """
        crew_games = int(self._safe_get(row, 'Crewmate Games'))

        if crew_games == 0:
            return 0.0, 0.0, {}

        # Win rate
        win_rate = self._safe_get(row, 'Crewmate Win %') / 100

        # Task completion
        task_pct = self._safe_get(row, 'Task Completion %') / 100

        # All tasks completed rate
        all_tasks = self._safe_get(row, 'All Tasks Completed')
        all_tasks_rate = min(all_tasks / crew_games, 1.0)

        # Bodies reported (shows awareness)
        bodies = self._safe_get(row, 'Bodies Reported')
        bodies_rate = min(bodies / crew_games, 1.0)

        # Survival rate (as crewmate)
        deaths = self._safe_get(row, 'Deaths')
        total_games = self._safe_get(row, 'Games Played')
        # Estimate crewmate deaths proportionally
        crew_death_est = deaths * (crew_games / total_games) if total_games > 0 else 0
        survival = max(1 - (crew_death_est / crew_games), 0)

        # Emergency meetings (moderate usage is good)
        meetings = self._safe_get(row, 'Emergency Meetings')
        meeting_rate = min(meetings / crew_games * 3, 1.0)

        score = (
            self.CREWMATE_WEIGHTS['win_rate'] * win_rate +
            self.CREWMATE_WEIGHTS['task_completion'] * task_pct +
            self.CREWMATE_WEIGHTS['all_tasks_rate'] * all_tasks_rate +
            self.CREWMATE_WEIGHTS['bodies_reported'] * bodies_rate +
            self.CREWMATE_WEIGHTS['survival'] * survival +
            self.CREWMATE_WEIGHTS['emergency_meetings'] * meeting_rate
        )

        confidence = self._calculate_confidence(crew_games, half_conf=30)

        metrics = {
            'win_rate': win_rate,
            'task_pct': task_pct * 100,
            'all_tasks_rate': all_tasks_rate,
            'bodies_rate': bodies_rate,
            'survival': survival
        }

        return score, confidence, metrics

    def _calculate_general_score(self, row: pd.Series) -> Tuple[float, float]:
        """Calculate general/meta score"""
        games = int(self._safe_get(row, 'Games Played'))

        if games == 0:
            return 0.0, 0.0

        # Overall win rate
        win_rate = self._safe_get(row, 'Win %') / 100

        # Consistency across roles
        role_wins = []
        for role in ['Imposter', 'Crewmate', 'Neutral']:
            role_games = self._safe_get(row, f'{role} Games')
            if role_games >= 3:
                role_win_pct = self._safe_get(row, f'{role} Win %') / 100
                role_wins.append(role_win_pct)

        if len(role_wins) >= 2:
            consistency = 1 - min(np.std(role_wins) * 2, 0.5)
        else:
            consistency = 0.5

        # First death avoidance
        first_death = self._safe_get(row, 'First Death of Game')
        survival = max(1 - (first_death / games), 0)

        # Behavior (minimal weight per user preference)
        disconnects = self._safe_get(row, 'Disconnected')
        rage_quits = self._safe_get(row, 'Rage Quit')
        behavior = max(1 - (disconnects + rage_quits) / games, 0)

        score = (
            self.GENERAL_WEIGHTS['overall_win_rate'] * win_rate +
            self.GENERAL_WEIGHTS['consistency'] * consistency +
            self.GENERAL_WEIGHTS['first_death_avoidance'] * survival +
            self.GENERAL_WEIGHTS['behavior'] * behavior
        )

        confidence = self._calculate_confidence(games, half_conf=50)

        return score, confidence

    def _calculate_composite(self, imp_score: float, imp_conf: float,
                             crew_score: float, crew_conf: float,
                             gen_score: float, gen_conf: float) -> Tuple[float, float]:
        """Calculate weighted composite score with dynamic reweighting"""
        weights = self.ROLE_WEIGHTS.copy()

        # Reweight if missing role data
        if imp_conf == 0:
            weights['imposter'] = 0
            weights['crewmate'] += 0.20
            weights['general'] += 0.15

        if crew_conf == 0:
            weights['crewmate'] = 0
            weights['imposter'] += 0.20
            weights['general'] += 0.15

        # Normalize
        total = sum(weights.values())
        if total > 0:
            weights = {k: v/total for k, v in weights.items()}
        else:
            return 0.5, 0.5

        composite = (
            weights['imposter'] * imp_score +
            weights['crewmate'] * crew_score +
            weights['general'] * gen_score
        )

        combined_conf = (
            weights['imposter'] * imp_conf +
            weights['crewmate'] * crew_conf +
            weights['general'] * gen_conf
        )

        return composite, combined_conf

    def _score_to_elo(self, composite: float, confidence: float) -> int:
        """Convert composite score to ELO rating"""
        # Apply confidence (pulls toward center for low confidence)
        adjusted = 0.5 + (composite - 0.5) * confidence

        # Scale to ELO
        elo = self.BASE_ELO + (adjusted - 0.5) * self.ELO_RANGE

        return int(max(500, min(1500, elo)))

    def _identify_strengths_weaknesses(self, player: PlayerRating,
                                        imp_metrics: dict,
                                        crew_metrics: dict) -> None:
        """Identify player strengths and weaknesses for player cards"""
        strengths = []
        weaknesses = []

        # Imposter analysis
        if player.imposter_games >= 5:
            if imp_metrics.get('win_rate', 0) >= 0.50:
                strengths.append(f"Elite Imposter ({player.imposter_win_pct:.0f}% win rate)")
            elif imp_metrics.get('win_rate', 0) < 0.30:
                weaknesses.append("Struggles as Imposter")

            if imp_metrics.get('kills_per_game', 0) >= 2.5:
                strengths.append(f"Lethal killer ({player.kills_per_imp_game:.1f} kills/game)")
            elif imp_metrics.get('kills_per_game', 0) < 1.5 and player.imposter_games >= 10:
                weaknesses.append("Low kill rate as Imposter")

        # Crewmate analysis
        if player.crewmate_games >= 10:
            if crew_metrics.get('win_rate', 0) >= 0.55:
                strengths.append(f"Strong Crewmate ({player.crewmate_win_pct:.0f}% win rate)")
            elif crew_metrics.get('win_rate', 0) < 0.40:
                weaknesses.append("Weak Crewmate performance")

            if crew_metrics.get('task_pct', 0) >= 50:
                strengths.append(f"Dedicated task doer ({player.task_completion_pct:.0f}%)")
            elif crew_metrics.get('task_pct', 0) < 25:
                weaknesses.append("Neglects tasks")

            if crew_metrics.get('bodies_rate', 0) >= 0.3:
                strengths.append("Sharp body finder")

        # General analysis
        if player.games_played >= 50:
            if player.composite_score >= 0.55:
                strengths.append("Consistent high performer")

            if player.confidence >= 0.95:
                strengths.append(f"Veteran ({player.games_played} games)")

        player.strengths = strengths[:4]  # Cap at 4
        player.weaknesses = weaknesses[:3]  # Cap at 3

    def calculate_all_ratings(self) -> pd.DataFrame:
        """Main method: Calculate ELO for all players"""
        self.results = []

        for _, row in self.df.iterrows():
            # Calculate sub-scores
            imp_score, imp_conf, imp_metrics = self._calculate_imposter_score(row)
            crew_score, crew_conf, crew_metrics = self._calculate_crewmate_score(row)
            gen_score, gen_conf = self._calculate_general_score(row)

            # Composite score
            composite, combined_conf = self._calculate_composite(
                imp_score, imp_conf,
                crew_score, crew_conf,
                gen_score, gen_conf
            )

            # Convert to ELO
            final_elo = self._score_to_elo(composite, combined_conf)

            player = PlayerRating(
                name=row['Name'],
                games_played=int(self._safe_get(row, 'Games Played')),
                imposter_score=round(imp_score, 3),
                crewmate_score=round(crew_score, 3),
                general_score=round(gen_score, 3),
                composite_score=round(composite, 3),
                imposter_games=int(self._safe_get(row, 'Imposter Games')),
                crewmate_games=int(self._safe_get(row, 'Crewmate Games')),
                imposter_win_pct=self._safe_get(row, 'Imposter Win %'),
                crewmate_win_pct=self._safe_get(row, 'Crewmate Win %'),
                kills_per_imp_game=self._safe_get(row, 'Kills Per Imposter Game'),
                task_completion_pct=self._safe_get(row, 'Task Completion %'),
                confidence=round(combined_conf, 3),
                final_elo=final_elo
            )

            # Identify strengths/weaknesses
            self._identify_strengths_weaknesses(player, imp_metrics, crew_metrics)

            self.results.append(player)

        # Sort by ELO and assign ranks
        self.results.sort(key=lambda x: x.final_elo, reverse=True)
        for i, player in enumerate(self.results):
            player.rank = i + 1

        return self._results_to_dataframe()

    def _results_to_dataframe(self) -> pd.DataFrame:
        """Convert results to DataFrame"""
        data = []
        for p in self.results:
            data.append({
                'Rank': p.rank,
                'Name': p.name,
                'ELO': p.final_elo,
                'Games': p.games_played,
                'Imposter Score': p.imposter_score,
                'Crewmate Score': p.crewmate_score,
                'General Score': p.general_score,
                'Composite': p.composite_score,
                'Confidence': p.confidence,
                'Imp Games': p.imposter_games,
                'Crew Games': p.crewmate_games,
                'Imp Win%': p.imposter_win_pct,
                'Crew Win%': p.crewmate_win_pct
            })
        return pd.DataFrame(data)

    def get_overall_leaderboard(self, top_n: Optional[int] = None) -> str:
        """Get formatted overall leaderboard"""
        if not self.results:
            self.calculate_all_ratings()

        players = self.results[:top_n] if top_n else self.results

        lines = ["=" * 70]
        lines.append("OVERALL ELO LEADERBOARD")
        lines.append("=" * 70)
        lines.append(f"{'Rank':<6}{'Name':<20}{'ELO':<8}{'Games':<8}{'Imp':<8}{'Crew':<8}{'Conf':<8}")
        lines.append("-" * 70)

        for p in players:
            lines.append(
                f"{p.rank:<6}{p.name:<20}{p.final_elo:<8}"
                f"{p.games_played:<8}{p.imposter_score:<8.3f}{p.crewmate_score:<8.3f}"
                f"{p.confidence:<8.2f}"
            )

        return "\n".join(lines)

    def get_imposter_leaderboard(self, min_games: int = 5, top_n: int = 15) -> str:
        """Get top Imposter specialists"""
        if not self.results:
            self.calculate_all_ratings()

        eligible = [p for p in self.results if p.imposter_games >= min_games]
        eligible.sort(key=lambda x: x.imposter_score, reverse=True)

        lines = ["=" * 60]
        lines.append(f"TOP IMPOSTER PLAYERS (min {min_games} games)")
        lines.append("=" * 60)
        lines.append(f"{'#':<4}{'Name':<20}{'Score':<10}{'Win%':<10}{'K/Game':<10}{'Games':<8}")
        lines.append("-" * 60)

        for i, p in enumerate(eligible[:top_n], 1):
            lines.append(
                f"{i:<4}{p.name:<20}{p.imposter_score:<10.3f}"
                f"{p.imposter_win_pct:<10.1f}{p.kills_per_imp_game:<10.2f}"
                f"{p.imposter_games:<8}"
            )

        return "\n".join(lines)

    def get_crewmate_leaderboard(self, min_games: int = 10, top_n: int = 15) -> str:
        """Get top Crewmate specialists"""
        if not self.results:
            self.calculate_all_ratings()

        eligible = [p for p in self.results if p.crewmate_games >= min_games]
        eligible.sort(key=lambda x: x.crewmate_score, reverse=True)

        lines = ["=" * 60]
        lines.append(f"TOP CREWMATE PLAYERS (min {min_games} games)")
        lines.append("=" * 60)
        lines.append(f"{'#':<4}{'Name':<20}{'Score':<10}{'Win%':<10}{'Tasks%':<10}{'Games':<8}")
        lines.append("-" * 60)

        for i, p in enumerate(eligible[:top_n], 1):
            lines.append(
                f"{i:<4}{p.name:<20}{p.crewmate_score:<10.3f}"
                f"{p.crewmate_win_pct:<10.1f}{p.task_completion_pct:<10.1f}"
                f"{p.crewmate_games:<8}"
            )

        return "\n".join(lines)

    def get_player_card(self, name: str) -> str:
        """Get detailed player card"""
        if not self.results:
            self.calculate_all_ratings()

        player = next((p for p in self.results if p.name.lower() == name.lower()), None)
        if not player:
            return f"Player '{name}' not found."

        lines = ["+" + "-" * 50 + "+"]
        lines.append(f"| {'PLAYER CARD: ' + player.name:<48} |")
        lines.append("+" + "-" * 50 + "+")
        lines.append(f"| Rank: #{player.rank:<5} ELO: {player.final_elo:<5} Games: {player.games_played:<8} |")
        lines.append("|" + "-" * 50 + "|")
        lines.append(f"| Imposter:  {player.imposter_score:.3f}  ({player.imposter_games} games, {player.imposter_win_pct:.1f}% win) |")
        lines.append(f"| Crewmate:  {player.crewmate_score:.3f}  ({player.crewmate_games} games, {player.crewmate_win_pct:.1f}% win) |")
        lines.append(f"| General:   {player.general_score:.3f}  (confidence: {player.confidence:.2f})           |")
        lines.append("|" + "-" * 50 + "|")

        if player.strengths:
            lines.append("| STRENGTHS:                                        |")
            for s in player.strengths:
                lines.append(f"|   + {s:<44} |")

        if player.weaknesses:
            lines.append("| WEAKNESSES:                                       |")
            for w in player.weaknesses:
                lines.append(f"|   - {w:<44} |")

        lines.append("+" + "-" * 50 + "+")
        return "\n".join(lines)

    def get_all_player_cards(self) -> str:
        """Get player cards for all players"""
        if not self.results:
            self.calculate_all_ratings()

        cards = []
        for p in self.results:
            cards.append(self.get_player_card(p.name))
            cards.append("")  # Blank line between cards

        return "\n".join(cards)

    def save_results(self, output_path: str):
        """Save full results to CSV"""
        df = self._results_to_dataframe()
        df.to_csv(output_path, index=False)
        print(f"\nResults saved to: {output_path}")


def main():
    """Main entry point"""
    # Configuration
    data_path = Path(__file__).parent / "2026-02-03T06-59_export.csv"
    output_path = Path(__file__).parent / "elo_rankings.csv"

    print("Loading Among Us Sidemen data...")
    elo_system = AmongUsELOSystem(str(data_path))

    print("Calculating ELO ratings...\n")
    elo_system.calculate_all_ratings()

    # Display leaderboards
    print(elo_system.get_overall_leaderboard())
    print("\n")
    print(elo_system.get_imposter_leaderboard())
    print("\n")
    print(elo_system.get_crewmate_leaderboard())
    print("\n")

    # Display player cards for top 10
    print("=" * 70)
    print("PLAYER CARDS (Top 10)")
    print("=" * 70)
    for player in elo_system.results[:10]:
        print(elo_system.get_player_card(player.name))
        print()

    # Save results
    elo_system.save_results(str(output_path))

    print("\nDone!")


if __name__ == "__main__":
    main()

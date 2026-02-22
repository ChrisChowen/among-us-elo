# Among Us Elo Rating System

A comprehensive skill rating system for Among Us players, built around Sidemen game data. Calculates composite Elo ratings from imposter performance, crewmate performance, and general gameplay metrics.

## Features

- **Composite Elo ratings** (500-1500 range) from three weighted components:
  - Imposter score (35%) - win rate, kills per game, KDR, deception
  - Crewmate score (35%) - task completion, detection, survival
  - General score (30%) - overall wins, consistency, behaviour
- **Player cards** with auto-detected strengths and weaknesses
- **Confidence scoring** based on games played
- **CSV export** of all ratings and breakdowns
- **Matplotlib visualizations** for rating distributions

## Usage

```bash
python among_us_elo.py
```

Reads game data from the embedded dataset (Sidemen Among Us games), calculates all ratings, and outputs:
- Console summary with rankings
- CSV export with full breakdowns
- Rating distribution charts

## Tech Stack

- Python 3
- pandas / NumPy
- matplotlib (visualizations)

## How Ratings Work

Each player's final Elo is calculated from normalized sub-scores:

```
composite = (imposter_score * 0.35) + (crewmate_score * 0.35) + (general_score * 0.30)
final_elo = BASE_ELO + (composite * ELO_RANGE) - (ELO_RANGE / 2)
```

A confidence factor based on games played adjusts ratings toward the baseline for players with limited data.

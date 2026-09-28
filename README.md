# ♟️ Lichess Spatial Heatmap Explorer

An interactive bivariate visualizer analyzing the spatial behavior of each chess piece across game phases (**Opening**, **Middlegame**, and **Endgame**), segmented by **ELO** rating brackets using the open database from [Lichess.org](https://database.lichess.org/?utm_source=gemini).

The project pairs a high-performance **ETL pipeline** (streaming `.pgn.zst` archives and aggregating into SQLite) with a **React + TypeScript + D3.js + Tailwind CSS** web client that smoothly interpolates $8 \times 8$ spatial matrices at 60 FPS.

---

## 🏗️ System Architecture

```text
┌──────────────────────────┐
│  Lichess .pgn.zst Stream │
└────────────┬─────────────┘
             │ (Adapter Pattern: ZstPgnFileAdapter)
             ▼
┌──────────────────────────┐
│     HeatmapProcessor     │ ──► O(1) tracking of all 32 pieces + Hybrid phase calculation
└────────────┬─────────────┘
             │ (Batch UPSERT every N games)
             ▼
┌──────────────────────────┐
│   SQLite (WAL Mode DB)   │ ──► `heatmaps` table indexed by (elo, phase, piece_id, square)
└────────────┬─────────────┘
             │ (FrontendJSONExporter + UNION ALL for *_ALL)
             ▼
┌──────────────────────────┐
│  Static JSON Artifacts   │ ──► Partitioned by ELO (`heatmap_1600-2000.json`, etc.)
└────────────┬─────────────┘
             │ (Fetch + Client Cache)
             ▼
┌──────────────────────────┐
│ React + D3.js Visualizer │ ──► SVG Data-Join + Smooth color and opacity transitions
└──────────────────────────┘

```

---

## 📐 Mathematical Model & Metrics

### 1. Piece Identity

Each piece is uniquely identified by its color (`W` or `B`), its type (`P, N, B, R, Q, K`), and its initial algebraic square on the standard chessboard (e.g., `W_N_g1` for the white king's knight, `W_N_b1` for the white queen's knight). In addition, the exporter generates aggregated series such as `W_N_ALL`, `B_B_ALL`, etc.

### 2. Hybrid Phase Transitions

Phase progression is monotonic ($F_0 \to F_1 \to F_2$) and evaluated at each half-move (_ply_ $p$) based on remaining material $M = \min(M_{\text{white}}, M_{\text{black}})$ excluding kings ($M_{\text{initial}} = 39$):

| Phase                    | Activation Condition     | Description                                        |
| ------------------------ | ------------------------ | -------------------------------------------------- |
| **Opening** (`apertura`) | Initial state ($p = 1$)  | Early piece development                            |
| **Middlegame** (`medio`) | $p > 30 \;\lor\; M < 13$ | Past move 15 or loss of ~2 minor pieces and 1 pawn |
| **Endgame** (`final`)    | $p > 80 \;\lor\; M < 11$ | Past move 40 or severe material simplification     |

### 3. Metrics per Square ($c \in \{a8 \dots h1\}$)

For a piece $P$, phase $F$, and a given ELO bracket:

- **Occupancy Frequency (`occ_pct`, `occ_norm`, `occ_log`):** Proportion of half-moves (_plies_) that piece $P$ spends on square $c$ relative to total plies by that piece in phase $F$. Includes logarithmic normalization for direct mapping to the alpha channel (opacity):

$$O_{\text{log}}(c) = \frac{\ln(1 + \text{plies}_c)}{\ln(1 + \max_{s}(\text{plies}_s))}$$

- **Active Move Frequency (`move_pct`, `move_norm`):** Proportion of times the piece actively moves to square $c$.
- **Threat / Win Rate Correlation (`win_rate`):** Percentage of games won by piece $P$'s side when that piece visited or occupied square $c$ during phase $F$ (subject to a minimum sample size $N_{\text{games}} \ge k$):

$$W_r(c) = \frac{\text{Games won with visit to } c}{\text{Total games with visit to } c} \times 100$$

- **Capture Rate (`capture_rate`, `capture_norm`):** Percentage of moves to square $c$ resulting in a capture.
- **Check Rate (`check_rate`):** Percentage of moves to square $c$ that deliver check to the opponent's king.

---

## 📂 Project Structure

```text
├── etl/
│   ├── pipeline_lichess.py          # .pgn.zst adapter, O(1) processor, and SQLite repository
│   ├── export_json.py               # SQLite to optimized JSON exporter
│   └── notebook_colab.ipynb         # Interactive notebook for cloud execution
├── public/
│   └── chess_frontend_json/         # Exported JSON artifacts
│       ├── metadata.json
│       ├── heatmap_under_1200.json
│       ├── heatmap_1200-1600.json
│       ├── heatmap_1600-2000.json
│       ├── heatmap_2000-2400.json
│       └── heatmap_over_2400.json
└── src/
    └── components/
        └── ChessHeatmapVisualizer.tsx # Interactive React + D3.js component

```

---

## 🚀 Getting Started
All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

### 1. Data Pipeline (Google Colab)

Run the full data processing and extraction pipeline in the cloud without needing local dependencies:

After running the notebook, copy the generated `chess_frontend_json/` directory into `public/chess_frontend_json/` inside your web project.

## 📄 JSON Data Contract (`heatmap_<elo>.json`)

Each ELO file contains a dictionary indexed by `piece_id` and `phase`, containing a statistical summary and a flat array of 64 cells ordered visually from `a8` (index 0) to `h1` (index 63):

```json
{
  "elo_bucket": "1600-2000",
  "min_games_threshold": 15,
  "pieces": {
    "W_N_g1": {
      "medio": {
        "summary": {
          "total_plies": 148200,
          "total_moves": 19340,
          "total_captures": 4120,
          "min_win_rate": 43.12,
          "max_win_rate": 64.85
        },
        "cells": [
          {
            "square": "a8",
            "row": 0,
            "col": 0,
            "occ_pct": 0.12,
            "occ_norm": 0.015,
            "occ_log": 0.184,
            "move_pct": 0.15,
            "move_norm": 0.021,
            "win_rate": 58.4,
            "capture_rate": 42.1,
            "capture_norm": 0.08,
            "check_rate": 0.0,
            "games": 42
          }
        ]
      }
    }
  }
}
```

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.


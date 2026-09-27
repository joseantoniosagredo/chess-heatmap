import type { Phase, HeatmapCell, PhaseHeatmap } from "./types";

export function generateFallbackGrid(
  pieceKey: string,
  phase: Phase,
): PhaseHeatmap {
  const files = "abcdefgh";
  const cells: HeatmapCell[] = [];
  const isWhite = pieceKey.startsWith("W_");
  const phaseShift = phase === "apertura" ? 0 : phase === "medio" ? 1 : 2;

  // Centro de gravedad simulado según la fase
  const targetRow = isWhite
    ? Math.max(1, 6 - phaseShift * 2)
    : Math.min(6, 1 + phaseShift * 2);
  const targetCol = 3.5;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = `${files[c]}${8 - r}`;
      const dist = Math.hypot(r - targetRow, c - targetCol);
      const rawOcc = Math.max(
        0,
        Math.exp(-dist * 0.55) * (1 - 0.15 * Math.sin(r * c)),
      );
      const occ_norm = Number(rawOcc.toFixed(4));
      const occ_log = Number(
        (Math.log1p(rawOcc * 100) / Math.log1p(100)).toFixed(4),
      );
      const advancement = isWhite ? (7 - r) / 7 : r / 7;
      const win_rate =
        occ_norm > 0.08
          ? Number(
              (44 + advancement * 18 + (3.5 - Math.abs(c - 3.5)) * 1.8).toFixed(
                1,
              ),
            )
          : null;

      cells.push({
        square: sq,
        row: r,
        col: c,
        occ_pct: Number((occ_norm * 8.5).toFixed(2)),
        occ_norm,
        occ_log,
        move_pct: Number((occ_norm * 7.2).toFixed(2)),
        move_norm: Number(Math.pow(occ_norm, 1.2).toFixed(4)),
        win_rate,
        capture_rate: Number((occ_norm * 28).toFixed(1)),
        capture_norm: Number(Math.pow(occ_norm, 1.4).toFixed(4)),
        check_rate: Number((advancement * occ_norm * 14).toFixed(1)),
        games: Math.round(occ_norm * 1450),
      });
    }
  }

  return {
    summary: {
      total_plies: 125000,
      total_moves: 18400,
      total_captures: 3200,
      min_win_rate: 42.0,
      max_win_rate: 66.0,
    },
    cells,
  };
}

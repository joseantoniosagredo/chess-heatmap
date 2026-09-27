export type Phase = "apertura" | "medio" | "final";
export type PieceColor = "W" | "B";
export type PieceType = "P" | "N" | "B" | "R" | "Q" | "K";
export type MetricMode =
  | "bivariate"
  | "occupancy"
  | "moves"
  | "win_rate"
  | "captures"
  | "checks";

export interface HeatmapCell {
  square: string;
  row: number;
  col: number;
  occ_pct: number;
  occ_norm: number;
  occ_log: number;
  move_pct: number;
  move_norm: number;
  win_rate: number | null;
  capture_rate: number;
  capture_norm: number;
  check_rate: number;
  games: number;
}

export interface PhaseHeatmap {
  summary: {
    total_plies: number;
    total_moves: number;
    total_captures: number;
    min_win_rate: number;
    max_win_rate: number;
  };
  cells: HeatmapCell[];
}

export interface EloHeatmapFile {
  elo_bucket: string;
  min_games_threshold: number;
  pieces: Record<string, Record<Phase, PhaseHeatmap>>;
}

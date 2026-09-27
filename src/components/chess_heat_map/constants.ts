import type { Phase, MetricMode, PieceColor, PieceType } from "./types";

export const ELO_BUCKETS = [
  "<1200",
  "1200-1600",
  "1600-2000",
  "2000-2400",
  ">2400",
] as const;

export const PHASES: { id: Phase; label: string; desc: string }[] = [
  {
    id: "apertura",
    label: "Apertura",
    desc: "Desarrollo inicial (Plies 1-30)",
  },
  { id: "medio", label: "Medio Juego", desc: "Táctica y maniobras" },
  { id: "final", label: "Final", desc: "Simplificación y coronación" },
];

export const METRIC_MODES: {
  id: MetricMode;
  label: string;
  description: string;
}[] = [
  {
    id: "bivariate",
    label: "Bivariado (Frecuencia + Win Rate)",
    description:
      "Opacidad = Tiempo en la casilla (log) · Color = Correlación con la victoria",
  },
  {
    id: "occupancy",
    label: "Frecuencia de Estancia",
    description: "Porcentaje de turnos que la pieza permanece en cada casilla",
  },
  {
    id: "moves",
    label: "Frecuencia de Movimiento",
    description:
      "Casillas hacia las que la pieza se desplaza activamente más veces",
  },
  {
    id: "win_rate",
    label: "Peligrosidad (Win Rate Puro)",
    description:
      "Tasa de victoria cuando la pieza visita la casilla en esta fase",
  },
  {
    id: "captures",
    label: "Mapa de Capturas",
    description: "Intensidad de capturas ejecutadas en cada casilla",
  },
  {
    id: "checks",
    label: "Frecuencia de Jaques",
    description:
      "Porcentaje de movimientos a esta casilla que dan jaque al rey rival",
  },
];

export const PIECE_ORIGINS: Record<
  PieceColor,
  Record<PieceType, { id: string; label: string; square: string }[]>
> = {
  W: {
    N: [
      { id: "W_N_g1", label: "Caballo de Rey (g1)", square: "g1" },
      { id: "W_N_b1", label: "Caballo de Dama (b1)", square: "b1" },
    ],
    B: [
      { id: "W_B_f1", label: "Alfil Blancas (f1)", square: "f1" },
      { id: "W_B_c1", label: "Alfil Negras (c1)", square: "c1" },
    ],
    R: [
      { id: "W_R_h1", label: "Torre de Rey (h1)", square: "h1" },
      { id: "W_R_a1", label: "Torre de Dama (a1)", square: "a1" },
    ],
    Q: [{ id: "W_Q_d1", label: "Dama Blanca (d1)", square: "d1" }],
    K: [{ id: "W_K_e1", label: "Rey Blanco (e1)", square: "e1" }],
    P: ["a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2"].map((sq) => ({
      id: `W_P_${sq}`,
      label: `Peón ${sq.toUpperCase()}`,
      square: sq,
    })),
  },
  B: {
    N: [
      { id: "B_N_g8", label: "Caballo de Rey (g8)", square: "g8" },
      { id: "B_N_b8", label: "Caballo de Dama (b8)", square: "b8" },
    ],
    B: [
      { id: "B_B_f8", label: "Alfil Negras (f8)", square: "f8" },
      { id: "B_B_c8", label: "Alfil Blancas (c8)", square: "c8" },
    ],
    R: [
      { id: "B_R_h8", label: "Torre de Rey (h8)", square: "h8" },
      { id: "B_R_a8", label: "Torre de Dama (a8)", square: "a8" },
    ],
    Q: [{ id: "B_Q_d8", label: "Dama Negra (d8)", square: "d8" }],
    K: [{ id: "B_K_e8", label: "Rey Negro (e8)", square: "e8" }],
    P: ["a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7"].map((sq) => ({
      id: `B_P_${sq}`,
      label: `Peón ${sq.toUpperCase()}`,
      square: sq,
    })),
  },
};

export const PIECE_LABELS: { type: PieceType; name: string; icon: string }[] = [
  { type: "N", name: "Caballo", icon: "♞" },
  { type: "B", name: "Alfil", icon: "♝" },
  { type: "R", name: "Torre", icon: "♜" },
  { type: "Q", name: "Dama", icon: "♛" },
  { type: "K", name: "Rey", icon: "♚" },
  { type: "P", name: "Peón", icon: "♟" },
];

import React, { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";

// ============================================================================
// 1. INTERFACES TYPESCRIPT (Esquema exacto del Exportador Python)
// ============================================================================

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

// ============================================================================
// 2. CATÁLOGO DE PIEZAS Y CONSTANTES DE UI
// ============================================================================

const ELO_BUCKETS = [
  "<1200",
  "1200-1600",
  "1600-2000",
  "2000-2400",
  ">2400",
] as const;
const PHASES: { id: Phase; label: string; desc: string }[] = [
  {
    id: "apertura",
    label: "Apertura",
    desc: "Desarrollo inicial (Plies 1-30)",
  },
  { id: "medio", label: "Medio Juego", desc: "Táctica y maniobras" },
  { id: "final", label: "Final", desc: "Simplificación y coronación" },
];

const METRIC_MODES: { id: MetricMode; label: string; description: string }[] = [
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

// Orígenes individuales por tipo de pieza y color
const PIECE_ORIGINS: Record<
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

const PIECE_LABELS: { type: PieceType; name: string; icon: string }[] = [
  { type: "N", name: "Caballo", icon: "♞" },
  { type: "B", name: "Alfil", icon: "♝" },
  { type: "R", name: "Torre", icon: "♜" },
  { type: "Q", name: "Dama", icon: "♛" },
  { type: "K", name: "Rey", icon: "♚" },
  { type: "P", name: "Peón", icon: "♟" },
];

// ============================================================================
// 3. GENERADOR DEMO (Fallback automático si no encuentra el JSON local)
// ============================================================================

function generateFallbackGrid(pieceKey: string, phase: Phase): PhaseHeatmap {
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

// ============================================================================
// 4. COMPONENTE PRINCIPAL REACT + D3.JS
// ============================================================================

interface Props {
  /** Ruta base donde están alojados los JSON exportados de Colab */
  jsonBaseUrl?: string;
}

export const ChessHeatmapVisualizer: React.FC<Props> = ({
  jsonBaseUrl = "/chess_frontend_json",
}) => {
  // --- Estado de Filtros ---
  const [eloBucket, setEloBucket] = useState<string>("1600-2000");
  const [phase, setPhase] = useState<Phase>("medio");
  const [color, setColor] = useState<PieceColor>("W");
  const [pieceType, setPieceType] = useState<PieceType>("N");
  const [isGrouped, setIsGrouped] = useState<boolean>(false);
  const [selectedOriginId, setSelectedOriginId] = useState<string>("W_N_g1");
  const [metricMode, setMetricMode] = useState<MetricMode>("bivariate");
  const [flipBoard, setFlipBoard] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // --- Estado de Datos y Tooltip ---
  const [eloData, setEloData] = useState<EloHeatmapFile | null>(null);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  // Caché de archivos JSON por ELO para evitar peticiones repetidas
  const cacheRef = useRef<Record<string, EloHeatmapFile>>({});
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Sincronizar el ID de origen cuando cambia el color o el tipo de pieza
  useEffect(() => {
    const origins = PIECE_ORIGINS[color][pieceType];
    if (origins && origins.length > 0) {
      setSelectedOriginId(origins[0].id);
    }
  }, [color, pieceType]);

  // Identificador final de la pieza a consultar en el JSON (ej. 'W_N_g1' o 'W_N_ALL')
  const activePieceKey = useMemo(() => {
    if (isGrouped || PIECE_ORIGINS[color][pieceType].length === 1) {
      return isGrouped ? `${color}_${pieceType}_ALL` : selectedOriginId;
    }
    return selectedOriginId;
  }, [color, pieceType, isGrouped, selectedOriginId]);

  // Casilla de origen para resaltarla en el tablero cuando no está agrupado
  const originSquare = useMemo(() => {
    if (isGrouped) return null;
    const parts = activePieceKey.split("_");
    return parts.length === 3 ? parts[2] : null;
  }, [activePieceKey, isGrouped]);

  // --- Carga de archivos JSON según el ELO seleccionado ---
  useEffect(() => {
    let isMounted = true;
    const safeName = eloBucket.replace("<", "under_").replace(">", "over_");
    const url = `${jsonBaseUrl}/heatmap_${safeName}.json`;

    if (cacheRef.current[eloBucket]) {
      setEloData(cacheRef.current[eloBucket]);
      setUsingFallback(false);
      return;
    }

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("JSON no encontrado");
        return res.json();
      })
      .then((data: EloHeatmapFile) => {
        if (!isMounted) return;
        cacheRef.current[eloBucket] = data;
        setEloData(data);
        setUsingFallback(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setUsingFallback(true);
        setEloData(null);
      });

    return () => {
      isMounted = false;
    };
  }, [eloBucket, jsonBaseUrl]);

  // --- Reproducción automática de las 3 fases (Animación temporal) ---
  useEffect(() => {
    if (!isPlaying) return;
    const order: Phase[] = ["apertura", "medio", "final"];
    const interval = setInterval(() => {
      setPhase((prev) => {
        const nextIdx = (order.indexOf(prev) + 1) % order.length;
        return order[nextIdx];
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // --- Obtener la matriz de 64 celdas activa ---
  const currentPhaseData: PhaseHeatmap = useMemo(() => {
    if (eloData && eloData.pieces[activePieceKey]?.[phase]) {
      return eloData.pieces[activePieceKey][phase];
    }
    return generateFallbackGrid(activePieceKey, phase);
  }, [eloData, activePieceKey, phase]);

  // ==========================================================================
  // 5. MOTOR DE RENDERIZADO Y TRANSICIONES CON D3.JS
  // ==========================================================================

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const boardSize = 560;
    const margin = 28;
    const sqSize = boardSize / 8;

    // Inicializar capas estáticas del SVG solo la primera vez
    let rootG = svg.select<SVGGElement>("g.board-root");
    if (rootG.empty()) {
      rootG = svg
        .append("g")
        .attr("class", "board-root")
        .attr("transform", `translate(${margin}, ${margin})`);

      rootG.append("g").attr("class", "squares-layer");
      rootG.append("g").attr("class", "coords-layer");
    }

    const squaresLayer = rootG.select<SVGGElement>("g.squares-layer");
    const coordsLayer = rootG.select<SVGGElement>("g.coords-layer");

    // --- Escalas de Color D3 ---
    const minWR = Math.min(42, currentPhaseData.summary.min_win_rate);
    const maxWR = Math.max(58, currentPhaseData.summary.max_win_rate);

    // Escala divergente para Peligrosidad (Azul frío < 50% < Ámbar/Coral intenso)
    const winRateColorScale = d3
      .scaleLinear<string>()
      .domain([minWR, 50, maxWR])
      .range(["#38bdf8", "#facc15", "#f43f5e"])
      .interpolate(d3.interpolateRgb)
      .clamp(true);

    // Escalas secuenciales para métricas univariadas
    const occColorScale = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([0, 1]);
    const moveColorScale = d3
      .scaleSequential(d3.interpolatePlasma)
      .domain([0, 1]);
    const captureColorScale = d3
      .scaleSequential(d3.interpolateInferno)
      .domain([0, 1]);
    const checkColorScale = d3
      .scaleSequential(d3.interpolateTurbo)
      .domain([0, 25]);

    // Funciones auxiliares para calcular Fill y Opacity según el modo activo
    const computeFill = (d: HeatmapCell): string => {
      switch (metricMode) {
        case "bivariate":
          return d.win_rate !== null
            ? winRateColorScale(d.win_rate)
            : "#64748b";
        case "win_rate":
          return d.win_rate !== null
            ? winRateColorScale(d.win_rate)
            : "#334155";
        case "occupancy":
          return occColorScale(d.occ_log);
        case "moves":
          return moveColorScale(d.move_norm);
        case "captures":
          return captureColorScale(d.capture_norm);
        case "checks":
          return checkColorScale(d.check_rate);
      }
    };

    const computeOpacity = (d: HeatmapCell): number => {
      if (d.games === 0) return 0;
      switch (metricMode) {
        case "bivariate":
          return Math.max(0.06, d.occ_log * 0.92);
        case "win_rate":
          return d.win_rate !== null ? 0.85 : 0.12;
        case "occupancy":
          return Math.max(0.05, d.occ_log * 0.92);
        case "moves":
          return Math.max(0.05, d.move_norm * 0.92);
        case "captures":
          return d.capture_norm > 0 ? Math.max(0.12, d.capture_norm * 0.92) : 0;
        case "checks":
          return d.check_rate > 0 ? Math.min(0.92, 0.2 + d.check_rate / 20) : 0;
      }
    };

    // Coordenadas X/Y teniendo en cuenta si el tablero está rotado (Negras abajo)
    const getX = (col: number) => (flipBoard ? 7 - col : col) * sqSize;
    const getY = (row: number) => (flipBoard ? 7 - row : row) * sqSize;

    // --- DATA JOIN DE LAS 64 CASILLAS ---
    const cellGroups = squaresLayer
      .selectAll<SVGGElement, HeatmapCell>("g.square-cell")
      .data(currentPhaseData.cells, (d) => d.square);

    // ENTER: Crear los elementos en el primer renderizado
    const cellEnter = cellGroups
      .enter()
      .append("g")
      .attr("class", "square-cell cursor-pointer")
      .attr("transform", (d) => `translate(${getX(d.col)}, ${getY(d.row)})`);

    // 1. Rectángulo base del tablero (escaques claros y oscuros en tonos pizarra para alto contraste)
    cellEnter
      .append("rect")
      .attr("class", "base-sq")
      .attr("width", sqSize)
      .attr("height", sqSize)
      .attr("fill", (d) => ((d.row + d.col) % 2 === 0 ? "#403D39" : "#262421"));

    // 2. Rectángulo del Mapa de Calor (animado por D3)
    cellEnter
      .append("rect")
      .attr("class", "heat-overlay")
      .attr("width", sqSize)
      .attr("height", sqSize)
      .attr("fill", (d) => computeFill(d))
      .attr("fill-opacity", 0);

    // 3. Marco indicador de casilla de origen (ej. g1)
    cellEnter
      .append("rect")
      .attr("class", "origin-ring")
      .attr("x", 3)
      .attr("y", 3)
      .attr("width", sqSize - 6)
      .attr("height", sqSize - 6)
      .attr("rx", 6)
      .attr("fill", "none")
      .attr("stroke", "#81B64C")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "5,3")
      .attr("opacity", 0);

    // 4. Etiqueta rápida de valor en el centro de las casillas más relevantes
    cellEnter
      .append("text")
      .attr("class", "cell-metric-text pointer-events-none select-none")
      .attr("x", sqSize / 2)
      .attr("y", sqSize / 2 + 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#f8fafc")
      .attr("opacity", 0);

    // MERGE (ENTER + UPDATE)
    const cellUpdate = cellEnter.merge(cellGroups);

    // Eventos de ratón para el Tooltip React
    cellUpdate
      .on("mouseenter", function (_event, d) {
        d3.select(this)
          .select("rect.heat-overlay")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2);
        setHoveredCell(d);
      })
      .on("mouseleave", function () {
        d3.select(this).select("rect.heat-overlay").attr("stroke", "none");
        setHoveredCell(null);
      });

    // Animar rotación del tablero si cambia flipBoard
    cellUpdate
      .transition()
      .duration(500)
      .ease(d3.easeCubicInOut)
      .attr("transform", (d) => `translate(${getX(d.col)}, ${getY(d.row)})`);

    // --- TRANSICIÓN D3 DEL MAPA DE CALOR ---
    cellUpdate
      .select<SVGRectElement>("rect.heat-overlay")
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr("fill", (d) => computeFill(d))
      .attr("fill-opacity", (d) => computeOpacity(d));

    // Resaltar casilla inicial de la pieza seleccionada
    cellUpdate
      .select<SVGRectElement>("rect.origin-ring")
      .transition()
      .duration(400)
      .attr("opacity", (d) => (d.square === originSquare ? 0.95 : 0));

    // Actualizar texto numérico sobre casillas destacadas
    cellUpdate
      .select<SVGTextElement>("text.cell-metric-text")
      .text((d) => {
        if (d.games === 0) return "";
        if (metricMode === "bivariate" || metricMode === "win_rate") {
          return d.win_rate !== null && d.occ_log > 0.45
            ? `${Math.round(d.win_rate)}%`
            : "";
        }
        if (metricMode === "occupancy" && d.occ_pct >= 2.5)
          return `${d.occ_pct.toFixed(1)}%`;
        if (metricMode === "moves" && d.move_pct >= 2.5)
          return `${d.move_pct.toFixed(1)}%`;
        if (
          metricMode === "captures" &&
          d.capture_rate >= 10 &&
          d.capture_norm > 0.3
        )
          return `${Math.round(d.capture_rate)}%`;
        if (metricMode === "checks" && d.check_rate >= 3)
          return `${d.check_rate.toFixed(1)}%`;
        return "";
      })
      .transition()
      .duration(500)
      .attr("opacity", (d) => (computeOpacity(d) > 0.35 ? 0.9 : 0));

    // --- COORDENADAS DEL TABLERO (a-h, 1-8) ---
    const files = flipBoard
      ? ["h", "g", "f", "e", "d", "c", "b", "a"]
      : ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = flipBoard
      ? ["1", "2", "3", "4", "5", "6", "7", "8"]
      : ["8", "7", "6", "5", "4", "3", "2", "1"];

    coordsLayer.selectAll("*").remove();

    files.forEach((f, i) => {
      coordsLayer
        .append("text")
        .attr("x", i * sqSize + sqSize / 2)
        .attr("y", boardSize + 18)
        .attr("text-anchor", "middle")
        .attr("fill", "#9B9997")
        .attr("font-size", "12px")
        .attr("font-weight", "600")
        .text(f);
    });

    ranks.forEach((r, i) => {
      coordsLayer
        .append("text")
        .attr("x", -14)
        .attr("y", i * sqSize + sqSize / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("fill", "#9B9997")
        .attr("font-size", "12px")
        .attr("font-weight", "600")
        .text(r);
    });
  }, [currentPhaseData, metricMode, flipBoard, originSquare]);

  // ==========================================================================
  // 6. RENDERIZADO DE CONTROLES E INTERFAZ
  // ==========================================================================

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-[#262421] text-[#E0E0E0] rounded-2xl border border-[#3C3A38] shadow-2xl font-sans">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#3C3A38]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Lichess Spatial Heatmap Explorer
            </h2>
            {usingFallback && (
              <span className="px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                Modo Demo (Sin JSON local)
              </span>
            )}
          </div>
          <p className="text-sm text-[#9B9997] mt-1">
            Análisis bivariado de frecuencia y correlación de victoria por fase
            de juego
          </p>
        </div>

        {/* Selector de Rango de ELO */}
        <div className="flex items-center bg-[#1E1C1A] p-1 rounded-xl border border-[#3C3A38]">
          {ELO_BUCKETS.map((bucket) => (
            <button
              key={bucket}
              onClick={() => setEloBucket(bucket)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                eloBucket === bucket
                  ? "bg-[#81B64C] text-[#262421] shadow-md"
                  : "text-[#9B9997] hover:text-[#E0E0E0]"
              }`}
            >
              {bucket}
            </button>
          ))}
        </div>
      </div>

      {/* Cuerpo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* COLUMNA IZQUIERDA: Controles de Pieza, Fase y Métrica (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* 1. Selector de Bando y Agrupación */}
          <div className="bg-[#1E1C1A]/70 p-4 rounded-xl border border-[#3C3A38] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9B9997]">
                1. Bando e Identidad
              </span>
              <button
                onClick={() => setFlipBoard((f) => !f)}
                className="text-xs text-[#81B64C] hover:text-[#A3D160] font-medium flex items-center gap-1"
              >
                ⇅ Rotar tablero
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setColor("W");
                  setFlipBoard(false);
                }}
                className={`py-2 px-3 rounded-lg font-semibold text-sm border transition-all ${
                  color === "W"
                    ? "bg-[#F8F8F8] text-[#262421] border-[#F8F8F8]"
                    : "bg-[#262421] text-[#9B9997] border-[#3C3A38] hover:border-[#4B4845]"
                }`}
              >
                ♔ Piezas Blancas
              </button>
              <button
                onClick={() => {
                  setColor("B");
                  setFlipBoard(true);
                }}
                className={`py-2 px-3 rounded-lg font-semibold text-sm border transition-all ${
                  color === "B"
                    ? "bg-[#1E1C1A] text-[#F8F8F8] border-[#81B64C]"
                    : "bg-[#262421] text-[#9B9997] border-[#3C3A38] hover:border-[#4B4845]"
                }`}
              >
                ♚ Piezas Negras
              </button>
            </div>

            {/* Selector de Tipo de Pieza */}
            <div className="grid grid-cols-6 gap-1.5">
              {PIECE_LABELS.map((p) => (
                <button
                  key={p.type}
                  onClick={() => setPieceType(p.type)}
                  title={p.name}
                  className={`flex flex-col items-center py-2 rounded-lg border transition-all ${
                    pieceType === p.type
                      ? "bg-[#81B64C]/20 border-[#81B64C] text-[#A3D160]"
                      : "bg-[#262421] border-[#3C3A38] text-[#9B9997] hover:text-[#E0E0E0]"
                  }`}
                >
                  <span className="text-2xl leading-none">{p.icon}</span>
                  <span className="text-[10px] mt-1 font-medium">{p.name}</span>
                </button>
              ))}
            </div>

            {/* Toggle Agrupar vs Pieza Individual */}
            {PIECE_ORIGINS[color][pieceType].length > 1 && (
              <div className="pt-2 border-t border-[#3C3A38] space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-[#E0E0E0] font-medium">
                    Agrupar piezas del mismo tipo ({`${color}_${pieceType}_ALL`}
                    )
                  </span>
                  <input
                    type="checkbox"
                    checked={isGrouped}
                    onChange={(e) => setIsGrouped(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#4B4845] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all relative peer-checked:bg-[#81B64C]" />
                </label>

                {!isGrouped && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {PIECE_ORIGINS[color][pieceType].map((orig) => (
                      <button
                        key={orig.id}
                        onClick={() => setSelectedOriginId(orig.id)}
                        className={`py-1.5 px-2.5 text-xs font-medium rounded-md border text-left truncate transition-all ${
                          selectedOriginId === orig.id
                            ? "bg-[#81B64C]/15 border-[#81B64C] text-[#A3D160]"
                            : "bg-[#262421] border-[#3C3A38] text-[#9B9997] hover:text-[#E0E0E0]"
                        }`}
                      >
                        {orig.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Control de Fase + Botón Animar */}
          <div className="bg-[#1E1C1A]/70 p-4 rounded-xl border border-[#3C3A38] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9B9997]">
                2. Fase de la Partida
              </span>
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isPlaying
                    ? "bg-[#C84630] text-white shadow-lg shadow-[#C84630]/25"
                    : "bg-[#81B64C]/15 text-[#A3D160] border border-[#81B64C]/30 hover:bg-[#81B64C]/25"
                }`}
              >
                {isPlaying ? "⏸ Pausar Animación" : "▶ Animar Fases"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PHASES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setIsPlaying(false);
                    setPhase(p.id);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    phase === p.id
                      ? "bg-[#81B64C]/20 border-[#81B64C] text-white"
                      : "bg-[#262421] border-[#3C3A38] text-[#9B9997] hover:border-[#4B4845]"
                  }`}
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[10px] text-[#9B9997] mt-0.5 line-clamp-1">
                    {p.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Selector de Capa / Métrica */}
          <div className="bg-[#1E1C1A]/70 p-4 rounded-xl border border-[#3C3A38] space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9B9997] block">
              3. Capa de Visualización
            </span>
            <div className="space-y-1.5">
              {METRIC_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetricMode(m.id)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                    metricMode === m.id
                      ? "bg-[#81B64C]/15 border-[#81B64C] text-[#E0E0E0]"
                      : "bg-[#262421]/70 border-[#3C3A38]/80 text-[#9B9997] hover:border-[#4B4845]"
                  }`}
                >
                  <div className="text-xs font-semibold">{m.label}</div>
                  <div className="text-[11px] text-[#9B9997] mt-0.5">
                    {m.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Tablero SVG D3 + Leyenda + Inspector (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-[616px] aspect-square bg-[#1E1C1A] rounded-2xl p-2 border border-[#3C3A38] shadow-inner">
            <svg
              ref={svgRef}
              viewBox="0 0 616 616"
              className="w-full h-full select-none overflow-visible"
            />
          </div>

          {/* Leyenda Bivariada e Inspector de Casilla */}
          <div className="w-full max-w-[616px] mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Leyenda */}
            <div className="bg-[#1E1C1A]/80 p-3.5 rounded-xl border border-[#3C3A38] flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9B9997]">
                Escala Visual Activa
              </span>
              <div className="my-2">
                <div
                  className="h-3 w-full rounded-full"
                  style={{
                    background:
                      metricMode === "bivariate" || metricMode === "win_rate"
                        ? "linear-gradient(90deg, #38bdf8 0%, #facc15 50%, #f43f5e 100%)"
                        : "linear-gradient(90deg, #262421 0%, #f59e0b 50%, #ef4444 100%)",
                  }}
                />
                <div className="flex justify-between text-[10px] text-[#9B9997] mt-1 font-medium">
                  {metricMode === "bivariate" || metricMode === "win_rate" ? (
                    <>
                      <span>&lt;45% Win (Desfavorable)</span>
                      <span>50% Neutro</span>
                      <span>&gt;55% Win (Letal)</span>
                    </>
                  ) : (
                    <>
                      <span>Baja intensidad</span>
                      <span>Media</span>
                      <span>Máxima concentración</span>
                    </>
                  )}
                </div>
              </div>
              {originSquare && (
                <div className="text-[11px] text-[#81B64C] flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 border border-dashed border-[#81B64C] rounded-sm" />
                  Casilla de origen: <strong>{originSquare}</strong>
                </div>
              )}
            </div>

            {/* Inspector de Casilla (Hover Tooltip Fijo) */}
            <div className="bg-[#1E1C1A]/80 p-3.5 rounded-xl border border-[#3C3A38]">
              {hoveredCell ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between border-b border-[#3C3A38] pb-1">
                    <span className="text-sm font-bold text-[#E0E0E0]">
                      Casilla {hoveredCell.square.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#9B9997]">
                      {hoveredCell.games.toLocaleString()} partidas
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1">
                    <div className="flex justify-between">
                      <span className="text-[#9B9997]">Estancia:</span>
                      <span className="font-semibold text-[#E0E0E0]">
                        {hoveredCell.occ_pct}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9B9997]">Win Rate:</span>
                      <span
                        className={`font-bold ${
                          hoveredCell.win_rate === null
                            ? "text-[#7A7876]"
                            : hoveredCell.win_rate >= 52
                              ? "text-[#f43f5e]"
                              : hoveredCell.win_rate <= 48
                                ? "text-[#38bdf8]"
                                : "text-[#facc15]"
                        }`}
                      >
                        {hoveredCell.win_rate !== null
                          ? `${hoveredCell.win_rate}%`
                          : "Muestra baja"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9B9997]">Movimientos:</span>
                      <span className="font-semibold text-[#E0E0E0]">
                        {hoveredCell.move_pct}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9B9997]">Capturas:</span>
                      <span className="font-semibold text-[#E0E0E0]">
                        {hoveredCell.capture_rate}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#7A7876] text-center py-4">
                  Pasa el cursor por cualquier casilla del tablero para
                  inspeccionar sus métricas exactas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessHeatmapVisualizer;

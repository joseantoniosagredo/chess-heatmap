import React, { useState, useEffect, useRef, useMemo } from "react";
import type {
  Phase,
  PieceColor,
  PieceType,
  MetricMode,
  EloHeatmapFile,
  HeatmapCell,
  PhaseHeatmap,
} from "./types";
import { PIECE_ORIGINS } from "./constants";
import { generateFallbackGrid } from "./utils";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Board } from "./Board";
import { Inspector } from "./Inspector";

interface Props {
  jsonBaseUrl?: string;
}

export const ChessHeatmapVisualizer: React.FC<Props> = ({
  jsonBaseUrl = "/chess_frontend_json",
}) => {
  const [eloBucket, setEloBucket] = useState<string>("1600-2000");
  const [phase, setPhase] = useState<Phase>("medio");
  const [color, setColor] = useState<PieceColor>("W");
  const [pieceType, setPieceType] = useState<PieceType>("N");
  const [isGrouped, setIsGrouped] = useState<boolean>(false);
  const [selectedOriginId, setSelectedOriginId] = useState<string>("W_N_g1");
  const [metricMode, setMetricMode] = useState<MetricMode>("bivariate");
  const [flipBoard, setFlipBoard] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [eloData, setEloData] = useState<EloHeatmapFile | null>(null);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const cacheRef = useRef<Record<string, EloHeatmapFile>>({});

  useEffect(() => {
    const origins = PIECE_ORIGINS[color][pieceType];
    if (origins && origins.length > 0) {
      setSelectedOriginId(origins[0].id);
    }
  }, [color, pieceType]);

  const activePieceKey = useMemo(() => {
    if (isGrouped || PIECE_ORIGINS[color][pieceType].length === 1) {
      return isGrouped ? `${color}_${pieceType}_ALL` : selectedOriginId;
    }
    return selectedOriginId;
  }, [color, pieceType, isGrouped, selectedOriginId]);

  const originSquare = useMemo(() => {
    if (isGrouped) return null;
    const parts = activePieceKey.split("_");
    return parts.length === 3 ? parts[2] : null;
  }, [activePieceKey, isGrouped]);

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

  const currentPhaseData: PhaseHeatmap = useMemo(() => {
    if (eloData && eloData.pieces[activePieceKey]?.[phase]) {
      return eloData.pieces[activePieceKey][phase];
    }
    return generateFallbackGrid(activePieceKey, phase);
  }, [eloData, activePieceKey, phase]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-[#262421] text-[#E0E0E0] rounded-2xl border border-[#3C3A38] shadow-2xl font-sans">
      <Header
        usingFallback={usingFallback}
        eloBucket={eloBucket}
        setEloBucket={setEloBucket}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 relative">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          color={color}
          setColor={setColor}
          flipBoard={flipBoard}
          setFlipBoard={setFlipBoard}
          pieceType={pieceType}
          setPieceType={setPieceType}
          isGrouped={isGrouped}
          setIsGrouped={setIsGrouped}
          selectedOriginId={selectedOriginId}
          setSelectedOriginId={setSelectedOriginId}
          phase={phase}
          setPhase={setPhase}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          metricMode={metricMode}
          setMetricMode={setMetricMode}
        />

        <div className="lg:col-span-7 flex flex-col items-center">
          <Board
            currentPhaseData={currentPhaseData}
            metricMode={metricMode}
            flipBoard={flipBoard}
            originSquare={originSquare}
            setHoveredCell={setHoveredCell}
          />
          <Inspector
            metricMode={metricMode}
            originSquare={originSquare}
            hoveredCell={hoveredCell}
          />
        </div>
      </div>
    </div>
  );
};

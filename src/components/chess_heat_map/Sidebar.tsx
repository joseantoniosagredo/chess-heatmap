import React from "react";
import type { Phase, PieceColor, PieceType, MetricMode } from "./types";
import { PIECE_LABELS, PIECE_ORIGINS, PHASES, METRIC_MODES } from "./constants";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  color: PieceColor;
  setColor: (color: PieceColor) => void;
  flipBoard: boolean;
  setFlipBoard: (flip: boolean | ((f: boolean) => boolean)) => void;
  pieceType: PieceType;
  setPieceType: (pt: PieceType) => void;
  isGrouped: boolean;
  setIsGrouped: (grouped: boolean) => void;
  selectedOriginId: string;
  setSelectedOriginId: (id: string) => void;
  phase: Phase;
  setPhase: (phase: Phase) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean | ((p: boolean) => boolean)) => void;
  metricMode: MetricMode;
  setMetricMode: (mode: MetricMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  color,
  setColor,
  flipBoard,
  setFlipBoard,
  pieceType,
  setPieceType,
  isGrouped,
  setIsGrouped,
  selectedOriginId,
  setSelectedOriginId,
  phase,
  setPhase,
  isPlaying,
  setIsPlaying,
  metricMode,
  setMetricMode,
}) => {
  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-[#262421] p-6 overflow-y-auto transition-transform duration-300 lg:static lg:w-auto lg:p-0 lg:bg-transparent lg:z-auto lg:overflow-visible lg:transform-none lg:col-span-5 flex flex-col gap-6 ${
          isSidebarOpen
            ? "translate-x-0 border-r border-[#3C3A38] lg:border-none shadow-2xl lg:shadow-none"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex justify-between items-center lg:hidden mb-2">
          <span className="font-bold text-white text-lg">Filtros</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-[#9B9997] hover:text-white text-3xl leading-none"
          >
            &times;
          </button>
        </div>

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

          {PIECE_ORIGINS[color][pieceType].length > 1 && (
            <div className="pt-2 border-t border-[#3C3A38] space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-[#E0E0E0] font-medium">
                  Agrupar piezas del mismo tipo ({`${color}_${pieceType}_ALL`})
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
    </>
  );
};

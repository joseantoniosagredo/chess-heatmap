import React from "react";
import type { HeatmapCell, MetricMode } from "./types";

interface InspectorProps {
  metricMode: MetricMode;
  originSquare: string | null;
  hoveredCell: HeatmapCell | null;
}

export const Inspector: React.FC<InspectorProps> = ({
  metricMode,
  originSquare,
  hoveredCell,
}) => {
  return (
    <div className="w-full max-w-[616px] mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Pasa el cursor por cualquier casilla del tablero para inspeccionar
            sus métricas exactas.
          </div>
        )}
      </div>
    </div>
  );
};

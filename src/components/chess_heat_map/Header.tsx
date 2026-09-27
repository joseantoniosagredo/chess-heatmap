import React from "react";
import { ELO_BUCKETS } from "./constants";

interface HeaderProps {
  usingFallback: boolean;
  eloBucket: string;
  setEloBucket: (bucket: string) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  usingFallback,
  eloBucket,
  setEloBucket,
  setIsSidebarOpen,
}) => {
  return (
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
          Análisis bivariado de frecuencia y correlación de victoria por fase de
          juego
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden px-4 py-1.5 bg-[#1E1C1A] border border-[#3C3A38] rounded-xl text-xs font-semibold text-[#E0E0E0] hover:text-white"
        >
          Filtros ☰
        </button>
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
    </div>
  );
};

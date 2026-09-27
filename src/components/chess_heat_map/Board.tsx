import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { PhaseHeatmap, MetricMode, HeatmapCell } from "./types";

interface BoardProps {
  currentPhaseData: PhaseHeatmap;
  metricMode: MetricMode;
  flipBoard: boolean;
  originSquare: string | null;
  setHoveredCell: (cell: HeatmapCell | null) => void;
}

export const Board: React.FC<BoardProps> = ({
  currentPhaseData,
  metricMode,
  flipBoard,
  originSquare,
  setHoveredCell,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const boardSize = 560;
    const margin = 28;
    const sqSize = boardSize / 8;

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

    const minWR = Math.min(42, currentPhaseData.summary.min_win_rate);
    const maxWR = Math.max(58, currentPhaseData.summary.max_win_rate);

    const winRateColorScale = d3
      .scaleLinear<string>()
      .domain([minWR, 50, maxWR])
      .range(["#38bdf8", "#facc15", "#f43f5e"])
      .interpolate(d3.interpolateRgb)
      .clamp(true);

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

    const getX = (col: number) => (flipBoard ? 7 - col : col) * sqSize;
    const getY = (row: number) => (flipBoard ? 7 - row : row) * sqSize;

    const cellGroups = squaresLayer
      .selectAll<SVGGElement, HeatmapCell>("g.square-cell")
      .data(currentPhaseData.cells, (d) => d.square);

    const cellEnter = cellGroups
      .enter()
      .append("g")
      .attr("class", "square-cell cursor-pointer")
      .attr("transform", (d) => `translate(${getX(d.col)}, ${getY(d.row)})`);

    cellEnter
      .append("rect")
      .attr("class", "base-sq")
      .attr("width", sqSize)
      .attr("height", sqSize)
      .attr("fill", (d) => ((d.row + d.col) % 2 === 0 ? "#403D39" : "#262421"));

    cellEnter
      .append("rect")
      .attr("class", "heat-overlay")
      .attr("width", sqSize)
      .attr("height", sqSize)
      .attr("fill", (d) => computeFill(d))
      .attr("fill-opacity", 0);

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

    const cellUpdate = cellEnter.merge(cellGroups);

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

    cellUpdate
      .transition()
      .duration(500)
      .ease(d3.easeCubicInOut)
      .attr("transform", (d) => `translate(${getX(d.col)}, ${getY(d.row)})`);

    cellUpdate
      .select<SVGRectElement>("rect.heat-overlay")
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr("fill", (d) => computeFill(d))
      .attr("fill-opacity", (d) => computeOpacity(d));

    cellUpdate
      .select<SVGRectElement>("rect.origin-ring")
      .transition()
      .duration(400)
      .attr("opacity", (d) => (d.square === originSquare ? 0.95 : 0));

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
  }, [currentPhaseData, metricMode, flipBoard, originSquare, setHoveredCell]);

  return (
    <div className="relative w-full max-w-[616px] aspect-square bg-[#1E1C1A] rounded-2xl p-2 border border-[#3C3A38] shadow-inner">
      <svg
        ref={svgRef}
        viewBox="0 0 616 616"
        className="w-full h-full select-none overflow-visible"
      />
    </div>
  );
};

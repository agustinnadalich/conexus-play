import React, { useMemo } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { MatchEvent } from "@/types";
import { pickValue } from "@/utils/eventUtils";
import { getTeamFromEvent, normalizeTeamForFilter } from "@/utils/teamUtils";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Props = {
  events: MatchEvent[];
  matchInfo?: any;
  ourTeamsList?: string[];
  onChartClick?: (...args: any[]) => void;
};

const normalizeResult = (raw: any): string => {
  const s = String(raw || "").toUpperCase().trim();
  if (!s) return "Desconocido";
  if (s.includes("CLEAN") || s.includes("LIMPIA") || s.includes("GAN")) return "Limpia";
  if (s.includes("DIRTY") || s.includes("SUCIA")) return "Sucia";
  if (s.includes("LOSE") || s.includes("LOST") || s.includes("PERD")) return "Perdido";
  if (s.includes("TORCID") || s.includes("NOT-STRAIGHT")) return "Torcida";
  if (s.includes("INFRA")) return "Infraccion";
  return s;
};

const normalizePosition = (raw: any): string => {
  const s = String(raw || "").toUpperCase().trim();
  if (!s) return "Sin dato";
  if (s === "A") return "Frontal (A)";
  if (s === "B") return "2da (B)";
  if (s === "C" || s === "MID" || s === "M") return "Centro (C)";
  if (s === "D") return "Penultima (D)";
  if (s === "E") return "Fondo (E)";
  if (s === "ZERO" || s === "0") return "Corto/0";
  return s;
};

const cleanPlayer = (raw: any): string => {
  if (!raw) return "";
  const s = String(raw).trim();
  if (s.startsWith("T-")) return s.slice(2);
  return s;
};

const LineoutDetailCharts: React.FC<Props> = ({ events, matchInfo, ourTeamsList = [], onChartClick }) => {
  const { resultCounts, positionCounts, throwerCounts, teamResultMatrix } = useMemo(() => {
    const resCounts: Record<string, number> = {};
    const posCounts: Record<string, number> = {};
    const throwers: Record<string, number> = {};
    const matrix: Record<string, Record<string, number>> = {};

    (events || []).forEach((event) => {
      const result = normalizeResult(
        pickValue(event, ["LINE_RESULT", "LINEOUT_RESULT", "RESULTADO-LINE", "RESULTADO"])
      );
      const position = normalizePosition(
        pickValue(event, ["LINE_POSITION", "LINEOUT_POSITION", "POSICION-LINE"])
      );
      const thrower = cleanPlayer(
        pickValue(event, ["LINE_THROWER", "TIRADOR-LINE", "PLAYER", "JUGADOR"])
      );

      resCounts[result] = (resCounts[result] || 0) + 1;
      posCounts[position] = (posCounts[position] || 0) + 1;
      if (thrower) throwers[thrower] = (throwers[thrower] || 0) + 1;

      const teamRaw = getTeamFromEvent(event) ?? pickValue(event, ["TEAM"]);
      const team = normalizeTeamForFilter(teamRaw || "", matchInfo, ourTeamsList);
      if (!matrix[team]) matrix[team] = {};
      matrix[team][result] = (matrix[team][result] || 0) + 1;
    });

    return { resultCounts: resCounts, positionCounts: posCounts, throwerCounts: throwers, teamResultMatrix: matrix };
  }, [events, matchInfo, ourTeamsList]);

  if (!events || events.length === 0) return null;

  const doughnutData = {
    labels: Object.keys(resultCounts),
    datasets: [
      {
        data: Object.values(resultCounts),
        backgroundColor: ["#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#94a3b8"],
      },
    ],
  };

  const positionData = {
    labels: Object.keys(positionCounts),
    datasets: [
      {
        label: "Lanzamiento",
        data: Object.values(positionCounts),
        backgroundColor: "#38bdf8",
      },
    ],
  };

  const topThrowers = Object.entries(throwerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const throwerData = {
    labels: topThrowers.map(([name]) => name || "Sin dato"),
    datasets: [
      {
        label: "Lanzador",
        data: topThrowers.map(([, count]) => count),
        backgroundColor: "#22c55e",
      },
    ],
  };

  const teamLabels = Object.keys(teamResultMatrix);
  const resultLabels = Object.keys(resultCounts);
  const stackedData = {
    labels: teamLabels,
    datasets: resultLabels.map((res, idx) => ({
      label: res,
      data: teamLabels.map((team) => teamResultMatrix[team]?.[res] || 0),
      backgroundColor: ["#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#94a3b8"][idx % 5],
      stack: "stack1",
    })),
  };

  const doughnutOptions = {
    plugins: {
      legend: { position: "bottom" as const },
      title: { display: true, text: "Resultado de lineouts" },
    },
    onClick: (event: any, elements: any, chart: any) => {
      if (!onChartClick || !elements?.length) return;
      const label = chart.data.labels[elements[0].index];
      onChartClick("LINE_RESULT", label, "LINE_RESULT");
    },
  };

  const positionOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Posición lanzada" },
    },
    scales: { y: { beginAtZero: true } },
    onClick: (event: any, elements: any, chart: any) => {
      if (!onChartClick || !elements?.length) return;
      const label = chart.data.labels[elements[0].index];
      onChartClick("LINE_POSITION", label, "LINE_POSITION");
    },
  };

  const throwerOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Top lanzadores" },
    },
    scales: { y: { beginAtZero: true } },
    indexAxis: "y" as const,
    onClick: (event: any, elements: any, chart: any) => {
      if (!onChartClick || !elements?.length) return;
      const label = chart.data.labels[elements[0].index];
      onChartClick("LINE_THROWER", label, "LINE_THROWER");
    },
  };

  const stackedOptions = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" as const },
      title: { display: true, text: "Resultado por equipo" },
    },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
    onClick: (event: any, elements: any, chart: any) => {
      if (!onChartClick || !elements?.length) return;
      const { datasetIndex, index } = elements[0];
      const team = chart.data.labels[index];
      const result = chart.data.datasets[datasetIndex].label;
      onChartClick(event, elements, chart, "LINE_RESULT", "lineouts-detail", [
        { descriptor: "TEAM", value: team },
        { descriptor: "LINE_RESULT", value: result },
      ]);
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div className="border rounded-lg p-4 h-72">
        <Doughnut data={doughnutData} options={doughnutOptions as any} />
      </div>
      <div className="border rounded-lg p-4 h-72">
        <Bar data={positionData} options={positionOptions as any} />
      </div>
      <div className="border rounded-lg p-4 h-72">
        <Bar data={throwerData} options={throwerOptions as any} />
      </div>
      <div className="border rounded-lg p-4 h-72 xl:col-span-3">
        <Bar data={stackedData} options={stackedOptions as any} />
      </div>
    </div>
  );
};

export default LineoutDetailCharts;

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
  if (s.includes("WIN") || s.includes("GAN")) return "Ganado";
  if (s.includes("LOSE") || s.includes("PERD")) return "Perdido";
  if (s.includes("PEN")) return "Penal";
  if (s.includes("FREE")) return "Free kick";
  return s;
};

const normalizeAdvance = (raw: any): string => {
  const s = String(raw || "").toUpperCase().trim();
  if (!s) return "Sin dato";
  if (s.startsWith("POS")) return "Positivo";
  if (s.startsWith("NEU")) return "Neutro";
  if (s.startsWith("NEG")) return "Negativo";
  return s;
};

const ScrumDetailCharts: React.FC<Props> = ({ events, matchInfo, ourTeamsList = [], onChartClick }) => {
  const { resultsCounts, advanceCounts, teamResultMatrix } = useMemo(() => {
    const resCounts: Record<string, number> = {};
    const advCounts: Record<string, number> = {};
    const matrix: Record<string, Record<string, number>> = {};

    (events || []).forEach((event) => {
      const result = normalizeResult(
        pickValue(event, ["SCRUM_RESULT", "RESULTADO", "RESULTADO-SCRUM", "RESULT"])
      );
      const advance = normalizeAdvance(pickValue(event, ["ADVANCE", "AVANCE"]));
      resCounts[result] = (resCounts[result] || 0) + 1;
      advCounts[advance] = (advCounts[advance] || 0) + 1;

      const teamRaw = getTeamFromEvent(event) ?? pickValue(event, ["TEAM"]);
      const team = normalizeTeamForFilter(teamRaw || "", matchInfo, ourTeamsList);
      if (!matrix[team]) matrix[team] = {};
      matrix[team][result] = (matrix[team][result] || 0) + 1;
    });

    return { resultsCounts: resCounts, advanceCounts: advCounts, teamResultMatrix: matrix };
  }, [events, matchInfo, ourTeamsList]);

  if (!events || events.length === 0) return null;

  const doughnutData = {
    labels: Object.keys(resultsCounts),
    datasets: [
      {
        data: Object.values(resultsCounts),
        backgroundColor: ["#22c55e", "#ef4444", "#f59e0b", "#38bdf8", "#94a3b8"],
      },
    ],
  };

  const advanceData = {
    labels: Object.keys(advanceCounts),
    datasets: [
      {
        label: "Scrums",
        data: Object.values(advanceCounts),
        backgroundColor: ["#22c55e", "#a3a3a3", "#ef4444", "#94a3b8"],
      },
    ],
  };

  const teamLabels = Object.keys(teamResultMatrix);
  const resultLabels = Object.keys(resultsCounts);
  const stackedData = {
    labels: teamLabels,
    datasets: resultLabels.map((res, idx) => ({
      label: res,
      data: teamLabels.map((team) => teamResultMatrix[team]?.[res] || 0),
      backgroundColor: ["#22c55e", "#ef4444", "#f59e0b", "#38bdf8", "#94a3b8"][idx % 5],
      stack: "stack1",
    })),
  };

  const doughnutOptions = {
    plugins: {
      legend: { position: "bottom" as const },
      title: { display: true, text: "Resultado de scrums" },
    },
    onClick: (event: any, elements: any, chart: any) => {
      if (!onChartClick || !elements?.length) return;
      const label = chart.data.labels[elements[0].index];
      onChartClick("SCRUM_RESULT", label, "SCRUM_RESULT");
    },
  };

  const advanceOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Avance en scrums" },
    },
    scales: { y: { beginAtZero: true } },
    onClick: (event: any, elements: any, chart: any) => {
      if (!onChartClick || !elements?.length) return;
      const label = chart.data.labels[elements[0].index];
      onChartClick("ADVANCE", label, "ADVANCE");
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
      onChartClick(event, elements, chart, "SCRUM_RESULT", "scrums-detail", [
        { descriptor: "TEAM", value: team },
        { descriptor: "SCRUM_RESULT", value: result },
      ]);
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="border rounded-lg p-4 h-72">
        <Doughnut data={doughnutData} options={doughnutOptions as any} />
      </div>
      <div className="border rounded-lg p-4 h-72">
        <Bar data={advanceData} options={advanceOptions as any} />
      </div>
      <div className="border rounded-lg p-4 h-72 md:col-span-1 col-span-1">
        <Bar data={stackedData} options={stackedOptions as any} />
      </div>
    </div>
  );
};

export default ScrumDetailCharts;

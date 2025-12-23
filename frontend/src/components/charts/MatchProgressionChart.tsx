import React from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

export type MatchProgressionDatum = {
  matchId: number;
  label: string;
  bars: Record<string, number>;
  lineValue?: number | null;
};

type Props = {
  title: string;
  data: MatchProgressionDatum[];
  lineLabel?: string;
  barColors?: string[];
};

const DEFAULT_COLORS = [
  "rgba(59, 130, 246, 0.8)",
  "rgba(239, 68, 68, 0.8)",
  "rgba(16, 185, 129, 0.8)",
  "rgba(234, 179, 8, 0.8)",
  "rgba(99, 102, 241, 0.8)",
];

const MatchProgressionChart: React.FC<Props> = ({ title, data, lineLabel = "Efectividad (%)", barColors = DEFAULT_COLORS }) => {
  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-500">Sin datos suficientes para mostrar progresión.</div>;
  }

  const labels = data.map((d) => d.label);
  const barKeys = Array.from(new Set(data.flatMap((d) => Object.keys(d.bars || {}))));
  const showLine = data.some((d) => d.lineValue !== undefined && d.lineValue !== null);

  const inferStack = (label: string) => {
    const low = label.toLowerCase();
    if (low.includes("rival") || low.includes("opp")) return "opp";
    if (low.includes("nuestro") || low.includes("our")) return "our";
    return "bars";
  };

  const datasets: any[] = barKeys.map((key, idx) => ({
    type: "bar",
    label: key,
    data: data.map((d) => d.bars?.[key] ?? 0),
    backgroundColor: barColors[idx % barColors.length],
    stack: inferStack(key),
  }));

  if (showLine) {
    datasets.push({
      type: "line",
      label: lineLabel,
      data: data.map((d) => d.lineValue ?? null),
      yAxisID: "y1",
      borderColor: "#1d4ed8",
      backgroundColor: "#1d4ed8",
      tension: 0.2,
      pointRadius: 4,
    });
  }

  const chartData = { labels, datasets };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: title },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || "";
            const value = context.raw;
            if (context.dataset.type === "line") return `${label}: ${value ?? 0}%`;
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
      y1: {
        position: "right",
        beginAtZero: true,
        suggestedMax: 100,
        grid: { drawOnChartArea: false },
        ticks: { callback: (v: number) => `${v}%` },
        display: showLine,
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default MatchProgressionChart;

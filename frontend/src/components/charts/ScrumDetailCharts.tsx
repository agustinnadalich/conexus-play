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
import { pickValue, isOpponentEvent } from "@/utils/eventUtils";
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
  if (s.includes("LOSE") || s.includes("LOST") || s.includes("PERD")) return "Perdido";
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
  const {
    teamResultAdvanceMatrix,
    teamAdvanceCounts,
    timeBuckets,
    timeTeamBuckets,
    teams,
    advances,
    results,
  } = useMemo(() => {
    const teamResAdv: Record<string, Record<string, Record<string, number>>> = {};
    const teamAdv: Record<string, Record<string, number>> = {};
    const timeMap: Record<string, Record<string, number>> = {};
    const timeTeamMap: Record<string, Record<string, Record<string, number>>> = {};
    const teamsSet = new Set<string>();
    const advSet = new Set<string>();
    const resSet = new Set<string>();

    (events || []).forEach((event) => {
      const result = normalizeResult(
        pickValue(event, ["SCRUM_RESULT", "SCRUM", "RESULTADO", "RESULTADO-SCRUM", "RESULT"])
      );
      const advance = normalizeAdvance(pickValue(event, ["ADVANCE", "AVANCE"]));
      const team = isOpponentEvent(event) ? "Rival" : "Nuestro Equipo";
      teamsSet.add(team);
      advSet.add(advance);
      resSet.add(result);

      if (!teamResAdv[team]) teamResAdv[team] = {};
      if (!teamResAdv[team][result]) teamResAdv[team][result] = {};
      teamResAdv[team][result][advance] = (teamResAdv[team][result][advance] || 0) + 1;

      if (!teamAdv[team]) teamAdv[team] = {};
      teamAdv[team][advance] = (teamAdv[team][advance] || 0) + 1;

      const tg = pickValue(event, ["Time_Group", "time_group", "Quarter_Group", "Time_Group"]) || event.extra_data?.Time_Group || null;
      const tgNorm = tg ? String(tg) : "Sin dato";
      if (!timeMap[tgNorm]) timeMap[tgNorm] = {};
      timeMap[tgNorm][result] = (timeMap[tgNorm][result] || 0) + 1;

      if (!timeTeamMap[tgNorm]) timeTeamMap[tgNorm] = {};
      if (!timeTeamMap[tgNorm][team]) timeTeamMap[tgNorm][team] = {};
      timeTeamMap[tgNorm][team][result] = (timeTeamMap[tgNorm][team][result] || 0) + 1;
    });

    return {
      teamResultAdvanceMatrix: teamResAdv,
      teamAdvanceCounts: teamAdv,
      timeBuckets: timeMap,
      teams: Array.from(teamsSet),
      advances: Array.from(advSet),
      results: Array.from(resSet),
      timeTeamBuckets: timeTeamMap,
    };
  }, [events, matchInfo, ourTeamsList]);

  if (!events || events.length === 0) return null;

  const perTeamResultAdvance = teams.map((team) => {
    const resAdv = teamResultAdvanceMatrix[team] || {};
    const colorForAdvance = (adv: string) => {
      const a = adv.toLowerCase();
      if (a.startsWith("pos")) return "rgba(96, 165, 250, 0.85)"; // azul
      if (a.startsWith("neu")) return "rgba(252, 211, 77, 0.85)"; // amarillo
      if (a.startsWith("neg")) return "rgba(239, 68, 68, 0.85)"; // rojo
      return "rgba(148, 163, 184, 0.75)";
    };
    const datasets = advances.map((adv) => ({
      label: adv,
      data: results.map((res) => resAdv[res]?.[adv] || 0),
      backgroundColor: colorForAdvance(adv),
      stack: "stack1",
    }));
    return {
      team,
      data: {
        labels: results,
        datasets,
      },
    };
  });

  const perTeamAdvancePie = teams.map((team) => {
    const adv = teamAdvanceCounts[team] || {};
    const labels = Object.keys(adv);
      const backgroundColor = labels.map((l) => {
        const a = l.toLowerCase();
        if (a.startsWith("pos")) return "rgba(96, 165, 250, 0.85)";
        if (a.startsWith("neu")) return "rgba(252, 211, 77, 0.85)";
        if (a.startsWith("neg")) return "rgba(239, 68, 68, 0.85)";
        return "rgba(148, 163, 184, 0.75)";
      });
    return {
      team,
      data: {
        labels,
        datasets: [
          {
            data: Object.values(adv),
            backgroundColor,
          },
        ],
      },
    };
  });

  const timeLabels = Object.keys(timeBuckets);
  const timeData = {
    labels: timeLabels,
    datasets: results.flatMap((res, idx) => {
      const colorMap: Record<string, string> = {
        Ganado: "rgba(59, 130, 246, 0.9)",
        Perdido: "rgba(239, 68, 68, 0.9)",
        Penal: "rgba(252, 211, 77, 0.9)",
        "Free kick": "rgba(148, 163, 184, 0.9)",
        Desconocido: "rgba(203, 213, 225, 0.9)",
      };
      const color = colorMap[res] || ["rgba(59,130,246,0.9)", "rgba(239,68,68,0.9)", "rgba(252,211,77,0.9)"][idx % 3];
      return ["OUR", "OPP"].map((side) => ({
        label: `${res} - ${side === "OUR" ? "Nuestro" : "Rival"}`,
        data: timeLabels.map((tg) => {
          const teamsInTime = timeTeamBuckets[tg] || {};
          const totalBySide = Object.entries(teamsInTime).reduce((acc, [team, resMap]) => {
            const isOur = team === "Nuestro Equipo";
            if ((side === "OUR" && isOur) || (side === "OPP" && !isOur)) {
              acc += resMap[res] || 0;
            }
            return acc;
          }, 0);
          return totalBySide;
        }),
        backgroundColor: color,
        stack: side,
      }));
    }),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {perTeamResultAdvance.map(({ team, data }) => (
        <div key={`res-${team}`} className="border rounded-lg p-4 h-72">
          <Bar
            data={data}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                title: { display: true, text: `Resultados por avance - ${team}` },
              },
              scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
              onClick: (event: any, elements: any, chart: any) => {
                if (!onChartClick || !elements?.length) return;
                const { datasetIndex, index } = elements[0];
                const res = chart.data.labels[index];
                const adv = chart.data.datasets[datasetIndex].label;
                onChartClick(event, elements, chart, "SCRUM_RESULT", "scrums-detail", [
                  { descriptor: "TEAM", value: team },
                  { descriptor: "SCRUM_RESULT", value: res },
                  { descriptor: "ADVANCE", value: adv },
                ]);
              },
            } as any}
          />
        </div>
      ))}

      <div className="border rounded-lg p-4 h-72 md:col-span-1 xl:col-span-1 w-full flex flex-col">
        <h4 className="text-md font-semibold mb-2">Avance</h4>
        <div
          className={`grid gap-2 flex-1 items-center justify-items-center ${
            perTeamAdvancePie.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {perTeamAdvancePie
            .sort((a, b) => {
              const aIsOur = a.team === "Nuestro Equipo";
              const bIsOur = b.team === "Nuestro Equipo";
              if (aIsOur === bIsOur) return 0;
              return aIsOur ? -1 : 1;
            })
            .map(({ team, data }) => {
              const isOur = team === "Nuestro Equipo";
              const label = isOur ? "Nuestro" : "Rival";
              return (
                <div key={`pie-${team}`} className="h-full w-full flex flex-col items-center">
                  <div className="text-sm font-medium mb-1">{label}</div>
                  <div className="h-full w-full max-h-48">
                    <Doughnut
                      data={data}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        resizeDelay: 50,
                        onClick: (event: any, elements: any, chart: any) => {
                          if (!onChartClick || !elements?.length) return;
                          const advLabel = chart.data.labels[elements[0].index];
                          onChartClick(event, elements, chart, "ADVANCE", "scrums-detail", [
                            { descriptor: "TEAM_SIDE", value: isOur ? "OUR_TEAM" : "OPPONENT" },
                            { descriptor: "ADVANCE", value: advLabel },
                          ]);
                        },
                      } as any}
                      style={{ height: "100%", width: "100%" }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
        <div className="mt-2 w-full flex justify-center gap-4 text-xs text-slate-200 flex-wrap">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: "rgba(96, 165, 250, 0.85)" }}></span>Positivo</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: "rgba(252, 211, 77, 0.85)" }}></span>Neutro</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: "rgba(239, 68, 68, 0.85)" }}></span>Negativo</span>
        </div>
      </div>

      <div className="border rounded-lg p-4 h-72 w-full xl:col-span-2">
        <Bar
          data={timeData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: { display: true, text: "Scrums por tiempo (Nuestro vs Rival)" },
            },
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
            onClick: (event: any, elements: any, chart: any) => {
              if (!onChartClick || !elements?.length) return;
              const { datasetIndex, index } = elements[0];
              const tg = chart.data.labels[index];
              const res = chart.data.datasets[datasetIndex].label;
              onChartClick(event, elements, chart, "SCRUM_RESULT", "scrums-detail", [
                { descriptor: "Time_Group", value: tg },
                { descriptor: "SCRUM_RESULT", value: res },
              ]);
            },
          } as any}
        />
      </div>
    </div>
  );
};

export default ScrumDetailCharts;

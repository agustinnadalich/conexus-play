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
  if (s.includes("LOSE") || s.includes("LOST") || s.includes("PERD") || s.includes("LOSTL")) return "Perdido";
  if (s.includes("TORCID") || s.includes("NOT-STRAIGHT")) return "Torcida";
  if (s.includes("INFRA")) return "Infraccion";
  return s;
};

const normalizePosition = (raw: any): string => {
  const s = String(raw || "").toUpperCase().trim();
  if (!s) return "Sin dato";
  if (s === "A") return "A";
  if (s === "B") return "B";
  if (s === "C" || s === "MID" || s === "M") return "C";
  if (s === "D") return "D";
  if (s === "E") return "E";
  if (s === "ZERO" || s === "0") return "0";
  return s;
};

const cleanPlayer = (raw: any): string => {
  if (!raw) return "";
  const s = String(raw).trim();
  if (s.startsWith("T-")) return s.slice(2);
  return s;
};

const LineoutDetailCharts: React.FC<Props> = ({ events, matchInfo, ourTeamsList = [], onChartClick }) => {
  const orderedPositions = ["A", "B", "C", "D", "E", "OTHER", "SIN DATO"];

  const {
    teamResultMatrix,
    teamPositionMatrix,
    teamThrowers,
    teamJumpers,
    teamPlays,
  } = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    const posMatrix: Record<string, Record<string, Record<string, number>>> = {};
    const throwers: Record<string, Record<string, { win: number; lose: number }>> = {};
    const jumpers: Record<string, Record<string, { win: number; lose: number }>> = {};
    const plays: Record<string, Record<string, { win: number; lose: number }>> = {};

    (events || []).forEach((event) => {
      const result = normalizeResult(pickValue(event, ["LINE_RESULT", "LINEOUT_RESULT", "RESULTADO-LINE", "RESULTADO"]));
      let position = normalizePosition(pickValue(event, ["LINE_POSITION", "LINEOUT_POSITION", "POSICION-LINE"]));
      if (position === "Sin dato") position = "SIN DATO";
      const thrower = cleanPlayer(pickValue(event, ["LINE_THROWER", "TIRADOR-LINE", "PLAYER", "JUGADOR"]));
      const jumperName = cleanPlayer(pickValue(event, ["JUGADOR", "PLAYER", "players"]));
      const playName = String(pickValue(event, ["JUGADA", "PLAY", "CHIAMATA", "MOVE"]) || "").trim() || "Sin dato";

      const teamRaw = getTeamFromEvent(event) ?? pickValue(event, ["TEAM"]);
      const team = normalizeTeamForFilter(teamRaw || "", matchInfo, ourTeamsList);

      if (!matrix[team]) matrix[team] = {};
      matrix[team][result] = (matrix[team][result] || 0) + 1;

      if (!posMatrix[team]) posMatrix[team] = {};
      if (!posMatrix[team][position]) posMatrix[team][position] = {};
      posMatrix[team][position][result] = (posMatrix[team][position][result] || 0) + 1;

      const isWin = result === "Limpia" || result === "Sucia";

      if (!throwers[team]) throwers[team] = {};
      if (thrower) {
        if (!throwers[team][thrower]) throwers[team][thrower] = { win: 0, lose: 0 };
        if (isWin) throwers[team][thrower].win += 1;
        else throwers[team][thrower].lose += 1;
      }

      if (!jumpers[team]) jumpers[team] = {};
      if (jumperName) {
        if (!jumpers[team][jumperName]) jumpers[team][jumperName] = { win: 0, lose: 0 };
        if (isWin) jumpers[team][jumperName].win += 1;
        else jumpers[team][jumperName].lose += 1;
      }

      if (!plays[team]) plays[team] = {};
      if (playName) {
        if (!plays[team][playName]) plays[team][playName] = { win: 0, lose: 0 };
        if (isWin) plays[team][playName].win += 1;
        else plays[team][playName].lose += 1;
      }
    });

    return {
      teamResultMatrix: matrix,
      teamPositionMatrix: posMatrix,
      teamThrowers: throwers,
      teamJumpers: jumpers,
      teamPlays: plays,
    };
  }, [events, matchInfo, ourTeamsList]);

  if (!events || events.length === 0) return null;

  const resultColors: Record<string, string> = {
    Limpia: "rgba(191, 219, 254, 0.9)", // azul
    Sucia: "rgba(253, 230, 138, 0.9)", // amarilla
    Perdido: "rgba(254, 202, 202, 0.95)", // rojo claro
    Torcida: "rgba(248, 113, 113, 0.9)", // rojo
    Infraccion: "rgba(226, 232, 240, 0.9)",
    Desconocido: "rgba(226, 232, 240, 0.9)",
  };

  const perTeamPositionData = Object.keys(teamPositionMatrix).map((team) => {
    const posData = teamPositionMatrix[team] || {};
    const labels = orderedPositions.filter((pos) => {
      const wins = (posData[pos]?.Limpia || 0) + (posData[pos]?.Sucia || 0);
      const losses = (posData[pos]?.Perdido || 0) + (posData[pos]?.Torcida || 0);
      return wins + losses > 0 || pos !== "SIN DATO";
    });
    const winData = labels.map((pos) => (posData[pos]?.Limpia || 0) + (posData[pos]?.Sucia || 0));
    const loseData = labels.map((pos) => (posData[pos]?.Perdido || 0) + (posData[pos]?.Torcida || 0));
    const totalWins = winData.reduce((a, b) => a + b, 0);
    const total = totalWins + loseData.reduce((a, b) => a + b, 0);
    const eff = total ? ((totalWins / total) * 100).toFixed(1) : "0.0";
    const labelsWithEff = labels.map((pos, idx) => {
      const wins = winData[idx];
      const losses = loseData[idx];
      const t = wins + losses;
      const p = t ? ((wins / t) * 100).toFixed(1) : "0.0";
      return `${pos} (${p}%)`;
    });
    return {
      team,
      eff,
      data: {
        labels: labelsWithEff,
        datasets: [
          { label: "Ganado", data: winData, backgroundColor: "rgba(191, 219, 254, 0.9)", stack: "stack1" },
          { label: "Perdido", data: loseData, backgroundColor: "rgba(254, 202, 202, 0.95)", stack: "stack1" },
        ],
      },
    };
  });

  const perTeamResultDonuts = Object.keys(teamResultMatrix).map((team) => {
    const resMap = teamResultMatrix[team] || {};
    const labels = Object.keys(resMap);
    const dataValues = labels.map((l) => resMap[l]);
    const wins = (resMap["Limpia"] || 0) + (resMap["Sucia"] || 0);
    const total = dataValues.reduce((a, b) => a + b, 0);
    const eff = total ? ((wins / total) * 100).toFixed(1) : "0.0";
    const colors = labels.map((l) => resultColors[l] || "rgba(226, 232, 240, 0.9)");
    return {
      team,
      eff,
      data: { labels, datasets: [{ data: dataValues, backgroundColor: colors }] },
    };
  });

  const buildEntityCharts = (
    entitiesByTeam: Record<string, Record<string, { win: number; lose: number }>>,
    descriptor: string,
    onlyOurTeam: boolean,
    skipUnknownLabel?: boolean
  ) =>
    Object.keys(entitiesByTeam)
      .map((team) => {
        const isOur = ourTeamsList?.length
          ? ourTeamsList.some((t) => t && team.toLowerCase().trim() === t.toLowerCase().trim())
          : true;
        if (onlyOurTeam && !isOur) return null;
        const entries = Object.entries(entitiesByTeam[team] || {}).filter(([name, v]) => {
          if (skipUnknownLabel && (!name || name.toLowerCase().includes("sin dato"))) return false;
          return v.win + v.lose > 0;
        });
        if (entries.length === 0) return null;
        const labelsArr = entries.map(([name, v]) => {
          const total = v.win + v.lose;
          const eff = total ? ((v.win / total) * 100).toFixed(1) : "0.0";
          return `${name || "Sin dato"} (${eff}%)`;
        });
        const winData = entries.map(([, v]) => v.win);
        const loseData = entries.map(([, v]) => v.lose);
        const totalWins = winData.reduce((a, b) => a + b, 0);
        const total = totalWins + loseData.reduce((a, b) => a + b, 0);
        const eff = total ? ((totalWins / total) * 100).toFixed(1) : "0.0";
        return {
          team,
          eff,
          data: {
            labels: labelsArr,
            datasets: [
              { label: "Ganado", data: winData, backgroundColor: "rgba(191, 219, 254, 0.9)", stack: "stack1" },
              { label: "Perdido", data: loseData, backgroundColor: "rgba(254, 202, 202, 0.95)", stack: "stack1" },
            ],
          },
          descriptor,
        };
      })
      .filter(Boolean) as Array<{ team: string; eff: string; data: any; descriptor: string }>;

  const perTeamThrowerCharts = buildEntityCharts(teamThrowers, "LINE_THROWER", true);
  const perTeamJumperCharts = buildEntityCharts(teamJumpers, "JUGADOR", true);
  const perTeamPlayCharts = buildEntityCharts(teamPlays, "JUGADA", true, true);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        <div className="border rounded-lg p-4 h-72 md:col-span-1 xl:col-span-1 flex flex-col">
          <h4 className="text-md font-semibold mb-2">Resultados</h4>
          <div
            className={`grid gap-2 justify-items-center flex-1 items-center ${
              perTeamResultDonuts.length === 1 ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            {perTeamResultDonuts.map(({ team, eff, data }) => {
              const isOur = ourTeamsList?.some((t) => t && team.toLowerCase().trim() === t.toLowerCase().trim());
              const label = isOur ? "Nuestro" : "Rival";
              const teamSide = isOur ? 'OUR_TEAM' : 'OPPONENT';
              return (
                <div key={`res-${team}`} className="h-full w-full flex flex-col items-center">
                  <div className="text-sm font-medium mb-1">{label}</div>
                  <div className="h-full w-full max-h-44">
                    <Doughnut
                      data={data}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                        resizeDelay: 50,
                        onClick: (event: any, elements: any, chart: any) => {
                          if (!onChartClick || !elements?.length) return;
                          const lbl = chart.data.labels[elements[0].index];
                          onChartClick(event, elements, chart, "LINE_RESULT", "lineouts-detail", [
                            { descriptor: "TEAM_SIDE", value: teamSide },
                            { descriptor: "LINE_RESULT", value: lbl },
                          ]);
                        },
                      } as any}
                      style={{ height: "100%", width: "100%" }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Eff {eff}%</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 w-full flex justify-center gap-3 text-xs text-gray-700 flex-wrap">
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: resultColors["Limpia"] }}></span>Limpia</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: resultColors["Sucia"] }}></span>Sucia</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: resultColors["Perdido"] }}></span>Perdido</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: resultColors["Torcida"] }}></span>Torcida</span>
          </div>
        </div>

        {perTeamPositionData.map(({ team, eff, data }) => (
          <div key={`pos-${team}`} className="border rounded-lg p-4 h-72">
            <Bar
              data={data}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: "bottom" as const },
                  title: { display: true, text: `Posición y resultado - ${team} (Eff ${eff}%)` },
                },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
                onClick: (event: any, elements: any, chart: any) => {
                  if (!onChartClick || !elements?.length) return;
                  const { datasetIndex, index } = elements[0];
                  const posRaw = chart.data.labels[index];
                  const pos = String(posRaw || '').split(' ')[0].replace(/[()%]/g, '');
                  const res = chart.data.datasets[datasetIndex].label;
                  const isOur = ourTeamsList?.some((t) => t && team.toLowerCase().trim() === t.toLowerCase().trim());
                  onChartClick(event, elements, chart, "LINE_POSITION", "lineouts-detail", [
                    { descriptor: "TEAM_SIDE", value: isOur ? "OUR_TEAM" : "OPPONENT" },
                    { descriptor: "LINE_POSITION", value: pos },
                    { descriptor: "LINE_RESULT", value: res === "Ganado" ? "WIN" : "LOSE" },
                  ]);
                },
              } as any}
            />
          </div>
        ))}

        {perTeamPlayCharts.map(({ team, eff, data, descriptor }) => (
          <div key={`play-${team}`} className="border rounded-lg p-4 h-72">
            <Bar
              data={data}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: "bottom" as const },
                  title: { display: true, text: `Jugadas - ${team} (Eff ${eff}%)` },
                },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
                onClick: (event: any, elements: any, chart: any) => {
                  if (!onChartClick || !elements?.length) return;
                  const { datasetIndex, index } = elements[0];
                  const rawLabel = chart.data.labels[index];
                  const name = String(rawLabel || '').replace(/\(.*?\)/g, '').trim();
                  const res = chart.data.datasets[datasetIndex].label;
                  const isOur = ourTeamsList?.some((t) => t && team.toLowerCase().trim() === t.toLowerCase().trim());
                  onChartClick(event, elements, chart, "LINE_RESULT", "lineouts-detail", [
                    { descriptor: "TEAM_SIDE", value: isOur ? "OUR_TEAM" : "OPPONENT" },
                    { descriptor, value: name },
                    { descriptor: "LINE_RESULT", value: res === "Ganado" ? "WIN" : "LOSE" },
                  ]);
                },
              } as any}
            />
          </div>
        ))}

        {perTeamThrowerCharts.map(({ team, eff, data, descriptor }) => (
          <div key={`throw-${team}`} className="border rounded-lg p-4 h-72">
            <Bar
              data={data}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: "bottom" as const },
                  title: { display: true, text: `Lanzadores (solo nuestro equipo) - ${team} (Eff ${eff}%)` },
                },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
                onClick: (event: any, elements: any, chart: any) => {
                  if (!onChartClick || !elements?.length) return;
                  const { datasetIndex, index } = elements[0];
                  const rawLabel = chart.data.labels[index];
                  const name = String(rawLabel || '').replace(/\(.*?\)/g, '').trim().replace(/^T[- ]/i, '');
                  const res = chart.data.datasets[datasetIndex].label;
                  const isOur = ourTeamsList?.some((t) => t && team.toLowerCase().trim() === t.toLowerCase().trim());
                  onChartClick(event, elements, chart, "LINE_RESULT", "lineouts-detail", [
                    { descriptor: "TEAM_SIDE", value: isOur ? "OUR_TEAM" : "OPPONENT" },
                    { descriptor, value: name },
                    { descriptor: "LINE_RESULT", value: res === "Ganado" ? "WIN" : "LOSE" },
                  ]);
                },
              } as any}
            />
          </div>
        ))}

        {perTeamJumperCharts.map(({ team, eff, data, descriptor }) => (
          <div key={`jump-${team}`} className="border rounded-lg p-4 h-72">
            <Bar
              data={data}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: "bottom" as const },
                  title: { display: true, text: `Saltadores (solo nuestro equipo) - ${team} (Eff ${eff}%)` },
                },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
                onClick: (event: any, elements: any, chart: any) => {
                  if (!onChartClick || !elements?.length) return;
                  const { datasetIndex, index } = elements[0];
                  const rawLabel = chart.data.labels[index];
                  const name = String(rawLabel || '').replace(/\(.*?\)/g, '').trim();
                  const res = chart.data.datasets[datasetIndex].label;
                  const isOur = ourTeamsList?.some((t) => t && team.toLowerCase().trim() === t.toLowerCase().trim());
                  onChartClick(event, elements, chart, "LINE_RESULT", "lineouts-detail", [
                    { descriptor: "TEAM_SIDE", value: isOur ? "OUR_TEAM" : "OPPONENT" },
                    { descriptor, value: name },
                    { descriptor: "LINE_RESULT", value: res === "Ganado" ? "WIN" : "LOSE" },
                  ]);
                },
              } as any}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LineoutDetailCharts;

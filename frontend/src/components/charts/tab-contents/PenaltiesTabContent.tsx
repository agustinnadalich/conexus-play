import PenaltiesPlayerBarChart from "../PenaltiesPlayerBarChart";
import PenaltiesTimeChart from "../PenaltiesTimeChart";
import InfringementsCauseChart from "../InfringementsCauseChart";
import PenaltiesTeamPieChart from "../PenaltiesTeamPieChart";
import TabEventsList from "./TabEventsList";
import { MatchEvent } from "@/types";
import MatchProgressionChart, { MatchProgressionDatum } from "../MatchProgressionChart";

type Props = {
  hasPenalties: boolean;
  hasPenaltyPlayers: boolean;
  penaltyEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
  onEventClick?: (event: MatchEvent) => void;
  progressionData?: MatchProgressionDatum[];
  showProgression?: boolean;
  ourTeamsList?: string[];
};

const PenaltiesTabContent = ({
  hasPenalties,
  hasPenaltyPlayers,
  penaltyEvents,
  onChartClick,
  onEventClick,
  progressionData,
  showProgression,
  ourTeamsList = [],
}: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Penales</h3>
    {showProgression && progressionData && progressionData.length > 0 && (
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">Penales por partido (MultiMatch)</h4>
        <div className="h-72">
          <MatchProgressionChart title="Penales propios vs rivales" data={progressionData} />
        </div>
      </div>
    )}
    {hasPenalties ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PenaltiesTeamPieChart
          events={penaltyEvents}
          category="PENALTY"
          title="Penales por Equipo"
          tabId="penalties-tab"
          onChartClick={onChartClick}
          ourTeamsList={ourTeamsList}
        />
        {hasPenaltyPlayers && (
          <PenaltiesPlayerBarChart
            events={penaltyEvents}
            category="PENALTY"
            title="Penales por Jugador"
            tabId="penalties-tab"
            onChartClick={onChartClick}
          />
        )}
        <PenaltiesTimeChart
          events={penaltyEvents}
          category="PENALTY"
          title="Penales por Bloque de Tiempo"
          tabId="penalties-tab"
          onChartClick={onChartClick}
        />
        <InfringementsCauseChart events={penaltyEvents} onChartClick={onChartClick} />
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de Penales para mostrar</div>
    )}
    <TabEventsList
      title="Eventos de Penales"
      events={penaltyEvents}
      columns={["TEAM", "JUGADOR", "PLAYER", "INFRACCION", "ADVANCE", "Game_Time", "clip_start", "clip_end"]}
      onRowClick={(ev) => {
        const id = (ev as any).id ?? (ev as any).ID;
        if (id !== undefined) onChartClick("ID", id, "ID");
        onEventClick?.(ev);
      }}
    />
  </div>
);

export default PenaltiesTabContent;

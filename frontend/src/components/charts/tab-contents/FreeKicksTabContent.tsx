import PenaltiesPlayerBarChart from "../PenaltiesPlayerBarChart";
import PenaltiesTimeChart from "../PenaltiesTimeChart";
import InfringementsCauseChart from "../InfringementsCauseChart";
import PenaltiesTeamPieChart from "../PenaltiesTeamPieChart";
import TabEventsList from "./TabEventsList";
import { MatchEvent } from "@/types";

type Props = {
  hasFreeKicks: boolean;
  hasFreeKickPlayers: boolean;
  freeKickEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
  onEventClick?: (event: MatchEvent) => void;
};

const FreeKicksTabContent = ({ hasFreeKicks, hasFreeKickPlayers, freeKickEvents, onChartClick, onEventClick }: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Free-kicks</h3>
    {hasFreeKicks ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PenaltiesTeamPieChart
          events={freeKickEvents}
          category="FREE-KICK"
          title="Free-kicks por Equipo"
          tabId="freekicks-tab"
          onChartClick={onChartClick}
        />
        {hasFreeKickPlayers && (
          <PenaltiesPlayerBarChart
            events={freeKickEvents}
            category="FREE-KICK"
            title="Free-kicks por Jugador"
            tabId="freekicks-tab"
            onChartClick={onChartClick}
          />
        )}
        <PenaltiesTimeChart
          events={freeKickEvents}
          category="FREE-KICK"
          title="Free-kicks por Bloque de Tiempo"
          tabId="freekicks-tab"
          onChartClick={onChartClick}
        />
        <InfringementsCauseChart events={freeKickEvents} onChartClick={onChartClick} />
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de Free-kicks para mostrar</div>
    )}
    <TabEventsList
      title="Eventos de Free-kicks"
      events={freeKickEvents}
      columns={["TEAM", "JUGADOR", "PLAYER", "INFRACCION", "ADVANCE", "Game_Time", "clip_start", "clip_end"]}
      onRowClick={(ev) => {
        const id = (ev as any).id ?? (ev as any).ID;
        if (id !== undefined) onChartClick("ID", id, "ID");
        onEventClick?.(ev);
      }}
    />
  </div>
);

export default FreeKicksTabContent;

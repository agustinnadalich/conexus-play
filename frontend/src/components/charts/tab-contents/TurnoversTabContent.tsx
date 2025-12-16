import TurnoversRecoversBarChart from "../TurnoversRecoversBarChart";
import TurnoversLostBarChart from "../TurnoversLostBarChart";
import TurnoversTypeChart from "../TurnoversTypeChart";
import TurnoversTimeChart from "../TurnoversTimeChart";
import TabEventsList from "./TabEventsList";
import { MatchEvent } from "@/types";

type Props = {
  hasTurnovers: boolean;
  turnoverEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
  onEventClick?: (event: MatchEvent) => void;
};

const TurnoversTabContent = ({ hasTurnovers, turnoverEvents, onChartClick, onEventClick }: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Turnovers</h3>
    {hasTurnovers ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TurnoversRecoversBarChart events={turnoverEvents} onChartClick={onChartClick} />
        <TurnoversLostBarChart events={turnoverEvents} onChartClick={onChartClick} />
        <TurnoversTypeChart events={turnoverEvents} onChartClick={onChartClick} />
        <TurnoversTimeChart events={turnoverEvents} onChartClick={onChartClick} />
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de Turnovers para mostrar</div>
    )}
    <TabEventsList
      title="Eventos de Turnovers"
      events={turnoverEvents}
      columns={["TEAM", "TURNOVER_TYPE", "event_type", "Game_Time", "clip_start", "clip_end"]}
      onRowClick={(ev) => {
        const id = (ev as any).id ?? (ev as any).ID;
        if (id !== undefined) onChartClick("ID", id, "ID");
        onEventClick?.(ev);
      }}
    />
  </div>
);

export default TurnoversTabContent;

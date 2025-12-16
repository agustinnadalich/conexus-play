import PlayerPointsChart from "../PlayerPointsChart";
import PointsTimeChart from "../PointsTimeChart";
import PointsTypeChart from "../PointsTypeChart";
import TabEventsList from "./TabEventsList";
import { MatchEvent } from "@/types";

type Props = {
  hasPoints: boolean;
  pointsEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
  onEventClick?: (event: MatchEvent) => void;
};

const PointsTabContent = ({ hasPoints, pointsEvents, onChartClick, onEventClick }: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Points</h3>
    {hasPoints ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-4 h-80">
          <h4 className="font-medium mb-2">Puntos por Jugador</h4>
          <PlayerPointsChart events={pointsEvents} onChartClick={onChartClick} />
        </div>
        <div className="border rounded-lg p-4 h-80">
          <h4 className="font-medium mb-2">Puntos por Tiempo</h4>
          <PointsTimeChart events={pointsEvents} onChartClick={onChartClick} />
        </div>
        <div className="border rounded-lg p-4 h-80">
          <h4 className="font-medium mb-2">Tipo de Puntos</h4>
          <PointsTypeChart events={pointsEvents} onChartClick={onChartClick} />
        </div>
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de Points para mostrar</div>
    )}
    <TabEventsList
      title="Eventos de Points"
      events={pointsEvents}
      columns={["TEAM", "JUGADOR", "PLAYER", "POINTS", "PUNTOS", "TIPO-PUNTOS", "Game_Time", "clip_start", "clip_end"]}
      onRowClick={(ev) => {
        const id = (ev as any).id ?? (ev as any).ID;
        if (id !== undefined) onChartClick("ID", id, "ID");
        onEventClick?.(ev);
      }}
    />
  </div>
);

export default PointsTabContent;

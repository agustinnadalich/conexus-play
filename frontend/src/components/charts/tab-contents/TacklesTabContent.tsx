import TacklesBarChart from "../TacklesBarChart";
import AdvancePieChart from "../AdvancePieChart";
import TacklesTimeChart from "../TacklesTimeChart";
import MissedTacklesBarChart from "../MissedTacklesBarChart";
import TacklesByTeamChart from "../TacklesByTeamChart";
import TabEventsList from "./TabEventsList";
import { MatchEvent } from "@/types";

type Availability = {
  hasTacklesBarChartData: boolean;
  hasTackleAdvanceData: boolean;
  hasTacklesTimeChartData: boolean;
  hasMissedTacklesBarChartData: boolean;
  hasTacklesByTeamChartData: boolean;
};

type Props = {
  filteredEvents: MatchEvent[];
  availability: Availability;
  onChartClick: (...args: any[]) => void;
  onEventClick?: (event: MatchEvent) => void;
};

const TacklesTabContent = ({ filteredEvents, availability, onChartClick, onEventClick }: Props) => {
  const {
    hasTacklesBarChartData,
    hasTackleAdvanceData,
    hasTacklesTimeChartData,
    hasMissedTacklesBarChartData,
    hasTacklesByTeamChartData,
  } = availability;

  const noCharts =
    !hasTacklesBarChartData &&
    !hasTackleAdvanceData &&
    !hasTacklesTimeChartData &&
    !hasMissedTacklesBarChartData &&
    !hasTacklesByTeamChartData;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Estadísticas de Tackles</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasTacklesBarChartData && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Tackles por Jugador</h4>
            <TacklesBarChart
              events={filteredEvents}
              onBarClick={(category, player) => {
                console.log("Clicked on player:", player);
                onChartClick("player", player, "JUGADOR");
              }}
            />
          </div>
        )}

        {hasTackleAdvanceData && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Distribución de Avances en Tackles</h4>
            <AdvancePieChart
              events={filteredEvents}
              category="TACKLE"
              onChartClick={(event, elements, chart, chartType, tabId, additionalFilters) => {
                console.log("Advance pie clicked:", chartType, additionalFilters);
                console.log("Additional filters details:", additionalFilters?.[0]);
                if (additionalFilters && additionalFilters.length > 0) {
                  const advanceFilter = additionalFilters.find((f) => f.descriptor === "ADVANCE");
                  if (advanceFilter) {
                    console.log("Found advance filter:", advanceFilter);
                    onChartClick("advance", advanceFilter.value, "AVANCE");
                  }
                }
              }}
            />
          </div>
        )}

        {hasTacklesTimeChartData && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Tackles por Tiempo de Juego</h4>
            <div className="h-80">
              <TacklesTimeChart
                events={filteredEvents}
                onChartClick={(chartType, value, descriptor) => onChartClick(chartType, value, descriptor)}
              />
            </div>
          </div>
        )}

        {hasMissedTacklesBarChartData && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Tackles Errados</h4>
            <div className="h-80">
              <MissedTacklesBarChart
                events={filteredEvents}
                onChartClick={(chartType, value, descriptor) => onChartClick(chartType, value, descriptor)}
              />
            </div>
          </div>
        )}

        {hasTacklesByTeamChartData && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Tackles por Equipo - Efectividad</h4>
            <div className="h-80">
              <TacklesByTeamChart
                events={filteredEvents}
                onChartClick={(chartType, value, descriptor) => onChartClick(chartType, value, descriptor)}
              />
            </div>
          </div>
        )}
      </div>

      {noCharts && <div className="text-center py-8 text-gray-500">No hay datos de tackles disponibles para mostrar</div>}

      <TabEventsList
        title="Eventos de Tackles"
        events={filteredEvents.filter(
          (e) =>
            e.event_type === "TACKLE" ||
            e.CATEGORY === "TACKLE" ||
            e.event_type === "MISSED-TACKLE"
        )}
        columns={["TEAM", "JUGADOR", "PLAYER", "event_type", "ADVANCE", "Game_Time", "clip_start", "clip_end"]}
        onRowClick={(ev) => {
          const id = (ev as any).id ?? (ev as any).ID;
          if (id !== undefined) onChartClick("ID", id, "ID");
          onEventClick?.(ev);
        }}
      />
    </div>
  );
};

export default TacklesTabContent;

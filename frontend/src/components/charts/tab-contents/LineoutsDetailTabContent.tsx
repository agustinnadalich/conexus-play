import { useState } from "react";
import LineoutDetailCharts from "../LineoutDetailCharts";
import LineoutDetailTable from "../LineoutDetailTable";
import { MatchEvent } from "@/types";

type Props = {
  hasLineoutDetails: boolean;
  lineoutEvents: MatchEvent[];
  matchInfo?: any;
  ourTeamsList: string[];
  onChartClick: (...args: any[]) => void;
  onEventClick?: (event: MatchEvent) => void;
};

const LineoutsDetailTabContent = ({
  hasLineoutDetails,
  lineoutEvents,
  matchInfo,
  ourTeamsList,
  onChartClick,
  onEventClick,
}: Props) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Detalle de Lineouts</h3>
      {hasLineoutDetails ? (
        <div className="space-y-6">
          <LineoutDetailCharts
            events={lineoutEvents}
            matchInfo={matchInfo}
            ourTeamsList={ourTeamsList}
            onChartClick={onChartClick}
          />
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-md">Tabla de eventos</h4>
              <button
                className="text-sm px-3 py-1 rounded border border-gray-200 hover:bg-gray-50"
                onClick={() => setShowTable((v) => !v)}
              >
                {showTable ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {showTable && (
              <div className="mt-2 max-h-80 overflow-auto">
                <LineoutDetailTable
                  events={lineoutEvents}
                  matchInfo={matchInfo}
                  ourTeamsList={ourTeamsList}
                  onRowClick={(event) => {
                    const id = event.id ?? (event as any).ID;
                    if (id !== undefined) {
                      onChartClick("ID", id, "ID");
                    }
                    onEventClick?.(event);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No hay datos de lineouts con detalle para mostrar</div>
      )}
    </div>
  );
};

export default LineoutsDetailTabContent;

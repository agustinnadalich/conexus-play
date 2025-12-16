import TriesPlayerChart from "../TriesPlayerChart";
import TriesTimeChart from "../TriesTimeChart";
import TriesPhasesChart from "../TriesPhasesChart";
import TriesOriginChart from "../TriesOriginChart";
import TabEventsList from "./TabEventsList";
import { MatchEvent } from "@/types";

type Props = {
  hasTries: boolean;
  triesOriginStatus: "calculated" | "present_but_generic" | "absent";
  triesEvents: MatchEvent[];
  pointsEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
  onEventClick?: (event: MatchEvent) => void;
};

const TriesTabContent = ({
  hasTries,
  triesOriginStatus,
  triesEvents,
  pointsEvents,
  onChartClick,
  onEventClick,
}: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Tries</h3>
    {hasTries ? (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TriesPlayerChart events={triesEvents} onChartClick={onChartClick} />
          <TriesTimeChart events={triesEvents} onChartClick={onChartClick} />
          <TriesPhasesChart events={triesEvents} onChartClick={onChartClick} />
        </div>

        {triesOriginStatus === "calculated" ? (
          <div className="grid grid-cols-1 gap-6">
            <TriesOriginChart events={pointsEvents} onChartClick={onChartClick} />
          </div>
        ) : triesOriginStatus === "present_but_generic" ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Datos de origen presentes pero genéricos:</strong> Se detectaron campos de origen en los
              eventos, pero todos están en estado genérico ("OTROS" o "RC"). El gráfico de origen no muestra
              información diferenciada hasta que el enricher calcule orígenes específicos.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Gráfico de origen no disponible:</strong> Los datos de origen de tries no han sido
              calculados. Esto se debe a que el análisis de secuencias de juego aún no está implementado en el
              proceso de importación.
            </p>
          </div>
        )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No hay datos de Tries para mostrar</div>
      )}
    <TabEventsList
      title="Eventos de Tries"
      events={triesEvents}
      columns={["TEAM", "JUGADOR", "PLAYER", "TRY_ORIGIN", "TRY_PHASES", "Game_Time", "clip_start", "clip_end"]}
      onRowClick={(ev) => {
        const id = (ev as any).id ?? (ev as any).ID;
        if (id !== undefined) onChartClick("ID", id, "ID");
        onEventClick?.(ev);
      }}
    />
  </div>
);

export default TriesTabContent;

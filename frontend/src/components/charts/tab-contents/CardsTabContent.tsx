import CardsSummaryChart from "../CardsSummaryChart";
import PenaltiesPlayerBarChart from "../PenaltiesPlayerBarChart";
import PenaltiesTimeChart from "../PenaltiesTimeChart";
import TabEventsList from "./TabEventsList";
import { matchesCategory } from "@/utils/eventUtils";
import { MatchEvent } from "@/types";
import { pickValue, normalizeBool } from "@/utils/eventUtils";

type Props = {
  hasCards: boolean;
  effectiveEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
  onEventClick?: (event: MatchEvent) => void;
};

const CardsTabContent = ({ hasCards, effectiveEvents, onChartClick, onEventClick }: Props) => {
  const isCardEvent = (ev: MatchEvent) => {
    const raw = String(ev.CATEGORY ?? ev.event_type ?? ev.code ?? ev.tag ?? "").toUpperCase();
    if (raw.includes("CARD") || matchesCategory(ev, "CARD", ["TARJETA", "YELLOW-CARD", "RED-CARD"])) return true;
    const ed = ev.extra_data || {};
    // Flags directos
    if (normalizeBool(ed["YELLOW-CARD"]) || normalizeBool(ed["RED-CARD"])) return true;
    if (String(ed["YELLOW-CARD"] ?? ed.YELLOW_CARD ?? ed.TARJETA ?? "").trim().length > 0) return true;
    if (String(ed["RED-CARD"] ?? "").trim().length > 0) return true;
    if (String(ed.CARD_TYPE ?? ed.CARD ?? ed.TARJETA ?? "").toUpperCase().includes("CARD")) return true;
    // Derivar desde penales con AVANCE codificando tarjeta (NEUTRAL -> amarilla, NEGATIVE -> roja)
    if (matchesCategory(ev, "PENALTY", ["PENAL"])) {
      const adv = String(
        pickValue(ev as any, ["AVANCE", "ADVANCE"]) ??
        ev.AVANCE ??
        ev.ADVANCE ??
        ed.AVANCE ??
        ed.ADVANCE ??
        ""
      ).toUpperCase();
      if (adv.includes("NEG") || adv.includes("ROJ")) return true;
      if (adv.includes("NEUT") || adv.includes("AMAR")) return true;
    }
    return false;
  };

  const cardEvents = effectiveEvents.filter(isCardEvent);
  const hasCardEvents = cardEvents.length > 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Tarjetas</h3>
      {hasCards || hasCardEvents ? (
        hasCardEvents ? (
          <div className="space-y-6">
            <CardsSummaryChart events={cardEvents} onChartClick={onChartClick} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PenaltiesTimeChart
            events={cardEvents}
            category="CARD"
            title="Tarjetas por Bloque de Tiempo"
            tabId="cards-tab"
            onChartClick={onChartClick}
            skipCategoryFilter
            compact
          />
          <PenaltiesPlayerBarChart
            events={cardEvents}
            category="CARD"
            title="Tarjetas por Jugador"
            tabId="cards-tab"
            onChartClick={onChartClick}
            skipCategoryFilter
            compact
          />
        </div>
      </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No se encontraron eventos de tarjetas.</div>
        )
      ) : (
        <div className="text-center py-8 text-gray-500">No hay datos de Tarjetas para mostrar</div>
      )}
      {hasCardEvents && (
        <TabEventsList
          title="Eventos de Tarjetas"
          events={cardEvents}
          columns={["TEAM", "JUGADOR", "PLAYER", "CARD_TYPE", "INFRACCION", "Game_Time", "clip_start", "clip_end"]}
          onRowClick={(ev) => {
            const id = (ev as any).id ?? (ev as any).ID;
            if (id !== undefined) onChartClick("ID", id, "ID");
            onEventClick?.(ev);
          }}
        />
      )}
    </div>
  );
};

export default CardsTabContent;

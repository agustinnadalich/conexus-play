import PossessionShareChart from "../PossessionShareChart";
import RucksFieldZonesChart from "../RucksFieldZonesChart";
import { MatchEvent } from "@/types";

type Props = {
  events: MatchEvent[];
  effectiveEvents: MatchEvent[];
  hasPossession: boolean;
  hasRuckPositions: boolean;
  onChartClick: (...args: any[]) => void;
};

const PossessionTabContent = ({
  events,
  effectiveEvents,
  hasPossession,
  hasRuckPositions,
  onChartClick,
}: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Posesión</h3>
    {hasPossession ? (
      <div className="space-y-4">
        <PossessionShareChart events={events} onChartClick={onChartClick} />
        {hasRuckPositions && (
          <RucksFieldZonesChart events={effectiveEvents} onChartClick={onChartClick} />
        )}
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de posesión disponibles</div>
    )}
  </div>
);

export default PossessionTabContent;

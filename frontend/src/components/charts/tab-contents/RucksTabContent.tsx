import RucksSpeedPieChart from "../RucksSpeedPieChart";
import { MatchEvent } from "@/types";

type Props = {
  hasRucks: boolean;
  effectiveEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
};

const RucksTabContent = ({ hasRucks, effectiveEvents, onChartClick }: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Rucks</h3>
    {hasRucks ? (
      <RucksSpeedPieChart events={effectiveEvents} onChartClick={onChartClick} />
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de Rucks para mostrar</div>
    )}
  </div>
);

export default RucksTabContent;

import OpenPlayKicksTeamPieChart from "../OpenPlayKicksTeamPieChart";
import OpenPlayKicksPlayerChart from "../OpenPlayKicksPlayerChart";
import OpenPlayKicksChart from "../OpenPlayKicksChart";
import { MatchEvent } from "@/types";

type Props = {
  hasOpenKicks: boolean;
  effectiveEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
};

const OpenKicksTabContent = ({ hasOpenKicks, effectiveEvents, onChartClick }: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Patadas en juego abierto</h3>
    {hasOpenKicks ? (
      <div className="space-y-4">
        <OpenPlayKicksTeamPieChart events={effectiveEvents} onChartClick={onChartClick} />
        <OpenPlayKicksPlayerChart events={effectiveEvents} onChartClick={onChartClick} />
        <OpenPlayKicksChart events={effectiveEvents} onChartClick={onChartClick} />
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de patadas en juego abierto</div>
    )}
  </div>
);

export default OpenKicksTabContent;

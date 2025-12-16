import MaulsOutcomeChart from "../MaulsOutcomeChart";
import { MatchEvent } from "@/types";

type Props = {
  hasMauls: boolean;
  effectiveEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
};

const MaulsTabContent = ({ hasMauls, effectiveEvents, onChartClick }: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Mauls</h3>
    {hasMauls ? (
      <MaulsOutcomeChart events={effectiveEvents} onChartClick={onChartClick} />
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de Mauls para mostrar</div>
    )}
  </div>
);

export default MaulsTabContent;

import GoalKicksEffectivityTeamChart from "../GoalKicksEffectivityTeamChart";
import GoalKicksEffectivityOpponentChart from "../GoalKicksEffectivityOpponentChart";
import GoalKicksPlayerChart from "../GoalKicksPlayerChart";
import GoalKicksTimeChart from "../GoalKicksTimeChart";
import { MatchEvent } from "@/types";

type Props = {
  hasGoalKicks: boolean;
  goalKickEvents: MatchEvent[];
  matchInfo?: any;
  onChartClick: (...args: any[]) => void;
};

const GoalKicksTabContent = ({ hasGoalKicks, goalKickEvents, matchInfo, onChartClick }: Props) => (
  <div className="space-y-4">
    {hasGoalKicks ? (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Patadas a los Palos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GoalKicksEffectivityTeamChart events={goalKickEvents} onChartClick={onChartClick} matchInfo={matchInfo} />
          <GoalKicksEffectivityOpponentChart
            events={goalKickEvents}
            onChartClick={onChartClick}
            matchInfo={matchInfo}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GoalKicksPlayerChart events={goalKickEvents} onChartClick={onChartClick} matchInfo={matchInfo} />
          <GoalKicksTimeChart events={goalKickEvents} onChartClick={onChartClick} />
        </div>
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de Patadas a los Palos para mostrar</div>
    )}
  </div>
);

export default GoalKicksTabContent;

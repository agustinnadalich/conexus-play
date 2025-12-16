import LineBreaksPlayerChart from "../LineBreaksPlayerChart";
import LineBreaksTypeTeamChart from "../LineBreaksTypeTeamChart";
import LineBreaksTypeOpponentChart from "../LineBreaksTypeOpponentChart";
import LineBreaksChannelTeamChart from "../LineBreaksChannelTeamChart";
import LineBreaksChannelOpponentChart from "../LineBreaksChannelOpponentChart";
import LineBreaksTimeChart from "../LineBreaksTimeChart";
import LineBreaksResultChart from "../LineBreaksResultChart";
import { MatchEvent } from "@/types";

type Props = {
  hasLineBreaks: boolean;
  lineBreakEvents: MatchEvent[];
  matchInfo?: any;
  onChartClick: (...args: any[]) => void;
};

const LineBreaksTabContent = ({ hasLineBreaks, lineBreakEvents, matchInfo, onChartClick }: Props) => (
  <div className="space-y-4">
    {hasLineBreaks ? (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Quiebres de Línea</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LineBreaksPlayerChart events={lineBreakEvents} onChartClick={onChartClick} matchInfo={matchInfo} />
          <LineBreaksTimeChart events={lineBreakEvents} onChartClick={onChartClick} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LineBreaksTypeTeamChart events={lineBreakEvents} onChartClick={onChartClick} matchInfo={matchInfo} />
          <LineBreaksTypeOpponentChart events={lineBreakEvents} onChartClick={onChartClick} matchInfo={matchInfo} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LineBreaksChannelTeamChart events={lineBreakEvents} onChartClick={onChartClick} matchInfo={matchInfo} />
          <LineBreaksChannelOpponentChart
            events={lineBreakEvents}
            onChartClick={onChartClick}
            matchInfo={matchInfo}
          />
        </div>
        <div className="grid grid-cols-1">
          <LineBreaksResultChart events={lineBreakEvents} onChartClick={onChartClick} />
        </div>
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de Quiebres para mostrar</div>
    )}
  </div>
);

export default LineBreaksTabContent;

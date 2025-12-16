import ScrumTeamChart from "../ScrumTeamChart";
import ScrumRivalChart from "../ScrumRivalChart";
import LineoutTeamChart from "../LineoutTeamChart";
import LineoutRivalChart from "../LineoutRivalChart";
import { MatchEvent } from "@/types";

type Props = {
  hasSetPieces: boolean;
  scrumEvents: MatchEvent[];
  lineoutEvents: MatchEvent[];
  onChartClick: (...args: any[]) => void;
  matchInfo?: any;
  ourTeamsList?: string[];
};

const SetPiecesTabContent = ({ hasSetPieces, scrumEvents, lineoutEvents, onChartClick, matchInfo, ourTeamsList }: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Set Pieces</h3>
    {hasSetPieces ? (
      <div className="space-y-8">
        {scrumEvents.length > 0 && (
          <div>
            <h4 className="text-md font-medium mb-4">Scrums</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ScrumTeamChart events={scrumEvents} onChartClick={onChartClick} />
              <ScrumRivalChart events={scrumEvents} onChartClick={onChartClick} />
            </div>
          </div>
        )}
        {lineoutEvents.length > 0 && (
          <div>
            <h4 className="text-md font-medium mb-4">Lineouts</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LineoutTeamChart events={lineoutEvents} onChartClick={onChartClick} matchInfo={matchInfo} ourTeamsList={ourTeamsList} />
              <LineoutRivalChart events={lineoutEvents} onChartClick={onChartClick} matchInfo={matchInfo} ourTeamsList={ourTeamsList} />
            </div>
          </div>
        )}
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">No hay datos de Set Pieces para mostrar</div>
    )}
  </div>
);

export default SetPiecesTabContent;

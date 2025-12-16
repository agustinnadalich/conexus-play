import { MatchEvent } from "@/types";

type Props = {
  effectiveEvents: MatchEvent[];
};

const OverviewTabContent = ({ effectiveEvents }: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Resumen del partido</h3>
    <p>Eventos totales: {effectiveEvents.length}</p>
    <p>Debug: {JSON.stringify(effectiveEvents.slice(0, 2), null, 2)}</p>
  </div>
);

export default OverviewTabContent;

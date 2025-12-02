import { useFilterContext } from "@/context/FilterContext";
import { useEffect, useState } from "react";

const HeaderPartido = () => {
  const { matchInfo } = useFilterContext();
  const [puntosEquipo, setPuntosEquipo] = useState(0);
  const [puntosRival, setPuntosRival] = useState(0);

  useEffect(() => {
    console.log("🏉 HeaderPartido - matchInfo recibido:", matchInfo);
    if (matchInfo?.RESULT) {
      console.log("📊 RESULT encontrado:", matchInfo.RESULT);
      const [a, b] = matchInfo.RESULT.split("-").map(Number);
      setPuntosEquipo(a);
      setPuntosRival(b);
    } else {
      console.warn("⚠️ No se encontró RESULT en matchInfo");
    }
  }, [matchInfo]);

  if (!matchInfo) {
    console.log("⚠️ HeaderPartido - matchInfo es null");
    return null;
  }

  const {
    TEAM,
    OPPONENT_NAME,
    DATE,
    COMPETITION,
    ROUND,
    GAME,
    FIELD,
    RAIN,
    MUDDY,
    WIND_1P,
    WIND_2P,
    REFEREE,
  } = matchInfo;

  const formattedDate = DATE ? new Date(DATE).toLocaleDateString("it-IT") : null;

  const clima = [];
  if (RAIN === "SI") clima.push("Pioggia");
  if (MUDDY === "SI") clima.push("Campo fangoso");
  if (WIND_1P === "F") clima.push("Vento a favore 1T");
  if (WIND_1P === "C") clima.push("Vento contro 1T");
  if (WIND_2P === "F") clima.push("Vento a favore 2T");
  if (WIND_2P === "C") clima.push("Vento contro 2T");

  const logo = (team: string) =>
    `/Logos/${team?.replace(/\s+/g, " ").replace(/[^\w\s]/g, "")}.jpg`;

  return (
    <div className="w-full bg-slate-100 p-4 rounded-xl shadow-sm">
      <div className="flex flex-col  gap-4">
        {/* Equipos y score */}
        <div className="flex-1 flex justify-center items-center gap-2 w-full">
          <div className="flex flex-col items-center flex-1 min-w-0">
            <img
              src={logo(TEAM)}
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              alt={`${TEAM} logo`}
              className="w-12 h-12"
            />
            <span className="text-sm font-semibold truncate text-center w-full">{TEAM}</span>
          </div>

          <div className="flex flex-col items-center text-lg font-bold mx-2  min-w-0">
            <span>{puntosEquipo} - {puntosRival}</span>
          </div>

          <div className="flex flex-col items-center flex-1 min-w-0">
            <img
              src={logo(OPPONENT_NAME)}
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              alt={`${OPPONENT_NAME} logo`}
              className="w-12 h-12"
            />
            <span className="text-sm font-semibold truncate text-center w-full">{OPPONENT_NAME}</span>
          </div>
        </div>
        {/* Detalles */}
        <div className="hidden 2xl:grid grid-cols-4 flex-nowrap justify-end w-full gap-x-4 gap-y-1">
          {/* Desktop (2xl) - details to the right */}
          {formattedDate && <div><strong>Data:</strong> {formattedDate}</div>}
          {GAME && <div><strong>Fecha:</strong> {GAME}</div>}
          {COMPETITION && <div><strong>Torneo:</strong> {COMPETITION}</div>}
          {ROUND && <div><strong>Ronda:</strong> {ROUND}</div>}
          {FIELD && <div><strong>Campo:</strong> {FIELD}</div>}
          {clima.length > 0 && (
            <div className="col-span-2 md:col-span-4">
              <strong>Clima:</strong> {clima.join(", ")}
            </div>
          )}
          {REFEREE && <div><strong>Arbitro:</strong> {REFEREE}</div>}
        </div>
        {/* Mobile/tablet - details below teams, up to 8 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-1 text-sm w-full 2xl:hidden mt-2">
          {formattedDate && <div><strong>Data:</strong> {formattedDate}</div>}
          {GAME && <div><strong>Fecha:</strong> {GAME}</div>}
          {COMPETITION && <div><strong>Torneo:</strong> {COMPETITION}</div>}
          {ROUND && <div><strong>Ronda:</strong> {ROUND}</div>}
          {FIELD && <div><strong>Campo:</strong> {FIELD}</div>}
          {clima.length > 0 && (
            <div className="col-span-2 sm:col-span-4 lg:col-span-6 xl:col-span-8">
              <strong>Clima:</strong> {clima.join(", ")}
            </div>
          )}
          {REFEREE && <div><strong>Arbitro:</strong> {REFEREE}</div>}
        </div>
      </div>
    </div>
  );
};

export default HeaderPartido;

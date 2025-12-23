import { useQuery } from '@tanstack/react-query';
import { authFetch } from '@/api/api';

export const useEvents = (matchId: number) => {
  return useQuery({
    queryKey: ['events', matchId],
    queryFn: async () => {
      try {
        // Obtener eventos
        const eventsRes = await authFetch(`/matches/${matchId}/events`);
        if (!eventsRes.ok) {
          throw new Error(`Error fetching events: ${eventsRes.status}`);
        }
        const eventsJson = await eventsRes.json();
        console.log("📦 Eventos obtenidos:", eventsJson.events?.length || 0, "eventos");

        // Obtener información del match (opcional) y mergear con la incluida en events
        let matchJson: any = {};
        let matchDetails: any = {};
        try {
          const matchRes = await authFetch(`/matches/${matchId}/info`);
          if (matchRes.ok) {
            matchJson = await matchRes.json();
            console.log("📦 Info del match obtenida");
          }
        } catch (matchError) {
          console.warn("⚠️ No se pudo obtener info del match:", matchError);
        }
        // Intentar obtener los delays y demás campos desde /matches/:id (incluye global_delay_seconds)
        try {
          const detailRes = await authFetch(`/matches/${matchId}`);
          if (detailRes.ok) {
            matchDetails = await detailRes.json();
            console.log("📦 Detalle del match obtenido (incluye delays)");
          }
        } catch (detailError) {
          console.warn("⚠️ No se pudo obtener detalle del match:", detailError);
        }

        // Combine match_info returned by events endpoint (que incluye delays) con la de /info
        const combinedMatchInfo = {
          ...(eventsJson.match_info || {}),
          ...(matchJson || {}),
          ...(matchDetails || {}),
        };

        // Transformar la respuesta del backend al formato esperado por el frontend
        const formattedData = {
          events: Array.isArray(eventsJson.events) ? eventsJson.events : [],
          match_info: combinedMatchInfo
        };

        console.log("📦 Datos formateados - eventos:", formattedData.events.length);
        return formattedData;
      } catch (error) {
        console.error("❌ Error en useEvents:", error);
        throw error;
      }
    },
    enabled: !!matchId,
  });
};

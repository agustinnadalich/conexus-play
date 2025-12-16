import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, pickValue, isOpponentEvent, normalizeBool } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const CardsSummaryChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [cardEventsMemo, setCardEventsMemo] = useState<any[]>([]);

  useEffect(() => {
    // Eventos de tarjeta reales o penales con AVANCE codificando tarjeta
    const isCard = (ev: any) => {
      const hasCardFlag = (val: any) => {
        if (normalizeBool(val)) return true;
        const s = String(val || '').trim();
        return s.length > 0;
      };

      return (
        matchesCategory(ev, 'CARD', ['TARJETA', 'YELLOW-CARD', 'RED-CARD', 'AMARILLA', 'ROJA']) ||
        hasCardFlag(ev['YELLOW-CARD']) ||
        hasCardFlag(ev['RED-CARD']) ||
        hasCardFlag(ev?.extra_data?.['YELLOW-CARD']) ||
        hasCardFlag(ev?.extra_data?.['RED-CARD']) ||
        matchesCategory(ev, 'PENALTY', ['PENAL'])
      ); // para derivar de AVANCE
    };

    const cardType = (ev: any) => {
      const hasYellow = (val: any) => normalizeBool(val) || String(val || '').trim().length > 0;
      const hasRed = (val: any) => normalizeBool(val) || String(val || '').trim().length > 0;

      if (hasYellow(ev['YELLOW-CARD']) || hasYellow(ev?.extra_data?.['YELLOW-CARD'])) return 'YELLOW';
      if (hasRed(ev['RED-CARD']) || hasRed(ev?.extra_data?.['RED-CARD'])) return 'RED';
      const raw =
        pickValue(ev, ['CARD_TYPE', 'CARD', 'TYPE', 'TARJETA', 'tipo_tarjeta', 'card_type', 'card']) ||
        ev?.category ||
        ev?.event_type;
      const n = String(raw || '').toUpperCase();
      if (n.includes('RED') || n.includes('ROJA')) return 'RED';
      if (n.includes('YELLOW') || n.includes('AMAR')) return 'YELLOW';

      // Derivar de penales: AVANCE neutro -> amarilla, negativo -> roja
      if (matchesCategory(ev, 'PENALTY', ['PENAL'])) {
        const adv = String(
          pickValue(ev, ['AVANCE', 'ADVANCE']) ??
          ev.AVANCE ??
          ev.ADVANCE ??
          ev.extra_data?.AVANCE ??
          ev.extra_data?.ADVANCE ??
          ''
        ).toUpperCase();
        if (adv.includes('NEG')) return 'RED';
        if (adv.includes('NEUT')) return 'YELLOW';
      }
      return 'OTHER';
    };

    const cardEvents = events.filter(isCard);
    setCardEventsMemo(cardEvents);
    const buckets = {
      our: { YELLOW: 0, RED: 0 },
      opp: { YELLOW: 0, RED: 0 },
    };

    cardEvents.forEach((ev) => {
      const type = cardType(ev);
      const side = isOpponentEvent(ev) ? 'opp' : 'our';
      if (type === 'YELLOW') buckets[side].YELLOW += 1;
      else if (type === 'RED') buckets[side].RED += 1;
    });

    setChartData({
      labels: ['Amarillas', 'Rojas'],
      datasets: [
        {
          label: 'Nuestro equipo',
          data: [buckets.our.YELLOW, buckets.our.RED],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
        },
        {
          label: 'Rival',
          data: [buckets.opp.YELLOW, buckets.opp.RED],
          backgroundColor: 'rgba(248, 113, 113, 0.7)',
        },
      ],
    });
  }, [events]);

  const handleClick = (event: any, elements: any[]) => {
    if (!elements?.length) return;
    const chart = elements[0].element?.$context?.chart;
    const dataIndex = elements[0].index ?? elements[0].element?.$context?.dataIndex;
    const label = chartData?.labels?.[dataIndex];
    const type = label?.toString().toUpperCase().includes('AMAR') ? 'YELLOW' : 'RED';
    // Intentar inferir jugador e infracción para ayudar en el filtro
    const matchingEvents = cardEventsMemo.filter(ev => {
      const t = (() => {
        const hasYellow = (val: any) => normalizeBool(val) || String(val || '').trim().length > 0;
        const hasRed = (val: any) => normalizeBool(val) || String(val || '').trim().length > 0;
        if (hasYellow(ev['YELLOW-CARD']) || hasYellow(ev?.extra_data?.['YELLOW-CARD'])) return 'YELLOW';
        if (hasRed(ev['RED-CARD']) || hasRed(ev?.extra_data?.['RED-CARD'])) return 'RED';
        const raw =
          pickValue(ev, ['CARD_TYPE', 'CARD', 'TYPE', 'TARJETA', 'tipo_tarjeta', 'card_type', 'card']) ||
          ev?.category ||
          ev?.event_type;
        const n = String(raw || '').toUpperCase();
        if (n.includes('RED') || n.includes('ROJA')) return 'RED';
        if (n.includes('YELLOW') || n.includes('AMAR')) return 'YELLOW';
        // derivar de penal
        if (matchesCategory(ev, 'PENALTY', ['PENAL'])) {
          const adv = String(
            pickValue(ev, ['AVANCE', 'ADVANCE']) ??
            ev.AVANCE ??
            ev.ADVANCE ??
            ev.extra_data?.AVANCE ??
            ev.extra_data?.ADVANCE ??
            ''
          ).toUpperCase();
          if (adv.includes('NEG')) return 'RED';
          if (adv.includes('NEUT')) return 'YELLOW';
        }
        return 'OTHER';
      })();
      return t === type;
    });
    const firstMatch = matchingEvents[0];
    const player = firstMatch ? (firstMatch.players?.[0] || firstMatch.PLAYER || firstMatch.player_name || firstMatch.JUGADOR || firstMatch.extra_data?.JUGADOR || firstMatch.extra_data?.PLAYER || null) : null;
    const infraction = firstMatch ? (firstMatch.INFRACCION || firstMatch.extra_data?.INFRACCION || firstMatch.extra_data?.INFRACCION_TIPO || null) : null;

    const filters = [
      { descriptor: 'CARD_TYPE', value: type },
    ];
    if (player) filters.push({ descriptor: 'JUGADOR', value: player });
    if (infraction) filters.push({ descriptor: 'INFRACCION', value: infraction });
    onChartClick(event, elements, chart, 'card', 'cards-tab', filters);
  };

  if (!chartData) return <div>No data for CardsSummaryChart</div>;

  return (
    <div className="h-80">
      <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Tarjetas Amarillas/Rojas' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default CardsSummaryChart;

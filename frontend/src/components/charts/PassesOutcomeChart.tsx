import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { matchesCategory, pickValue, isOpponentEvent } from '@/utils/eventUtils';

interface Props {
  events: any[];
  onChartClick: (...args: any[]) => void;
}

const PassesOutcomeChart: React.FC<Props> = ({ events, onChartClick }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const isPass = (ev: any) =>
      matchesCategory(ev, 'PASS', ['PASE', 'PASO', 'PASES', 'OFFLOAD', 'OFF-LOAD']) ||
      String(ev?.event_type || '').toUpperCase().includes('PASS');

    const isFailed = (ev: any) => {
      const typeStr = String(ev?.event_type || ev?.CATEGORY || '').toUpperCase();
      if (typeStr.includes('KNOCK') || typeStr.includes('FORWARD')) return true;
      if (typeStr.includes('BAD') || typeStr.includes('ERROR')) return true;
      const outcome = String(
        pickValue(ev, ['RESULT', 'RESULTADO', 'OUTCOME', 'SUCCESS', 'COMPLETED', 'STATUS']) || ''
      ).toUpperCase();
      if (!outcome) return false;
      if (/(FAIL|NO|ERR|FALL|INCOMPLETO|DROP)/.test(outcome)) return true;
      if (/(OK|SUCCESS|COMPLETE|COMPLETO|GOOD|CORRECTO)/.test(outcome)) return false;
      return false;
    };

    const passEvents = events.filter(isPass);
    const buckets = {
      success: { our: 0, opp: 0 },
      fail: { our: 0, opp: 0 },
    };

    passEvents.forEach((ev) => {
      const side = isOpponentEvent(ev) ? 'opp' : 'our';
      const failed = isFailed(ev);
      if (failed) buckets.fail[side] += 1;
      else buckets.success[side] += 1;
    });

    setChartData({
      labels: ['Completados', 'Fallidos'],
      datasets: [
        {
          label: 'Nuestro equipo',
          data: [buckets.success.our, buckets.fail.our],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
        },
        {
          label: 'Rival',
          data: [buckets.success.opp, buckets.fail.opp],
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
    const status = label?.toString().toUpperCase().includes('FALL') ? 'FAILED' : 'COMPLETED';
    const filters = [
      { descriptor: 'CATEGORY', value: 'PASS' },
      { descriptor: 'OUTCOME', value: status },
    ];
    onChartClick(event, elements, chart, 'pass', 'passes-tab', filters);
  };

  if (!chartData) return <div>No data for PassesOutcomeChart</div>;

  return (
    <div className="h-80">
      <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Pases completados vs fallidos' } },
          onClick: handleClick,
        }}
      />
    </div>
  );
};

export default PassesOutcomeChart;

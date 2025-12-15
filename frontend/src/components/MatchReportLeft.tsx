// src/components/MatchReportLeft.js
import React from 'react';
import HorizontalBarChart from './HorizontalBarChart';

const MatchReportLeft = ({ data }) => {
  const getDataForCategory = (category, value = null) => {
    if (!data || !data.length) return { labels: [category], datasets: [{ label: 'Our Team', data: [0], isRival: false }, { label: 'Opponent', data: [0], isRival: true }] };

    const ourTeamData = value !== null
      ? data.filter(event => event.CATEGORY === category && event.TEAM !== 'OPPONENT' && event['POINTS(VALUE)'] === value).length
      : data.filter(event => event.CATEGORY === category && event.TEAM !== 'OPPONENT').reduce((sum, event) => sum + (event['POINTS(VALUE)'] || 0), 0);

    const rivalTeamData = value !== null
      ? data.filter(event => event.CATEGORY === category && event.TEAM === 'OPPONENT' && event['POINTS(VALUE)'] === value).length
      : data.filter(event => event.CATEGORY === category && event.TEAM === 'OPPONENT').reduce((sum, event) => sum + (event['POINTS(VALUE)'] || 0), 0);

    return {
      labels: [category],
      datasets: [
        {
          label: 'Our Team',
          data: [ourTeamData],
          isRival: false,
        },
        {
          label: 'Opponent',
          data: [rivalTeamData],
          isRival: true,
        },
      ],
    };
  };

  const formatSeconds = (seconds: number) => {
    const safe = Number(seconds) || 0;
    const mins = Math.floor(safe / 60);
    const secs = Math.round(safe % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEffectiveGameTime = () => {
    if (!data || !data.length) {
      return { our: 0, opp: 0, total: 0 };
    }
    const isAttackOrDefense = (event: any) => {
      const cat = String(event?.CATEGORY ?? '').toUpperCase();
      return cat === 'ATTACK' || cat === 'DEFENSE';
    };
    const our = data.filter(ev => isAttackOrDefense(ev) && ev.TEAM !== 'OPPONENT').reduce((sum, ev) => sum + (ev.DURATION || 0), 0);
    const opp = data.filter(ev => isAttackOrDefense(ev) && ev.TEAM === 'OPPONENT').reduce((sum, ev) => sum + (ev.DURATION || 0), 0);
    return { our, opp, total: our + opp };
  };

  const getDataForPali = () => {
    if (!data || !data.length) return { labels: ['GOAL-KICK'], datasets: [{ label: 'Our Team', data: [0], isRival: false }, { label: 'Opponent', data: [0], isRival: true }] };

    const ourTeamConverted = data.filter(event => event.CATEGORY === 'GOAL-KICK' && event.TEAM !== 'OPPONENT' && event.GOAL_KICK === 'SUCCESS').length;
    const ourTeamTotal = data.filter(event => event.CATEGORY === 'GOAL-KICK' && event.TEAM !== 'OPPONENT').length;
    const rivalTeamConverted = data.filter(event => event.CATEGORY === 'GOAL-KICK' && event.TEAM === 'OPPONENT' && event.GOAL_KICK === 'SUCCESS').length;
    const rivalTeamTotal = data.filter(event => event.CATEGORY === 'GOAL-KICK' && event.TEAM === 'OPPONENT').length;

    return {
      labels: ['GOAL-KICK'],
      datasets: [
        {
          label: `${ourTeamConverted}/${ourTeamTotal}`,
          data: [ourTeamConverted],
          isRival: false,
        },
        {
          label: `${rivalTeamConverted}/${rivalTeamTotal}`,
          data: [rivalTeamConverted],
          isRival: true,
        },
      ],
    };
  };

  const getDataForPosesion = () => {
    if (!data || !data.length) {
      console.log("No data available for possession calculation.");
      return {
        labels: ['BALL POSSESSION'],
        datasets: [
          { label: 'Our Team', data: [0], isRival: false },
          { label: 'Opponent', data: [0], isRival: true },
        ],
      };
    }
  
    // Suma los tiempos de ATTACK y DEFENSE
    const ourTeamAttackTime = data
      .filter(event => event.CATEGORY === 'ATTACK')
      .reduce((sum, event) => {
        return sum + (event.DURATION || 0);
      }, 0);
  
    const opponentDefenseTime = data
      .filter(event => event.CATEGORY === 'DEFENSE')
      .reduce((sum, event) => {
        // console.log("DEFENCE Event:", event);
        return sum + (event.DURATION || 0);
      }, 0);
  
    const totalTime = ourTeamAttackTime + opponentDefenseTime;
  
    // Calcula los porcentajes
    const ourTeamPercentage = totalTime > 0 ? Math.round((ourTeamAttackTime / totalTime) * 100) : 0;
    const opponentPercentage = totalTime > 0 ? Math.round((opponentDefenseTime / totalTime) * 100) : 0;
  
    return {
      labels: ['BALL POSSESSION'],
      datasets: [
        {
          label: `${ourTeamPercentage}%`,
          data: [ourTeamPercentage],
          isRival: false,
        },
        {
          label: `${opponentPercentage}%`,
          data: [opponentPercentage],
          isRival: true,
        },
      ],
    };
  };

  const getDataForTackles = () => {
    if (!data || !data.length) return { labels: ['TACKLE'], datasets: [{ label: 'Our Team', data: [0], isRival: false }, { label: 'Opponent', data: [0], isRival: true }] };

    const ourTeamTackles = data.filter(event => event.CATEGORY === 'TACKLE' && event.TEAM !== 'OPPONENT').length;
    const rivalTeamTackles = data.filter(event => event.CATEGORY === 'TACKLE' && event.TEAM === 'OPPONENT').length;

    return {
      labels: ['TACKLE'],
      datasets: [
        {
          label: 'Our Team',
          data: [ourTeamTackles],
          isRival: false,
        },
        {
          label: 'Opponent',
          data: [rivalTeamTackles],
          isRival: true,
        },
      ],
    };
  };

  const puntosTotalesData = getDataForCategory('POINTS');
  const triesData = getDataForCategory('POINTS', 5);
  const patadasPalosData = getDataForPali();
  const posesionData = getDataForPosesion();
  const tacklesData = getDataForTackles();
  const effectiveTime = getEffectiveGameTime();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h3>Stats</h3>
      <div style={{ width: "100%", marginRight: "5px", marginLeft: "5px" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "20px",
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <h4 style={{ margin: "0px" }}>Our Team</h4>
          <h4 style={{ margin: "0px" }}>Opponent</h4>
        </div>
      </div>
      <div style={{ width: '100%', marginBottom: '5px', textAlign: 'center' }}>
        <h4 style={{ margin: "0px" }}>Total points</h4>
        <HorizontalBarChart data={puntosTotalesData} />
      </div>
      <div style={{ width: '100%', marginBottom: '5px', textAlign: 'center' }}>
        <h4 style={{ margin: "0px" }}>Tries</h4>
        <HorizontalBarChart data={triesData} />
      </div>
      <div style={{ width: '100%', marginBottom: '5px', textAlign: 'center' }}>
        <h4 style={{ margin: "0px" }}>Goal kicks</h4>
        <HorizontalBarChart data={patadasPalosData} />
      </div>
      <div style={{ width: '100%', marginBottom: '5px', textAlign: 'center' }}>
        <h4 style={{ margin: "0px" }}>Possession</h4>
        <HorizontalBarChart data={posesionData} />
        <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
          Effective game time: <strong>{formatSeconds(effectiveTime.total)}</strong> (Our team: {formatSeconds(effectiveTime.our)} · Opponent: {formatSeconds(effectiveTime.opp)})
        </div>
      </div>
      <div style={{ width: '100%', marginBottom: '5px', textAlign: 'center' }}>
        <h4 style={{ margin: "0px" }}>Tackles</h4>
        <HorizontalBarChart data={tacklesData} />
      </div>
    </div>
  );
};

export default MatchReportLeft;

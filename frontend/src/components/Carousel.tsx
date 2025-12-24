import React, { useState, useContext, useImperativeHandle, forwardRef, useEffect } from 'react';
import TacklesBarChart from './charts/TacklesBarChart';
import MissedTacklesBarChart from './charts/MissedTacklesBarChart';
import TacklesByTeamChart from './charts/TacklesByTeamChart';
import AdvancePieChart from './charts/AdvancePieChart';
import TacklesEffectivityChart from './charts/TacklesEffectivityChart';
import TacklesTimeChart from './charts/TacklesTimeChart';
import PenaltiesPlayerBarChart from './charts/PenaltiesPlayerBarChart';
import PenaltiesTimeChart from './charts/PenaltiesTimeChart';
import PenaltiesCausePieChart from './charts/PenaltiesCausePieChart';
// import TurnoversPlayerBarChart from './charts/TurnoversPlayerBarChart';
// import TurnoversTypePieChart from './charts/TurnoversTypePieChart';
import TurnoversTimeChart from './charts/TurnoversTimeChart';
import { useFilterContext } from '../context/FilterContext';
import PlayerPointsChart from './charts/PlayerPointsChart';
import PointsTimeChart from './charts/PointsTimeChart';
import PointsTypeChart from './charts/PointsTypeChart';
import TriesPlayerChart from './charts/TriesPlayerChart';
import TriesTimeChart from './charts/TriesTimeChart';
import TriesOriginChart from './charts/TriesOriginChart';
import ScrumEffectivityChart from './charts/ScrumEffectivityChart';
import LineoutEffectivityChart from './charts/LineoutEffectivityChart';
import './Carousel.css';

// Use loose typing here to avoid widespread type errors during iterative fixes.
type CarouselProps = any;

const Tabs = forwardRef<any, any>(({ children, activeTab, setActiveTab }: any, ref: any) => {
  useImperativeHandle(ref, () => ({
    setActiveTab: (index) => {
      setActiveTab(index);
    },
  }));

  return (
    <div className="carousel-container">
      <div className="tabs">
        {React.Children.toArray(children).map((tab: any, index) => (
          <button
            key={index}
            className={`tab-button ${activeTab === index ? "active" : ""} ${(tab as any).props?.style?.display === 'none' ? 'hidden' : ''}`}
            onClick={() => setActiveTab(index)}
            aria-controls={(tab as any).props?.id}
          >
            {(tab as any).props?.['data-label'] ?? (tab as any).props?.label}
          </button>
        ))}
      </div>
      <div className="tab-content">{(children as any)[activeTab]}</div>
    </div>
  );
});

const Carousel = forwardRef<any, CarouselProps>(
  (props: any, ref: any) => {
    const { filteredEvents, allEvents, handleChartClick, activeTab, setActiveTab } = props;
    useImperativeHandle(ref, () => ({
      setActiveTab: (tabId) => {
        setActiveTab(tabId);
      },
    }));

  const { selectedTeam } = useFilterContext();

    useEffect(() => {
      const tabButton = document.querySelector(`.tab-button[aria-controls="${activeTab}"]`);
      if (tabButton) {
        setActiveTab(Array.from(document.querySelectorAll(".tab-button")).indexOf(tabButton));
      }
    }, [filteredEvents]); // Se ejecuta cuando cambian los eventos filtrados

    const hasSetPieces = filteredEvents.some(event => event.CATEGORY === "SCRUM" || event.CATEGORY === "LINEOUT" || event.event_type === "SCRUM" || event.event_type === "LINEOUT");
    const hasTackles = filteredEvents.some((event) => event.CATEGORY === "TACKLE" || event.event_type === "TACKLE");
    const hasMissedTackles = filteredEvents.some((event) => event.CATEGORY === "MISSED-TACKLE" || event.event_type === "MISSED-TACKLE");
    const hasTeamTackles = filteredEvents.some((event) => event.TEAM !== "OPPONENT" && (event.CATEGORY === "TACKLE" || event.event_type === "TACKLE"));
    const hasTeamMissedTackles = filteredEvents.some((event) => event.TEAM !== "OPPONENT" && (event.CATEGORY === "MISSED-TACKLE" || event.event_type === "MISSED-TACKLE"));
    const hasRivalTackles = filteredEvents.some((event) => event.TEAM === "OPPONENT" && (event.CATEGORY === "TACKLE" || event.event_type === "TACKLE"));
    const hasRivalMissedTackles = filteredEvents.some((event) => event.TEAM === "OPPONENT" && (event.CATEGORY === "MISSED-TACKLE" || event.event_type === "MISSED-TACKLE"));

    const hasPenalties = filteredEvents.some((event) => event.CATEGORY === "PENALTY" || event.event_type === "PENALTY");
    const hasPoints = filteredEvents.some((event) => event.CATEGORY === "POINTS" || event.event_type === "POINTS");
    const hasTries = filteredEvents.some((event) => (event.CATEGORY === "POINTS" || event.event_type === "POINTS") && event.POINTS === "TRY");
    const hasTurnovers = filteredEvents.some((event) => event.CATEGORY === "TURNOVER+" || event.CATEGORY === "TURNOVER-" || event.event_type === "TURNOVER+" || event.event_type === "TURNOVER-");

    return (
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} ref={ref}>
        <div data-label="Points" id="points-tab" className='tab-content'  style={{ display: hasPoints ? 'flex' : 'none' }}>
          <div className="chart-container">
            <PlayerPointsChart events={filteredEvents.filter(event => event.CATEGORY === "POINTS")} onChartClick={handleChartClick} />
          </div>
          <div className="chart-container">
            <PointsTimeChart events={filteredEvents.filter(event => event.CATEGORY === "POINTS")} onChartClick={handleChartClick} />
          </div>
          <div className="chart-container">
            <PointsTypeChart events={filteredEvents.filter(event => event.CATEGORY === "POINTS")} onChartClick={handleChartClick} />
          </div>
        </div>
  <div data-label="Set Pieces" id="set-pieces-tab" className='tab-content' style={{ display: hasSetPieces ? 'flex' : 'none' }}>
        {hasSetPieces && (
          <div className="chart-row">
            {/* Scrum Charts */}
            {filteredEvents.some(event => event.CATEGORY === "SCRUM" && event.TEAM !== "OPPONENT") && (
              <div className="chart-container">
                <ScrumEffectivityChart
                  events={filteredEvents.filter(event => event.CATEGORY === "SCRUM" && event.TEAM !== "OPPONENT")}
                  title="Our Scrums"
                  onChartClick={handleChartClick}               />
              </div>
            )}
            {filteredEvents.some(event => event.CATEGORY === "SCRUM" && event.TEAM === "OPPONENT") && (
              <div className="chart-container">
                <ScrumEffectivityChart
                  events={filteredEvents.filter(event => event.CATEGORY === "SCRUM" && event.TEAM === "OPPONENT")}
                  title="Opponent Scrums"
                  onChartClick={handleChartClick}                 />
              </div>
            )}

            {/* Lineout Charts */}
            {filteredEvents.some(event => event.CATEGORY === "LINEOUT" && event.TEAM !== "OPPONENT") && (
              <div className="chart-container">
                <LineoutEffectivityChart
                  events={filteredEvents.filter(event => event.CATEGORY === "LINEOUT" && event.TEAM !== "OPPONENT")}
                  title="Our Lineouts"
                  onChartClick={handleChartClick}                 />
              </div>
            )}
            {filteredEvents.some(event => event.CATEGORY === "LINEOUT" && event.TEAM === "OPPONENT") && (
              <div className="chart-container">
                <LineoutEffectivityChart
                  events={filteredEvents.filter(event => event.CATEGORY === "LINEOUT" && event.TEAM === "OPPONENT")}
                  title="Opponent Lineouts"
                  onChartClick={handleChartClick}                 />
              </div>
            )}
          </div>
        )}
      </div>
  <div data-label="Tackles" id="tackles-tab" className='tab-content'  style={{ display: hasTackles || hasMissedTackles ? 'flex' : 'none' }}>
          {hasTeamTackles && (
            <div className="chart-container">
              <TacklesBarChart
                events={filteredEvents.filter(event => event.TEAM !== "OPPONENT")}
                onBarClick={(category, player) => {
                  // Convertir onBarClick a onChartClick format
                  const mockElements = [{ index: 0 }];
                  const mockChart = { data: { labels: [`${category} - ${player}`] } };
                  handleChartClick(null, mockElements, mockChart, "player", "tackles-tab");
                }}
              />
            </div>
          )}
          {hasTeamMissedTackles && (
            <div className="chart-container">
              <MissedTacklesBarChart
                events={filteredEvents.filter(event => event.TEAM !== "OPPONENT")}
                onChartClick={handleChartClick}
              />
            </div>
          )}
          {(hasTackles || hasMissedTackles) && (
            <div className="chart-container">
              <TacklesByTeamChart
                events={filteredEvents}
                onChartClick={handleChartClick}
              />
            </div>
          )}
          {hasTeamTackles && (
            <div className="chart-container">
              <AdvancePieChart
                events={filteredEvents.filter(event => event.TEAM !== "OPPONENT")}
                onChartClick={handleChartClick}
                category="TACKLE"
              />
            </div>
          )}
          {(hasTeamTackles || hasTeamMissedTackles || hasRivalTackles || hasRivalMissedTackles) && (
            <div className="chart-container">
              <TacklesEffectivityChart events={filteredEvents} onChartClick={handleChartClick} />
            </div>
          )}
          {hasTackles && (
            <div className="chart-container">
              <TacklesTimeChart
                events={filteredEvents}
                onChartClick={handleChartClick}
              />
            </div>
          )}
        </div>
  <div data-label="Tries" id="tries-tab" className='tab-content' style={{ display: hasTries ? 'flex' : 'none' }}>
          <div className="chart-container">
            <TriesPlayerChart events={filteredEvents.filter(event => event.CATEGORY === "POINTS")} onChartClick={handleChartClick} />
          </div>
          <div className="chart-container">
            <TriesTimeChart events={filteredEvents.filter(event => event.CATEGORY === "POINTS")} onChartClick={handleChartClick} />
          </div>
          <div className="chart-container">
            <TriesOriginChart events={filteredEvents.filter(event => event.CATEGORY === "POINTS")} onChartClick={handleChartClick} />
          </div>
        </div>
  <div data-label="Penalties" id="penalties-tab" className='tab-content' style={{ display: hasPenalties ? 'flex' : 'none' }}>
          <div className="chart-container">
            <PenaltiesPlayerBarChart events={filteredEvents.filter(event => event.CATEGORY === "PENALTY")} onChartClick={handleChartClick} />
          </div>
          <div className="chart-container">
            <PenaltiesTimeChart events={filteredEvents.filter(event => event.CATEGORY === "PENALTY")} onChartClick={handleChartClick} />
          </div>
          <div className="chart-container">
            <PenaltiesCausePieChart events={filteredEvents.filter(event => event.CATEGORY === "PENALTY")} onChartClick={handleChartClick} />
          </div>
        </div>
  <div data-label="Turnovers" id="turnovers-tab" className='tab-content'  style={{ display: hasTurnovers ? 'flex' : 'none' }}>
          {/* <div className="chart-container">
            <TurnoversPlayerBarChart events={filteredEvents.filter(event => event.CATEGORY === "TURNOVER+" || event.CATEGORY === "TURNOVER-")} onChartClick={handleChartClick} />
          </div>
          <div className="chart-container">
            <TurnoversTypePieChart events={filteredEvents.filter(event => event.CATEGORY === "TURNOVER+" || event.CATEGORY === "TURNOVER-")} onChartClick={handleChartClick} />
          </div> */}
          <div className="chart-container">
            <TurnoversTimeChart events={filteredEvents.filter(event => event.CATEGORY === "TURNOVER+" || event.CATEGORY === "TURNOVER-")} onChartClick={handleChartClick} />
          </div>
        </div>
      </Tabs>
    );
  }
);

export default Carousel;
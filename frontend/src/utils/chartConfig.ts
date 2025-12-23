import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

// Registrar los componentes necesarios
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Global dark theme defaults for charts
ChartJS.defaults.font.family = '"Montserrat", "Inter", system-ui, -apple-system, sans-serif';
ChartJS.defaults.color = '#e2e8f0';
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.14)';
ChartJS.defaults.plugins.legend.labels.color = '#e2e8f0';
ChartJS.defaults.plugins.title.color = '#e2e8f0';
ChartJS.defaults.plugins.tooltip.titleColor = '#0b1220';
ChartJS.defaults.plugins.tooltip.bodyColor = '#0b1220';
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(255,255,255,0.9)';
ChartJS.defaults.scale.grid.color = 'rgba(255,255,255,0.08)';
ChartJS.defaults.scale.ticks.color = '#cbd5e1';

export default ChartJS;

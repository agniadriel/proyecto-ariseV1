// src/components/RingChart.jsx
// Gráfico de dona/anel: % de cumplimiento general. Recharts Pie con centro en blanco.
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = { accent: '#22d3ee', track: 'rgba(148,163,184,0.14)' };

export default function RingChart({ percentage = 0, value = 'PROGRESO GENERAL' }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const data = [
    { name: 'cumplido', value: clamped },
    { name: 'restante', value: 100 - clamped },
  ];

  return (
    <div className="ring-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            cornerRadius={10}
          >
            <Cell fill={COLORS.accent} />
            <Cell fill={COLORS.track} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="ring-center">
        <div className="ring-value">{Math.round(clamped)}<span>%</span></div>
        <div className="ring-label">{value}</div>
      </div>
    </div>
  );
}
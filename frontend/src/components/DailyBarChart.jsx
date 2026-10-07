// src/components/DailyBarChart.jsx
// Gráfico de barras: progreso diario (%) durante el mes.
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

export default function DailyBarChart({ days = [] }) {
  // Etiquetas de eje: mostrar solo cada 3er día para no saturar.
  const data = days.map((d) => ({
    ...d,
    label: `${Number(d.date.slice(8, 10))}`,
    showLabel: false,
  }));

  return (
    <div className="chart-box daily-chart">
      <h3 className="card-title">Progreso diario (%)</h3>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={2}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(148,163,184,0.3)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={{ background: '#131a2a', border: '1px solid #26314a', borderRadius: 8, color: '#e2e8f0' }}
              labelFormatter={(label) => `Día ${label}`}
              formatter={(value) => [`${value}%`, 'Cumplimiento']}
            />
            <Bar dataKey="percentage" radius={[4, 4, 0, 0]} name="Cumplimiento">
              {data.map((d, i) => (
                <Cell key={i} fill={d.percentage >= 70 ? '#34d399' : d.percentage >= 40 ? '#22d3ee' : '#f87171'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
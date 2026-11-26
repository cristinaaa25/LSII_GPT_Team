import React, { useContext } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyViews } from '../types/analytics';
import { formatChartDate } from '../utils/format';
import { ThemeContext } from '../context/ThemeContext';

// SVG attributes cannot read CSS variables reliably, so the chart takes the theme colours from here.
const CHART_COLORS = {
  light: {
    grid: '#dedcec',
    axis: '#6b6a80',
    total: '#5b4bdb',
    authenticated: '#1f9d68',
    anonymous: '#e5603f',
    surface: '#ffffff',
    text: '#1c1b29',
  },
  dark: {
    grid: '#34334d',
    axis: '#a3a2b8',
    total: '#8b7ff0',
    authenticated: '#4cc795',
    anonymous: '#ff8f73',
    surface: '#1c1b2e',
    text: '#ecebf5',
  },
};

interface Props {
  data: DailyViews[];
}

export const ViewsOverTimeChart: React.FC<Props> = ({ data }) => {
  const colors = CHART_COLORS[useContext(ThemeContext)?.theme ?? 'light'];
  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h2 className="card-title h5 mb-3">Views Over Time (Last 30 Days)</h2>
        <div style={{ width: '100%', height: 320 }} data-testid="views-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="date" tickFormatter={formatChartDate} stroke={colors.axis} fontSize={12} />
              <YAxis allowDecimals={false} stroke={colors.axis} fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: colors.surface, borderColor: colors.grid, color: colors.text }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                name="Total Views"
                stroke={colors.total}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="authenticatedViews"
                name="Authenticated"
                stroke={colors.authenticated}
                strokeWidth={1.5}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="anonymousViews"
                name="Anonymous"
                stroke={colors.anonymous}
                strokeWidth={1.5}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ViewsOverTimeChart;

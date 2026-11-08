import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyViews } from '../types/analytics';
import { formatChartDate } from '../utils/format';

interface Props {
  data: DailyViews[];
}

export const ViewsOverTimeChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Views Over Time (Last 30 Days)</h5>
        <div style={{ width: '100%', height: 320 }} data-testid="views-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tickFormatter={formatChartDate} stroke="#6c757d" fontSize={12} />
              <YAxis allowDecimals={false} stroke="#6c757d" fontSize={12} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                name="Total Views"
                stroke="#0d6efd"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="authenticatedViews"
                name="Authenticated"
                stroke="#198754"
                strokeWidth={1.5}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="anonymousViews"
                name="Anonymous"
                stroke="#fd7e14"
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

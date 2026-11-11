import React from 'react';
import { render, screen } from '@testing-library/react';
import ViewsOverTimeChart from '../ViewsOverTimeChart';
import { DailyViews } from '../../types/analytics';

const sampleData: DailyViews[] = [
  { date: '2026-10-06', views: 0, authenticatedViews: 0, anonymousViews: 0 },
  { date: '2026-11-04', views: 15, authenticatedViews: 10, anonymousViews: 5 },
];

describe('ViewsOverTimeChart', () => {
  it('renders the chart card with title and container', () => {
    render(<ViewsOverTimeChart data={sampleData} />);

    expect(screen.getByText('Views Over Time (Last 30 Days)')).toBeInTheDocument();
    expect(screen.getByTestId('views-chart-container')).toBeInTheDocument();
  });
});

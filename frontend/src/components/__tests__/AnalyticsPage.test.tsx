import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsPage from '../AnalyticsPage';
import { useAnalytics } from '../../hooks/useAnalytics';

jest.mock('../../hooks/useAnalytics');

const mockedUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

describe('AnalyticsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when loading', () => {
    mockedUseAnalytics.mockReturnValue({
      analytics: null,
      loading: true,
      error: null,
      refresh: jest.fn(),
    });

    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('analytics-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('renders error state and retries on button click', () => {
    const mockRefresh = jest.fn();
    mockedUseAnalytics.mockReturnValue({
      analytics: null,
      loading: false,
      error: 'Failed to fetch analytics',
      refresh: mockRefresh,
    });

    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch analytics');
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when user has no videos', () => {
    mockedUseAnalytics.mockReturnValue({
      analytics: {
        totals: { videos: 0, views: 0, likes: 0, comments: 0 },
        videos: [],
        viewsPerDay: [],
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('analytics-empty')).toBeInTheDocument();
    expect(screen.getByText('No video analytics yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload your first video/i })).toHaveAttribute('href', '/upload');
  });

  it('renders full data state with KPI cards, chart and table', () => {
    mockedUseAnalytics.mockReturnValue({
      analytics: {
        totals: { videos: 3, views: 450, likes: 52, comments: 26 },
        videos: [
          {
            id: 10,
            title: 'Sample Video One',
            thumbnailUrl: 'thumb1.webp',
            uploadDate: '2026-11-01T12:00:00Z',
            duration: 90,
            views: 300,
            likes: 40,
            comments: 20,
          },
          {
            id: 20,
            title: 'Sample Video Two',
            thumbnailUrl: null,
            uploadDate: '2026-11-02T12:00:00Z',
            duration: 60,
            views: 150,
            likes: 12,
            comments: 6,
          },
        ],
        viewsPerDay: [
          { date: '2026-11-01', views: 50, authenticatedViews: 30, anonymousViews: 20 },
          { date: '2026-11-02', views: 100, authenticatedViews: 60, anonymousViews: 40 },
        ],
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('analytics-page')).toBeInTheDocument();

    // KPI values
    expect(screen.getByTestId('kpi-total-videos')).toHaveTextContent('3');
    expect(screen.getByTestId('kpi-total-views')).toHaveTextContent('450');
    expect(screen.getByTestId('kpi-total-likes')).toHaveTextContent('52');
    expect(screen.getByTestId('kpi-total-comments')).toHaveTextContent('26');

    // Chart
    expect(screen.getByTestId('views-chart-container')).toBeInTheDocument();

    // Table
    expect(screen.getByText('Sample Video One')).toBeInTheDocument();
    expect(screen.getByText('Sample Video Two')).toBeInTheDocument();
  });
});

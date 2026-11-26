import React from 'react';
import { Link } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import ViewsOverTimeChart from './ViewsOverTimeChart';
import SortableVideoTable from './SortableVideoTable';
import Skeleton from './Skeleton';
import Icon from './Icon';

export const AnalyticsPage: React.FC = () => {
  const { analytics, loading, error, refresh } = useAnalytics();

  if (loading) {
    return (
      <div data-testid="analytics-loading">
        <Skeleton label="Loading analytics..." variant="block" count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 d-flex justify-content-between align-items-center gap-2" role="alert">
        <span>{error}</span>
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => refresh()}>
          Retry
        </button>
      </div>
    );
  }

  if (!analytics || analytics.totals.videos === 0 || analytics.videos.length === 0) {
    return (
      <div className="text-center py-5 my-4" data-testid="analytics-empty">
        <svg className="mb-3" width="144" viewBox="0 0 160 124" aria-hidden="true" focusable="false">
          <rect className="pt-ill-soft" x="20" y="22" width="120" height="80" rx="14" />
          <rect className="pt-ill-primary" x="40" y="66" width="16" height="22" rx="4" />
          <rect className="pt-ill-primary" x="64" y="52" width="16" height="36" rx="4" opacity="0.8" />
          <rect className="pt-ill-primary" x="88" y="40" width="16" height="48" rx="4" opacity="0.6" />
          <circle className="pt-ill-accent" cx="120" cy="38" r="7" />
        </svg>
        <h2 className="h4 fw-bold">No video analytics yet</h2>
        <p className="text-muted mb-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
          You have not uploaded any videos yet. Once you publish videos, your views, likes, comments, and daily trends
          will appear here.
        </p>
        <Link to="/upload" className="btn btn-primary">
          <Icon name="upload" />
          Upload your first video
        </Link>
      </div>
    );
  }

  const { totals, videos, viewsPerDay } = analytics;

  return (
    <div className="py-3" data-testid="analytics-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Channel Analytics</h1>
          <p className="text-muted mb-0">Overview of your channel performance and video statistics</p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          <Icon name="upload" />
          Upload Video
        </Link>
      </div>

      {/* KPI Cards: surface cards with a coloured marker (the colour is decoration, the text keeps AA contrast) */}
      <div className="row g-3 mb-4">
        {[
          {
            id: 'kpi-total-videos',
            label: 'Total Videos',
            value: totals.videos,
            hint: 'Published videos',
            color: 'var(--pt-primary)',
          },
          {
            id: 'kpi-total-views',
            label: 'Total Views',
            value: totals.views,
            hint: 'All-time views',
            color: '#2fb37a',
          },
          {
            id: 'kpi-total-likes',
            label: 'Total Likes',
            value: totals.likes,
            hint: 'Across all videos',
            color: 'var(--pt-accent)',
          },
          {
            id: 'kpi-total-comments',
            label: 'Total Comments',
            value: totals.comments,
            hint: 'Audience engagement',
            color: '#3ba7d9',
          },
        ].map((kpi) => (
          <div className="col-6 col-md-3" key={kpi.id}>
            <div className="card shadow-sm h-100" style={{ borderTop: `4px solid ${kpi.color}` }}>
              <div className="card-body">
                <span className="text-body-secondary text-uppercase small fw-semibold">{kpi.label}</span>
                <p className="display-6 fw-bold my-2" data-testid={kpi.id}>
                  {kpi.value.toLocaleString()}
                </p>
                <span className="small text-body-secondary">{kpi.hint}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Views Over Time Chart */}
      <ViewsOverTimeChart data={viewsPerDay} />

      {/* Per-Video Table */}
      <div className="mb-2 d-flex justify-content-between align-items-center">
        <h2 className="h5 fw-bold mb-0">Video Performance</h2>
        <span className="text-muted small">
          {videos.length} {videos.length === 1 ? 'video' : 'videos'}
        </span>
      </div>
      <SortableVideoTable videos={videos} />
    </div>
  );
};

export default AnalyticsPage;

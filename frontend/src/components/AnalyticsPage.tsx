import React from 'react';
import { Link } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import ViewsOverTimeChart from './ViewsOverTimeChart';
import SortableVideoTable from './SortableVideoTable';

export const AnalyticsPage: React.FC = () => {
  const { analytics, loading, error, refresh } = useAnalytics();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" data-testid="analytics-loading">
        <div className="spinner-border text-primary me-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span>Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 d-flex justify-content-between align-items-center" role="alert">
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
        <div className="display-1 text-muted mb-3">📊</div>
        <h2 className="h4 fw-bold">No video analytics yet</h2>
        <p className="text-muted mb-4" style={{ maxWidth: '480px', margin: '0 auto' }}>
          You have not uploaded any videos yet. Once you publish videos, your views, likes, comments, and daily trends
          will appear here.
        </p>
        <Link to="/upload" className="btn btn-primary">
          Upload your first video
        </Link>
      </div>
    );
  }

  const { totals, videos, viewsPerDay } = analytics;

  return (
    <div className="py-3" data-testid="analytics-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Channel Analytics</h1>
          <p className="text-muted mb-0">Overview of your channel performance and video statistics</p>
        </div>
        <Link to="/upload" className="btn btn-primary btn-sm">
          + Upload Video
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card shadow-sm h-100 border-0 bg-primary text-white">
            <div className="card-body">
              <span className="text-white-50 text-uppercase small fw-semibold">Total Videos</span>
              <h2 className="display-6 fw-bold my-2" data-testid="kpi-total-videos">
                {totals.videos.toLocaleString()}
              </h2>
              <span className="small text-white-50">Published videos</span>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card shadow-sm h-100 border-0 bg-success text-white">
            <div className="card-body">
              <span className="text-white-50 text-uppercase small fw-semibold">Total Views</span>
              <h2 className="display-6 fw-bold my-2" data-testid="kpi-total-views">
                {totals.views.toLocaleString()}
              </h2>
              <span className="small text-white-50">All-time views</span>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card shadow-sm h-100 border-0 bg-warning text-dark">
            <div className="card-body">
              <span className="text-dark-50 text-uppercase small fw-semibold">Total Likes</span>
              <h2 className="display-6 fw-bold my-2" data-testid="kpi-total-likes">
                {totals.likes.toLocaleString()}
              </h2>
              <span className="small text-muted">Across all videos</span>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card shadow-sm h-100 border-0 bg-info text-white">
            <div className="card-body">
              <span className="text-white-50 text-uppercase small fw-semibold">Total Comments</span>
              <h2 className="display-6 fw-bold my-2" data-testid="kpi-total-comments">
                {totals.comments.toLocaleString()}
              </h2>
              <span className="small text-white-50">Audience engagement</span>
            </div>
          </div>
        </div>
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

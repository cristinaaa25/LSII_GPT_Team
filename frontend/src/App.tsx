import React from 'react';
import './App.css';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import VideoCatalog from './components/VideoCatalog';
import VideoDetailPage from './components/VideoDetailPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Header from './components/Header';
import SearchPage from './components/SearchPage';
import UploadPage from './components/UploadPage';
import ProtectedRoute from './components/ProtectedRoute';
import ProfilePage from './components/ProfilePage';
import PublicProfilePage from './components/PublicProfilePage';
import AnalyticsPage from './components/AnalyticsPage';
import SubscriptionsPage from './components/SubscriptionsPage';
import HistoryPage from './components/HistoryPage';
import PlaylistsPage from './components/PlaylistsPage';
import PlaylistDetailPage from './components/PlaylistDetailPage';
import AuthCallbackPage from './components/AuthCallbackPage';
import NotFoundPage from './components/NotFoundPage';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './context/AuthProvider';
import { ThemeProvider } from './context/ThemeProvider';
import { ToastProvider } from './context/ToastProvider';

interface AppProps {
  router?: 'browser' | 'none';
}

export const AppContent: React.FC = () => {
  const location = useLocation();

  return (
    <div className="App">
      <ScrollToTop />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="container py-4" tabIndex={-1}>
        {/* key: each new page fades in (disabled with prefers-reduced-motion in theme.css) */}
        <div key={location.pathname} className="pt-page">
          <Routes>
            <Route path="/" element={<VideoCatalog />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/videos/:id" element={<VideoDetailPage />} />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <ProtectedRoute>
                  <SubscriptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playlists"
              element={
                <ProtectedRoute>
                  <PlaylistsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/playlists/:id"
              element={
                <ProtectedRoute>
                  <PlaylistDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/users/:username" element={<PublicProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export const App: React.FC<AppProps> = ({ router = 'browser' }) => {
  const content = (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );

  if (router === 'none') {
    return content;
  }

  return <BrowserRouter>{content}</BrowserRouter>;
};

export default App;

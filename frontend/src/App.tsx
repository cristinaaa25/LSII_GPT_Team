import React from 'react';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import VideoCatalog from './components/VideoCatalog';
import VideoDetailPage from './components/VideoDetailPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Header from './components/Header';
import { AuthProvider } from './context/AuthProvider';

interface AppProps {
  router?: 'browser' | 'none';
}

export const AppContent: React.FC = () => {
  return (
    <div className="App">
      <Header />
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<VideoCatalog />} />
          <Route path="/videos/:id" element={<VideoDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC<AppProps> = ({ router = 'browser' }) => {
  if (router === 'none') {
    return (
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

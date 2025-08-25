import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AuthPage from './pages/Auth';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';
import ApiGateway from './pages/ApiGateway';
import Admin from './pages/Admin';
import AIInsights from './pages/AIInsights'; // New import

function App() {
  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}>
      <BrowserRouter>
                            <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/api-gateway" element={<ApiGateway />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/ai-insights" element={<AIInsights />} /> // New route
                    </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

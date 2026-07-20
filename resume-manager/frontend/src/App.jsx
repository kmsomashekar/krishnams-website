import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import PageLayout from './layouts/PageLayout.jsx';
import AdminUsers from './components/AdminUsers.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Opportunities from './pages/Opportunities.jsx';
import OpportunityDetail from './pages/OpportunityDetail.jsx';
import Resumes from './pages/Resumes.jsx';
import Interviews from './pages/Interviews.jsx';
import CoverLetters from './pages/CoverLetters.jsx';
import JDAnalyzer from './pages/JDAnalyzer.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PageLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/jd-analyzer" element={<JDAnalyzer />} />

            <Route path="/opportunities" element={<Opportunities />} />

            <Route
              path="/opportunities/:id"
              element={<OpportunityDetail />}
            />

            <Route path="/resumes" element={<Resumes />} />

            <Route path="/interviews" element={<Interviews />} />
			
            <Route path="/cover-letters" element={<CoverLetters />} />

			<Route path="/settings/admin/users" element={<AdminUsers />} />
			
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
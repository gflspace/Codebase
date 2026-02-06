import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Layout from './Layout.jsx';

// Eager load Home for best initial performance
import Home from './Home';

// Lazy load other pages for better performance
const Procedures = lazy(() => import('./Procedures'));
const Gallery = lazy(() => import('./Gallery'));
const About = lazy(() => import('./About'));
const Financing = lazy(() => import('./Financing'));
const AdminDashboard = lazy(() => import('./admin/Dashboard'));

// Page registry
const PAGES = {
  Home: Home,
  Procedures: Procedures,
  Gallery: Gallery,
  About: About,
  Financing: Financing,
};

function _getCurrentPage(url) {
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split('/').pop();
  if (urlLastPart.includes('?')) {
    urlLastPart = urlLastPart.split('?')[0];
  }

  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || Object.keys(PAGES)[0];
}

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-[#4A1515] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-[#6B5C4C] text-sm">Loading...</p>
    </div>
  </div>
);

// Layout wrapper that conditionally applies Layout for non-admin routes
function LayoutWrapper({ children }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const currentPage = _getCurrentPage(location.pathname);

  // Admin routes don't use Layout
  if (isAdminRoute) {
    return <>{children}</>;
  }

  return <Layout currentPageName={currentPage}>{children}</Layout>;
}

// Main routing component
function PagesContent() {
  return (
    <LayoutWrapper>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Home */}
          <Route path="/" element={<Home />} />
          <Route path="/Home" element={<Home />} />

          {/* Procedures */}
          <Route path="/procedures" element={<Procedures />} />
          <Route path="/procedures/:procedureId" element={<Procedures />} />
          <Route path="/Procedures" element={<Procedures />} />

          {/* Gallery */}
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/Gallery" element={<Gallery />} />

          {/* About */}
          <Route path="/about" element={<About />} />
          <Route path="/About" element={<About />} />

          {/* Financing */}
          <Route path="/financing" element={<Financing />} />
          <Route path="/Financing" element={<Financing />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </LayoutWrapper>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}

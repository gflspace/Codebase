import Layout from "./Layout.jsx";
import Login from "./Login";
import AdvancedDashboard from "./AdvancedDashboard";
import Assets from "./Assets";
import CodebaseAnalysis from "./CodebaseAnalysis";
import ComplianceReports from "./ComplianceReports";
import Dashboard from "./Dashboard";
import ImportVulnerabilities from "./ImportVulnerabilities";
import IncidentResponse from "./IncidentResponse";
import PredictiveAnalysis from "./PredictiveAnalysis";
import RemediationTasks from "./RemediationTasks";
import Settings from "./Settings";
import Teams from "./Teams";
import ThreatHunting from "./ThreatHunting";
import ThreatModeling from "./ThreatModeling";
import Vulnerabilities from "./Vulnerabilities";
import VulnerabilityDetail from "./VulnerabilityDetail";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    AdvancedDashboard: AdvancedDashboard,
    
    Assets: Assets,
    
    CodebaseAnalysis: CodebaseAnalysis,
    
    ComplianceReports: ComplianceReports,
    
    Dashboard: Dashboard,
    
    ImportVulnerabilities: ImportVulnerabilities,
    
    IncidentResponse: IncidentResponse,
    
    PredictiveAnalysis: PredictiveAnalysis,
    
    RemediationTasks: RemediationTasks,
    
    Settings: Settings,
    
    Teams: Teams,
    
    ThreatHunting: ThreatHunting,
    
    ThreatModeling: ThreatModeling,
    
    Vulnerabilities: Vulnerabilities,
    
    VulnerabilityDetail: VulnerabilityDetail,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Helper component to wrap routes with protection
function Protected({ children, allowedRoles }) {
    return (
        <ProtectedRoute allowedRoles={allowedRoles}>
            {children}
        </ProtectedRoute>
    );
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    // Login page doesn't use Layout
    if (location.pathname.toLowerCase() === '/login') {
        return (
            <Routes>
                <Route path="/Login" element={<Login />} />
            </Routes>
        );
    }

    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                {/* Public routes */}
                <Route path="/Login" element={<Login />} />

                {/* Protected routes - require authentication */}
                <Route path="/" element={<Protected><Dashboard /></Protected>} />
                <Route path="/Dashboard" element={<Protected><Dashboard /></Protected>} />
                <Route path="/AdvancedDashboard" element={<Protected><AdvancedDashboard /></Protected>} />
                <Route path="/Vulnerabilities" element={<Protected><Vulnerabilities /></Protected>} />
                <Route path="/VulnerabilityDetail" element={<Protected><VulnerabilityDetail /></Protected>} />
                <Route path="/RemediationTasks" element={<Protected><RemediationTasks /></Protected>} />
                <Route path="/Assets" element={<Protected><Assets /></Protected>} />
                <Route path="/Teams" element={<Protected><Teams /></Protected>} />
                <Route path="/IncidentResponse" element={<Protected><IncidentResponse /></Protected>} />
                <Route path="/ComplianceReports" element={<Protected><ComplianceReports /></Protected>} />
                <Route path="/ThreatHunting" element={<Protected><ThreatHunting /></Protected>} />
                <Route path="/ThreatModeling" element={<Protected><ThreatModeling /></Protected>} />
                <Route path="/PredictiveAnalysis" element={<Protected><PredictiveAnalysis /></Protected>} />
                <Route path="/CodebaseAnalysis" element={<Protected><CodebaseAnalysis /></Protected>} />

                {/* Admin-only routes */}
                <Route path="/Settings" element={<Protected allowedRoles={['admin', 'manager']}><Settings /></Protected>} />
                <Route path="/ImportVulnerabilities" element={<Protected allowedRoles={['admin', 'manager', 'analyst']}><ImportVulnerabilities /></Protected>} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
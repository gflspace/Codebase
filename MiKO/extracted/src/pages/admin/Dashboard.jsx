import React, { useState, useEffect, Component, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Mail,
  Video,
  MapPin,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  Settings,
  Bell,
  ChevronRight,
  Activity,
  Wifi,
  WifiOff,
  BarChart3,
  PieChart,
  FileText,
  Download,
  FileSpreadsheet,
  CalendarDays,
  UserCheck,
  UserX,
  Target,
  Zap,
  Brain,
  ClipboardList,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { format, formatDistanceToNow, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO, isWithinInterval } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { checkAdminAuth } from './AdminLogin';
import { auditExport, auditView } from '@/lib/security';
import { isDemoMode, getDemoLeads, getDemoAppointments } from '@/lib/demoMode';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg">
            <h2 className="text-xl font-bold text-red-600 mb-4">Dashboard Error</h2>
            <p className="text-gray-600 mb-4">Something went wrong loading the dashboard.</p>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Color constants for charts
const CHART_COLORS = ['#4A1515', '#8B4513', '#C4A484', '#6B5C4C', '#D4AF37', '#2D5016'];
const STATUS_COLORS = {
  new: '#3B82F6',
  contacted: '#F59E0B',
  qualified: '#8B5CF6',
  booked: '#10B981',
  completed: '#059669',
  'no-show': '#EF4444',
};

// Fallback mock data
const fallbackLeads = [
  {
    id: '1',
    full_name: 'Jennifer Martinez',
    email: 'jennifer.m@email.com',
    phone: '(310) 555-0123',
    source: 'website',
    status: 'new',
    lead_score: 75,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    notes: 'Interested in rhinoplasty',
    clinical_interests: [{ specific_procedure: 'Rhinoplasty' }],
    ai_qualified: true,
    response_time_seconds: 45,
  },
  {
    id: '2',
    full_name: 'Michael Chen',
    email: 'm.chen@email.com',
    phone: '(818) 555-0456',
    source: 'instagram',
    status: 'contacted',
    lead_score: 65,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    notes: 'Consultation scheduled',
    clinical_interests: [{ specific_procedure: 'Facelift' }],
    ai_qualified: true,
    response_time_seconds: 30,
  },
  {
    id: '3',
    full_name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '(424) 555-0789',
    source: 'google',
    status: 'booked',
    lead_score: 90,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    notes: 'VIP referral',
    clinical_interests: [{ specific_procedure: 'Breast Augmentation' }],
    ai_qualified: true,
    response_time_seconds: 15,
  },
  {
    id: '4',
    full_name: 'David Wilson',
    email: 'david.w@email.com',
    phone: '(310) 555-0321',
    source: 'referral',
    status: 'qualified',
    lead_score: 80,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    notes: 'Previous patient referral',
    clinical_interests: [{ specific_procedure: 'Liposuction' }],
    ai_qualified: true,
    response_time_seconds: 60,
  },
];

const fallbackAppointments = [
  {
    id: 'apt1',
    patientName: 'Lisa Anderson',
    leadId: '1',
    type: 'virtual',
    procedure: 'Rhinoplasty Consultation',
    start: new Date(Date.now() + 1000 * 60 * 60 * 2),
    end: new Date(Date.now() + 1000 * 60 * 60 * 3),
    status: 'confirmed',
  },
  {
    id: 'apt2',
    patientName: 'Robert Kim',
    leadId: '2',
    type: 'in-person',
    procedure: 'Facelift Consultation',
    start: new Date(Date.now() + 1000 * 60 * 60 * 24),
    end: new Date(Date.now() + 1000 * 60 * 60 * 25),
    status: 'pending',
  },
  {
    id: 'apt3',
    patientName: 'Emily Davis',
    leadId: '3',
    type: 'virtual',
    procedure: 'Follow-up',
    start: new Date(Date.now() + 1000 * 60 * 60 * 48),
    end: new Date(Date.now() + 1000 * 60 * 60 * 49),
    status: 'confirmed',
  },
];

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  booked: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  'no-show': 'bg-red-100 text-red-700',
};

const statusLabels = {
  new: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  booked: 'Booked',
  completed: 'Completed',
  'no-show': 'No Show',
};

// Safe hook wrapper
function useSafeLeads() {
  const [data, setData] = useState({ leads: [], loading: true, error: null });

  useEffect(() => {
    const loadLeads = async () => {
      try {
        // Use demo data in demo mode
        if (isDemoMode()) {
          setData({ leads: getDemoLeads(), loading: false, error: null });
          return;
        }

        const { isSupabaseConfigured } = await import('@/lib/supabase');

        if (!isSupabaseConfigured()) {
          setData({ leads: fallbackLeads, loading: false, error: null });
          return;
        }

        const { supabase } = await import('@/lib/supabase');
        const { data: leads, error } = await supabase
          .from('leads')
          .select('*, clinical_interests(specific_procedure)')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setData({ leads: leads || fallbackLeads, loading: false, error: null });
      } catch (err) {
        console.error('Error loading leads:', err);
        setData({ leads: fallbackLeads, loading: false, error: err.message });
      }
    };

    loadLeads();
  }, []);

  return data;
}

function useSafeAppointments() {
  const [data, setData] = useState({ appointments: [], loading: true, error: null });

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        // Use demo data in demo mode
        if (isDemoMode()) {
          // Transform demo appointments to match expected format
          const demoAppts = getDemoAppointments().map(apt => ({
            id: apt.id,
            patientName: apt.leads?.full_name || 'Unknown',
            leadId: apt.lead_id,
            type: apt.appointment_type === 'virtual' ? 'virtual' : 'in-person',
            procedure: apt.procedure_of_interest,
            start: new Date(apt.scheduled_at),
            end: new Date(new Date(apt.scheduled_at).getTime() + apt.duration_minutes * 60000),
            status: apt.status,
          }));
          setData({ appointments: demoAppts, loading: false, error: null });
          return;
        }

        const { isSupabaseConfigured } = await import('@/lib/supabase');

        if (!isSupabaseConfigured()) {
          setData({ appointments: fallbackAppointments, loading: false, error: null });
          return;
        }

        const { supabase } = await import('@/lib/supabase');
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .order('scheduled_time', { ascending: true })
          .limit(50);

        if (error) throw error;
        setData({ appointments: appointments || fallbackAppointments, loading: false, error: null });
      } catch (err) {
        console.error('Error loading appointments:', err);
        setData({ appointments: fallbackAppointments, loading: false, error: err.message });
      }
    };

    loadAppointments();
  }, []);

  return data;
}

// Google Calendar Integration Hook
function useGoogleCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  const initializeGoogleAPI = useCallback(async () => {
    if (!googleClientId || !googleApiKey) {
      setError('Google Calendar credentials not configured');
      return;
    }

    try {
      setLoading(true);
      // Load Google API script
      if (!window.gapi) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      await new Promise((resolve) => window.gapi.load('client:auth2', resolve));

      await window.gapi.client.init({
        apiKey: googleApiKey,
        clientId: googleClientId,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
      });

      const authInstance = window.gapi.auth2.getAuthInstance();
      setConnected(authInstance.isSignedIn.get());

      authInstance.isSignedIn.listen((isSignedIn) => {
        setConnected(isSignedIn);
        if (isSignedIn) fetchCalendarEvents();
      });

      if (authInstance.isSignedIn.get()) {
        await fetchCalendarEvents();
      }
    } catch (err) {
      console.error('Google Calendar init error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [googleClientId, googleApiKey]);

  const signIn = async () => {
    try {
      await window.gapi.auth2.getAuthInstance().signIn();
    } catch (err) {
      setError(err.message);
    }
  };

  const signOut = async () => {
    try {
      await window.gapi.auth2.getAuthInstance().signOut();
      setEvents([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 20,
        singleEvents: true,
        orderBy: 'startTime',
      });

      setEvents(response.result.items || []);
    } catch (err) {
      console.error('Error fetching calendar:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeGoogleAPI();
  }, [initializeGoogleAPI]);

  return { events, loading, connected, error, signIn, signOut, refresh: fetchCalendarEvents };
}

// Overview Tab Component
function OverviewTab({ leads, appointments, supabaseConnected }) {
  const stats = useMemo(() => {
    const today = new Date();
    const todayLeads = leads.filter(l => isToday(new Date(l.created_at)));
    const qualifiedLeads = leads.filter(l => l.status === 'qualified' || l.status === 'booked');
    const bookedLeads = leads.filter(l => l.status === 'booked' || l.status === 'completed');
    const noShows = leads.filter(l => l.status === 'no-show');

    const avgResponseTime = leads.reduce((acc, l) => acc + (l.response_time_seconds || 60), 0) / leads.length;
    const conversionRate = leads.length > 0 ? (bookedLeads.length / leads.length) * 100 : 0;
    const noShowRate = leads.length > 0 ? (noShows.length / leads.length) * 100 : 0;
    const aiQualifiedRate = leads.length > 0 ? (leads.filter(l => l.ai_qualified).length / leads.length) * 100 : 0;

    return {
      totalLeads: leads.length,
      newLeadsToday: todayLeads.length,
      qualifiedLeads: qualifiedLeads.length,
      bookedConsultations: bookedLeads.length,
      upcomingAppointments: appointments.length,
      avgResponseTime: Math.round(avgResponseTime),
      conversionRate: conversionRate.toFixed(1),
      noShowRate: noShowRate.toFixed(1),
      aiQualifiedRate: aiQualifiedRate.toFixed(1),
    };
  }, [leads, appointments]);

  const leadSourceData = useMemo(() => {
    const sources = {};
    leads.forEach(lead => {
      const source = lead.source || 'unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const pipelineData = useMemo(() => {
    const pipeline = { new: 0, contacted: 0, qualified: 0, booked: 0, completed: 0 };
    leads.forEach(lead => {
      const status = lead.status || 'new';
      if (pipeline[status] !== undefined) {
        pipeline[status]++;
      }
    });
    return Object.entries(pipeline).map(([name, value]) => ({
      name: statusLabels[name] || name,
      value,
      fill: STATUS_COLORS[name] || '#6B5C4C',
    }));
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E8E3DC]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7355]">Total Leads</p>
                <p className="text-3xl font-semibold text-[#2D0A0A] mt-1">{stats.totalLeads}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">+{stats.newLeadsToday}</span>
              <span className="text-[#8B7355]">today</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8E3DC]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7355]">Response Time</p>
                <p className="text-3xl font-semibold text-[#2D0A0A] mt-1">{stats.avgResponseTime}s</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm">
              <ArrowDownRight className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">Instant</span>
              <span className="text-[#8B7355]">AI-powered</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8E3DC]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7355]">Conversion Rate</p>
                <p className="text-3xl font-semibold text-[#2D0A0A] mt-1">{stats.conversionRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <Progress value={parseFloat(stats.conversionRate)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card className="border-[#E8E3DC]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7355]">AI Qualified</p>
                <p className="text-3xl font-semibold text-[#2D0A0A] mt-1">{stats.aiQualifiedRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Brain className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <Progress value={parseFloat(stats.aiQualifiedRate)} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#E8E3DC]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7355]">Booked Consultations</p>
                <p className="text-3xl font-semibold text-[#2D0A0A] mt-1">{stats.bookedConsultations}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8E3DC]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7355]">No-Show Rate</p>
                <p className="text-3xl font-semibold text-[#2D0A0A] mt-1">{stats.noShowRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">Target: &lt;10%</p>
          </CardContent>
        </Card>

        <Card className="border-[#E8E3DC]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8B7355]">Upcoming Today</p>
                <p className="text-3xl font-semibold text-[#2D0A0A] mt-1">{stats.upcomingAppointments}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources Pie Chart */}
        <Card className="border-[#E8E3DC]">
          <CardHeader>
            <CardTitle className="text-[#2D0A0A]">Lead Sources</CardTitle>
            <CardDescription>Where your leads are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card className="border-[#E8E3DC]">
          <CardHeader>
            <CardTitle className="text-[#2D0A0A]">Lead Pipeline</CardTitle>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Status */}
      <Card className="border-[#E8E3DC]">
        <CardHeader>
          <CardTitle className="text-[#2D0A0A]">AI Automation Workflow Status</CardTitle>
          <CardDescription>Lead → Instant Response → AI Intake → Qualification → Scheduling → Reminders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {[
              { label: 'Lead Capture', icon: Users, status: 'active', count: stats.totalLeads },
              { label: 'Instant Response', icon: Zap, status: 'active', count: stats.totalLeads },
              { label: 'AI Intake', icon: MessageSquare, status: 'active', count: Math.round(stats.totalLeads * 0.9) },
              { label: 'Qualification', icon: Brain, status: 'active', count: stats.qualifiedLeads },
              { label: 'Scheduling', icon: Calendar, status: 'active', count: stats.bookedConsultations },
              { label: 'Reminders', icon: Bell, status: 'active', count: stats.upcomingAppointments },
            ].map((step, index) => (
              <div key={step.label} className="flex items-center">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    step.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <step.icon className={`w-6 h-6 ${step.status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <p className="text-xs font-medium text-[#2D0A0A]">{step.label}</p>
                  <p className="text-lg font-semibold text-[#4A1515]">{step.count}</p>
                </div>
                {index < 5 && (
                  <ChevronRight className="w-5 h-5 text-[#C4A484] mx-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Calendar Tab Component
function CalendarTab({ appointments }) {
  const calendar = useGoogleCalendar();

  return (
    <div className="space-y-6">
      {/* Google Calendar Connection */}
      <Card className="border-[#E8E3DC]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#2D0A0A]">Google Calendar Integration</CardTitle>
              <CardDescription>Sync your appointments with Google Calendar</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {calendar.connected ? (
                <>
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <Wifi className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={calendar.refresh} disabled={calendar.loading}>
                    <RefreshCw className={`w-4 h-4 mr-1 ${calendar.loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={calendar.signOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button onClick={calendar.signIn} disabled={calendar.loading}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {calendar.error && (
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              {calendar.error}
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Calendar Events */}
        <Card className="border-[#E8E3DC]">
          <CardHeader>
            <CardTitle className="text-[#2D0A0A]">Google Calendar Events</CardTitle>
            <CardDescription>Upcoming events from your calendar</CardDescription>
          </CardHeader>
          <CardContent>
            {calendar.loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-[#8B7355]" />
              </div>
            ) : calendar.events.length > 0 ? (
              <div className="space-y-3">
                {calendar.events.slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border bg-[#FDFCFB] border-[#F0EBE5] hover:border-[#C4A484] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-[#2D0A0A]">{event.summary}</h4>
                        <p className="text-sm text-[#6B5C4C] mt-1">
                          {event.start?.dateTime
                            ? format(new Date(event.start.dateTime), 'MMM d, yyyy h:mm a')
                            : event.start?.date}
                        </p>
                      </div>
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4A1515] hover:text-[#6B2020]"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#8B7355]">
                {calendar.connected ? 'No upcoming events' : 'Connect Google Calendar to see events'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* MiKO Appointments */}
        <Card className="border-[#E8E3DC]">
          <CardHeader>
            <CardTitle className="text-[#2D0A0A]">MiKO Appointments</CardTitle>
            <CardDescription>Consultations from the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3 rounded-lg border bg-[#FDFCFB] border-[#F0EBE5] hover:border-[#C4A484] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        apt.type === 'virtual' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {apt.type === 'virtual' ? (
                          <Video className="w-5 h-5 text-blue-600" />
                        ) : (
                          <MapPin className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-[#2D0A0A]">{apt.patientName}</h4>
                        <p className="text-sm text-[#6B5C4C]">{apt.procedure}</p>
                        <p className="text-xs text-[#8B7355] mt-1">
                          {format(new Date(apt.start), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    } border-0`}>
                      {apt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ leads }) {
  const [timeRange, setTimeRange] = useState('7d');

  const trendData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayLeads = leads.filter(l => {
        const leadDate = new Date(l.created_at);
        return leadDate.toDateString() === date.toDateString();
      });

      data.push({
        date: format(date, 'MMM d'),
        leads: dayLeads.length,
        qualified: dayLeads.filter(l => l.status === 'qualified' || l.status === 'booked').length,
        booked: dayLeads.filter(l => l.status === 'booked' || l.status === 'completed').length,
      });
    }

    return data;
  }, [leads, timeRange]);

  const procedureData = useMemo(() => {
    const procedures = {};
    leads.forEach(lead => {
      const procedure = lead.clinical_interests?.[0]?.specific_procedure || 'General Inquiry';
      procedures[procedure] = (procedures[procedure] || 0) + 1;
    });
    return Object.entries(procedures)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [leads]);

  const conversionBySource = useMemo(() => {
    const sources = {};
    leads.forEach(lead => {
      const source = lead.source || 'unknown';
      if (!sources[source]) {
        sources[source] = { total: 0, converted: 0 };
      }
      sources[source].total++;
      if (lead.status === 'booked' || lead.status === 'completed') {
        sources[source].converted++;
      }
    });

    return Object.entries(sources).map(([name, data]) => ({
      name,
      total: data.total,
      converted: data.converted,
      rate: data.total > 0 ? ((data.converted / data.total) * 100).toFixed(1) : 0,
    }));
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lead Trends */}
      <Card className="border-[#E8E3DC]">
        <CardHeader>
          <CardTitle className="text-[#2D0A0A]">Lead Trends</CardTitle>
          <CardDescription>Lead volume and conversion over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="leads" stackId="1" stroke="#4A1515" fill="#4A1515" fillOpacity={0.6} name="Total Leads" />
                <Area type="monotone" dataKey="qualified" stackId="2" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} name="Qualified" />
                <Area type="monotone" dataKey="booked" stackId="3" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Booked" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Procedure Popularity */}
        <Card className="border-[#E8E3DC]">
          <CardHeader>
            <CardTitle className="text-[#2D0A0A]">Procedure Interest</CardTitle>
            <CardDescription>Most requested procedures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={procedureData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={10} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4A1515" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion by Source */}
        <Card className="border-[#E8E3DC]">
          <CardHeader>
            <CardTitle className="text-[#2D0A0A]">Conversion by Source</CardTitle>
            <CardDescription>Performance of each lead source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionBySource.map((source) => (
                <div key={source.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-[#2D0A0A]">{source.name}</span>
                    <span className="text-[#6B5C4C]">
                      {source.converted}/{source.total} ({source.rate}%)
                    </span>
                  </div>
                  <Progress value={parseFloat(source.rate)} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reports Builder Tab Component
function ReportsTab({ leads, appointments }) {
  const [reportType, setReportType] = useState('');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [exporting, setExporting] = useState(false);

  const reportTypes = [
    { value: 'leads-summary', label: 'Leads Summary Report', description: 'Overview of all leads with status and sources' },
    { value: 'leads-detailed', label: 'Leads Detailed Report', description: 'Full lead information with contact details' },
    { value: 'procedures', label: 'Procedures Report', description: 'Breakdown of interest by procedure type' },
    { value: 'conversion', label: 'Conversion Report', description: 'Lead conversion rates by source and time' },
    { value: 'appointments', label: 'Appointments Report', description: 'All scheduled consultations' },
    { value: 'pipeline', label: 'Pipeline Report', description: 'Current pipeline status breakdown' },
    { value: 'response-times', label: 'Response Times Report', description: 'AI response time analytics' },
    { value: 'no-shows', label: 'No-Show Analysis', description: 'No-show patterns and insights' },
  ];

  const generateReport = useCallback(() => {
    if (!reportType) return;

    let data = [];
    let columns = [];

    switch (reportType) {
      case 'leads-summary':
        columns = ['Name', 'Email', 'Status', 'Source', 'Score', 'Created'];
        data = leads.map(l => ({
          Name: l.full_name,
          Email: l.email,
          Status: statusLabels[l.status] || l.status,
          Source: l.source,
          Score: l.lead_score || 0,
          Created: format(new Date(l.created_at), 'yyyy-MM-dd'),
        }));
        break;

      case 'leads-detailed':
        columns = ['Name', 'Email', 'Phone', 'Status', 'Source', 'Procedure', 'Score', 'AI Qualified', 'Notes', 'Created'];
        data = leads.map(l => ({
          Name: l.full_name,
          Email: l.email,
          Phone: l.phone,
          Status: statusLabels[l.status] || l.status,
          Source: l.source,
          Procedure: l.clinical_interests?.[0]?.specific_procedure || 'General',
          Score: l.lead_score || 0,
          'AI Qualified': l.ai_qualified ? 'Yes' : 'No',
          Notes: l.notes || '',
          Created: format(new Date(l.created_at), 'yyyy-MM-dd HH:mm'),
        }));
        break;

      case 'procedures':
        const procedureCounts = {};
        leads.forEach(l => {
          const proc = l.clinical_interests?.[0]?.specific_procedure || 'General Inquiry';
          if (!procedureCounts[proc]) {
            procedureCounts[proc] = { count: 0, qualified: 0, booked: 0 };
          }
          procedureCounts[proc].count++;
          if (l.status === 'qualified' || l.status === 'booked') procedureCounts[proc].qualified++;
          if (l.status === 'booked' || l.status === 'completed') procedureCounts[proc].booked++;
        });
        columns = ['Procedure', 'Total Leads', 'Qualified', 'Booked', 'Conversion Rate'];
        data = Object.entries(procedureCounts).map(([proc, counts]) => ({
          Procedure: proc,
          'Total Leads': counts.count,
          Qualified: counts.qualified,
          Booked: counts.booked,
          'Conversion Rate': `${((counts.booked / counts.count) * 100).toFixed(1)}%`,
        }));
        break;

      case 'conversion':
        const sourceCounts = {};
        leads.forEach(l => {
          const src = l.source || 'unknown';
          if (!sourceCounts[src]) {
            sourceCounts[src] = { total: 0, contacted: 0, qualified: 0, booked: 0 };
          }
          sourceCounts[src].total++;
          if (['contacted', 'qualified', 'booked', 'completed'].includes(l.status)) sourceCounts[src].contacted++;
          if (['qualified', 'booked', 'completed'].includes(l.status)) sourceCounts[src].qualified++;
          if (['booked', 'completed'].includes(l.status)) sourceCounts[src].booked++;
        });
        columns = ['Source', 'Total', 'Contacted', 'Qualified', 'Booked', 'Conversion Rate'];
        data = Object.entries(sourceCounts).map(([src, counts]) => ({
          Source: src,
          Total: counts.total,
          Contacted: counts.contacted,
          Qualified: counts.qualified,
          Booked: counts.booked,
          'Conversion Rate': `${((counts.booked / counts.total) * 100).toFixed(1)}%`,
        }));
        break;

      case 'appointments':
        columns = ['Patient', 'Type', 'Procedure', 'Date', 'Status'];
        data = appointments.map(a => ({
          Patient: a.patientName,
          Type: a.type,
          Procedure: a.procedure,
          Date: format(new Date(a.start), 'yyyy-MM-dd HH:mm'),
          Status: a.status,
        }));
        break;

      case 'pipeline':
        const statusCounts = {};
        Object.keys(statusLabels).forEach(s => statusCounts[s] = 0);
        leads.forEach(l => {
          const status = l.status || 'new';
          if (statusCounts[status] !== undefined) statusCounts[status]++;
        });
        columns = ['Status', 'Count', 'Percentage'];
        data = Object.entries(statusCounts).map(([status, count]) => ({
          Status: statusLabels[status] || status,
          Count: count,
          Percentage: `${((count / leads.length) * 100).toFixed(1)}%`,
        }));
        break;

      case 'response-times':
        const timeRanges = { '0-30s': 0, '30-60s': 0, '1-2min': 0, '2-5min': 0, '5min+': 0 };
        leads.forEach(l => {
          const time = l.response_time_seconds || 60;
          if (time <= 30) timeRanges['0-30s']++;
          else if (time <= 60) timeRanges['30-60s']++;
          else if (time <= 120) timeRanges['1-2min']++;
          else if (time <= 300) timeRanges['2-5min']++;
          else timeRanges['5min+']++;
        });
        columns = ['Response Time', 'Count', 'Percentage'];
        data = Object.entries(timeRanges).map(([range, count]) => ({
          'Response Time': range,
          Count: count,
          Percentage: `${((count / leads.length) * 100).toFixed(1)}%`,
        }));
        break;

      case 'no-shows':
        const noShowLeads = leads.filter(l => l.status === 'no-show');
        columns = ['Name', 'Email', 'Phone', 'Source', 'Procedure', 'Created'];
        data = noShowLeads.map(l => ({
          Name: l.full_name,
          Email: l.email,
          Phone: l.phone,
          Source: l.source,
          Procedure: l.clinical_interests?.[0]?.specific_procedure || 'General',
          Created: format(new Date(l.created_at), 'yyyy-MM-dd'),
        }));
        break;
    }

    setGeneratedReport({ columns, data, type: reportType });
  }, [reportType, leads, appointments]);

  const exportToCSV = useCallback(async () => {
    if (!generatedReport) return;

    // SECURITY: Verify admin authentication before exporting PHI
    const isAuthorized = await checkAdminAuth();
    if (!isAuthorized) {
      alert('Session expired. Please log in again to export data.');
      window.location.href = '/admin';
      return;
    }

    // AUDIT: Log the export action for HIPAA compliance
    await auditExport('report', {
      reportType: generatedReport.type,
      rowCount: generatedReport.data.length,
      columns: generatedReport.columns,
      exportFormat: 'csv',
    });

    const headers = generatedReport.columns.join(',');
    const rows = generatedReport.data.map(row =>
      generatedReport.columns.map(col => `"${String(row[col] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `miko-${generatedReport.type}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  }, [generatedReport]);

  const exportToGoogleSheets = useCallback(async () => {
    if (!generatedReport) return;

    // SECURITY: Verify admin authentication before exporting PHI
    const isAuthorized = await checkAdminAuth();
    if (!isAuthorized) {
      alert('Session expired. Please log in again to export data.');
      window.location.href = '/admin';
      return;
    }

    setExporting(true);
    try {
      // AUDIT: Log the export action for HIPAA compliance
      await auditExport('report', {
        reportType: generatedReport.type,
        rowCount: generatedReport.data.length,
        columns: generatedReport.columns,
        exportFormat: 'google_sheets',
      });

      // Prepare the CSV data for Google Sheets
      const headers = generatedReport.columns;
      const rows = generatedReport.data.map(row =>
        generatedReport.columns.map(col => row[col] || '')
      );

      // Create a CSV blob
      const csvContent = [
        headers.join('\t'),
        ...rows.map(row => row.join('\t'))
      ].join('\n');

      // Copy to clipboard for easy paste into Google Sheets
      await navigator.clipboard.writeText(csvContent);

      // Open Google Sheets in new tab
      window.open('https://sheets.google.com/create', '_blank');

      alert('Data copied to clipboard! Paste it into the new Google Sheet (Ctrl+V or Cmd+V)');
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export. Please try downloading as CSV instead.');
    } finally {
      setExporting(false);
    }
  }, [generatedReport]);

  return (
    <div className="space-y-6">
      {/* Report Selector */}
      <Card className="border-[#E8E3DC]">
        <CardHeader>
          <CardTitle className="text-[#2D0A0A]">Reports Builder</CardTitle>
          <CardDescription>Select a report type and generate custom reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-[#2D0A0A] mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a report type..." />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-gray-500">{type.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={!reportType}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Report */}
      {generatedReport && (
        <Card className="border-[#E8E3DC]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#2D0A0A]">
                  {reportTypes.find(t => t.value === generatedReport.type)?.label}
                </CardTitle>
                <CardDescription>
                  {generatedReport.data.length} records | Generated {format(new Date(), 'MMM d, yyyy h:mm a')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <Download className="w-4 h-4 mr-1" />
                  Download CSV
                </Button>
                <Button size="sm" onClick={exportToGoogleSheets} disabled={exporting}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  {exporting ? 'Exporting...' : 'Export to Google Sheets'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E3DC]">
                    {generatedReport.columns.map((col) => (
                      <th key={col} className="text-left py-3 px-4 font-medium text-[#2D0A0A] bg-[#F8F5F2]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {generatedReport.data.slice(0, 20).map((row, index) => (
                    <tr key={index} className="border-b border-[#F0EBE5] hover:bg-[#FDFCFB]">
                      {generatedReport.columns.map((col) => (
                        <td key={col} className="py-3 px-4 text-[#6B5C4C]">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {generatedReport.data.length > 20 && (
                <p className="text-sm text-[#8B7355] mt-4 text-center">
                  Showing 20 of {generatedReport.data.length} records. Export to see all data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Lead Pipeline Tab Component
function LeadPipelineTab({ leads, loading, searchQuery, setSearchQuery }) {
  const filteredLeads = leads.filter(lead => {
    const name = lead.full_name || '';
    const email = lead.email || '';
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <Card className="border-[#E8E3DC]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-[#2D0A0A]">Lead Pipeline</CardTitle>
            <CardDescription>Recent inquiries and their status</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B7355]" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48 h-9 border-[#E8E3DC]"
              />
            </div>
            <Button variant="outline" size="sm" className="border-[#E8E3DC]">
              <Filter className="w-4 h-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-[#8B7355]" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-4 rounded-xl border bg-[#FDFCFB] border-[#F0EBE5] hover:border-[#C4A484] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 bg-[#3D1010]">
                      <AvatarFallback className="text-white text-sm">
                        {(lead.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-[#2D0A0A]">{lead.full_name}</h4>
                      <p className="text-sm text-[#6B5C4C]">
                        {lead.clinical_interests?.[0]?.specific_procedure || 'General Inquiry'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-[#8B7355]">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </p>
                        {lead.lead_score && (
                          <span className="text-xs text-[#6B5C4C]">Score: {lead.lead_score}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.ai_qualified && (
                      <Badge className="bg-amber-100 text-amber-700 border-0">
                        <Brain className="w-3 h-3 mr-1" /> AI Qualified
                      </Badge>
                    )}
                    <Badge className={`${statusColors[lead.status] || statusColors['new']} border-0`}>
                      {statusLabels[lead.status] || 'New Lead'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardContent({ onLogout }) {
  const { leads, loading: leadsLoading, error: leadsError } = useSafeLeads();
  const { appointments, loading: appointmentsLoading } = useSafeAppointments();
  const [searchQuery, setSearchQuery] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [demoModeActive, setDemoModeActive] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check demo mode first
        if (isDemoMode()) {
          setDemoModeActive(true);
          setSupabaseConnected(false);
          return;
        }

        const { isSupabaseConfigured } = await import('@/lib/supabase');
        setSupabaseConnected(isSupabaseConfigured());
      } catch {
        setSupabaseConnected(false);
      }
    };
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F5F2]">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E3DC] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_69487d2cd5b55089ee0d9113/ede5f8e54_image.png"
                alt="MiKO"
                className="h-10 object-contain"
              />
              <div>
                <h1 className="text-lg font-semibold text-[#2D0A0A]">Admin Dashboard</h1>
                <p className="text-xs text-[#8B7355]">MiKO Plastic Surgery</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${supabaseConnected ? 'bg-green-100 text-green-700' : demoModeActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'} border-0`}>
                {supabaseConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                {supabaseConnected ? 'Connected' : demoModeActive ? 'Demo Mode' : 'Offline'}
              </Badge>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-[#6B5C4C]" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5 text-[#6B5C4C]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="hover:bg-red-50"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-red-500" />
              </Button>
              <Avatar className="h-9 w-9 bg-[#3D1010]">
                <AvatarFallback className="text-white text-sm">MK</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-[#E8E3DC] p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#4A1515] data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="leads" className="data-[state=active]:bg-[#4A1515] data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-[#4A1515] data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#4A1515] data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-[#4A1515] data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab leads={leads} appointments={appointments} supabaseConnected={supabaseConnected} />
          </TabsContent>

          <TabsContent value="leads">
            <LeadPipelineTab
              leads={leads}
              loading={leadsLoading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarTab appointments={appointments} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab leads={leads} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab leads={leads} appointments={appointments} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const { checkAdminAuth, checkAdminAuthSync } = await import('./AdminLogin');

        // First do a fast sync check for cached auth
        if (checkAdminAuthSync()) {
          setIsAuthenticated(true);
          setAuthChecked(true);

          // Then verify async in background
          const isValid = await checkAdminAuth();
          if (!isValid) {
            setIsAuthenticated(false);
          }
        } else {
          // No cached auth, do full async check
          const isValid = await checkAdminAuth();
          setIsAuthenticated(isValid);
          setAuthChecked(true);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    const { adminLogout } = await import('./AdminLogin');
    await adminLogout();
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#4A1515] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    const AdminLogin = React.lazy(() => import('./AdminLogin'));
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-[#2D0A0A] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      </React.Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardContent onLogout={handleLogout} />
    </ErrorBoundary>
  );
}

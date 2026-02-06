import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import IncidentCard from "@/components/incident/IncidentCard";
import IncidentTimeline from "@/components/incident/IncidentTimeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  AlertTriangle,
  Shield,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";

export default function IncidentResponse() {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.IncidentResponse.list('-detection_time', 50),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.IncidentResponse.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['incidents']);
      setShowDetails(false);
    },
  });

  const activeIncidents = incidents.filter(i => 
    i.status === 'detected' || i.status === 'containing' || i.status === 'investigating'
  );
  const resolvedIncidents = incidents.filter(i => 
    i.status === 'resolved' || i.status === 'closed'
  );

  const statusConfig = {
    detected: { color: 'text-red-400', bg: 'bg-red-950/30', icon: AlertTriangle },
    containing: { color: 'text-orange-400', bg: 'bg-orange-950/30', icon: Shield },
    contained: { color: 'text-amber-400', bg: 'bg-amber-950/30', icon: Shield },
    investigating: { color: 'text-blue-400', bg: 'bg-blue-950/30', icon: Clock },
    resolved: { color: 'text-emerald-400', bg: 'bg-emerald-950/30', icon: CheckCircle2 },
    closed: { color: 'text-slate-400', bg: 'bg-slate-900/30', icon: CheckCircle2 }
  };

  const handleIncidentClick = (incident) => {
    setSelectedIncident(incident);
    setShowDetails(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">VIOE</h1>
                <p className="text-xs text-slate-500">Incident Response</p>
              </div>
            </Link>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Dashboard</Button>
              </Link>
              <Link to={createPageUrl("Vulnerabilities")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Vulnerabilities</Button>
              </Link>
              <Link to={createPageUrl("IncidentResponse")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Incidents</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Security Incidents</h2>
            <p className="text-slate-400 mt-1">
              {activeIncidents.length} active • {resolvedIncidents.length} resolved
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2">
              {activeIncidents.filter(i => i.severity === 'critical').length} Critical
            </Badge>
            <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-4 py-2">
              {activeIncidents.filter(i => i.severity === 'high').length} High
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
            <Shield className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-lg font-medium text-slate-400">No incidents recorded</h3>
            <p className="text-slate-500 mt-1">Incidents will appear here when critical vulnerabilities are detected</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Incidents */}
            {activeIncidents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Active Incidents
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {activeIncidents.map(incident => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                      onClick={() => handleIncidentClick(incident)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Resolved Incidents */}
            {resolvedIncidents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Resolved Incidents
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {resolvedIncidents.slice(0, 10).map(incident => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                      compact
                      onClick={() => handleIncidentClick(incident)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Incident Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Badge className={`${statusConfig[selectedIncident.status]?.bg} ${statusConfig[selectedIncident.status]?.color}`}>
                    {selectedIncident.incident_id}
                  </Badge>
                  <span className="text-lg">{selectedIncident.severity} Severity</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* AI Assessment */}
                {selectedIncident.ai_assessment && (
                  <div className="bg-purple-950/20 border border-purple-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-400 mb-3">AI Assessment</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">Threat Level:</span>
                        <span className="text-white ml-2">{selectedIncident.ai_assessment.threat_level}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Priority:</span>
                        <span className="text-white ml-2">{selectedIncident.ai_assessment.containment_priority}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Blast Radius:</span>
                        <p className="text-white mt-1">{selectedIncident.ai_assessment.blast_radius}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Potential Impact:</span>
                        <p className="text-white mt-1">{selectedIncident.ai_assessment.potential_impact}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Affected Assets */}
                {selectedIncident.affected_assets?.length > 0 && (
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-400 mb-3">Affected Assets</h4>
                    <div className="space-y-2">
                      {selectedIncident.affected_assets.map((asset, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                          <div>
                            <p className="text-sm text-white">{asset.asset_name}</p>
                            <p className="text-xs text-slate-500">{asset.asset_type}</p>
                          </div>
                          <Badge className={
                            asset.isolation_status === 'isolated' ? 'bg-red-500/10 text-red-400' :
                            asset.isolation_status === 'not_required' ? 'bg-slate-500/10 text-slate-400' :
                            'bg-amber-500/10 text-amber-400'
                          }>
                            {asset.isolation_status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Containment Actions */}
                {selectedIncident.containment_actions?.length > 0 && (
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-400 mb-3">Containment Actions</h4>
                    <div className="space-y-2">
                      {selectedIncident.containment_actions.map((action, idx) => (
                        <div key={idx} className="p-2 bg-slate-900/50 rounded">
                          <div className="flex items-start justify-between">
                            <p className="text-sm text-white flex-1">{action.action}</p>
                            <Badge className={
                              action.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                              action.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                              action.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                              'bg-slate-500/10 text-slate-400'
                            }>
                              {action.status}
                            </Badge>
                          </div>
                          {action.result && (
                            <p className="text-xs text-slate-500 mt-1">{action.result}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <IncidentTimeline timeline={selectedIncident.timeline} />

                {/* Incident Report */}
                {selectedIncident.incident_report && (
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-400 mb-3">Full Incident Report</h4>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                      {selectedIncident.incident_report}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  {selectedIncident.status !== 'resolved' && selectedIncident.status !== 'closed' && (
                    <>
                      {selectedIncident.status === 'detected' && (
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: selectedIncident.id, status: 'investigating' })}
                          className="bg-blue-600 hover:bg-blue-500"
                        >
                          Start Investigation
                        </Button>
                      )}
                      {(selectedIncident.status === 'containing' || selectedIncident.status === 'investigating') && (
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: selectedIncident.id, status: 'resolved' })}
                          className="bg-emerald-600 hover:bg-emerald-500"
                        >
                          Mark as Resolved
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="outline" onClick={() => setShowDetails(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
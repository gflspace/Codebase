import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ComplianceFindingCard from "@/components/compliance/ComplianceFindingCard";
import ComplianceScoreCard from "@/components/compliance/ComplianceScoreCard";
import PolicyUpdateCard from "@/components/compliance/PolicyUpdateCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  FileText,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ClipboardCheck
} from "lucide-react";

export default function ComplianceReports() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [evidenceData, setEvidenceData] = useState(null);
  const [policyData, setPolicyData] = useState(null);
  const [selectedFrameworks, setSelectedFrameworks] = useState(['soc2', 'iso27001', 'gdpr']);
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['complianceReports'],
    queryFn: () => base44.entities.ComplianceReport.list('-report_date', 10),
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ['complianceEvidence'],
    queryFn: () => base44.entities.ComplianceEvidence.list(),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('generateComplianceReport', {
        frameworks: selectedFrameworks
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['complianceReports']);
      setIsGenerating(false);
      setShowDialog(false);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const generateEvidenceMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('generateComplianceEvidence', {
        frameworks: selectedFrameworks
      });
      return result.data;
    },
    onSuccess: (data) => {
      setEvidenceData(data);
      setShowEvidence(true);
      queryClient.invalidateQueries(['complianceEvidence']);
    },
  });

  const policyMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('suggestPolicyUpdates', {});
      return result.data;
    },
    onSuccess: (data) => {
      setPolicyData(data);
      setShowPolicies(true);
    },
  });

  const latestReport = reports[0];

  const frameworks = [
    { id: 'soc2', label: 'SOC 2', description: 'Service Organization Control 2' },
    { id: 'iso27001', label: 'ISO 27001', description: 'Information Security Management' },
    { id: 'gdpr', label: 'GDPR', description: 'General Data Protection Regulation' },
    { id: 'pci_dss', label: 'PCI DSS', description: 'Payment Card Industry Data Security' }
  ];

  const toggleFramework = (id) => {
    setSelectedFrameworks(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
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
                <p className="text-xs text-slate-500">Compliance Reporting</p>
              </div>
            </Link>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Dashboard</Button>
              </Link>
              <Link to={createPageUrl("ComplianceReports")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Compliance</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-7 h-7 text-cyan-400" />
              Compliance Reports
            </h2>
            <p className="text-slate-400 mt-1">Automated compliance assessment and gap analysis</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => generateEvidenceMutation.mutate()}
              disabled={generateEvidenceMutation.isPending}
              variant="outline"
              className="border-slate-700 text-slate-300"
            >
              {generateEvidenceMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ClipboardCheck className="w-4 h-4 mr-2" />
              )}
              Generate Evidence
            </Button>
            <Button
              onClick={() => policyMutation.mutate()}
              disabled={policyMutation.isPending}
              variant="outline"
              className="border-slate-700 text-slate-300"
            >
              {policyMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Policy Updates
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500">
                  <Play className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Generate Compliance Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-slate-400">Select compliance frameworks to include:</p>
                {frameworks.map(fw => (
                  <div key={fw.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <Checkbox
                      checked={selectedFrameworks.includes(fw.id)}
                      onCheckedChange={() => toggleFramework(fw.id)}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{fw.label}</p>
                      <p className="text-xs text-slate-500">{fw.description}</p>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    setIsGenerating(true);
                    generateMutation.mutate();
                  }}
                  disabled={isGenerating || selectedFrameworks.length === 0}
                  className="w-full bg-cyan-600 hover:bg-cyan-500"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Report'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Evidence Summary */}
        {evidence.length > 0 && (
          <div className="mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-400" />
              Compliance Evidence ({evidence.length})
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/50">
                <p className="text-sm text-emerald-400 mb-1">Compliant</p>
                <p className="text-2xl font-bold text-white">
                  {evidence.filter(e => e.compliance_status === 'compliant').length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/50">
                <p className="text-sm text-amber-400 mb-1">Partial</p>
                <p className="text-2xl font-bold text-white">
                  {evidence.filter(e => e.compliance_status === 'partial').length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50">
                <p className="text-sm text-red-400 mb-1">Non-Compliant</p>
                <p className="text-2xl font-bold text-white">
                  {evidence.filter(e => e.compliance_status === 'non_compliant').length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1">Frameworks</p>
                <p className="text-2xl font-bold text-white">
                  {[...new Set(evidence.map(e => e.framework))].length}
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : !latestReport ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-lg font-medium text-slate-400">No compliance reports yet</h3>
            <p className="text-slate-500 mt-1 mb-4">Generate your first compliance assessment</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Executive Summary */}
            {latestReport.executive_summary && (
              <div className="bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-900/50 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-2">Executive Summary</h3>
                    <p className="text-slate-300 leading-relaxed">{latestReport.executive_summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Compliance Scores */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ComplianceScoreCard
                title="Overall Score"
                score={latestReport.overall_compliance_score}
                icon={CheckCircle2}
                highlight
              />
              {Object.entries(latestReport.framework_scores || {}).map(([fw, score]) => (
                <ComplianceScoreCard
                  key={fw}
                  title={fw.toUpperCase()}
                  score={score}
                />
              ))}
            </div>

            {/* Gap Summary */}
            {latestReport.non_compliance_summary && (
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-red-400">Critical Gaps</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{latestReport.non_compliance_summary.critical_gaps}</p>
                </div>
                <div className="bg-orange-950/30 border border-orange-900/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    <span className="text-sm text-orange-400">High Priority</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{latestReport.non_compliance_summary.high_gaps}</p>
                </div>
                <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-sm text-amber-400">Medium Priority</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{latestReport.non_compliance_summary.medium_gaps}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-400">Total Gaps</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{latestReport.non_compliance_summary.total_gaps}</p>
                </div>
              </div>
            )}

            {/* Compliance Findings */}
            {latestReport.compliance_findings?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                  Compliance Findings ({latestReport.compliance_findings.length})
                </h3>
                <div className="space-y-3">
                  {latestReport.compliance_findings.map((finding, idx) => (
                    <ComplianceFindingCard key={idx} finding={finding} />
                  ))}
                </div>
              </div>
            )}

            {/* Remediation Roadmap */}
            {latestReport.remediation_roadmap?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Remediation Roadmap
                </h3>
                <div className="space-y-3">
                  {latestReport.remediation_roadmap.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white">{item.action}</h4>
                        <Badge className={
                          item.priority === 'immediate' ? 'bg-red-500/10 text-red-400' :
                          item.priority === 'short_term' ? 'bg-orange-500/10 text-orange-400' :
                          item.priority === 'medium_term' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-blue-500/10 text-blue-400'
                        }>
                          {item.priority.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">Framework:</span>
                          <span className="text-white ml-2">{item.framework}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Effort:</span>
                          <span className="text-white ml-2">{item.estimated_effort}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{item.expected_impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Evidence Dialog */}
      <Dialog open={showEvidence} onOpenChange={setShowEvidence}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compliance Evidence Package</DialogTitle>
          </DialogHeader>
          {evidenceData && (
            <div className="space-y-6 pt-4">
              {evidenceData.audit_summary && (
                <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-900/50">
                  <h3 className="text-sm font-semibold text-indigo-400 mb-3">Audit Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Controls Evidenced:</span>
                      <span className="text-white ml-2">{evidenceData.audit_summary.total_controls_evidenced}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Strong Evidence:</span>
                      <span className="text-emerald-400 ml-2">{evidenceData.audit_summary.strong_evidence}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Weak Evidence:</span>
                      <span className="text-amber-400 ml-2">{evidenceData.audit_summary.weak_evidence}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Missing Evidence:</span>
                      <span className="text-red-400 ml-2">{evidenceData.audit_summary.missing_evidence}</span>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Evidence by Control</h3>
                <div className="space-y-3">
                  {evidenceData.evidence_packages?.slice(0, 10).map((pkg, i) => (
                    <div key={i} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-semibold text-white">{pkg.control_name}</h4>
                          <p className="text-xs text-slate-500">{pkg.framework} - {pkg.control_id}</p>
                        </div>
                        <Badge className="text-xs">{pkg.evidence_items?.length || 0} items</Badge>
                      </div>
                      {pkg.evidence_items?.slice(0, 2).map((item, j) => (
                        <div key={j} className="text-xs text-slate-400 mt-2">• {item.description}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Policy Updates Dialog */}
      <Dialog open={showPolicies} onOpenChange={setShowPolicies}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Policy Update Recommendations</DialogTitle>
          </DialogHeader>
          {policyData && (
            <div className="space-y-6 pt-4">
              {policyData.executive_summary && (
                <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-900/50">
                  <h3 className="text-sm font-semibold text-indigo-400 mb-2">Executive Summary</h3>
                  <p className="text-sm text-slate-300">{policyData.executive_summary}</p>
                </div>
              )}
              {policyData.implementation_roadmap && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/50">
                    <h4 className="text-sm font-semibold text-red-400 mb-2">Immediate</h4>
                    <div className="space-y-1">
                      {policyData.implementation_roadmap.phase_1_immediate?.map((item, i) => (
                        <p key={i} className="text-xs text-slate-400">• {item}</p>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/50">
                    <h4 className="text-sm font-semibold text-amber-400 mb-2">Short-term</h4>
                    <div className="space-y-1">
                      {policyData.implementation_roadmap.phase_2_short_term?.map((item, i) => (
                        <p key={i} className="text-xs text-slate-400">• {item}</p>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-900/50">
                    <h4 className="text-sm font-semibold text-blue-400 mb-2">Long-term</h4>
                    <div className="space-y-1">
                      {policyData.implementation_roadmap.phase_3_long_term?.map((item, i) => (
                        <p key={i} className="text-xs text-slate-400">• {item}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Policy Recommendations</h3>
                <div className="grid grid-cols-1 gap-4">
                  {policyData.policy_updates?.map((update, i) => (
                    <PolicyUpdateCard key={i} update={update} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
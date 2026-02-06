import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ShieldAlert, 
  Settings as SettingsIcon,
  Filter,
  Sparkles,
  Bell,
  GitBranch,
  Database,
  Plus,
  Trash2,
  CheckCircle2
} from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("suppression");

  const { data: suppressionRules = [], isLoading } = useQuery({
    queryKey: ['suppressionRules'],
    queryFn: () => base44.entities.SuppressionRule.list(),
  });

  const [newRule, setNewRule] = useState({
    name: "",
    rule_type: "environment",
    is_active: true,
    conditions: {}
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.SuppressionRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['suppressionRules']);
      setNewRule({ name: "", rule_type: "environment", is_active: true, conditions: {} });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.SuppressionRule.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['suppressionRules']),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.SuppressionRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['suppressionRules']),
  });

  const ruleTypeDescriptions = {
    environment: "Suppress non-production environment findings",
    asset_pattern: "Suppress based on asset name patterns",
    severity_environment: "Suppress low severity in non-prod",
    duplicate: "Suppress duplicate findings across environments",
    age_based: "Suppress old findings that haven't been exploited"
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">VIOE</h1>
                  <p className="text-xs text-slate-500">Vulnerability Intelligence</p>
                </div>
              </Link>
            </div>
            
            <nav className="flex items-center gap-1">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Dashboard</Button>
              </Link>
              <Link to={createPageUrl("Vulnerabilities")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Vulnerabilities</Button>
              </Link>
              <Link to={createPageUrl("Teams")}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">Teams</Button>
              </Link>
              <Link to={createPageUrl("Settings")}>
                <Button variant="ghost" className="text-cyan-400 bg-cyan-500/10">Settings</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <p className="text-slate-400 mt-1">Configure AI automation and noise filtering rules</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
            <TabsTrigger value="suppression" className="data-[state=active]:bg-slate-800">
              <Filter className="w-4 h-4 mr-2" />
              Noise Suppression
            </TabsTrigger>
            <TabsTrigger value="ownership" className="data-[state=active]:bg-slate-800">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Ownership
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-slate-800">
              <Database className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-800">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppression" className="mt-6">
            <div className="space-y-6">
              {/* Create New Rule */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Create Suppression Rule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Rule Name</Label>
                    <Input
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="e.g., Suppress Dev Environment"
                      className="mt-1 bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400">Rule Type</Label>
                    <Select 
                      value={newRule.rule_type} 
                      onValueChange={(v) => setNewRule({ ...newRule, rule_type: v })}
                    >
                      <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="environment">Environment-based</SelectItem>
                        <SelectItem value="asset_pattern">Asset Pattern</SelectItem>
                        <SelectItem value="severity_environment">Severity + Environment</SelectItem>
                        <SelectItem value="duplicate">Duplicate Detection</SelectItem>
                        <SelectItem value="age_based">Age-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mt-3">
                  {ruleTypeDescriptions[newRule.rule_type]}
                </p>
                <Button 
                  onClick={() => createRuleMutation.mutate(newRule)}
                  className="mt-4 bg-cyan-600 hover:bg-cyan-500"
                  disabled={!newRule.name}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
              </div>

              {/* Existing Rules */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Active Rules</h3>
                {suppressionRules.length > 0 ? (
                  <div className="space-y-3">
                    {suppressionRules.map((rule) => (
                      <div 
                        key={rule.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
                      >
                        <div className="flex items-center gap-4">
                          <Switch 
                            checked={rule.is_active}
                            onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, is_active: checked })}
                          />
                          <div>
                            <p className="font-medium text-white">{rule.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                                {rule.rule_type}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {rule.suppressed_count || 0} suppressed
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No suppression rules configured</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ownership" className="mt-6">
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">AI Ownership Resolution</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium text-white">Git Commit Analysis</p>
                        <p className="text-sm text-slate-500">Analyze commit patterns to determine ownership</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-indigo-400" />
                      <div>
                        <p className="font-medium text-white">CODEOWNERS Parsing</p>
                        <p className="text-sm text-slate-500">Use GitHub/GitLab CODEOWNERS files</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="font-medium text-white">Directory Integration</p>
                        <p className="text-sm text-slate-500">Connect to Okta/Active Directory for org mapping</p>
                      </div>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-800">
                  <Label className="text-slate-400">Minimum Confidence Threshold</Label>
                  <Select defaultValue="70">
                    <SelectTrigger className="mt-2 w-48 bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="50">50% - Accept more assignments</SelectItem>
                      <SelectItem value="70">70% - Balanced (Recommended)</SelectItem>
                      <SelectItem value="90">90% - High confidence only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-2">
                    Assignments below this threshold will be flagged for manual review
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="mt-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Scanner Integrations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["Snyk", "SonarQube", "Checkmarx", "Qualys", "Tenable", "Rapid7"].map((scanner) => (
                  <div 
                    key={scanner}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold">
                        {scanner.charAt(0)}
                      </div>
                      <span className="font-medium text-white">{scanner}</span>
                    </div>
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-400">
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                  <div>
                    <p className="font-medium text-white">New Critical Vulnerability</p>
                    <p className="text-sm text-slate-500">Immediate alert for critical findings</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                  <div>
                    <p className="font-medium text-white">SLA Approaching</p>
                    <p className="text-sm text-slate-500">Notify 48 hours before SLA deadline</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                  <div>
                    <p className="font-medium text-white">Low Confidence Assignment</p>
                    <p className="text-sm text-slate-500">Alert when AI confidence is below threshold</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                  <div>
                    <p className="font-medium text-white">Daily Summary</p>
                    <p className="text-sm text-slate-500">Daily digest of vulnerability status</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
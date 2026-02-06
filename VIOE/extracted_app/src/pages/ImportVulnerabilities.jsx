import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ShieldAlert, 
  Upload,
  FileUp,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Loader2
} from "lucide-react";

export default function ImportVulnerabilities() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const processImport = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProgress(30);
      setUploading(false);
      setProcessing(true);

      // Extract data from file
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              cve_id: { type: "string" },
              severity: { type: "string" },
              description: { type: "string" },
              asset: { type: "string" },
              environment: { type: "string" },
              source: { type: "string" },
              file_path: { type: "string" },
              cvss_score: { type: "number" }
            }
          }
        }
      });

      setProgress(60);

      if (extractResult.status === "error") {
        throw new Error(extractResult.details);
      }

      const vulnerabilities = Array.isArray(extractResult.output) 
        ? extractResult.output 
        : [extractResult.output];

      // Process with AI for ownership
      const processedVulns = [];
      for (let i = 0; i < vulnerabilities.length; i++) {
        const vuln = vulnerabilities[i];
        
        // Simulate AI ownership resolution
        const ownershipResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this vulnerability and suggest ownership:
          Title: ${vuln.title}
          Asset: ${vuln.asset}
          File Path: ${vuln.file_path || 'N/A'}
          
          Based on common team structures, suggest:
          1. Which team should own this (e.g., Platform, Backend, Frontend, Security, DevOps)
          2. Confidence score 0-100
          3. Brief reasoning`,
          response_json_schema: {
            type: "object",
            properties: {
              assigned_team: { type: "string" },
              ownership_confidence: { type: "number" },
              ownership_reasoning: { type: "string" }
            }
          }
        });

        processedVulns.push({
          ...vuln,
          status: "open",
          severity: vuln.severity?.toLowerCase() || "medium",
          environment: vuln.environment?.toLowerCase() || "production",
          first_seen: new Date().toISOString(),
          ...ownershipResult
        });

        setProgress(60 + Math.round((i / vulnerabilities.length) * 30));
      }

      // Bulk create vulnerabilities
      await base44.entities.Vulnerability.bulkCreate(processedVulns);
      
      setProgress(100);
      setResults({
        success: true,
        count: processedVulns.length,
        assigned: processedVulns.filter(v => v.assigned_team).length
      });

      queryClient.invalidateQueries(['vulnerabilities']);

    } catch (error) {
      setResults({
        success: false,
        error: error.message
      });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
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
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Import Vulnerabilities</h2>
          <p className="text-slate-400 mt-2">
            Upload scan results and let AI automatically assign ownership
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          {!results ? (
            <>
              {/* Upload Area */}
              <div 
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  file ? "border-cyan-500/50 bg-cyan-500/5" : "border-slate-700 hover:border-slate-600"
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.json,.xlsx,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading || processing}
                />
                
                {file ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <FileUp className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-white">{file.name}</p>
                      <p className="text-sm text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-xl bg-slate-800 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-300">
                        Drop your scan results here
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Supports CSV, JSON, Excel, and PDF formats
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress */}
              {(uploading || processing) && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      {uploading ? "Uploading file..." : "Processing with AI..."}
                    </span>
                    <span className="text-cyan-400">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-slate-800" />
                  {processing && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>AI is analyzing ownership patterns...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <Button 
                onClick={processImport}
                disabled={!file || uploading || processing}
                className="w-full mt-6 bg-cyan-600 hover:bg-cyan-500 h-12"
              >
                {uploading || processing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Import & Auto-Assign Ownership
                  </>
                )}
              </Button>
            </>
          ) : (
            /* Results */
            <div className="text-center py-6">
              {results.success ? (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Import Successful!</h3>
                  <p className="text-slate-400 mb-6">
                    {results.count} vulnerabilities imported, {results.assigned} auto-assigned
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setResults(null);
                        setProgress(0);
                      }}
                      className="border-slate-700"
                    >
                      Import More
                    </Button>
                    <Link to={createPageUrl("Vulnerabilities")}>
                      <Button className="bg-cyan-600 hover:bg-cyan-500">
                        View Vulnerabilities
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                    <XCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Import Failed</h3>
                  <p className="text-slate-400 mb-6">{results.error}</p>
                  <Button
                    onClick={() => {
                      setFile(null);
                      setResults(null);
                      setProgress(0);
                    }}
                    className="bg-slate-800 hover:bg-slate-700"
                  >
                    Try Again
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="text-center p-4">
            <div className="w-10 h-10 mx-auto rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-sm font-medium text-white">AI Ownership</p>
            <p className="text-xs text-slate-500 mt-1">Auto-assign to teams</p>
          </div>
          <div className="text-center p-4">
            <div className="w-10 h-10 mx-auto rounded-lg bg-indigo-500/10 flex items-center justify-center mb-3">
              <Upload className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-white">Multi-Format</p>
            <p className="text-xs text-slate-500 mt-1">CSV, JSON, PDF, Excel</p>
          </div>
          <div className="text-center p-4">
            <div className="w-10 h-10 mx-auto rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-white">Deduplication</p>
            <p className="text-xs text-slate-500 mt-1">Smart noise filtering</p>
          </div>
        </div>
      </main>
    </div>
  );
}
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ComplianceScoreCard({ title, score, icon: Icon = CheckCircle2, highlight }) {
  const getScoreColor = (score) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 75) return "text-amber-400";
    if (score >= 60) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreBg = (score) => {
    if (score >= 90) return "from-emerald-950/30 to-emerald-900/30 border-emerald-900/50";
    if (score >= 75) return "from-amber-950/30 to-amber-900/30 border-amber-900/50";
    if (score >= 60) return "from-orange-950/30 to-orange-900/30 border-orange-900/50";
    return "from-red-950/30 to-red-900/30 border-red-900/50";
  };

  return (
    <div className={cn(
      "rounded-xl p-5 border",
      highlight ? `bg-gradient-to-br ${getScoreBg(score)}` : "bg-slate-900/50 border-slate-800"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-5 h-5", highlight ? getScoreColor(score) : "text-slate-400")} />
        <span className="text-sm text-slate-400">{title}</span>
      </div>
      <p className={cn("text-3xl font-bold", highlight ? getScoreColor(score) : "text-white")}>
        {score}%
      </p>
    </div>
  );
}
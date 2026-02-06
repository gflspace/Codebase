import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PolicyViolationBadge({ status, violations = [], compact = false }) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: "Policy Check Pending",
      color: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      iconColor: "text-slate-400"
    },
    passed: {
      icon: ShieldCheck,
      label: "Policy Compliant",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      iconColor: "text-emerald-400"
    },
    warning: {
      icon: AlertTriangle,
      label: `${violations.length} Warning${violations.length !== 1 ? 's' : ''}`,
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      iconColor: "text-amber-400"
    },
    failed: {
      icon: ShieldAlert,
      label: `${violations.length} Violation${violations.length !== 1 ? 's' : ''}`,
      color: "bg-red-500/10 text-red-400 border-red-500/20",
      iconColor: "text-red-400"
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-3.5 h-3.5", config.iconColor)} />
        <span className="text-xs text-slate-400">{config.label}</span>
      </div>
    );
  }

  return (
    <Badge className={cn("border", config.color)}>
      <Icon className="w-3 h-3 mr-1.5" />
      {config.label}
    </Badge>
  );
}
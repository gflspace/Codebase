import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  icon: Icon, 
  variant = "default",
  className 
}) {
  const variants = {
    default: "bg-slate-900/50 border-slate-800",
    success: "bg-emerald-950/30 border-emerald-900/50",
    warning: "bg-amber-950/30 border-amber-900/50",
    danger: "bg-red-950/30 border-red-900/50",
    info: "bg-indigo-950/30 border-indigo-900/50"
  };

  const iconVariants = {
    default: "bg-slate-800 text-slate-400",
    success: "bg-emerald-900/50 text-emerald-400",
    warning: "bg-amber-900/50 text-amber-400",
    danger: "bg-red-900/50 text-red-400",
    info: "bg-indigo-900/50 text-indigo-400"
  };

  const trendColors = {
    up: "text-emerald-400",
    down: "text-red-400",
    neutral: "text-slate-500"
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:border-slate-700",
      variants[variant],
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-bl-full" />
      
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-400 tracking-wide uppercase">
            {title}
          </p>
          <p className="text-3xl font-bold text-white tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        
        {Icon && (
          <div className={cn("p-3 rounded-xl", iconVariants[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {trendValue && (
        <div className={cn("flex items-center gap-1.5 mt-4 text-sm font-medium", trendColors[trend])}>
          <TrendIcon className="w-4 h-4" />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
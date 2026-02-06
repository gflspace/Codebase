import { Clock } from "lucide-react";

export default function IncidentTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Incident Timeline
      </h4>
      <div className="space-y-3">
        {timeline.map((event, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              {idx < timeline.length - 1 && (
                <div className="w-0.5 h-full bg-slate-700 mt-1" />
              )}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{event.event}</p>
                  <p className="text-xs text-slate-400 mt-1">{event.details}</p>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">by {event.actor}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
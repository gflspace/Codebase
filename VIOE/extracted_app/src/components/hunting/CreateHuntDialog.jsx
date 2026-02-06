import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export default function CreateHuntDialog({ open, onOpenChange }) {
  const [hypothesis, setHypothesis] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('createHuntingSession', { hypothesis });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['huntingSessions']);
      onOpenChange(false);
      setHypothesis('');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Create Hunting Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              Threat Hypothesis
            </label>
            <Textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="e.g., Suspicious lateral movement detected in production environment suggesting potential APT activity..."
              className="bg-slate-800 border-slate-700 text-white min-h-[120px]"
            />
            <p className="text-xs text-slate-500 mt-2">
              Describe what threat pattern or suspicious activity you want to investigate
            </p>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !hypothesis}
            className="w-full bg-cyan-600 hover:bg-cyan-500"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Start Hunt'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
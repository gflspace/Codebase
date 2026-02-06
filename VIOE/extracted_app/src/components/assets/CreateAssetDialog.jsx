import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function CreateAssetDialog({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    asset_name: '',
    asset_type: 'server',
    asset_id: '',
    description: '',
    criticality: 'medium',
    status: 'active',
    owner: '',
    owner_team: '',
    location: '',
    environment: 'production',
    hostname: '',
    ip_address: '',
    operating_system: '',
    cloud_provider: 'none'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Asset.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
      setIsSubmitting(false);
      onOpenChange(false);
      setFormData({
        asset_name: '',
        asset_type: 'server',
        asset_id: '',
        description: '',
        criticality: 'medium',
        status: 'active',
        owner: '',
        owner_team: '',
        location: '',
        environment: 'production',
        hostname: '',
        ip_address: '',
        operating_system: '',
        cloud_provider: 'none'
      });
    },
    onError: () => {
      setIsSubmitting(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Asset Name *</label>
              <Input
                value={formData.asset_name}
                onChange={(e) => setFormData({...formData, asset_name: e.target.value})}
                className="bg-slate-800 border-slate-700"
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Asset Type *</label>
              <Select value={formData.asset_type} onValueChange={(v) => setFormData({...formData, asset_type: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="workstation">Workstation</SelectItem>
                  <SelectItem value="mobile_device">Mobile Device</SelectItem>
                  <SelectItem value="network_device">Network Device</SelectItem>
                  <SelectItem value="software_license">Software License</SelectItem>
                  <SelectItem value="cloud_resource">Cloud Resource</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="application">Application</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="bg-slate-800 border-slate-700 min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Criticality *</label>
              <Select value={formData.criticality} onValueChange={(v) => setFormData({...formData, criticality: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Environment</label>
              <Select value={formData.environment} onValueChange={(v) => setFormData({...formData, environment: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="qa">QA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Asset ID</label>
              <Input
                value={formData.asset_id}
                onChange={(e) => setFormData({...formData, asset_id: e.target.value})}
                className="bg-slate-800 border-slate-700"
                placeholder="Serial number or ID"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Hostname</label>
              <Input
                value={formData.hostname}
                onChange={(e) => setFormData({...formData, hostname: e.target.value})}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Owner Email</label>
              <Input
                type="email"
                value={formData.owner}
                onChange={(e) => setFormData({...formData, owner: e.target.value})}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Owner Team</label>
              <Input
                value={formData.owner_team}
                onChange={(e) => setFormData({...formData, owner_team: e.target.value})}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="bg-slate-800 border-slate-700"
                placeholder="e.g., AWS us-east-1, Office 3rd floor"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">IP Address</label>
              <Input
                value={formData.ip_address}
                onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !formData.asset_name || !formData.criticality}
            className="w-full bg-cyan-600 hover:bg-cyan-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Asset'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
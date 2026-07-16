'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { architectPipeline } from '@/ai/flows/architect-pipeline-flow';
import { useToast } from '@/hooks/use-toast';

interface AIArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScaffold: (scaffold: any) => void;
}

export default function AIArchitectModal({ isOpen, onClose, onApplyScaffold }: AIArchitectModalProps) {
  const { toast } = useToast();
  const [requirement, setRequirement] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleArchitect = async () => {
    if (!requirement.trim()) return;
    setIsLoading(true);
    try {
      const res = await architectPipeline({ requirement });
      onApplyScaffold(res);
      toast({
        title: "Architecture Scaffolded",
        description: "Your design canvas has been updated with a suggested architecture.",
      });
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Architect Error",
        description: error instanceof Error ? error.message : "Failed to generate architecture. Please try a different requirement.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-panel">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>AI Architect Assistant</DialogTitle>
          </div>
          <DialogDescription>
            Describe the target dataset or business objective. The AI will scaffold the lineage, sources, and targets for you.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="e.g., I need a unified customer view combining Salesforce leads, Stripe payments, and Hubspot activities to calculate ROI by campaign."
            className="min-h-[150px] bg-black/20 border-white/10 focus:border-primary/50 text-sm leading-relaxed"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button 
            onClick={handleArchitect} 
            disabled={isLoading || !requirement.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Generate Architecture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

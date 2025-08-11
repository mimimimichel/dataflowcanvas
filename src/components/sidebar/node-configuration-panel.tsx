
'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { PipelineNode } from '@/lib/pipeline-data';
import { AreaChart, SlidersHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NodeConfigurationPanelProps {
  node: PipelineNode | undefined;
  isOpen: boolean;
  onClose: () => void;
  viewMode: 'consumer' | 'engineer';
}

const NodeConfigurationPanel: React.FC<NodeConfigurationPanelProps> = ({ node, isOpen, onClose, viewMode }) => {
  const { toast } = useToast();
  const [nodeName, setNodeName] = useState(node?.name || '');
  
  useEffect(() => {
    if (node) {
      setNodeName(node.name);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    toast({
      title: "Configuration Saved",
      description: `Changes to "${nodeName}" have been saved.`
    });
    onClose();
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md w-full">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">Configure: {node.name}</SheetTitle>
          <SheetDescription>
            {viewMode === 'engineer'
              ? 'Modify configurations for this node.'
              : 'View aggregated statistics for this node.'}
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <Tabs defaultValue={viewMode === 'engineer' ? 'config' : 'stats'} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stats"><AreaChart className="mr-2"/> Statistics</TabsTrigger>
            <TabsTrigger value="config" disabled={viewMode === 'consumer'}><SlidersHorizontal className="mr-2"/> Configuration</TabsTrigger>
          </TabsList>
          <TabsContent value="stats" className="mt-4">
             <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">{node.status}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Data Quality Score:</span>
                    <span className="font-medium">{node.quality}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Records Processed (24h):</span>
                    <span className="font-medium">1,234,567</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Latency:</span>
                    <span className="font-medium">120ms</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Run:</span>
                    <span className="font-medium">5 minutes ago</span>
                </div>
             </div>
          </TabsContent>
          <TabsContent value="config" className="mt-4">
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="node-name">Node Name</Label>
                <Input type="text" id="node-name" value={nodeName} onChange={(e) => setNodeName(e.target.value)} />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="batch-size">Batch Size</Label>
                <Input type="number" id="batch-size" defaultValue="1000" />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="retry-attempts">Retry Attempts</Label>
                <Input type="number" id="retry-attempts" defaultValue="3" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default NodeConfigurationPanel;

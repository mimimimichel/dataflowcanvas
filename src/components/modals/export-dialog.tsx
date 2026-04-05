'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, FileJson, FileCode, Workflow, Check } from 'lucide-react';
import { generateOntologyJSON, generateTransformsCode, generatePipelineConfig } from '@/lib/code-generators';
import type { PipelineNode, Connector } from '@/lib/pipeline-data';

interface ExportDialogProps {
  nodes: PipelineNode[];
  connectors: Connector[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportDialog({ nodes, connectors, open, onOpenChange }: ExportDialogProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const handleCopy = async (content: string, tab: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ontologyCode = generateOntologyJSON(nodes, connectors);
  const transformsCode = generateTransformsCode(nodes);
  const pipelineConfig = generatePipelineConfig(nodes, connectors);

  const tabData = [
    { id: 'ontology', label: 'Ontology', icon: FileJson, code: ontologyCode, filename: 'foundry-ontology.json' },
    { id: 'transforms', label: 'Transforms', icon: FileCode, code: transformsCode, filename: 'foundry-transforms.py' },
    { id: 'pipeline', label: 'Pipeline Config', icon: Workflow, code: pipelineConfig, filename: 'foundry-pipeline-config.json' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Export to Palantir Foundry
            <Badge variant="secondary">v1.0</Badge>
          </DialogTitle>
          <DialogDescription>
            Auto-generate Foundry ontology, transform code, and pipeline config from your visual pipeline.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ontology" className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              {tabData.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs">
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {tabData.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="flex-1 mt-0 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <span className="text-xs font-mono text-muted-foreground">
                  {tab.filename} — {tab.code.split('\n').length} lines
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => handleCopy(tab.code, tab.id)}>
                    {copiedTab === tab.id ? <><Check className="h-3.5 w-3.5 mr-1 text-green-500" />Copié!</> : <><Copy className="h-3.5 w-3.5 mr-1" />Copy</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => handleDownload(tab.code, tab.filename)}>
                    <Download className="h-3.5 w-3.5 mr-1" />Download
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 border border-border rounded-md bg-muted/30 p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">{tab.code}</pre>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

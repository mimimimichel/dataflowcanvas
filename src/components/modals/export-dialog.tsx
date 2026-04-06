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
    { id: 'ontology', label: 'Ontology', short: 'Ont.', icon: FileJson, code: ontologyCode, filename: 'foundry-ontology.json' },
    { id: 'transforms', label: 'Transforms', short: 'Py', icon: FileCode, code: transformsCode, filename: 'foundry-transforms.py' },
    { id: 'pipeline', label: 'Pipeline Config', short: 'Cfg', icon: Workflow, code: pipelineConfig, filename: 'foundry-pipeline-config.json' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] h-[90vh] sm:h-[85vh] flex flex-col p-3 sm:p-6 gap-3">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-lg">
            Export to Foundry
            <Badge variant="secondary" className="text-[9px] sm:text-[10px]">v1.0</Badge>
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-sm">
            Generate Foundry ontology, transforms &amp; pipeline config.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ontology" className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <TabsList className="grid w-full max-w-[280px] sm:max-w-md grid-cols-3 h-7 sm:h-10">
              {tabData.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center gap-1 text-[10px] sm:text-xs px-0.5 sm:px-2">
                  <tab.icon className="h-3 w-3 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {tabData.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="flex-1 mt-0 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1 sm:mb-2 flex-shrink-0 gap-1">
                <span className="text-[10px] sm:text-xs font-mono text-muted-foreground truncate">
                  {tab.filename}
                </span>
                <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-6 sm:h-7 px-1.5 text-[10px] sm:text-xs text-muted-foreground" onClick={() => handleCopy(tab.code, tab.id)}>
                    {copiedTab === tab.id ? <><Check className="h-3 w-3 mr-1 text-green-500" />Copié</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 sm:h-7 px-1.5 text-[10px] sm:text-xs text-muted-foreground" onClick={() => handleDownload(tab.code, tab.filename)}>
                    <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1" /><span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 border border-border rounded-md bg-muted/30 p-1.5 sm:p-4">
                <pre className="text-[9px] sm:text-xs font-mono whitespace-pre-wrap leading-relaxed">{tab.code}</pre>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

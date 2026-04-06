'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, FileJson, FileCode, Workflow, Check, Code2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('ontology');

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
    { id: 'ontology', label: 'Ontology', icon: FileJson, color: 'text-sky-500', code: ontologyCode, filename: 'foundry-ontology.json', lang: 'JSON' },
    { id: 'transforms', label: 'Transforms', icon: FileCode, color: 'text-amber-500', code: transformsCode, filename: 'foundry-transforms.py', lang: 'Python' },
    { id: 'pipeline', label: 'Pipeline', icon: Workflow, color: 'text-emerald-500', code: pipelineConfig, filename: 'foundry-pipeline-config.json', lang: 'JSON' },
  ];

  const activeTabData = tabData.find(t => t.id === activeTab)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[85vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Code2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">Export to Foundry</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate ontology, transforms &amp; pipeline config
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">v1.0</Badge>
          </div>
        </div>

        {/* Tab selector */}
        <div className="shrink-0 px-5 py-3 border-b bg-muted/10">
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {tabData.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className={`h-3.5 w-3.5 ${activeTab === tab.id ? tab.color : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Code viewer */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* File info + actions bar */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-muted/10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">{activeTabData.filename}</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">{activeTabData.lang}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(activeTabData.code, activeTab)}
              >
                {copiedTab === activeTab
                  ? <><Check className="h-3 w-3 mr-1 text-emerald-500" /> Copied</>
                  : <><Copy className="h-3 w-3 mr-1" /> Copy</>
                }
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleDownload(activeTabData.code, activeTabData.filename)}
              >
                <Download className="h-3 w-3 mr-1" /> Download
              </Button>
            </div>
          </div>

          {/* Code content */}
          <ScrollArea className="flex-1">
            <pre className="text-xs font-mono leading-relaxed p-4 whitespace-pre-wrap text-foreground/90">
              {activeTabData.code}
            </pre>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

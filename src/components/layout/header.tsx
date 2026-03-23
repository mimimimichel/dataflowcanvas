'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, Download, Share2, GitBranch, PlusCircle, 
  Terminal, Sparkles, Library, Settings2, Wand2, LayoutDashboard 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PipelineVersion, LineageInfo } from '@/lib/pipeline-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import AIArchitectModal from '@/components/modals/ai-architect-modal';

interface HeaderProps {
  activeLineage?: LineageInfo;
  activeVersion?: PipelineVersion;
  versions: PipelineVersion[];
  activeVersionId: string;
  onVersionChange: (id: string) => void;
  onCreateVersion: (name: string) => void;
  onGeneratePython: () => void;
  onGenerateSpec: () => void;
  onImportPipeline: (data: any) => void;
  onApplyScaffold: (scaffold: any) => void;
  onAutoLayout: () => void;
  activeView: 'dashboard' | 'editor';
  onViewChange: (view: 'dashboard' | 'editor') => void;
}

const CreateVersionDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
  activeVersionName: string;
}> = ({ isOpen, onOpenChange, onCreate, activeVersionName }) => {
  const [name, setName] = useState(`Copy of ${activeVersionName}`);

  const handleCreate = () => {
    if(name.trim()) {
      onCreate(name.trim());
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Version</DialogTitle>
          <DialogDescription>
            This will create a copy of the current version "{activeVersionName}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Version</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const Header: React.FC<HeaderProps> = ({ 
  activeLineage,
  activeVersion,
  versions, 
  activeVersionId, 
  onVersionChange, 
  onCreateVersion, 
  onGeneratePython, 
  onGenerateSpec,
  onImportPipeline,
  onApplyScaffold,
  onAutoLayout,
  activeView,
  onViewChange
}) => {
  const { toast } = useToast();
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!activeVersion) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeVersion));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `pipeline_${activeLineage?.name || 'design'}_${activeVersion.name}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    toast({
      title: "Export Successful",
      description: "Pipeline configuration has been exported as JSON.",
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          onImportPipeline(content);
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Import Error",
            description: "Failed to parse design JSON.",
          });
        }
      };
      reader.readAsText(file);
    }
  };
  
  const handleShare = () => {
    const shareUrl = `${window.location.origin}/share/${activeLineage?.id || 'design'}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
            title: "Link Copied",
            description: "A shareable link has been copied to your clipboard.",
        });
    });
  }

  return (
    <header className={cn(
      "flex h-16 items-center justify-between border-b px-4 md:px-6 shrink-0 z-30 relative shadow-sm",
      "bg-gradient-to-b from-card/95 via-card/90 to-card/80 backdrop-blur-xl",
      "after:absolute after:inset-x-0 after:top-0 after:h-[1px] after:bg-white/5"
    )}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold tracking-tight text-foreground hidden md:block">DataFlow</h1>
        </div>

        <Tabs value={activeView} onValueChange={(v) => onViewChange(v as any)} className="w-[300px]">
          <TabsList className="grid w-full grid-cols-2 bg-background/40">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Library className="h-4 w-4" /> Library
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Designer
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeView === 'editor' && (
          <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-2">
            <Select value={activeVersionId} onValueChange={onVersionChange}>
              <SelectTrigger className="w-48 h-9 bg-background/50 border-white/10">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map(version => (
                  <SelectItem key={version.id} value={version.id}>{version.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsCreateVersionOpen(true)}>
              <PlusCircle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 border-r border-white/10 pr-4">
            <Button variant="outline" size="sm" onClick={onAutoLayout} className="h-9 bg-background/40 border-white/10 hover:bg-background/60">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Auto-Layout
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsArchitectOpen(true)} className="group h-9 bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary">
                <Wand2 className="mr-2 h-4 w-4" /> AI Architect
            </Button>
            <Button variant="outline" size="sm" onClick={onGenerateSpec} className="group h-9 bg-background/40 border-white/10 hover:bg-background/60">
                <Sparkles className="mr-2 h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" /> Write Spec
            </Button>
            <Button variant="outline" size="sm" onClick={onGeneratePython} className="h-9 bg-background/40 border-white/10 hover:bg-background/60">
                <Terminal className="mr-2 h-4 w-4" /> Foundry
            </Button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleFileChange}
            />
            <Button variant="outline" size="sm" onClick={handleImportClick} className="h-9 bg-background/40 border-white/10 hover:bg-background/60">
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleExport} className="h-9 bg-background/40 border-white/10 hover:bg-background/60">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
        </div>

        <div className="flex items-center gap-3 pl-2">
          <Button size="sm" onClick={handleShare} className="h-9 shadow-inner"><Share2 className="mr-2 h-4 w-4" /> Share</Button>
        </div>
      </div>

      {activeVersion && (
         <CreateVersionDialog 
          isOpen={isCreateVersionOpen}
          onOpenChange={setIsCreateVersionOpen}
          onCreate={onCreateVersion}
          activeVersionName={activeVersion.name}
        />
      )}

      <AIArchitectModal 
        isOpen={isArchitectOpen}
        onClose={() => setIsArchitectOpen(false)}
        onApplyScaffold={onApplyScaffold}
      />
    </header>
  );
};

export default Header;

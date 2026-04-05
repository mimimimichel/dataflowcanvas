'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, Share2, GitBranch, PlusCircle, 
  Terminal, Sparkles, Library, Settings2, Wand2,
  Menu, Sun, Moon, Laptop
} from 'lucide-react';
import { PipelineVersion, LineageInfo } from '@/lib/pipeline-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import AIArchitectModal from '@/components/modals/ai-architect-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  activeLineage?: LineageInfo;
  activeVersion?: PipelineVersion;
  versions: PipelineVersion[];
  activeVersionId: string;
  onVersionChange: (id: string) => void;
  onCreateVersion: (name: string) => void;
  onGeneratePython: () => void;
  onGenerateSpec: () => void;
  onExport: () => void;
  onImportPipeline: (data: any) => void;
  onApplyScaffold: (scaffold: any) => void;
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
      <DialogContent className="glass-panel">
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
              className="col-span-3 bg-muted/50"
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
  onExport,
  onApplyScaffold,
  activeView,
  onViewChange,
}) => {
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleExport = () => {
    if (!activeVersion) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeVersion));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `pipeline_${activeLineage?.name || 'design'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <header className={cn(
      "flex h-16 items-center justify-between border-b px-4 md:px-6 shrink-0 z-30 relative shadow-sm",
      "bg-card/80 backdrop-blur-xl transition-colors duration-300"
    )}>
      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold tracking-tight hidden xl:block">DataFlow</h1>
        </div>

        <Tabs value={activeView} onValueChange={(v) => onViewChange(v as any)} className="w-[200px] md:w-[300px]">
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 text-xs md:text-sm">
              <Library className="h-4 w-4 hidden sm:block" /> Library
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-2 text-xs md:text-sm">
              <Settings2 className="h-4 w-4 hidden sm:block" /> Designer
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeView === 'editor' && (
          <div className="hidden md:flex items-center gap-2 border-l border-border pl-4 ml-2">
            <Select value={activeVersionId} onValueChange={onVersionChange}>
              <SelectTrigger className="w-40 h-9 bg-background/50 border-border text-xs">
                <SelectValue placeholder="Version" />
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

      <div className="flex items-center gap-2 md:gap-4">
        {activeView === 'editor' && (
          <div className="hidden lg:flex items-center gap-2 border-r border-border pr-4">
              <Button variant="outline" size="sm" onClick={() => setIsArchitectOpen(true)} className="group h-9 bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary">
                  <Wand2 className="mr-2 h-4 w-4" /> Architect
              </Button>
              <Button variant="outline" size="sm" onClick={onGenerateSpec} className="group h-9 bg-background/40 border-border hover:bg-background/60">
                  <Sparkles className="mr-2 h-4 w-4 text-amber-500" /> Spec
              </Button>
              <Button variant="outline" size="sm" onClick={onGeneratePython} className="h-9 bg-background/40 border-border hover:bg-background/60">
              <Button variant="outline" size="sm" onClick={onExport} className="h-9 bg-background/40 border-border hover:bg-background/60 ml-1">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
                  <Terminal className="mr-2 h-4 w-4" /> PySpark Code
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} className="h-9 bg-background/40 border-border hover:bg-background/60">
                <Download className="mr-2 h-4 w-4" /> Export
              </Button>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Laptop className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="lg:hidden flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 bg-background/40 border-border">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 glass-panel border-border">
              <DropdownMenuItem onClick={() => setIsArchitectOpen(true)} className="gap-2 text-primary font-bold">
                <Wand2 className="h-4 w-4" /> AI Architect
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={onGenerateSpec} className="gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> AI Spec Writer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onGeneratePython} className="gap-2">
                <Terminal className="h-4 w-4" /> PySpark Code
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" /> Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button size="sm" className="h-9 shadow-inner px-3 md:px-4 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Share2 className="md:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
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
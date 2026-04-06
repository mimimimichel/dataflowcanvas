'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download, Share2, GitBranch, PlusCircle,
  Terminal, Sparkles, Library, Settings2, Wand2,
  Menu, Sun, Moon, Laptop, Layers, ZoomIn, ZoomOut, Scan
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
  onTemplates: () => void;
  onImportPipeline: (data: any) => void;
  onApplyScaffold: (scaffold: any) => void;
  activeView: 'dashboard' | 'editor';
  onViewChange: (view: 'dashboard' | 'editor') => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  zoom?: number;
}

const CreateVersionDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
  activeVersionName: string;
}> = ({ isOpen, onOpenChange, onCreate, activeVersionName }) => {
  const [name, setName] = useState(`Copy of ${activeVersionName}`);

  const handleCreate = () => {
    if (name.trim()) {
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
            This will create a copy of the current version &quot;{activeVersionName}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
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
  onTemplates,
  onImportPipeline,
  onApplyScaffold,
  activeView,
  onViewChange,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  zoom,
}) => {
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileRef.current?.click();
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          onImportPipeline(data);
        } catch {
          console.error('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  return (
    <>
      {/* Header */}
      <header className={cn(
        "flex h-14 items-center justify-between border-b px-3 md:px-4 shrink-0 z-30 relative shadow-sm",
        "bg-card/90 backdrop-blur-xl transition-colors duration-300"
      )}>
        {/* Left: Logo + View Tabs */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <GitBranch className="h-5 w-5 text-primary" />
            <h1 className="text-base font-bold tracking-tight hidden lg:block">DataFlow Canvas</h1>
          </div>

          <Tabs value={activeView} onValueChange={(v) => onViewChange(v as 'dashboard' | 'editor')} className="w-[160px] md:w-[220px] shrink-0">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 h-8">
              <TabsTrigger value="dashboard" className="text-xs">
                <Library className="h-3.5 w-3.5 mr-1 hidden sm:block" /> Library
              </TabsTrigger>
              <TabsTrigger value="editor" className="text-xs">
                <Settings2 className="h-3.5 w-3.5 mr-1 hidden sm:block" /> Designer
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Version selector - desktop only */}
          {activeView === 'editor' && (
            <div className="hidden md:flex items-center gap-1.5">
              <Select value={activeVersionId} onValueChange={onVersionChange}>
                <SelectTrigger className="w-36 h-8 bg-background/50 border-border text-xs">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map(version => (
                    <SelectItem key={version.id} value={version.id} className="text-xs">{version.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCreateVersionOpen(true)}>
                <PlusCircle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
              </Button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {activeView === 'editor' && (
            <>
              {/* Desktop: clean toolbar */}
              <div className="hidden lg:flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={onGenerateSpec} className="h-8 px-2.5 hover:bg-amber-500/10">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="ml-1.5 text-xs">Spec</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onGeneratePython} className="h-8 px-2.5">
                  <Terminal className="h-3.5 w-3.5" />
                  <span className="ml-1.5 text-xs">PySpark</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onExport} className="h-8 px-2.5">
                  <Download className="h-3.5 w-3.5" />
                  <span className="ml-1.5 text-xs">Export</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={onTemplates} className="h-8 px-2.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="ml-1.5 text-xs">Templates</span>
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button variant="ghost" size="sm" onClick={() => setIsArchitectOpen(true)} className="h-8 px-2.5 text-primary bg-primary/10 hover:bg-primary/20">
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs">Architect</span>
                </Button>
              </div>

              {/* Tablet: icons only */}
              <div className="hidden md:flex lg:hidden items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onGenerateSpec}>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onGeneratePython}>
                  <Terminal className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExport}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTemplates}>
                  <Layers className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setIsArchitectOpen(true)}>
                  <Wand2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* Theme selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
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

          {/* Mobile menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {activeView === 'editor' && (
                  <>
                    <DropdownMenuItem onClick={() => setIsArchitectOpen(true)} className="gap-2 text-primary font-medium">
                      <Wand2 className="h-4 w-4" /> AI Architect
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onGenerateSpec} className="gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" /> AI Spec
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onGeneratePython} className="gap-2">
                      <Terminal className="h-4 w-4" /> PySpark
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onExport} className="gap-2">
                      <Download className="h-4 w-4" /> Export
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onTemplates} className="gap-2">
                      <Layers className="h-4 w-4" /> Templates
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleImportClick} className="gap-2">
                  <Download className="h-4 w-4" /> Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Share button */}
          <Button size="sm" className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs">
            <Share2 className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>

        {/* Hidden file input */}
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportChange} />
      </header>

      {/* Zoom Controls - Floating (Figma-style) */}
      {activeView === 'editor' && onZoomIn && onZoomOut && (
        <div className="fixed bottom-4 left-4 z-20 flex items-center gap-1 p-1 rounded-lg bg-card/90 backdrop-blur-xl border shadow-sm">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs tabular-nums w-10 text-center">{zoom ? `${Math.round(zoom * 100)}%` : '100%'}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          {onZoomFit && (
            <>
              <div className="w-px h-4 bg-border" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomFit}>
                <Scan className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Version dialog */}
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
    </>
  );
};

export default Header;

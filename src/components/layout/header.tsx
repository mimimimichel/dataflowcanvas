'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download, Share2, GitBranch, PlusCircle,
  Library, Settings2, Wand2,
  Menu, Layers, User, ShieldCheck, Package,
  Check, Circle, Loader2, AlertCircle
} from 'lucide-react';
import { PipelineVersion, LineageInfo } from '@/lib/pipeline-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import AIArchitectModal from '@/components/modals/ai-architect-modal';
import { ThemeToggle } from '@/components/shared/theme-toggle';
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
  onDeliverables: () => void;
  onAudit: () => void;
  auditGrade?: string;
  auditScore?: number;
  isArchitectOpen: boolean;
  onArchitectOpenChange: (open: boolean) => void;
  onTemplates: () => void;
  onImportPipeline: (data: any) => void;
  onApplyScaffold: (scaffold: any) => void;
  activeView: 'projects' | 'dataProducts' | 'dataProductDoc' | 'editor';
  onViewChange: (view: 'dataProductDoc' | 'editor') => void;
  onShare?: () => void;
  onAccountSettings?: () => void;
  /** Undefined in Demo Mode — there's nothing to save there, so no indicator at all. */
  saveStatus?: 'saved' | 'unsaved' | 'saving' | 'error';
  onForceSave?: () => void;
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


const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-500',
  B: 'text-lime-500',
  C: 'text-amber-500',
  D: 'text-orange-500',
  E: 'text-red-500',
};

const Header: React.FC<HeaderProps> = ({
  activeLineage,
  activeVersion,
  versions,
  activeVersionId,
  onVersionChange,
  onCreateVersion,
  onDeliverables,
  onAudit,
  auditGrade,
  auditScore,
  isArchitectOpen,
  onArchitectOpenChange,
  onTemplates,
  onImportPipeline,
  onApplyScaffold,
  activeView,
  onViewChange,
  onAccountSettings,
  onShare,
  saveStatus,
  onForceSave,
}) => {
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
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
            <h1 className="text-base font-bold tracking-tight hidden xl:block">Theseus</h1>
          </div>

          {(activeView === 'dataProductDoc' || activeView === 'editor') && (
            <Tabs value={activeView} onValueChange={(v) => onViewChange(v as 'dataProductDoc' | 'editor')} className="w-[160px] md:w-[220px] shrink-0">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 h-8">
                <TabsTrigger value="dataProductDoc" className="text-xs">
                  <Library className="h-3.5 w-3.5 mr-1 hidden sm:block" /> Overview
                </TabsTrigger>
                <TabsTrigger value="editor" className="text-xs">
                  <Settings2 className="h-3.5 w-3.5 mr-1 hidden sm:block" /> Designer
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Version selector - desktop only */}
          {activeView === 'editor' && (
            <div className="hidden lg:flex items-center gap-1.5">
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
              {/* Desktop: Build -> Validate -> Deliver */}
              <div className="hidden xl:flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={onTemplates} className="h-8 px-2.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="ml-1.5 text-xs">Templates</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onArchitectOpenChange(true)} className="h-8 px-2.5 text-primary bg-primary/10 hover:bg-primary/20">
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs">Architect</span>
                </Button>
                <div className="w-px h-5 bg-border/50 mx-2" />
                {auditGrade && (
                  <Button variant="ghost" size="sm" onClick={onAudit} className="h-8 px-2.5 gap-1.5" aria-label={`Compliance score ${auditScore}/100`}>
                    <ShieldCheck className={cn("h-3.5 w-3.5", GRADE_COLORS[auditGrade])} />
                    <span className={cn("text-sm font-bold leading-none", GRADE_COLORS[auditGrade])}>{auditGrade}</span>
                    <span className="text-[10px] text-muted-foreground">{auditScore}/100</span>
                  </Button>
                )}
                <Button variant="default" size="sm" onClick={onDeliverables} className="h-8 px-3">
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs">Livrables</span>
                </Button>
              </div>

              {/* Tablet: icons only */}
              <div className="hidden md:flex xl:hidden items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTemplates} aria-label="Templates">
                  <Layers className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onArchitectOpenChange(true)} aria-label="AI Architect">
                  <Wand2 className="h-4 w-4" />
                </Button>
                {auditGrade && (
                  <Button variant="ghost" size="sm" className="h-8 px-1.5 gap-1" onClick={onAudit} aria-label={`Compliance score ${auditScore}/100`}>
                    <ShieldCheck className={cn("h-4 w-4", GRADE_COLORS[auditGrade])} />
                    <span className={cn("text-sm font-bold leading-none", GRADE_COLORS[auditGrade])}>{auditGrade}</span>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDeliverables} aria-label="Livrables">
                  <Package className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* Save status */}
          {saveStatus && activeView === 'editor' && (
            <button
              type="button"
              onClick={saveStatus === 'unsaved' || saveStatus === 'error' ? onForceSave : undefined}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              className={cn(
                "flex items-center gap-1.5 h-8 px-2 sm:px-2.5 rounded-md text-xs font-medium transition-colors shrink-0",
                saveStatus === 'saved' && "text-muted-foreground",
                saveStatus === 'unsaved' && "text-amber-600 hover:bg-amber-500/10 cursor-pointer",
                saveStatus === 'saving' && "text-muted-foreground",
                saveStatus === 'error' && "text-red-500 hover:bg-red-500/10 cursor-pointer"
              )}
              title={
                saveStatus === 'saved' ? 'Toutes les modifications sont enregistrées'
                  : saveStatus === 'unsaved' ? 'Modifications non enregistrées — cliquer pour enregistrer maintenant'
                  : saveStatus === 'saving' ? 'Enregistrement en cours…'
                  : "Échec de l'enregistrement — cliquer pour réessayer"
              }
            >
              {saveStatus === 'saved' && <Check className="h-3.5 w-3.5" />}
              {saveStatus === 'unsaved' && <Circle className="h-2 w-2 fill-current" />}
              {saveStatus === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saveStatus === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">
                {saveStatus === 'saved' && 'Enregistré'}
                {saveStatus === 'unsaved' && 'Non enregistré'}
                {saveStatus === 'saving' && 'Enregistrement…'}
                {saveStatus === 'error' && 'Erreur'}
              </span>
            </button>
          )}

          {/* Theme selector */}
          <ThemeToggle />

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
                    <DropdownMenuItem onClick={() => onArchitectOpenChange(true)} className="gap-2 text-primary font-medium">
                      <Wand2 className="h-4 w-4" /> AI Architect
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onTemplates} className="gap-2">
                      <Layers className="h-4 w-4" /> Templates
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onAudit} className="gap-2">
                      <ShieldCheck className={cn("h-4 w-4", auditGrade ? GRADE_COLORS[auditGrade] : 'text-emerald-500')} />
                      Audit {auditGrade ? `— ${auditGrade} (${auditScore}/100)` : ''}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDeliverables} className="gap-2">
                      <Package className="h-4 w-4" /> Livrables
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

          {/* Account button */}
          {onAccountSettings && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAccountSettings} aria-label="Account">
              <User className="h-4 w-4" />
            </Button>
          )}

          {/* Share button */}
          <Button size="sm" className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-xs" onClick={() => onShare?.()}>
            <Share2 className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>

        {/* Hidden file input */}
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportChange} />
      </header>

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
        onClose={() => onArchitectOpenChange(false)}
        onApplyScaffold={onApplyScaffold}
      />
    </>
  );
};

export default Header;

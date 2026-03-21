'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Download, Share2, GitBranch, PlusCircle, Terminal, FileText, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PipelineVersion } from '@/lib/pipeline-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface HeaderProps {
  versions: PipelineVersion[];
  activeVersionId: string;
  onVersionChange: (id: string) => void;
  onCreateVersion: (name: string) => void;
  onGeneratePython: () => void;
  onGenerateSpec: () => void;
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


const Header: React.FC<HeaderProps> = ({ versions, activeVersionId, onVersionChange, onCreateVersion, onGeneratePython, onGenerateSpec }) => {
  const { toast } = useToast();
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);

  const handleExport = () => {
    toast({
      title: "Exporting Pipeline",
      description: "Your pipeline configuration has been exported as JSON.",
    });
  };

  const handleImport = () => {
    toast({
      title: "Import Successful",
      description: "Pipeline configuration has been imported.",
    });
  };
  
  const handleShare = () => {
    toast({
        title: "Sharing Pipeline",
        description: "A shareable link has been copied to your clipboard.",
    });
  }
  
  const activeVersion = versions.find(v => v.id === activeVersionId);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 shrink-0 z-20 relative">
      <div className="flex items-center gap-4">
        <GitBranch className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">DataFlow Canvas</h1>
        <div className="flex items-center gap-1">
          <Select value={activeVersionId} onValueChange={onVersionChange}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map(version => (
                <SelectItem key={version.id} value={version.id}>{version.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsCreateVersionOpen(true)}>
            <PlusCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
            <Avatar className="h-8 w-8 border-2 border-card">
                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
                <AvatarFallback>U1</AvatarFallback>
            </Avatar>
            <Avatar className="h-8 w-8 border-2 border-card">
                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704a" />
                <AvatarFallback>U2</AvatarFallback>
            </Avatar>
             <Avatar className="h-8 w-8 border-2 border-card bg-primary text-primary-foreground">
                <AvatarFallback>+3</AvatarFallback>
            </Avatar>
        </div>
        <div className="flex items-center gap-2 border-l pl-4 ml-2">
            <Button variant="outline" size="sm" onClick={onGenerateSpec} className="group">
                <Sparkles className="mr-2 h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" /> Write Spec
            </Button>
            <Button variant="outline" size="sm" onClick={onGeneratePython}>
                <Terminal className="mr-2 h-4 w-4" /> Foundry
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}><Upload className="mr-2 h-4 w-4" /> Import</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
            <Button size="sm" onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Share</Button>
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
    </header>
  );
};

export default Header;

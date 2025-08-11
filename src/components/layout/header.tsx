
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Upload, Download, Share2, Users, GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  viewMode: 'consumer' | 'engineer';
  setViewMode: (mode: 'consumer' | 'engineer') => void;
}

const Header: React.FC<HeaderProps> = ({ viewMode, setViewMode }) => {
  const { toast } = useToast();

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

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <GitBranch className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">DataFlow Canvas</h1>
        <Select defaultValue="v1.2-prod">
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Select version" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="v1.2-prod">v1.2 (Production)</SelectItem>
            <SelectItem value="v1.3-dev">v1.3 (Development)</SelectItem>
            <SelectItem value="v1.1-archived">v1.1 (Archived)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
            <Label htmlFor="view-mode" className="text-sm font-medium text-muted-foreground">Consumer</Label>
            <Switch
                id="view-mode"
                checked={viewMode === 'engineer'}
                onCheckedChange={(checked) => setViewMode(checked ? 'engineer' : 'consumer')}
            />
            <Label htmlFor="view-mode" className="text-sm font-medium">Engineer</Label>
        </div>
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
        <Button variant="outline" size="sm" onClick={handleImport}><Upload className="mr-2" /> Import</Button>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2" /> Export</Button>
        <Button size="sm" onClick={handleShare}><Share2 className="mr-2" /> Share</Button>
      </div>
    </header>
  );
};

export default Header;

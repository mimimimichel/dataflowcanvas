'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LineageInfo } from '@/lib/pipeline-data';
import { 
  ArrowUpRight, GitBranch, Search, Filter, Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface LineageDashboardProps {
  lineages: LineageInfo[];
  onSelectLineage: (id: string) => void;
  onCreateLineage: (name: string, description: string) => void;
}

const CreateLineageDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description: string) => void;
}> = ({ isOpen, onOpenChange, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if(name.trim()) {
      onCreate(name.trim(), description.trim());
      onOpenChange(false);
      setName('');
      setDescription('');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel">
        <DialogHeader>
          <DialogTitle>Create New Design</DialogTitle>
          <DialogDescription>
            Define a new data lineage project to start designing your pipeline.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Design Name</Label>
            <Input
              id="name"
              placeholder="e.g., Marketing ROI Analysis"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-primary/50"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              placeholder="Explain the purpose of this design..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-primary/50 min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 hover:bg-white/5">Cancel</Button>
          <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">Create Design</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function LineageDashboard({ lineages, onSelectLineage, onCreateLineage }: LineageDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredLineages = useMemo(() => {
    return lineages.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lineages, searchTerm]);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-4xl font-extrabold tracking-tight text-white">Design Library</h2>
            <p className="text-muted-foreground text-lg">Architect and manage your enterprise data lineages.</p>
          </div>
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-5 w-5" /> New Design
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter designs..." 
              className="pl-11 h-12 bg-white/[0.03] border-white/10 focus:border-primary/50 rounded-xl" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 hover:bg-white/5 rounded-xl">
            <Filter className="h-5 w-5" />
          </Button>
        </div>

        <Card className="apple-card overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
            <CardTitle className="text-white">Active Projects</CardTitle>
            <CardDescription>Select a project to open it in the visual designer workspace.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="px-8 h-14 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Project Name</TableHead>
                  <TableHead className="h-14 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Objective</TableHead>
                  <TableHead className="h-14 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Owner</TableHead>
                  <TableHead className="h-14 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Last Modified</TableHead>
                  <TableHead className="h-14 px-8 text-right text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLineages.length > 0 ? (
                  filteredLineages.map((lineage) => {
                    return (
                      <TableRow 
                        key={lineage.id} 
                        className="group cursor-pointer hover:bg-white/[0.05] transition-all border-white/5" 
                        onClick={() => onSelectLineage(lineage.id)}
                      >
                        <TableCell className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                              <GitBranch className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-white font-semibold text-base">{lineage.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono opacity-60 tracking-tight">{lineage.id}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs py-5">
                          <p className="text-sm text-muted-foreground/90 line-clamp-1">{lineage.description}</p>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground/80 py-5">{lineage.owner}</TableCell>
                        <TableCell className="text-muted-foreground text-sm py-5 font-medium">{lineage.lastEdited}</TableCell>
                        <TableCell className="px-8 py-5 text-right">
                          <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg font-bold">
                            Open Designer <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                      No matching projects found in your library.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CreateLineageDialog 
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreate={onCreateLineage}
      />
    </div>
  );
}

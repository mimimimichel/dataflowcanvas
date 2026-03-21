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
      <DialogContent>
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
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              placeholder="Explain the purpose of this design..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Design</Button>
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
    <div className="flex-1 p-8 overflow-y-auto bg-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Lineage Library</h2>
            <p className="text-muted-foreground">Browse and manage your data pipeline architecture designs.</p>
          </div>
          <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Lineage
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search lineages..." 
              className="pl-9 bg-background" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available Designs</CardTitle>
            <CardDescription>Select a lineage to open it in the visual editor.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Design Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Last Edited</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLineages.length > 0 ? (
                  filteredLineages.map((lineage) => {
                    return (
                      <TableRow 
                        key={lineage.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors" 
                        onClick={() => onSelectLineage(lineage.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-primary/10">
                              <GitBranch className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span>{lineage.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">{lineage.id}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-muted-foreground truncate">{lineage.description}</p>
                        </TableCell>
                        <TableCell className="text-sm">{lineage.owner}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{lineage.lastEdited}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="gap-2">
                            Edit <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No matching designs found.
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

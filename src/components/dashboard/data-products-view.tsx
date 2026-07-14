'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Project } from '@/lib/pipeline-data';
import { ArrowUpRight, Package, Search, Plus, GitBranch, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DataProductsViewProps {
  project: Project;
  onBack: () => void;
  onSelectDataProduct: (id: string) => void;
  onCreateDataProduct: (name: string, description: string) => void;
}

const CreateDataProductDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description: string) => void;
}> = ({ isOpen, onOpenChange, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim());
      onOpenChange(false);
      setName('');
      setDescription('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel">
        <DialogHeader>
          <DialogTitle>New Data Product</DialogTitle>
          <DialogDescription>
            A data product bundles its own documentation with one or more designed pipelines.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="dp-name">Data Product Name</Label>
            <Input
              id="dp-name"
              placeholder="e.g., Customer 360"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-muted/50 border-border focus:border-primary/50"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dp-desc">Description</Label>
            <Textarea
              id="dp-desc"
              placeholder="What does this data product provide..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-muted/50 border-border focus:border-primary/50 min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border hover:bg-muted">Cancel</Button>
          <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">Create Data Product</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function DataProductsView({ project, onBack, onSelectDataProduct, onCreateDataProduct }: DataProductsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    return project.dataProducts.filter(dp =>
      dp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dp.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [project.dataProducts, searchTerm]);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-background">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" /> Projects
          </Button>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div className="space-y-1">
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground">{project.name}</h2>
              <p className="text-muted-foreground text-lg">{project.description}</p>
            </div>
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 shrink-0 self-start sm:self-auto" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-5 w-5" /> New Data Product
            </Button>
          </div>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter data products..."
            className="pl-11 h-12 bg-muted/30 border-border focus:border-primary/50 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Card className="apple-card overflow-hidden">
          <CardHeader className="bg-muted/10 border-b border-border p-8">
            <CardTitle className="text-foreground">Data Products</CardTitle>
            <CardDescription>Each one holds its own documentation and pipeline designs.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="px-8 h-14 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Data Product</TableHead>
                  <TableHead className="h-14 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Description</TableHead>
                  <TableHead className="h-14 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Pipelines</TableHead>
                  <TableHead className="h-14 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Owner</TableHead>
                  <TableHead className="h-14 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Last Modified</TableHead>
                  <TableHead className="h-14 px-8 text-right text-muted-foreground uppercase text-[11px] font-bold tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((dp) => (
                    <TableRow
                      key={dp.id}
                      className="group cursor-pointer hover:bg-muted/40 transition-all border-border"
                      onClick={() => onSelectDataProduct(dp.id)}
                    >
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-foreground font-semibold text-base">{dp.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs py-5">
                        <p className="text-sm text-muted-foreground/90 line-clamp-1">{dp.description}</p>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground/80 py-5">
                        <span className="inline-flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" /> {dp.lineageIds.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground/80 py-5">{dp.owner}</TableCell>
                      <TableCell className="text-muted-foreground text-sm py-5 font-medium">{dp.lastEdited}</TableCell>
                      <TableCell className="px-8 py-5 text-right">
                        <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg font-bold">
                          Open <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                      No matching data products.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CreateDataProductDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={onCreateDataProduct} />
    </div>
  );
}

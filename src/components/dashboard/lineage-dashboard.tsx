'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LineageInfo } from '@/lib/pipeline-data';
import { 
  ArrowUpRight, GitBranch, Search, Filter, Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface LineageDashboardProps {
  lineages: LineageInfo[];
  onSelectLineage: (id: string) => void;
}

export default function LineageDashboard({ lineages, onSelectLineage }: LineageDashboardProps) {
  return (
    <div className="flex-1 p-8 overflow-y-auto bg-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Lineage Library</h2>
            <p className="text-muted-foreground">Browse and manage your data pipeline architecture designs.</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Lineage
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search lineages..." className="pl-9 bg-background" />
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
                {lineages.map((lineage) => {
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
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineageInfo, LineageStatus } from '@/lib/pipeline-data';
import { 
  Activity, CheckCircle2, XCircle, Clock3, MoreVertical, 
  ArrowUpRight, GitBranch, Layers, AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LineageDashboardProps {
  lineages: LineageInfo[];
  onSelectLineage: (id: string) => void;
}

const statusConfig: Record<LineageStatus, { icon: any, color: string, label: string }> = {
  success: { icon: CheckCircle2, color: 'text-green-500', label: 'Healthy' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Critical' },
  running: { icon: Activity, color: 'text-blue-500', label: 'Processing' },
  idle: { icon: Clock3, color: 'text-muted-foreground', label: 'Inactive' },
};

export default function LineageDashboard({ lineages, onSelectLineage }: LineageDashboardProps) {
  const stats = {
    total: lineages.length,
    failed: lineages.filter(l => l.status === 'failed').length,
    running: lineages.filter(l => l.status === 'running').length,
    avgHealth: Math.round(lineages.reduce((acc, l) => acc + l.health, 0) / lineages.length)
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lineage Overview</h2>
          <p className="text-muted-foreground">Monitor and manage your active data pipelines and dependencies.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lineages</CardTitle>
              <GitBranch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">+2 from last week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Failures</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
              <p className="text-xs text-muted-foreground">Action required on 1 pipeline</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgHealth}%</div>
              <Progress value={stats.avgHealth} className="h-2 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
              <Layers className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.running}</div>
              <p className="text-xs text-muted-foreground">Processing 1.2M rows/sec</p>
            </CardContent>
          </Card>
        </div>

        {/* Lineage Table */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Active Lineages</CardTitle>
            <CardDescription>Detailed status of all registered data pipelines.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Pipeline Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Last Execution</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineages.map((lineage) => {
                  const status = statusConfig[lineage.status];
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={lineage.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelectLineage(lineage.id)}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{lineage.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{lineage.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("h-4 w-4", status.color)} />
                          <span className="text-sm font-medium">{status.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 w-32">
                          <Progress value={lineage.health} className="h-2" />
                          <span className="text-xs font-mono">{lineage.health}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{lineage.lastRun}</TableCell>
                      <TableCell className="text-sm">{lineage.owner}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <ArrowUpRight className="h-4 w-4" />
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

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, AlertCircle, Columns, Rows, Hash } from 'lucide-react';
import { type DatasetProfile, qualityColor, qualityBadge } from '@/lib/data-profiler';

interface DataProfilePanelProps {
  profile: DatasetProfile | null;
  onClose: () => void;
}

export default function DataProfilePanel({ profile, onClose }: DataProfilePanelProps) {
  if (!profile) return null;
  const q = qualityBadge(profile.overallQuality);

  return (
    <div className="w-72 md:w-80 lg:w-96 border-l border-border bg-background/95 backdrop-blur-sm flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-xs font-semibold flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Data Profile
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Quality Score */}
          <div className={`rounded-lg border p-3 ${q.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium flex items-center gap-1.5 ${q.text}`}>
                <AlertCircle className="h-3.5 w-3.5" /> Quality Score
              </span>
              <span className={`text-xs font-bold ${q.text}`}>{profile.overallQuality}%</span>
            </div>
            <Progress value={profile.overallQuality} className="h-1.5" />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-muted/40 p-2.5 flex flex-col items-center">
              <Rows className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-sm font-bold">{(profile.rowCount / 1000).toFixed(1)}K</span>
              <span className="text-[10px] text-muted-foreground">Rows</span>
            </div>
            <div className="rounded-md bg-muted/40 p-2.5 flex flex-col items-center">
              <Columns className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-sm font-bold">{profile.columnCount}</span>
              <span className="text-[10px] text-muted-foreground">Columns</span>
            </div>
          </div>

          {/* Column Stats */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
              <Hash className="h-3 w-3" /> Columns
            </p>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] h-6 px-2 py-0.5">Field</TableHead>
                  <TableHead className="text-[10px] h-6 px-2 py-0.5">Type</TableHead>
                  <TableHead className="text-[10px] h-6 px-2 py-0.5 text-right">Compl.</TableHead>
                  <TableHead className="text-[10px] h-6 px-2 py-0.5 text-right">Nulls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.columns.map((col) => (
                  <TableRow key={col.name} className="hover:bg-muted/20">
                    <TableCell className="text-[10px] px-2 py-1 font-medium truncate max-w-[80px]">{col.name}</TableCell>
                    <TableCell className="text-[10px] px-2 py-1 font-mono text-muted-foreground">{col.type}</TableCell>
                    <TableCell className={`text-[10px] px-2 py-1 text-right font-medium ${qualityColor(col.completeness)}`}>{col.completeness}%</TableCell>
                    <TableCell className="text-[10px] px-2 py-1 text-right text-muted-foreground">{col.nullCount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Key Metrics per Column */}
          {profile.columns.map((col) => (col.min || col.max || col.mostCommon) && (
            <div key={`detail-${col.name}`} className="rounded-md bg-muted/20 border border-border/40 p-2.5">
              <p className="text-[10px] font-semibold mb-1.5">{col.name}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                {col.min && <><span className="text-muted-foreground">Min</span><span className="font-mono text-right">{col.min}</span></>}
                {col.max && <><span className="text-muted-foreground">Max</span><span className="font-mono text-right">{col.max}</span></>}
                {col.mostCommon && <><span className="text-muted-foreground">Top val.</span><span className="font-mono text-right">{col.mostCommon}</span></>}
                <><span className="text-muted-foreground">Distinct</span><span className="font-mono text-right">{col.distinctCount.toLocaleString()}</span></>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

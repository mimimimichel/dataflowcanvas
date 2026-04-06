'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart3,
  AlertCircle,
  Columns3,
  Rows3,
  CheckCircle2,
  AlertTriangle,
  ArrowDownUp,
  Hash,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { type DatasetProfile, qualityBadge } from '@/lib/data-profiler';
import { cn } from '@/lib/utils';

interface DataProfilePanelProps {
  profile: DatasetProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function qualityRing(pct: number, size: number = 48) {
  const color = pct >= 80 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-rose-500';
  const bgColor = pct >= 80 ? 'text-emerald-500/10' : pct >= 50 ? 'text-amber-500/10' : 'text-rose-500/10';
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={cn("relative", bgColor)} style={{ width: size, height: size }} />
  );
}

function ColumnRow({ col }: { col: NonNullable<DatasetProfile>['columns'][number] }) {
  const [expanded, setExpanded] = useState(false);
  const completeness = col.completeness;
  const ok = completeness >= 80;
  const warn = completeness >= 50;

  return (
    <div className="border-b border-border/40">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-muted/30 transition-colors group"
      >
        <div className="shrink-0">
          {expanded
            ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground" />
          }
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium truncate">{col.name}</span>
            <span className={cn(
              "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded",
              ok ? "text-emerald-500 bg-emerald-500/10" : warn ? "text-amber-500 bg-amber-500/10" : "text-rose-500 bg-rose-500/10"
            )}>
              {completeness}%
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span className="font-mono">{col.type}</span>
            <span>Nulls: {col.nullCount.toLocaleString()}</span>
            <span>Distinct: {col.distinctCount.toLocaleString()}</span>
          </div>
          {/* Mini completeness bar */}
          <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                ok ? "bg-emerald-500" : warn ? "bg-amber-500" : "bg-rose-500"
              )}
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </button>

      {expanded && (col.min || col.max || col.mostCommon) && (
        <div className="px-7 pb-3 pt-1 bg-muted/20">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {col.min && (
              <>
                <span className="text-muted-foreground text-[10px]">Min</span>
                <span className="font-mono text-[10px] text-right truncate">{col.min}</span>
              </>
            )}
            {col.max && (
              <>
                <span className="text-muted-foreground text-[10px]">Max</span>
                <span className="font-mono text-[10px] text-right truncate">{col.max}</span>
              </>
            )}
            {col.mostCommon && (
              <>
                <span className="text-muted-foreground text-[10px]">Top value</span>
                <span className="font-mono text-[10px] text-right truncate">{col.mostCommon}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DataProfilePanel({ profile, open, onOpenChange }: DataProfilePanelProps) {
  if (!profile) return null;
  const q = qualityBadge(profile.overallQuality);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] max-w-[95vw] p-0 flex flex-col overflow-hidden" side="right">
        {/* Header */}
        <div className={cn("shrink-0 px-5 pt-5 pb-4 border-b", q.bg)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl ring-1", q.ring, q.bg)}>
                <BarChart3 className={cn("h-4 w-4", q.text)} />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">Data Profile</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  Column statistics &amp; data quality
                </SheetDescription>
              </div>
            </div>

            {/* Quality Score Ring */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <svg width="48" height="48" viewBox="0 0 48 48" className="transform -rotate-90">
                  <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="4" />
                  <circle
                    cx="24" cy="24" r="18" fill="none"
                    className={q.text}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18 * (1 - profile.overallQuality / 100)}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-xs font-bold", q.text)}>{profile.overallQuality}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="shrink-0 grid grid-cols-3 gap-2 px-5 py-3 border-b bg-muted/10">
          <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-background/60">
            <Rows3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-bold tabular-nums">{profile.rowCount.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">Rows</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-background/60">
            <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-bold tabular-nums">{profile.columnCount}</span>
            <span className="text-[10px] text-muted-foreground">Columns</span>
          </div>
          <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-background/60">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-bold tabular-nums">{profile.columns.reduce((s, c) => s + (c.completeness >= 80 ? 1 : 0), 0)}/{profile.columnCount}</span>
            <span className="text-[10px] text-muted-foreground">Healthy</span>
          </div>
        </div>

        {/* Column List */}
        <ScrollArea className="flex-1">
          <div className="px-2 py-2">
            <div className="flex items-center justify-between px-2 py-1.5 mb-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> Columns ({profile.columns.length})
              </span>
            </div>

            <div className="rounded-lg border border-border/50 overflow-hidden bg-background/50">
              {profile.columns.map((col, i) => (
                <ColumnRow key={`${col.name}-${i}`} col={col} />
              ))}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

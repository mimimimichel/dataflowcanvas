'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  X,
  Columns3,
  Rows3,
  CheckCircle2,
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

function ColumnRow({ col }: { col: NonNullable<DatasetProfile>['columns'][number] }) {
  const [expanded, setExpanded] = useState(false);
  const completeness = col.completeness;
  const ok = completeness >= 80;
  const warn = completeness >= 50;

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
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
              "text-[10px] font-semibold px-1.5 py-0.5 rounded",
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
        <div className="px-6 pb-3 pt-1 bg-muted/20">
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

  const healthyCount = profile.columns.reduce((s, c) => s + (c.completeness >= 80 ? 1 : 0), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] max-w-[95vw] flex flex-col" side="right">
        {/* Header */}
        <div className={cn("shrink-0 px-5 pt-5 pb-4 pr-12 border-b", q.bg)}>
          <SheetHeader className="space-y-2">
            <div className="flex items-center justify-between">
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

              {/* Quality score */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
                    <circle cx="24" cy="24" r="18" fill="none" className="text-muted/30" stroke="currentColor" strokeWidth="4" />
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
          </SheetHeader>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2 mt-3">
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
              <span className="text-sm font-bold tabular-nums">{healthyCount}/{profile.columnCount}</span>
              <span className="text-[10px] text-muted-foreground">Healthy</span>
            </div>
          </div>

          {/* Close button */}
          <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>

        {/* Column List */}
        <ScrollArea className="flex-1">
          <div className="px-3 py-2">
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

'use client';

const MAX_PREVIEW_ROWS = 50;

import React, { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Table2,
  ArrowRight,
  Filter,
  Layers,
  AlertCircle,
  Search,
  Hash,
  CaseSensitive,
  Calendar,
  ToggleLeft,
  Braces,
  Brackets,
} from 'lucide-react';
import type { PipelinePreviewResult } from '@/lib/pipeline-executor';
import { cn } from '@/lib/utils';

interface DataPreviewPanelProps {
  preview: PipelinePreviewResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeName: string;
}

// Foundry-style column type glyphs — a quick visual scan of the schema without reading labels.
const TYPE_META: Record<string, { icon: React.ElementType; label: string; numeric?: boolean }> = {
  string: { icon: CaseSensitive, label: 'string' },
  int: { icon: Hash, label: 'int', numeric: true },
  integer: { icon: Hash, label: 'integer', numeric: true },
  long: { icon: Hash, label: 'long', numeric: true },
  double: { icon: Hash, label: 'double', numeric: true },
  float: { icon: Hash, label: 'float', numeric: true },
  boolean: { icon: ToggleLeft, label: 'boolean' },
  date: { icon: Calendar, label: 'date' },
  timestamp: { icon: Calendar, label: 'timestamp' },
  array: { icon: Brackets, label: 'array' },
  object: { icon: Braces, label: 'object' },
};

function typeMeta(type: string) {
  return TYPE_META[type] || { icon: CaseSensitive, label: type };
}

function OperationBadge({ description }: { description: string }) {
  const isFilter = description.toLowerCase().includes('filter');
  return (
    <span
      className={cn(
        "text-[10px] font-mono px-1.5 py-0.5 rounded-sm border flex items-center gap-1",
        isFilter
          ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
          : "border-primary/30 text-primary bg-primary/5"
      )}
    >
      {isFilter ? <Filter className="h-2.5 w-2.5" /> : <Layers className="h-2.5 w-2.5" />}
      {description}
    </span>
  );
}

function formatCellValue(value: string | number | boolean | null | undefined): React.ReactNode {
  if (value == null || value === undefined) {
    return <span className="text-muted-foreground/40 italic">null</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={cn("font-medium", value ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
        {String(value)}
      </span>
    );
  }
  if (typeof value === 'number') {
    return <span className="tabular-nums">{Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)}</span>;
  }
  return <span title={String(value)}>{String(value)}</span>;
}

export default function DataPreviewPanel({
  preview,
  open,
  onOpenChange,
  nodeName,
}: DataPreviewPanelProps) {
  const [filter, setFilter] = useState('');

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return preview.rows;
    return preview.rows.filter(row =>
      preview.columns.some(col => String(row[col.name] ?? '').toLowerCase().includes(q))
    );
  }, [preview, filter]);

  const visibleColumns = preview ? preview.columns.slice(0, 10) : [];
  const hiddenColumnCount = preview ? preview.columns.length - visibleColumns.length : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden font-mono rounded-t-xl border-t">
        {/* Drag-handle affordance, Foundry/bottom-sheet convention */}
        <div className="shrink-0 flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        {!preview ? (
          <div className="px-6 py-10 text-center space-y-1.5 font-body">
            <SheetTitle className="text-sm font-semibold">{nodeName}</SheetTitle>
            <SheetDescription className="text-sm">
              No sample data available for this node yet — upload sample data or define its schema to preview it.
            </SheetDescription>
          </div>
        ) : (
        <>

        {/* Header — flat, information-dense, Foundry-style dataset preview chrome */}
        <div className="shrink-0 px-5 pb-3 border-b bg-muted/30 font-body">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-primary/10 ring-1 ring-primary/20">
              <Table2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-semibold truncate">{nodeName}</SheetTitle>
              <SheetDescription className="text-xs mt-0">Data Sample Preview</SheetDescription>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground border rounded-sm px-2 py-1 bg-background shrink-0">
              {filter ? `${filteredRows.length.toLocaleString()} matched` : preview.previewRowCount.toLocaleString()} / {preview.totalRows.toLocaleString()} rows · {preview.columns.length} cols
            </span>
          </div>

          {/* Lineage chain */}
          {preview.appliedOperations.length > 0 && (
            <div className="mt-2.5 flex flex-col items-start gap-1.5">
              <div className="flex items-center flex-wrap gap-1">
                {preview.nodeChain.map((name, i) => (
                  <React.Fragment key={name + i}>
                    {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                    <span className={cn(
                      "text-[11px] font-mono px-1.5 py-0.5 rounded-sm border",
                      i === preview.nodeChain.length - 1
                        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                        : "bg-background border-border text-muted-foreground"
                    )}>
                      {name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {preview.appliedOperations.map((op, i) => (
                  <OperationBadge key={i} description={op} />
                ))}
              </div>
            </div>
          )}

          {/* Filter toolbar */}
          <div className="relative mt-3 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter rows..."
              className="h-8 pl-8 text-xs font-mono bg-background"
            />
          </div>
        </div>

        {/* Data grid */}
        <ScrollArea className="flex-1">
          <div className="px-4 pb-4 pt-3">
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/60">
                    <th className="w-[42px] text-muted-foreground text-center py-1.5 border-b border-r bg-muted/80 sticky left-0 font-normal">#</th>
                    {visibleColumns.map((col, i) => {
                      const meta = typeMeta(col.type);
                      const Icon = meta.icon;
                      return (
                        <th
                          key={col.name + i}
                          className={cn("py-1.5 px-2.5 border-b font-normal", meta.numeric ? "text-right" : "text-left")}
                        >
                          <div className={cn("flex flex-col gap-0.5", meta.numeric && "items-end")}>
                            <span className="font-semibold text-foreground">{col.name}</span>
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70 uppercase tracking-wide">
                              <Icon className="h-2.5 w-2.5" /> {meta.label}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    {hiddenColumnCount > 0 && (
                      <th className="py-1.5 px-2.5 border-b text-left text-muted-foreground font-normal">+{hiddenColumnCount} more</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={cn("hover:bg-primary/5", rowIdx % 2 === 1 && "bg-muted/20")}>
                      <td className="text-muted-foreground text-center py-1 border-r bg-muted/30 sticky left-0 tabular-nums">
                        {rowIdx + 1}
                      </td>
                      {visibleColumns.map((col, colIdx) => {
                        const meta = typeMeta(col.type);
                        return (
                          <td key={col.name + colIdx} className={cn("py-1 px-2.5", meta.numeric ? "text-right" : "text-left")}>
                            {formatCellValue(row[col.name])}
                          </td>
                        );
                      })}
                      {hiddenColumnCount > 0 && (
                        <td className="py-1 px-2.5 text-muted-foreground/50">—</td>
                      )}
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={visibleColumns.length + 1 + (hiddenColumnCount > 0 ? 1 : 0)}
                        className="py-12 text-center font-body"
                      >
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                          {filter ? 'No rows match your filter' : 'No rows returned'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {filter ? 'Try a different search term' : 'Check your filter criteria'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {preview.totalRows > MAX_PREVIEW_ROWS && (
              <div className="mt-2.5 text-center font-body">
                <p className="text-xs text-muted-foreground">
                  Showing first {MAX_PREVIEW_ROWS} of {preview.totalRows.toLocaleString()} rows
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        </>
        )}
      </SheetContent>
    </Sheet>
  );
}

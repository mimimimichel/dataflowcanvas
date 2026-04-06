'use client';

const MAX_PREVIEW_ROWS = 50;

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
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  X,
  Table2,
  ArrowRight,
  Filter,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { PipelinePreviewResult } from '@/lib/pipeline-executor';
import { cn } from '@/lib/utils';

interface DataPreviewPanelProps {
  preview: PipelinePreviewResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeName: string;
}

function OperationBadge({ description }: { description: string }) {
  const isFilter = description.toLowerCase().includes('filter');
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-mono px-2 py-0.5 flex items-center gap-1",
        isFilter
          ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
          : "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5"
      )}
    >
      {isFilter ? <Filter className="h-2.5 w-2.5" /> : <Layers className="h-2.5 w-2.5" />}
      {description}
    </Badge>
  );
}

function formatCellValue(value: string | number | boolean | null | undefined): React.ReactNode {
  if (value == null || value === undefined) {
    return (
      <span className="text-muted-foreground/40 italic text-[10px]">null</span>
    );
  }
  if (typeof value === 'boolean') {
    return (
      <span className={cn(
        "text-[10px] font-medium px-1 py-0.5 rounded",
        value
          ? "text-emerald-600 bg-emerald-500/10"
          : "text-rose-600 bg-rose-500/10"
      )}>
        {String(value)}
      </span>
    );
  }
  if (typeof value === 'number') {
    return (
      <span className="font-mono text-[11px] tabular-nums">
        {Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)}
      </span>
    );
  }
  return (
    <span className="text-xs" title={String(value)}>
      {String(value)}
    </span>
  );
}

export default function DataPreviewPanel({
  preview,
  open,
  onOpenChange,
  nodeName,
}: DataPreviewPanelProps) {
  if (!preview) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[560px] max-w-[95vw] p-0 flex flex-col" side="right">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Table2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-sm font-semibold">{nodeName}</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Data Sample Preview
              </SheetDescription>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                {preview.previewRowCount}/{preview.totalRows.toLocaleString()} rows
              </Badge>
            </div>
          </div>

          {/* Operation chain */}
          {preview.appliedOperations.length > 0 && (
            <div className="mt-3 flex flex-col items-start gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Pipeline
              </span>
              <div className="flex items-center flex-wrap gap-1">
                {preview.nodeChain.map((name, i) => (
                  <React.Fragment key={name + i}>
                    {i > 0 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40" />}
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium",
                      i === preview.nodeChain.length - 1
                        ? "bg-primary/10 text-primary font-semibold"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {preview.appliedOperations.map((op, i) => (
                  <OperationBadge key={i} description={op} />
                ))}
              </div>
            </div>
          )}

          {/* Close button */}
          <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </div>

        {/* Data table */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[40px] text-[10px] text-muted-foreground text-center py-1.5">#</TableHead>
                    {preview.columns.slice(0, 8).map((col, i) => (
                      <TableHead key={col.name + i} className="text-[10px] text-muted-foreground py-1.5">
                        <div className="flex flex-col">
                          <span className="font-medium">{col.name}</span>
                          <span className="font-normal text-muted-foreground/60 font-mono text-[9px]">{col.type}</span>
                        </div>
                      </TableHead>
                    ))}
                    {preview.columns.length > 8 && (
                      <TableHead className="text-[10px] text-muted-foreground py-1.5">
                        +{preview.columns.length - 8} more
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-muted/30">
                      <TableCell className="text-[9px] text-muted-foreground text-center font-mono py-1 px-1 w-[40px]">
                        {rowIdx + 1}
                      </TableCell>
                      {preview.columns.slice(0, 8).map((col, colIdx) => (
                        <TableCell key={col.name + colIdx} className="py-1 px-2">
                          {formatCellValue(row[col.name])}
                        </TableCell>
                      ))}
                      {preview.columns.length > 8 && (
                        <TableCell className="py-1 px-2 text-[9px] text-muted-foreground">—</TableCell>
                      )}
                    </TableRow>
                  ))}
                  {preview.rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={Math.min(preview.columns.length, 8) + 2}
                        className="py-8 text-center"
                      >
                        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No rows returned</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Check your filter criteria
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {preview.totalRows > MAX_PREVIEW_ROWS && (
              <div className="mt-2 text-center">
                <p className="text-[10px] text-muted-foreground">
                  Showing first {MAX_PREVIEW_ROWS} of {preview.totalRows.toLocaleString()} rows
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

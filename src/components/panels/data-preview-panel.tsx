'use client';

const MAX_PREVIEW_ROWS = 50;

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Maximize2,
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
    return <span className="text-muted-foreground/40 italic text-[10px]">null</span>;
  }
  if (typeof value === 'boolean') {
    return (
      <span className={cn(
        "text-[10px] font-medium px-1 py-0.5 rounded",
        value ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] w-[95vw] max-h-[95vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Table2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">{nodeName}</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Data Sample Preview
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="text-xs px-2.5 py-1">
              {preview.previewRowCount}/{preview.totalRows.toLocaleString()} rows
            </Badge>
          </div>

          {/* Operation chain */}
          {preview.appliedOperations.length > 0 && (
            <div className="mt-3 flex flex-col items-start gap-1.5">
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Pipeline
              </span>
              <div className="flex items-center flex-wrap gap-1.5">
                {preview.nodeChain.map((name, i) => (
                  <React.Fragment key={name + i}>
                    {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-md font-medium",
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
        </DialogHeader>

        {/* Data table */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-4">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[50px] text-xs text-muted-foreground text-center py-2">#</TableHead>
                    {preview.columns.slice(0, 10).map((col, i) => (
                      <TableHead key={col.name + i} className="text-xs text-muted-foreground py-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{col.name}</span>
                          <span className="font-normal text-muted-foreground/60 font-mono text-[10px]">{col.type}</span>
                        </div>
                      </TableHead>
                    ))}
                    {preview.columns.length > 10 && (
                      <TableHead className="text-xs text-muted-foreground py-2">
                        +{preview.columns.length - 10} more
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground text-center font-mono py-2 px-2 w-[50px]">
                        {rowIdx + 1}
                      </TableCell>
                      {preview.columns.slice(0, 10).map((col, colIdx) => (
                        <TableCell key={col.name + colIdx} className="py-2 px-3">
                          {formatCellValue(row[col.name])}
                        </TableCell>
                      ))}
                      {preview.columns.length > 10 && (
                        <TableCell className="py-2 px-3 text-xs text-muted-foreground">—</TableCell>
                      )}
                    </TableRow>
                  ))}
                  {preview.rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={Math.min(preview.columns.length, 10) + 2}
                        className="py-12 text-center"
                      >
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No rows returned</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Check your filter criteria
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {preview.totalRows > MAX_PREVIEW_ROWS && (
              <div className="mt-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Showing first {MAX_PREVIEW_ROWS} of {preview.totalRows.toLocaleString()} rows
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

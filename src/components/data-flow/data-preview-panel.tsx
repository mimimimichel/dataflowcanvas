'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  FileText,
  DatabaseZap,
  Activity,
  ChevronRight,
  Trash,
  X,
  Table as TableIcon,
  Info,
} from 'lucide-react';
import { PipelineNode, Field, NodeType, Operation } from '@/lib/pipeline-data';
import { simulateDataProfile, DataProfile } from '@/lib/data-profiler';

interface DataPreviewPanelProps {
  node: PipelineNode | null;
  onClose: () => void;
  isOpen: boolean;
}

const qualityColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40';
  if (score >= 50) return 'bg-amber-500/20 text-amber-600 border-amber-500/40';
  return 'bg-red-500/20 text-red-600 border-red-500/40';
};

const qualityLabel = (score: number) => {
  if (score >= 80) return 'Excellent';
  if (score >= 50) return 'Fair';
  return 'Poor';
};

function MiniHistogram({
  buckets,
  maxCount,
}: {
  buckets: { value: string; count: number }[];
  maxCount: number;
}) {
  return (
    <div className="flex items-end gap-0.5 h-14 mt-2">
      {buckets.slice(0, 12).map((b, i) => {
        const pct = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
        return (
          <TooltipProvider key={i}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex-1 bg-primary/40 hover:bg-primary/60 rounded-sm min-w-[6px] transition-colors cursor-pointer"
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-[10px]">
                  {b.value}: {b.count}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

export default function DataPreviewPanel({
  node,
  onClose,
  isOpen,
}: DataPreviewPanelProps) {
  if (!node) return null;

  const fields: Field[] =
    node.outputFields && node.outputFields.length > 0
      ? node.outputFields
      : node.inputFields || [];
  const operationType = node.operation?.type || 'source';
  const profile = simulateDataProfile(fields, operationType, node);

  const allBucketMax = Math.max(
    ...Object.values(profile.distributions).flatMap((d) =>
      d.buckets.map((b) => b.count)
    ),
    1
  );

  const dataSourceLabel =
    node.type === 'source' ? 'Raw Source Data' : 'Transformed Data';
  const dataSourceIcon =
    node.type === 'source' ? (
      <DatabaseZap className="w-3 h-3" />
    ) : (
      <Activity className="w-3 h-3" />
    );

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 bg-background/95 backdrop-blur border-l border-border shadow-2xl z-50 transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Data Preview</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="h-[calc(100vh-48px)]">
        <div className="p-3 space-y-3">
          {/* Node Info */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground truncate" title={node.name}>
              {node.name}
            </span>
            <ChevronRight className="w-3 h-3" />
            <Badge variant="outline" className="text-[9px] capitalize">
              {node.type}
            </Badge>
          </div>

          <Separator />

          {/* Quality Score */}
          <Card className="border border-border bg-card/50">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
                  Quality Score
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {qualityLabel(profile.qualityScore)}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-xs font-bold ${qualityColor(profile.qualityScore)}`}
              >
                {profile.qualityScore}/100
              </Badge>
            </CardContent>
          </Card>

          <Tabs defaultValue="schema" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="schema" className="text-[10px]">
                Schema
              </TabsTrigger>
              <TabsTrigger value="samples" className="text-[10px]">
                Samples
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schema" className="mt-2 space-y-2">
              {/* Schema Table */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[9px] font-semibold text-muted-foreground h-7 px-2">
                        Column
                      </TableHead>
                      <TableHead className="text-[9px] font-semibold text-muted-foreground h-7 px-2">
                        Type
                      </TableHead>
                      <TableHead className="text-[9px] font-semibold text-muted-foreground h-7 px-2 text-right">
                        Null%
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.schema.map((col) => (
                      <TableRow key={col.name} className="hover:bg-muted/30">
                        <TableCell className="text-[10px] font-mono py-1.5 px-2 truncate max-w-[90px]" title={col.name}>
                          {col.name}
                        </TableCell>
                        <TableCell className="text-[9px] text-muted-foreground py-1.5 px-2">
                          {col.type}
                        </TableCell>
                        <TableCell className="text-[10px] py-1.5 px-2 text-right">
                          {(profile.nullRate[col.name] ?? 0).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Per-column stats */}
              {profile.schema.map((col) => {
                const dist = profile.distributions[col.name];
                if (!dist || dist.buckets.length === 0) return null;
                return (
                  <Card key={col.name} className="border border-border bg-card/30">
                    <CardContent className="p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-medium" title={col.name}>
                          {col.name}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {profile.uniqueValues[col.name] ?? 0} unique
                        </span>
                      </div>
                      <MiniHistogram
                        buckets={dist.buckets}
                        maxCount={allBucketMax}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="samples" className="mt-2">
              {/* Sample Rows */}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {profile.schema.slice(0, 5).map((col) => (
                        <TableHead
                          key={col.name}
                          className="text-[8px] font-semibold text-muted-foreground h-6 px-1.5 whitespace-nowrap"
                        >
                          {col.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.sampleRows.map((row, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        {profile.schema.slice(0, 5).map((col) => (
                          <TableCell
                            key={col.name}
                            className="text-[9px] font-mono py-1 px-1.5 truncate max-w-[60px]"
                            title={String(row[col.name] ?? '')}
                          >
                            {String(row[col.name] ?? '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Data Source */}
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border">
            {dataSourceIcon}
            <span className="text-[10px] text-muted-foreground">
              {dataSourceLabel}
            </span>
            <Badge variant="secondary" className="ml-auto text-[8px]">
              Mock
            </Badge>
          </div>

          {/* Row Count */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <TableIcon className="w-3 h-3" />
              Total Rows
            </span>
            <span className="font-mono font-semibold">
              {profile.rowCount.toLocaleString()}
            </span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

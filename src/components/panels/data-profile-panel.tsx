'use client';

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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  X,
  Database,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Info,
  Hash,
  Sigma,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldProfile {
  name: string;
  type: string;
  nonNullCount: number;
  nullCount: number;
  uniqueCount: number;
  completeness: number;
  nullPercentage: number;
  uniquePercentage: number;
  hasNulls: boolean;
  isUnique: boolean;
  mostCommon?: { value: string; count: number }[];
}

interface DataProfilePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    totalRecords: number;
    fieldCount: number;
    fields: Record<string, FieldProfile>;
  } | null;
  nodeName: string;
  onAnalyze?: () => void;
}

export default function DataProfilePanel({
  open,
  onOpenChange,
  profile,
  nodeName,
  onAnalyze,
}: DataProfilePanelProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null);

  if (!profile) return null;

  const overallCompleteness = profile.fieldCount > 0
    ? Object.values(profile.fields).reduce((sum, f) => sum + f.completeness, 0) / profile.fieldCount
    : 0;

  const overallCompletenessPct = overallCompleteness * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] sm:max-h-[90vh] w-[95vw] max-h-[95vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <Database className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">Data Profile — {nodeName}</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Statistical analysis of dataset structure and quality
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2.5 py-1">
                {profile.totalRecords.toLocaleString()} records
              </Badge>
              <Badge variant="outline" className="text-xs px-2.5 py-1">
                {profile.fieldCount} fields
              </Badge>
            </div>
          </div>

          {/* Overall completeness */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Overall Data Completeness
              </span>
              <span className="font-semibold">{overallCompletenessPct.toFixed(1)}%</span>
            </div>
            <Progress value={overallCompletenessPct} className="h-2" />
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {Object.entries(profile.fields).map(([fieldName, field]) => {
              const isExpanded = expandedField === fieldName;
              const completenessPct = field.completeness * 100;
              const nullPct = field.nullPercentage * 100;

              return (
                <div
                  key={fieldName}
                  className={cn(
                    "rounded-lg border cursor-pointer transition-all",
                    isExpanded ? "bg-muted/30 border-primary/30" : "hover:bg-muted/20"
                  )}
                  onClick={() => setExpandedField(isExpanded ? null : fieldName)}
                >
                  {/* Field summary row */}
                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "p-1.5 rounded-md",
                        field.type.includes('int') || field.type.includes('float')
                          ? "bg-blue-500/10 text-blue-500"
                          : field.type.includes('bool')
                          ? "bg-green-500/10 text-green-500"
                          : "bg-purple-500/10 text-purple-500"
                      )}>
                        {field.type.includes('int') || field.type.includes('float') ? (
                          <Hash className="h-3.5 w-3.5" />
                        ) : field.type.includes('bool') ? (
                          <Percent className="h-3.5 w-3.5" />
                        ) : (
                          <Info className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{fieldName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{field.type}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Completeness</p>
                        <p className={cn(
                          "text-sm font-semibold",
                          field.completeness >= 0.95 ? "text-emerald-600" :
                          field.completeness >= 0.8 ? "text-amber-600" : "text-red-600"
                        )}>
                          {completenessPct.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Nulls</p>
                        <p className={cn(
                          "text-sm font-semibold",
                          field.nullCount > 0 ? "text-amber-600" : "text-muted-foreground"
                        )}>
                          {field.nullCount.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Unique</p>
                        <p className="text-sm font-semibold">
                          {field.uniqueCount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mini completeness bar */}
                  <div className="px-4 pb-2">
                    <Progress value={completenessPct} className="h-1.5" />
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 rounded-md bg-muted/50">
                          <p className="text-muted-foreground mb-1">Non-null values</p>
                          <p className="font-semibold">{field.nonNullCount.toLocaleString()}</p>
                        </div>
                        <div className="p-2.5 rounded-md bg-muted/50">
                          <p className="text-muted-foreground mb-1">Null values</p>
                          <p className="font-semibold">{field.nullCount.toLocaleString()} ({nullPct.toFixed(1)}%)</p>
                        </div>
                        <div className="p-2.5 rounded-md bg-muted/50">
                          <p className="text-muted-foreground mb-1">Unique values</p>
                          <p className="font-semibold">{field.uniqueCount.toLocaleString()}</p>
                        </div>
                      </div>

                      {field.mostCommon && field.mostCommon.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Most common values
                          </p>
                          <div className="space-y-1.5">
                            {field.mostCommon.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="w-16 font-mono text-muted-foreground truncate">
                                  {String(item.value).slice(0, 16)}
                                </span>
                                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary/40 rounded-full"
                                    style={{ width: `${Math.min((item.count / profile.totalRecords) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="w-12 text-right font-mono">{item.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quality indicators */}
                      <div className="mt-3 flex gap-2">
                        {field.hasNulls && (
                          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 bg-amber-500/5">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Has nulls
                          </Badge>
                        )}
                        {field.isUnique && (
                          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Unique
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

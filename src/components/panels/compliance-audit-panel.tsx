'use client';

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPLIANCE_DIMENSION_LABELS, type ComplianceAuditResult, type ComplianceIssue, type ComplianceSeverity } from '@/lib/pipeline-data';

interface ComplianceAuditPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ComplianceAuditResult | null;
}

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-500',
  B: 'text-lime-500',
  C: 'text-amber-500',
  D: 'text-orange-500',
  E: 'text-red-500',
};

const SEVERITY_ICON: Record<ComplianceSeverity, React.ReactNode> = {
  info: <Info className="h-3.5 w-3.5 text-sky-500 shrink-0" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
  critical: <AlertOctagon className="h-3.5 w-3.5 text-red-500 shrink-0" />,
};

const SEVERITY_ORDER: Record<ComplianceSeverity, number> = { critical: 0, warning: 1, info: 2 };

const SEVERITY_TABS: { value: ComplianceSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

function IssueRow({ issue }: { issue: ComplianceIssue }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/50 text-xs">
      {SEVERITY_ICON[issue.severity]}
      <span className="text-foreground/90 flex-1">{issue.message}</span>
      <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
        {COMPLIANCE_DIMENSION_LABELS[issue.dimension]}
      </Badge>
    </div>
  );
}

export default function ComplianceAuditPanel({ open, onOpenChange, result }: ComplianceAuditPanelProps) {
  const [severityTab, setSeverityTab] = useState<ComplianceSeverity | 'all'>('all');

  const sortedIssues = useMemo(() => {
    if (!result) return [];
    return [...result.issues].sort((a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      COMPLIANCE_DIMENSION_LABELS[a.dimension].localeCompare(COMPLIANCE_DIMENSION_LABELS[b.dimension])
    );
  }, [result]);

  const countsBySeverity = useMemo(() => {
    const counts: Record<ComplianceSeverity, number> = { critical: 0, warning: 0, info: 0 };
    sortedIssues.forEach(issue => { counts[issue.severity]++; });
    return counts;
  }, [sortedIssues]);

  if (!result) return null;

  const visibleIssues = severityTab === 'all' ? sortedIssues : sortedIssues.filter(i => i.severity === severityTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] sm:max-h-[90vh] w-[95vw] max-h-[95vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">Compliance Audit</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Data product readiness, scored against completeness, coherence, quality, maintainability &amp; security.
              </DialogDescription>
            </div>
            <div className="text-center shrink-0">
              <p className={cn('text-3xl font-bold leading-none', GRADE_COLOR[result.grade])}>{result.grade}</p>
              <p className="text-xs text-muted-foreground mt-1">{result.score}/100</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {result.dimensions.map(dim => (
                <div key={dim.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {dim.label} <span className="text-[10px] opacity-60">({Math.round(dim.weight * 100)}%)</span>
                    </span>
                    <span className="font-semibold">{dim.score}/100</span>
                  </div>
                  <Progress value={dim.score} className="h-2" />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Findings
                </h3>
                <Badge variant="outline" className="text-[10px]">{result.issues.length} issue{result.issues.length === 1 ? '' : 's'}</Badge>
              </div>

              {sortedIssues.length === 0 ? (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-center">
                  <p className="text-sm text-emerald-600">No issues found — this pipeline is audit-clean.</p>
                </div>
              ) : (
                <Tabs value={severityTab} onValueChange={(v) => setSeverityTab(v as ComplianceSeverity | 'all')}>
                  <TabsList className="w-full justify-start h-9">
                    {SEVERITY_TABS.map(tab => {
                      const count = tab.value === 'all' ? sortedIssues.length : countsBySeverity[tab.value];
                      return (
                        <TabsTrigger key={tab.value} value={tab.value} disabled={count === 0} className="gap-1.5 text-xs">
                          {tab.label}
                          <span className="text-[10px] text-muted-foreground">{count}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  <TabsContent value={severityTab} className="space-y-1.5">
                    {visibleIssues.map((issue, idx) => <IssueRow key={idx} issue={issue} />)}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

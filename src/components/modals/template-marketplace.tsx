'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Brain, ArrowRight } from 'lucide-react';
import { ALL_TEMPLATES } from '@/lib/pipeline-templates';
import type { PipelineTemplate } from '@/lib/pipeline-templates';
import { cn } from '@/lib/utils';

interface TemplateMarketplaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: PipelineTemplate) => void;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'flight-ops': { label: 'Flight Ops', icon: <Package className="h-3.5 w-3.5" />, color: 'bg-sky-500/10 text-sky-500' },
  maintenance: { label: 'Maintenance', icon: <Brain className="h-3.5 w-3.5" />, color: 'bg-amber-500/10 text-amber-500' },
  'supply-chain': { label: 'Supply Chain', icon: <Package className="h-3.5 w-3.5" />, color: 'bg-emerald-500/10 text-emerald-500' },
  'data-ingestion': { label: 'Data Pipeline', icon: <Package className="h-3.5 w-3.5" />, color: 'bg-violet-500/10 text-violet-500' },
  quality: { label: 'Quality', icon: <Search className="h-3.5 w-3.5" />, color: 'bg-rose-500/10 text-rose-500' },
};

const DIFFICULTY: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'bg-emerald-500/10 text-emerald-500' },
  intermediate: { label: 'Intermediate', color: 'bg-amber-500/10 text-amber-500' },
  advanced: { label: 'Advanced', color: 'bg-rose-500/10 text-rose-500' },
};

function TemplateCard({ template, onClick }: { template: PipelineTemplate; onClick: () => void }) {
  const meta = CATEGORY_META[template.category];
  const diff = DIFFICULTY[template.difficulty] || DIFFICULTY.beginner;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/60 bg-card p-4
        hover:border-primary/30 hover:bg-primary/5 transition-all duration-200
        group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", meta.color)}>
            {meta.icon}
          </div>
          <h3 className="text-sm font-medium tracking-tight">{template.name}</h3>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {template.description}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" className={`text-[10px] px-2 py-0 rounded-full font-medium border-none ${meta.color}`}>
          {meta.label}
        </Badge>
        <Badge variant="secondary" className={`text-[10px] px-2 py-0 rounded-full font-medium border-none ${diff.color}`}>
          {diff.label}
        </Badge>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {template.nodes.length} nodes
        </span>
      </div>
    </button>
  );
}

export default function TemplateMarketplace({ open, onOpenChange, onSelectTemplate }: TemplateMarketplaceProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = ALL_TEMPLATES.filter(t => {
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    const matchSearch = search === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b space-y-4">
          <div className="space-y-1">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Template Marketplace
            </DialogTitle>
            <DialogDescription className="text-sm">
              Pre-built Foundry data pipelines — click to load into your canvas
            </DialogDescription>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates, tags..."
              className="pl-9 h-10 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full font-medium transition-all border",
                activeCategory === 'all'
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border-transparent"
              )}
            >
              All ({ALL_TEMPLATES.length})
            </button>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const count = ALL_TEMPLATES.filter(t => t.category === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-medium transition-all border flex items-center gap-1",
                    activeCategory === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border-transparent"
                  )}
                >
                  {meta.icon}
                  {meta.label} ({count})
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Template list */}
        <ScrollArea className="flex-1">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No templates found
              </div>
            )}
            {filtered.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onClick={() => {
                  onSelectTemplate(t);
                  onOpenChange(false);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

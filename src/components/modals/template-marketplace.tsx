'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, ArrowRight, Layers, Eye } from 'lucide-react';
import { ALL_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/pipeline-templates';
import type { PipelineTemplate } from '@/lib/pipeline-templates';

interface TemplateMarketplaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: PipelineTemplate) => void;
}

const difficultyStyle: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function TemplateMarketplace({ open, onOpenChange, onSelectTemplate }: TemplateMarketplaceProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = ALL_TEMPLATES.filter(t => {
    const matchSearch = search === '' || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] h-[85vh] flex flex-col p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Layers className="h-5 w-5" /> Template Marketplace
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Pre-built Foundry pipeline templates — click to load into your canvas.
          </DialogDescription>
        </DialogHeader>

        {/* Search + Filters */}
        <div className="space-y-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates..." className="pl-8 h-8 sm:h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setActiveCategory('all')}
              className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full border transition ${activeCategory === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>
              All ({ALL_TEMPLATES.length})
            </button>
            {TEMPLATE_CATEGORIES.map(cat => {
              const count = ALL_TEMPLATES.filter(t => t.category === cat.id).length;
              return (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full border transition ${activeCategory === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>
                  {cat.icon} {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Cards */}
        <ScrollArea className="flex-1 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2">
            {filtered.map(template => (
              <div key={template.id} className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors group">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className="text-lg">{template.icon}</span>
                    {template.name}
                  </h3>
                  <Badge className={`text-[9px] ${difficultyStyle[template.difficulty]}`}>
                    {template.difficulty}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed line-clamp-2">{template.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[9px] py-0 h-4">{tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground">
                    {template.nodes.length} nodes · {template.connectors.length} connectors
                  </span>
                  <button
                    onClick={() => onSelectTemplate(template)}
                    className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
                  >
                    Load <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No templates match your search.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

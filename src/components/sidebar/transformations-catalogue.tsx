'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { transformations, TransformationItem, advancedTransformations } from '@/lib/pipeline-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TransformationsCatalogueProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const DraggableItem: React.FC<{item: TransformationItem}> = ({ item }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'move';
    };

    const content = (
        <div 
            draggable 
            onDragStart={handleDragStart} 
            className="flex items-center gap-4 p-2.5 rounded-lg hover:bg-white/5 cursor-grab w-full text-left transition-colors border border-transparent hover:border-white/5"
        >
            <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
              <item.icon className="w-4 h-4 text-primary flex-shrink-0" />
            </div>
            <span className="font-medium text-sm text-foreground/90">{item.name}</span>
        </div>
    );
    
    if (!item.description) {
        return content;
    }

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" align="start" className="max-w-xs glass-panel">
            <p className="text-xs">{item.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
};

const CatalogueSection: React.FC<{title: string, items: TransformationItem[], itemType: TransformationItem['type']}> = ({title, items, itemType}) => {
  if (items.length === 0) return null;
  return (
      <div className="space-y-1.5">
          <h3 className="px-2.5 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{title}</h3>
          <div className="space-y-0.5">
            {items.map((item) => (
                <DraggableItem key={item.operationType || item.name} item={{...item, type: itemType}} />
            ))}
          </div>
      </div>
  );
};


const TransformationsCatalogue: React.FC<TransformationsCatalogueProps> = ({ isCollapsed, onToggleCollapse }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransformations = useMemo(() => {
    if (!searchTerm) {
      return {
        sources: transformations.sources,
        dataset: transformations.dataset,
        destination: transformations.destination,
        common: transformations.common,
        advanced: advancedTransformations,
      };
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const filterItems = (items: TransformationItem[]) => items.filter(item => 
        item.name.toLowerCase().includes(lowerCaseSearchTerm) || 
        item.description?.toLowerCase().includes(lowerCaseSearchTerm)
    );

    const filteredAdvanced = (advancedTransformations || [])
      .map(category => ({
        ...category,
        items: filterItems(category.items)
      }))
      .filter(category => category.items.length > 0);

    return {
      sources: filterItems(transformations.sources),
      dataset: filterItems([transformations.dataset])[0] || { name: '', icon: () => null, type: 'dataset', description: ''},
      destination: filterItems([transformations.destination])[0] || { name: '', icon: () => null, type: 'destination', description: ''},
      common: filterItems(transformations.common),
      advanced: filteredAdvanced,
    };
  }, [searchTerm]);

  if (isCollapsed) return null;

  return (
    <aside className={cn(
      "w-80 glass-panel shrink-0 flex flex-col z-40 transition-all duration-300",
      "after:absolute after:inset-y-0 after:right-0 after:w-[1px] after:bg-white/5"
    )}>
        <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-tight">Catalogue</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-white/5" onClick={onToggleCollapse}>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 h-9 bg-black/20 border-white/5 focus:border-primary/50 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-4 space-y-8">
                <CatalogueSection title="Sources" items={filteredTransformations.sources} itemType="source" />
                
                <div className="space-y-4">
                    <CatalogueSection title="Common Transformations" items={filteredTransformations.common} itemType="transformation" />
                    
                    {filteredTransformations.advanced.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="advanced" className="border-b-0">
                                <AccordionTrigger className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest hover:no-underline px-2.5 py-2 hover:bg-white/5 rounded-lg transition-colors">
                                    Advanced Operations
                                </AccordionTrigger>
                                <AccordionContent className="p-1 space-y-6 pt-4">
                                    {filteredTransformations.advanced.map((category) => (
                                      <div key={category.category} className="space-y-1.5">
                                        <h4 className="px-2.5 text-[9px] uppercase font-semibold text-muted-foreground/60 tracking-wider">{category.category}</h4>
                                        <div className="space-y-0.5">
                                          {category.items.map(item => (
                                            <DraggableItem key={item.operationType || item.name} item={{...item, type: 'transformation'}} />
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </div>
               
                {filteredTransformations.dataset.name && (
                    <CatalogueSection title="Datasets" items={[filteredTransformations.dataset]} itemType="dataset" />
                )}
                
                {filteredTransformations.destination.name && (
                    <CatalogueSection title="Destinations" items={[filteredTransformations.destination]} itemType="destination" />
                )}
            </div>
        </ScrollArea>
    </aside>
  );
};

export default TransformationsCatalogue;

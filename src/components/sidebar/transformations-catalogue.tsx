
'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { transformations, TransformationItem } from '@/lib/pipeline-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, type Icon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DraggableItem: React.FC<{item: TransformationItem}> = ({ item }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'move';
    };

    const content = (
        <div 
            draggable 
            onDragStart={handleDragStart} 
            className="flex items-center gap-4 p-2 rounded-md hover:bg-muted cursor-grab w-full text-left"
        >
            <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-medium text-sm">{item.name}</span>
        </div>
    );
    
    if (!item.description) {
        return content;
    }

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" align="start" className="max-w-xs">
            <p>{item.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
};

const CatalogueSection: React.FC<{title: string, items: TransformationItem[], itemType: TransformationItem['type']}> = ({title, items, itemType}) => {
  if (items.length === 0) return null;
  return (
      <div className="space-y-1">
          <h3 className="px-2 text-sm font-semibold text-muted-foreground">{title}</h3>
          {items.map((item) => (
              <DraggableItem key={item.operationType || item.name} item={{...item, type: itemType}} />
          ))}
      </div>
  );
};


const TransformationsCatalogue: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransformations = useMemo(() => {
    if (!searchTerm) {
      return transformations;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const filterItems = (items: TransformationItem[]) => items.filter(item => 
        item.name.toLowerCase().includes(lowerCaseSearchTerm) || 
        item.description?.toLowerCase().includes(lowerCaseSearchTerm)
    );

    return {
      sources: filterItems(transformations.sources),
      dataset: transformations.dataset.name.toLowerCase().includes(lowerCaseSearchTerm) || 
        transformations.dataset.description?.toLowerCase().includes(lowerCaseSearchTerm)
        ? transformations.dataset
        : { name: '', icon: (() => null) as Icon, type: 'dataset' as const, description: '' },
      destination: transformations.destination.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        transformations.destination.description?.toLowerCase().includes(lowerCaseSearchTerm)
        ? transformations.destination
        : { name: '', icon: (() => null) as Icon, type: 'destination' as const, description: '' },
      common: filterItems(transformations.common),
      advanced: filterItems(transformations.advanced),
    };
  }, [searchTerm]);

  return (
    <aside className="w-80 border-r bg-card flex flex-col shrink-0">
        <div className="p-4 border-b">
            <h2 className="text-lg font-bold">Catalogue</h2>
            <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search transformations..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
                <CatalogueSection title="Sources" items={filteredTransformations.sources} itemType="source" />
                
                <div className="space-y-2">
                    <CatalogueSection title="Transformations courantes" items={filteredTransformations.common} itemType="transformation" />
                    
                    {filteredTransformations.advanced.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="advanced" className="border-b-0">
                                <AccordionTrigger className="text-sm font-semibold text-muted-foreground hover:no-underline px-2 py-2">
                                    Transformations avancées
                                </AccordionTrigger>
                                <AccordionContent className="p-1 space-y-1">
                                    {filteredTransformations.advanced.map((item) => (
                                        <DraggableItem key={item.operationType} item={{...item, type: 'transformation'}} />
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

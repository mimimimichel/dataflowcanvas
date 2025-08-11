
'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { transformations, TransformationItem } from '@/lib/pipeline-data';
import { Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TransformationsCatalogueProps {
}

const DraggableSidebarMenuButton: React.FC<{item: TransformationItem, children: React.ReactNode}> = ({ item, children }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'move';
    };

    const button = (
        <div draggable onDragStart={handleDragStart} className="w-full">
            <div className="cursor-grab w-full justify-start p-2 rounded-md hover:bg-muted flex items-center gap-2 text-sm">
                {children}
            </div>
        </div>
    );

    if (item.description) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" align="center" className="max-w-xs">
                        <p className="font-semibold">{item.category}</p>
                        <p className="text-muted-foreground">{item.description}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    return button;
};

const TransformationsCatalogue: React.FC<TransformationsCatalogueProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransformations = useMemo(() => {
    if (!searchTerm) {
      return transformations;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const filteredSources = transformations.sources.filter(source => 
      source.name.toLowerCase().includes(lowerCaseSearchTerm)
    );

    const filteredCategories = transformations.categories.map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.name.toLowerCase().includes(lowerCaseSearchTerm) || 
        item.description?.toLowerCase().includes(lowerCaseSearchTerm)
      ),
    })).filter(category => category.items.length > 0);

    const isDatasetVisible = transformations.dataset.name.toLowerCase().includes(lowerCaseSearchTerm);
    const isDestinationVisible = transformations.destination.name.toLowerCase().includes(lowerCaseSearchTerm);

    return {
      sources: filteredSources,
      dataset: isDatasetVisible ? transformations.dataset : { name: '', icon: () => null, type: 'dataset' as const, description: '' },
      destination: isDestinationVisible ? transformations.destination : { name: '', icon: () => null, type: 'destination' as const, description: '' },
      categories: filteredCategories,
    };
  }, [searchTerm]);

  const defaultAccordionOpen = useMemo(() => {
      if(searchTerm) {
          return filteredTransformations.categories.map(c => c.name);
      }
      return ['TRANSFORMATIONS DE NETTOYAGE (Data Cleaning)'];
  }, [searchTerm, filteredTransformations.categories]);

  return (
    <aside className="w-72 border-r bg-card flex flex-col shrink-0">
        <div className="p-2 border-b">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search transformations..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-2">
                <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sources</p>
                {filteredTransformations.sources.map((source) => (
                    <DraggableSidebarMenuButton key={source.name} item={{...source, type: 'source'}}>
                        <source.icon className="h-4 w-4" />
                        {source.name}
                    </DraggableSidebarMenuButton>
                ))}
            </div>
            
            <Accordion type="multiple" className="w-full px-2" defaultValue={defaultAccordionOpen} key={searchTerm}>
                {filteredTransformations.categories.map(category => (
                    <AccordionItem value={category.name} key={category.name} className="border-none">
                        <AccordionTrigger className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline hover:bg-muted rounded-md [&[data-state=open]>svg]:rotate-180">
                            <span className="flex-1 text-left">{category.name}</span>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 pl-2">
                           <div className="py-1">
                                {category.items.map((item) => (
                                    <DraggableSidebarMenuButton key={item.name} item={{...item, type: 'transformation', category: category.name}}>
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </DraggableSidebarMenuButton>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
           
            {filteredTransformations.dataset.name && (
                 <div className="p-2">
                    <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Datasets</p>
                    <DraggableSidebarMenuButton item={{...filteredTransformations.dataset, type: 'dataset'}}>
                        <filteredTransformations.dataset.icon className="h-4 w-4" />
                        {filteredTransformations.dataset.name}
                    </DraggableSidebarMenuButton>
                </div>
            )}
            
            {filteredTransformations.destination.name && (
                 <div className="p-2">
                    <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Destinations</p>
                    <DraggableSidebarMenuButton item={{...filteredTransformations.destination, type: 'destination'}}>
                        <filteredTransformations.destination.icon className="h-4 w-4" />
                        {filteredTransformations.destination.name}
                    </DraggableSidebarMenuButton>
                </div>
            )}
        </ScrollArea>
    </aside>
  );
};

export default TransformationsCatalogue;

    

'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { transformations, TransformationItem } from '@/lib/pipeline-data';
import { Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';


interface TransformationsCatalogueProps {
  onAddNode: (item: TransformationItem, position: { x: number; y: number }) => void;
}

const DraggableSidebarMenuButton: React.FC<{item: TransformationItem, children: React.ReactNode}> = ({ item, children }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
    };

    const button = (
        <div draggable onDragStart={handleDragStart} className="w-full">
            <SidebarMenuButton className="cursor-grab w-full justify-start">
                {children}
            </SidebarMenuButton>
        </div>
    );

    if (item.category) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" align="center">
                        <p>{item.category}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    return button;
};

const TransformationsCatalogue: React.FC<TransformationsCatalogueProps> = ({ onAddNode }) => {
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
        item.name.toLowerCase().includes(lowerCaseSearchTerm)
      ),
    })).filter(category => category.items.length > 0);

    const isDatasetVisible = transformations.dataset.name.toLowerCase().includes(lowerCaseSearchTerm);
    const isDestinationVisible = transformations.destination.name.toLowerCase().includes(lowerCaseSearchTerm);

    return {
      sources: filteredSources,
      dataset: isDatasetVisible ? transformations.dataset : { name: '', icon: () => null, type: 'dataset' as const },
      destination: isDestinationVisible ? transformations.destination : { name: '', icon: () => null, type: 'destination' as const },
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
    <aside className="w-64 border-r hidden md:flex flex-col shrink-0">
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
            {filteredTransformations.sources.length > 0 && (
                <div className="p-2">
                    <SidebarGroupLabel>Sources</SidebarGroupLabel>
                    <SidebarMenu>
                        {filteredTransformations.sources.map((source) => (
                            <SidebarMenuItem key={source.name}>
                                <DraggableSidebarMenuButton item={{...source, type: 'source'}}>
                                    <source.icon />
                                    {source.name}
                                </DraggableSidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </div>
            )}
            
            {filteredTransformations.categories.length > 0 && (
                <Accordion type="multiple" className="px-2 w-full" defaultValue={defaultAccordionOpen} key={searchTerm}>
                    {filteredTransformations.categories.map(category => (
                        <AccordionItem value={category.name} key={category.name} className="border-none">
                            <AccordionTrigger className="p-2 text-xs font-medium text-sidebar-foreground/70 hover:no-underline hover:bg-muted rounded-md [&[data-state=open]>svg]:rotate-180">
                                <span className="flex-1 text-left">{category.name}</span>
                            </AccordionTrigger>
                            <AccordionContent className="p-0 pl-2">
                                <SidebarMenu className="py-2">
                                    {category.items.map((item) => (
                                        <SidebarMenuItem key={item.name}>
                                            <DraggableSidebarMenuButton item={{...item, type: 'transformation', category: category.name}}>
                                                <item.icon />
                                                {item.name}
                                            </DraggableSidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
           
            {filteredTransformations.dataset.name && (
                <div className="p-2">
                    <SidebarGroupLabel>Datasets</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DraggableSidebarMenuButton item={{...filteredTransformations.dataset, type: 'dataset'}}>
                                <filteredTransformations.dataset.icon />
                                {filteredTransformations.dataset.name}
                            </DraggableSidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
            )}
            
            {filteredTransformations.destination.name && (
                 <div className="p-2">
                    <SidebarGroupLabel>Destinations</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DraggableSidebarMenuButton item={{...filteredTransformations.destination, type: 'destination'}}>
                                <filteredTransformations.destination.icon />
                                {filteredTransformations.destination.name}
                            </DraggableSidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
            )}
        </ScrollArea>
    </aside>
  );
};

export default TransformationsCatalogue;

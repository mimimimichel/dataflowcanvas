
'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { transformations, TransformationItem } from '@/lib/pipeline-data';
import { Search, type Icon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '../ui/sidebar';

const DraggableSidebarMenuButton: React.FC<{item: TransformationItem, children: React.ReactNode}> = ({ item, children }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div draggable onDragStart={handleDragStart} className="w-full">
            <SidebarMenuButton 
                tooltip={{ children: item.name, side:'right', align: 'center'}}
                className="w-full justify-start cursor-grab" 
                asChild
            >
                <div>
                  {children}
                </div>
            </SidebarMenuButton>
        </div>
    );
};

const CatalogueSection: React.FC<{title: string, items: TransformationItem[], itemType: TransformationItem['type']}> = ({title, items, itemType}) => {
  if (items.length === 0) return null;
  return (
      <div className="p-2">
          <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 group-data-[collapsible=icon]:hidden">{title}</p>
          <SidebarMenu>
          {items.map((item) => (
              <SidebarMenuItem key={item.operationType || item.name}>
                  <DraggableSidebarMenuButton item={{...item, type: itemType}}>
                      <item.icon className="h-4 w-4" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                  </DraggableSidebarMenuButton>
              </SidebarMenuItem>
          ))}
          </SidebarMenu>
      </div>
  );
};

const AdvancedTransformations: React.FC<{
  categories: {name: string, items: TransformationItem[]}[], 
  defaultOpen: string[]
}> = ({categories, defaultOpen}) => {
  if (categories.length === 0) return null;
  return (
       <Accordion type="multiple" className="w-full px-2 group-data-[collapsible=icon]:hidden" defaultValue={defaultOpen}>
           <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline hover:bg-muted rounded-md [&[data-state=open]>svg]:rotate-180">
                  <span className="flex-1 text-left">Transformations Avancées</span>
              </AccordionTrigger>
              <AccordionContent className="p-0 pl-2">
                 {categories.map(category => (
                      <Accordion key={category.name} type="multiple" defaultValue={[category.name]}>
                           <AccordionItem value={category.name} key={category.name} className="border-none">
                              <AccordionTrigger className="p-2 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider hover:no-underline hover:bg-muted/80 rounded-md [&[data-state=open]>svg]:rotate-180">
                                  <span className="flex-1 text-left">{category.name}</span>
                              </AccordionTrigger>
                              <AccordionContent className="p-0 pl-2">
                                 <SidebarMenu>
                                      {category.items.map((item) => (
                                          <SidebarMenuItem key={item.operationType || item.name}>
                                              <DraggableSidebarMenuButton item={{...item, type: 'transformation'}}>
                                                  <item.icon className="h-4 w-4" />
                                                  <span>{item.name}</span>
                                              </DraggableSidebarMenuButton>
                                          </SidebarMenuItem>
                                      ))}
                                  </SidebarMenu>
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>
                 ))}
              </AccordionContent>
          </AccordionItem>
      </Accordion>
  )
}

const TransformationsCatalogue: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const filteredTransformations = useMemo(() => {
    if (!searchTerm) {
      return transformations;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const filteredSources = transformations.sources.filter(source => 
      source.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
    
    const filteredCommon = transformations.common.filter(item => 
        item.name.toLowerCase().includes(lowerCaseSearchTerm) || 
        item.description?.toLowerCase().includes(lowerCaseSearchTerm)
    );

    const filteredAdvanced = transformations.advanced.map(category => ({
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
      dataset: isDatasetVisible ? transformations.dataset : { name: '', icon: (() => null) as Icon, type: 'dataset' as const, description: '' },
      destination: isDestinationVisible ? transformations.destination : { name: '', icon: (() => null) as Icon, type: 'destination' as const, description: '' },
      common: filteredCommon,
      advanced: filteredAdvanced,
    };
  }, [searchTerm]);

  const defaultAccordionOpen = useMemo(() => {
      if(searchTerm) {
          return filteredTransformations.advanced.map(c => c.name);
      }
      return [];
  }, [searchTerm, filteredTransformations.advanced]);
  
  const allAdvancedItems = useMemo(() => 
    filteredTransformations.advanced.flatMap(category => category.items),
    [filteredTransformations.advanced]
  );

  return (
    <Sidebar collapsible="icon" className="w-72">
        <SidebarHeader>
            <div className="relative p-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search transformations..." 
                  className="pl-8 group-data-[collapsible=icon]:hidden"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </SidebarHeader>
        <SidebarContent>
            <CatalogueSection title="Sources" items={filteredTransformations.sources} itemType="source" />
            
            <CatalogueSection title="Transformations Courantes" items={filteredTransformations.common} itemType="transformation" />
            
            {isCollapsed ? (
                 <CatalogueSection title="Transformations Avancées" items={allAdvancedItems} itemType="transformation" />
            ) : (
                <AdvancedTransformations categories={filteredTransformations.advanced} defaultOpen={defaultAccordionOpen}/>
            )}
           
            {filteredTransformations.dataset.name && (
                <CatalogueSection title="Datasets" items={[filteredTransformations.dataset]} itemType="dataset" />
            )}
            
            {filteredTransformations.destination.name && (
                <CatalogueSection title="Destinations" items={[filteredTransformations.destination]} itemType="destination" />
            )}
        </SidebarContent>
    </Sidebar>
  );
};

export default TransformationsCatalogue;

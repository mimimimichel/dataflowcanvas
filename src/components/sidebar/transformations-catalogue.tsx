
import React from 'react';
import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { transformations, TransformationItem } from '@/lib/pipeline-data';
import { Search } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
  return (
    <Sidebar className="w-64 border-r hidden md:flex shrink-0">
        <SidebarHeader>
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search transformations..." className="pl-8" />
            </div>
        </SidebarHeader>
        <SidebarContent className="p-0">
            <SidebarGroup className="p-2">
                <SidebarGroupLabel>Sources</SidebarGroupLabel>
                 <SidebarMenu>
                    <SidebarMenuItem>
                         <DraggableSidebarMenuButton item={{...transformations.source, type: 'source'}}>
                            <transformations.source.icon />
                            {transformations.source.name}
                        </DraggableSidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
            
            <Accordion type="multiple" className="px-2 w-full">
                {transformations.categories.map(category => (
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
           
            <SidebarGroup className="p-2">
                <SidebarGroupLabel>Destinations</SidebarGroupLabel>
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <DraggableSidebarMenuButton item={{...transformations.destination, type: 'destination'}}>
                            <transformations.destination.icon />
                            {transformations.destination.name}
                        </DraggableSidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
  );
};

export default TransformationsCatalogue;

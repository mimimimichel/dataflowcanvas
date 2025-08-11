import React from 'react';
import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { transformations, TransformationItem } from '@/lib/pipeline-data';
import { Search, EyeOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TransformationsCatalogueProps {
  onAddNode: (item: TransformationItem, position: { x: number; y: number }) => void;
}

const DraggableSidebarMenuButton: React.FC<{item: TransformationItem, children: React.ReactNode}> = ({ item, children }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
    };

    const button = (
        <div draggable onDragStart={handleDragStart}>
            <SidebarMenuButton className="cursor-grab">
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
        <SidebarContent>
            <SidebarGroup>
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
            
            {transformations.categories.map(category => (
                 <SidebarGroup key={category.name}>
                    <SidebarGroupLabel>{category.name}</SidebarGroupLabel>
                     <SidebarMenu>
                        {category.items.map((item) => (
                            <SidebarMenuItem key={item.name}>
                                <DraggableSidebarMenuButton item={{...item, type: 'transformation', category: category.name}}>
                                    <item.icon />
                                    {item.name}
                                </DraggableSidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
           
            <SidebarGroup>
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

    
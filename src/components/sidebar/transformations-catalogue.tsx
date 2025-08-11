import React from 'react';
import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { transformations } from '@/lib/pipeline-data';
import { Search } from 'lucide-react';

const TransformationsCatalogue: React.FC = () => {
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
                        <SidebarMenuButton>
                            <transformations.source.icon />
                            {transformations.source.name}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
             <SidebarGroup>
                <SidebarGroupLabel>Transformations</SidebarGroupLabel>
                 <SidebarMenu>
                    {transformations.transform.map((item) => (
                        <SidebarMenuItem key={item.name}>
                            <SidebarMenuButton>
                                <item.icon />
                                {item.name}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarGroupLabel>Destinations</SidebarGroupLabel>
                 <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton>
                            <transformations.destination.icon />
                            {transformations.destination.name}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
  );
};

export default TransformationsCatalogue;

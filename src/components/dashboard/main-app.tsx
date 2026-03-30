'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Header from '@/components/layout/header';
import TransformationsCatalogue from '@/components/sidebar/transformations-catalogue';
import NodeConfigurationPanel from '@/components/sidebar/node-configuration-panel';
import Node from '@/components/data-flow/node';
import Connector from '@/components/data-flow/connector';
import GroupZone from '@/components/data-flow/group-zone';
import { 
  PipelineNode, 
  TransformationItem, 
  Connector as ConnectorType, 
  Field, 
  Operation, 
  PipelineVersion,
  mockLineages,
  LineageInfo,
  NodeGroup
} from '@/lib/pipeline-data';
import { cn } from '@/lib/utils';
import ConnectionFieldsModal from '@/components/data-flow/connection-fields-modal';
import PythonCodeModal from '@/components/modals/python-code-modal';
import SpecModal from '@/components/modals/spec-modal';
import { generatePythonCode } from '@/lib/python-generator';
import { generatePipelineSpec } from '@/ai/flows/generate-spec-flow';
import LineageDashboard from '@/components/dashboard/lineage-dashboard';
import { useToast } from '@/hooks/use-toast';
import { 
  ZoomIn, ZoomOut, RotateCcw, Crosshair, Keyboard, 
  MousePointer2, BoxSelect, Trash2, Group, Square, 
  LayoutDashboard, Boxes
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type SvgDimensions = {
  width: number | string;
  height: number | string;
  top: number;
  left: number;
};

const PORT_Y_OFFSET = 45;
const NODE_WIDTH = 256;

const ShortcutLegend = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute bottom-20 left-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="glass-panel rounded-2xl p-4 space-y-3 border border-border shadow-2xl min-w-[240px]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Raccourcis Clavier</span>
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-50 hover:opacity-100" onClick={onClose}>
            <span className="text-xs">×</span>
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <MousePointer2 className="h-3 w-3" /> Clic Gauche
            </div>
            <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">Glisser / Pan</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <BoxSelect className="h-3 w-3" /> Clic Droit
            </div>
            <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">Sélection</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Square className="h-3 w-3" /> Bouton Dessiner
            </div>
            <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">Créer Zone</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Group className="h-3 w-3" /> Ctrl + G
            </div>
            <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">Grouper</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Trash2 className="h-3 w-3" /> Suppr / Backspace
            </div>
            <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">Supprimer</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MainApp() {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'dashboard' | 'editor'>('dashboard');
  const [lineages, setLineages] = useState<LineageInfo[]>(mockLineages);
  const [activeLineageId, setActiveLineageId] = useState<string>('lineage-1');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);
  
  const activeLineage = useMemo(() => 
    lineages.find(l => l.id === activeLineageId) || lineages[0], 
  [lineages, activeLineageId]);

  const [activeVersionId, setActiveVersionId] = useState<string>(activeLineage.versions[0].id);
  
  const activeVersion = useMemo(() => 
    activeLineage.versions.find(v => v.id === activeVersionId) || activeLineage.versions[0], 
  [activeLineage, activeVersionId]);
  
  const nodes = activeVersion.nodes;
  const connectors = activeVersion.connectors;
  const groups = activeVersion.groups || [];

  const setNodes = useCallback((updater: React.SetStateAction<PipelineNode[]>) => {
    setLineages(currentLineages => currentLineages.map(l => 
      l.id === activeLineageId ? {
        ...l,
        versions: l.versions.map(v => v.id === activeVersionId ? { 
          ...v, 
          nodes: typeof updater === 'function' ? updater(v.nodes) : updater 
        } : v)
      } : l
    ));
  }, [activeLineageId, activeVersionId]);
  
  const setConnectors = useCallback((updater: React.SetStateAction<ConnectorType[]>) => {
    setLineages(currentLineages => currentLineages.map(l => 
      l.id === activeLineageId ? {
        ...l,
        versions: l.versions.map(v => v.id === activeVersionId ? { 
          ...v, 
          connectors: typeof updater === 'function' ? updater(v.connectors) : updater 
        } : v)
      } : l
    ));
  }, [activeLineageId, activeVersionId]);

  const setGroups = useCallback((updater: React.SetStateAction<NodeGroup[]>) => {
    setLineages(currentLineages => currentLineages.map(l => 
      l.id === activeLineageId ? {
        ...l,
        versions: l.versions.map(v => v.id === activeVersionId ? { 
          ...v, 
          groups: typeof updater === 'function' ? updater(v.groups || []) : updater 
        } : v)
      } : l
    ));
  }, [activeLineageId, activeVersionId]);

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType | null>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [newConnector, setNewConnector] = useState<{ from: string; to: { x: number; y: number } } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ startX: number, startY: number, x: number, y: number, width: number, height: number } | null>(null);
  const [drawingZoneRect, setDrawingZoneRect] = useState<{ startX: number, startY: number, x: number, y: number, width: number, height: number } | null>(null);
  
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [generatedPythonCode, setGeneratedPythonCode] = useState('');
  
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [generatedSpec, setGeneratedSpec] = useState('');
  const [isSpecLoading, setIsSpecLoading] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isDrawingZoneRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const draggingNodeIdRef = useRef<string | null>(null);
  const draggingGroupIdRef = useRef<string | null>(null);
  const resizingGroupIdRef = useRef<string | null>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const isConnectingRef = useRef(false);

  const [connectionForFields, setConnectionForFields] = useState<{fromNodeId: string, toNodeId: string} | null>(null);
  const [svgDimensions, setSvgDimensions] = useState<SvgDimensions>({ width: '100%', height: '100%', top: 0, left: 0 });

  // Cycle safe descendant retriever
  const getDescendants = useCallback((parentId: string, currentGroups: NodeGroup[], currentNodes: PipelineNode[], visited = new Set<string>()): { groupIds: string[], nodeIds: string[] } => {
    if (visited.has(parentId)) return { groupIds: [], nodeIds: [] };
    visited.add(parentId);

    const childGroups = currentGroups.filter(g => g.parentGroupId === parentId);
    const childNodes = currentNodes.filter(n => n.groupId === parentId);

    let groupIds = childGroups.map(g => g.id);
    let nodeIds = childNodes.map(n => n.id);

    childGroups.forEach(cg => {
      const descendants = getDescendants(cg.id, currentGroups, currentNodes, visited);
      groupIds = [...groupIds, ...descendants.groupIds];
      nodeIds = [...nodeIds, ...descendants.nodeIds];
    });

    return { groupIds, nodeIds };
  }, []);

  // Cycle safe ancestor collapse check
  const isAncestorCollapsed = useCallback((targetGroupId: string | undefined, visited = new Set<string>()): boolean => {
    if (!targetGroupId || visited.has(targetGroupId)) return false;
    visited.add(targetGroupId);
    
    const group = groups.find(g => g.id === targetGroupId);
    if (!group) return false;
    if (group.isCollapsed) return true;
    return isAncestorCollapsed(group.parentGroupId, visited);
  }, [groups]);

  // Cycle safe highest collapsed ancestor finder
  const getHighestCollapsedAncestor = useCallback((targetGroupId: string | undefined, visited = new Set<string>()): NodeGroup | null => {
    if (!targetGroupId || visited.has(targetGroupId)) return null;
    visited.add(targetGroupId);
    
    const group = groups.find(g => g.id === targetGroupId);
    if (!group) return null;
    
    const parentCollapsed = getHighestCollapsedAncestor(group.parentGroupId, visited);
    if (parentCollapsed) return parentCollapsed;
    
    if (group.isCollapsed) return group;
    return null;
  }, [groups]);

  const handleNodeSelect = (id: string, isShift: boolean) => {
    setSelectedConnector(null);
    if (isShift) {
      setSelectedNodeIds(prev => prev.includes(id) ? prev.filter(nodeId => nodeId !== id) : [...prev, id]);
    } else {
      if (!selectedNodeIds.includes(id)) {
        setSelectedNodeIds([id]);
        setSelectedGroupIds([]);
      }
    }
  };

  const handleGroupSelect = (id: string, isShift: boolean) => {
    setSelectedConnector(null);
    if (isShift) {
      setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]);
    } else {
      if (!selectedGroupIds.includes(id)) {
        setSelectedGroupIds([id]);
        setSelectedNodeIds([]);
      }
    }
  };

  const finalizeNodeDrag = useCallback(() => {
    const draggingId = draggingNodeIdRef.current;
    if (!draggingId) return;
    
    setNodes(currentNodes => {
      return currentNodes.map(node => {
        if (node.id === draggingId || selectedNodeIds.includes(node.id)) {
          const centerX = node.position.x + (NODE_WIDTH / 2);
          const centerY = node.position.y + 60;

          const containingGroups = groups.filter(g => {
            const currentWidth = g.isCollapsed ? Math.max(250, g.width * 0.4) : g.width;
            const currentHeight = g.isCollapsed ? 64 : g.height;
            return centerX >= g.position.x && centerX <= g.position.x + currentWidth &&
                   centerY >= g.position.y && centerY <= g.position.y + currentHeight;
          });

          containingGroups.sort((a, b) => {
              const aLevel = (g: NodeGroup) => { let l = 0, p = g.parentGroupId; while(p){ l++; p = groups.find(x => x.id === p)?.parentGroupId; } return l; };
              return aLevel(b) - aLevel(a);
          });
          
          return { ...node, groupId: containingGroups[0]?.id || undefined };
        }
        return node;
      });
    });
    draggingNodeIdRef.current = null;
  }, [selectedNodeIds, groups, setNodes]);

  const finalizeGroupDrag = useCallback(() => {
    const draggingId = draggingGroupIdRef.current;
    if (!draggingId) return;

    const isDescendantOf = (childId: string, parentId: string, visited = new Set<string>()): boolean => {
      if (!childId || visited.has(childId)) return false;
      visited.add(childId);
      const childGroup = groups.find(g => g.id === childId);
      if (!childGroup || !childGroup.parentGroupId) return false;
      if (childGroup.parentGroupId === parentId) return true;
      return isDescendantOf(childGroup.parentGroupId, parentId, visited);
    };

    setGroups(currentGroups => {
      return currentGroups.map(group => {
        if (group.id === draggingId || selectedGroupIds.includes(group.id)) {
          const centerX = group.position.x + (group.width / 2);
          const centerY = group.position.y + 32;

          const containingGroups = currentGroups.filter(g => {
            if (g.id === group.id || selectedGroupIds.includes(g.id) || isDescendantOf(g.id, group.id)) return false;
            const currentWidth = g.isCollapsed ? Math.max(250, g.width * 0.4) : g.width;
            const currentHeight = g.isCollapsed ? 64 : g.height;
            return centerX >= g.position.x && centerX <= g.position.x + currentWidth &&
                   centerY >= g.position.y && centerY <= g.position.y + currentHeight;
          });

          containingGroups.sort((a, b) => {
              const aLevel = (g: NodeGroup) => { let l = 0, p = g.parentGroupId; while(p){ l++; p = currentGroups.find(x => x.id === p)?.parentGroupId; } return l; };
              return aLevel(b) - aLevel(a);
          });

          return { ...group, parentGroupId: containingGroups[0]?.id || undefined };
        }
        return group;
      });
    });
    draggingGroupIdRef.current = null;
  }, [selectedGroupIds, groups, setGroups]);

  const finalizeResize = useCallback(() => {
    const resizingId = resizingGroupIdRef.current;
    if (!resizingId) return;

    const group = groups.find(g => g.id === resizingId);
    if (!group) return;

    setNodes(currentNodes => {
      return currentNodes.map(node => {
        const centerX = node.position.x + (NODE_WIDTH / 2);
        const centerY = node.position.y + 60;
        const currentWidth = group.isCollapsed ? Math.max(250, group.width * 0.4) : group.width;
        const currentHeight = group.isCollapsed ? 64 : group.height;
        const isInside = centerX >= group.position.x && centerX <= group.position.x + currentWidth &&
                        centerY >= group.position.y && centerY <= group.position.y + currentHeight;

        if (isInside && node.groupId !== group.id) return { ...node, groupId: group.id };
        else if (!isInside && node.groupId === group.id) return { ...node, groupId: undefined };
        return node;
      });
    });

    resizingGroupIdRef.current = null;
  }, [groups, setNodes]);

  const handleCreateGroup = useCallback(() => {
    if (selectedNodeIds.length === 0 && selectedGroupIds.length === 0) {
      toast({ title: "Aucun élément sélectionné", description: "Sélectionnez des nœuds ou des zones pour les grouper.", variant: "destructive" });
      return;
    }

    const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
    const selectedSubGroups = groups.filter(g => selectedGroupIds.includes(g.id));
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedNodes.forEach(n => {
      minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_WIDTH); maxY = Math.max(maxY, n.position.y + 150);
    });

    selectedSubGroups.forEach(g => {
      minX = Math.min(minX, g.position.x); minY = Math.min(minY, g.position.y);
      maxX = Math.max(maxX, g.position.x + g.width); maxY = Math.max(maxY, g.position.y + g.height);
    });

    const padding = 60;
    const newGroupId = `group-${Date.now()}`;
    const newGroup: NodeGroup = {
      id: newGroupId,
      name: "Nouvelle Zone Fonctionnelle",
      color: "slate",
      position: { x: minX - padding, y: minY - padding },
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      isCollapsed: false
    };

    setGroups(prev => [
      ...prev.map(g => selectedGroupIds.includes(g.id) ? { ...g, parentGroupId: newGroupId } : g),
      newGroup
    ]);
    setNodes(prev => prev.map(n => selectedNodeIds.includes(n.id) ? { ...n, groupId: newGroupId } : n));
    setSelectedGroupIds([newGroupId]);
    
    toast({ title: "Zone créée", description: `${selectedNodeIds.length + selectedGroupIds.length} éléments groupés.` });
  }, [selectedNodeIds, selectedGroupIds, nodes, groups, toast, setGroups, setNodes]);

  const finalizeDrawingZone = useCallback(() => {
    if (!drawingZoneRect) return;
    if (drawingZoneRect.width < 50 || drawingZoneRect.height < 50) {
      setDrawingZoneRect(null);
      return;
    }

    const newGroupId = `group-${Date.now()}`;
    const newGroup: NodeGroup = {
      id: newGroupId,
      name: "Zone de Travail Personnalisée",
      color: "slate",
      position: { x: drawingZoneRect.x, y: drawingZoneRect.y },
      width: drawingZoneRect.width,
      height: drawingZoneRect.height,
      isCollapsed: false
    };

    setNodes(currentNodes => {
      return currentNodes.map(node => {
        const centerX = node.position.x + (NODE_WIDTH / 2);
        const centerY = node.position.y + 60;
        const isInside = centerX >= drawingZoneRect.x && centerX <= drawingZoneRect.x + drawingZoneRect.width &&
                        centerY >= drawingZoneRect.y && centerY <= drawingZoneRect.y + drawingZoneRect.height;
        return isInside ? { ...node, groupId: newGroupId } : node;
      });
    });

    setGroups(currentGroups => {
        const updated = currentGroups.map(g => {
            const centerX = g.position.x + (g.width / 2);
            const centerY = g.position.y + (g.height / 2);
            const isInside = centerX >= drawingZoneRect.x && centerX <= drawingZoneRect.x + drawingZoneRect.width &&
                            centerY >= drawingZoneRect.y && centerY <= drawingZoneRect.y + drawingZoneRect.height;
            return (isInside && g.id !== newGroupId) ? { ...g, parentGroupId: newGroupId } : g;
        });
        return [...updated, newGroup];
    });

    setSelectedGroupIds([newGroupId]);
    setDrawingZoneRect(null);
    setIsDrawMode(false); 
    toast({ title: "Zone de travail créée", description: "Éléments rattachés avec succès." });
  }, [drawingZoneRect, setGroups, setNodes, toast]);

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId).map(g => g.parentGroupId === groupId ? { ...g, parentGroupId: undefined } : g));
    setNodes(prev => prev.map(n => n.groupId === groupId ? { ...n, groupId: undefined } : n));
    setSelectedGroupIds(prev => prev.filter(id => id !== groupId));
  };

  const handleRenameGroup = (groupId: string, newName: string) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g));
  };

  const handleToggleGroupCollapse = (groupId: string) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g));
  };

  const handleOpenConfig = (nodeId: string) => {
    setSelectedNodeIds([nodeId]);
    setIsConfigPanelOpen(true);
  }

  const handleZoom = (delta: number) => {
    const newZoom = Math.min(Math.max(zoom + delta, 0.1), 3);
    setZoom(newZoom);
  };

  const handleResetCanvas = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (nodes.length === 0 || !canvasRef.current) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x); minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + NODE_WIDTH); maxY = Math.max(maxY, node.position.y + 100);
    });

    const padding = 100;
    const contentWidth = maxX - minX + (padding * 2);
    const contentHeight = maxY - minY + (padding * 2);
    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;

    const newZoom = Math.min(canvasWidth / contentWidth, canvasHeight / contentHeight, 1.5);
    setZoom(newZoom);
    setPan({
      x: (canvasWidth - contentWidth * newZoom) / 2 - minX * newZoom + padding * newZoom,
      y: (canvasHeight - contentHeight * newZoom) / 2 - minY * newZoom + padding * newZoom
    });
  };

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    
    const HORIZONTAL_GAP = 450;
    const VERTICAL_GAP = 320; // Increased vertical gap to prevent overlaps
    const PADDING = 100;

    // 1. Calculate levels for nodes (Topological levels)
    const levels: Record<string, number> = {};
    const getLevel = (nodeId: string, visited = new Set<string>()): number => {
      if (levels[nodeId] !== undefined) return levels[nodeId];
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);

      const incoming = connectors.filter(c => c.to === nodeId);
      if (incoming.length === 0) return 0;

      const level = Math.max(...incoming.map(c => getLevel(c.from, visited))) + 1;
      levels[nodeId] = level;
      return level;
    };

    nodes.forEach(n => getLevel(n.id));

    // 2. Group nodes by level, but sort by groupId to keep group members together
    const levelGroups: Record<number, string[]> = {};
    Object.entries(levels).forEach(([id, level]) => {
      if (!levelGroups[level]) levelGroups[level] = [];
      levelGroups[level].push(id);
    });
    
    Object.keys(levelGroups).forEach(level => {
      const l = parseInt(level);
      levelGroups[l].sort((a, b) => {
        const nodeA = nodes.find(n => n.id === a);
        const nodeB = nodes.find(n => n.id === b);
        // Secondary sort by name to be deterministic
        const groupCompare = (nodeA?.groupId || '').localeCompare(nodeB?.groupId || '');
        if (groupCompare !== 0) return groupCompare;
        return (nodeA?.name || '').localeCompare(nodeB?.name || '');
      });
    });

    // 3. Assign new positions to all nodes globally
    const newNodes = nodes.map(node => {
      const level = levels[node.id] || 0;
      const indexInLevel = levelGroups[level]?.indexOf(node.id) || 0;
      return {
        ...node,
        position: {
          x: level * HORIZONTAL_GAP + 200,
          y: indexInLevel * VERTICAL_GAP + 200
        }
      };
    });

    // 4. Update groups bottom-up (resize children then parents)
    const getGroupHierarchyDepth = (groupId: string | undefined): number => {
      if (!groupId) return 0;
      const group = groups.find(g => g.id === groupId);
      return 1 + getGroupHierarchyDepth(group?.parentGroupId);
    };

    const sortedGroups = [...groups].sort((a, b) => getGroupHierarchyDepth(b.id) - getGroupHierarchyDepth(a.id));

    let updatedGroups = [...groups];
    
    sortedGroups.forEach(group => {
      const immediateNodes = newNodes.filter(n => n.groupId === group.id);
      const immediateSubGroups = updatedGroups.filter(g => g.parentGroupId === group.id);

      if (immediateNodes.length === 0 && immediateSubGroups.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      immediateNodes.forEach(n => {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
        // Use a larger buffer for height to account for expanded state
        maxY = Math.max(maxY, n.position.y + 250);
      });

      immediateSubGroups.forEach(g => {
        minX = Math.min(minX, g.position.x);
        minY = Math.min(minY, g.position.y);
        maxX = Math.max(maxX, g.position.x + g.width);
        maxY = Math.max(maxY, g.position.y + g.height);
      });

      updatedGroups = updatedGroups.map(ug => {
        if (ug.id === group.id) {
          return {
            ...ug,
            position: { x: minX - PADDING, y: minY - PADDING },
            width: (maxX - minX) + (PADDING * 2),
            height: (maxY - minY) + (PADDING * 2)
          };
        }
        return ug;
      });
    });

    setNodes(newNodes);
    setGroups(updatedGroups);
    toast({ 
      title: "Auto-layout optimisé", 
      description: "Les espacements ont été augmentés pour garantir la lisibilité du pipeline." 
    });
  }, [nodes, connectors, groups, setNodes, setGroups, toast]);
  
  const handleAddNode = useCallback((item: TransformationItem, position: {x: number, y: number}) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = (position.x - canvasRect.left - pan.x) / zoom;
    const y = (position.y - canvasRect.top - pan.y) / zoom;

    const groupUnder = groups.find(g => {
      const currentWidth = g.isCollapsed ? Math.max(250, g.width * 0.4) : g.width;
      const currentHeight = g.isCollapsed ? 64 : g.height;
      return x >= g.position.x && x <= g.position.x + currentWidth &&
             y >= g.position.y && y <= g.position.y + currentHeight;
    });
    
    const newNode: PipelineNode = {
      id: `${item.type}-${Date.now()}`,
      name: item.name,
      type: item.type,
      status: 'draft',
      position: { x, y },
      groupId: groupUnder?.id,
      inputFields: [],
      outputFields: [],
    };
    setNodes((prev) => [...prev, newNode]);
  }, [pan.x, pan.y, zoom, groups, setNodes]);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    handleNodeSelect(nodeId, e.shiftKey);
    draggingNodeIdRef.current = nodeId;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleGroupMouseDown = (e: React.MouseEvent, groupId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    handleGroupSelect(groupId, e.shiftKey);
    draggingGroupIdRef.current = groupId;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, groupId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    resizingGroupIdRef.current = groupId;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    isConnectingRef.current = true;
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setNewConnector({ 
        from: nodeId, 
        to: { 
            x: (e.clientX - canvasRect.left - pan.x) / zoom,
            y: (e.clientY - canvasRect.top - pan.y) / zoom,
        } 
    });
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      isSelectingRef.current = true;
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setSelectionRect({ startX: x, startY: y, x, y, width: 0, height: 0 });
      if (!e.shiftKey) { setSelectedNodeIds([]); setSelectedGroupIds([]); }
    } 
    else if (e.button === 0) {
      if (isDrawMode) {
        isDrawingZoneRef.current = true;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;
        setDrawingZoneRect({ startX: x, startY: y, x, y, width: 0, height: 0 });
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      }
    }
    setSelectedConnector(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = (e.clientX - lastMousePosRef.current.x) / zoom;
    const dy = (e.clientY - lastMousePosRef.current.y) / zoom;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (isConnectingRef.current && newConnector) {
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      setNewConnector({ ...newConnector, to: { x: (e.clientX - canvasRect.left - pan.x) / zoom, y: (e.clientY - canvasRect.top - pan.y) / zoom } });
    } else if (isSelectingRef.current && selectionRect) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / zoom;
      const currentY = (e.clientY - rect.top - pan.y) / zoom;
      const x = Math.min(selectionRect.startX, currentX), y = Math.min(selectionRect.startY, currentY);
      const width = Math.abs(selectionRect.startX - currentX), height = Math.abs(selectionRect.startY - currentY);
      setSelectionRect({ ...selectionRect, x, y, width, height });
      setSelectedNodeIds(nodes.filter(n => !isAncestorCollapsed(n.groupId) && n.position.x >= x && n.position.x <= x + width && n.position.y >= y && n.position.y <= y + height).map(n => n.id));
    } else if (isDrawingZoneRef.current && drawingZoneRect) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / zoom;
      const currentY = (e.clientY - rect.top - pan.y) / zoom;
      const x = Math.min(drawingZoneRect.startX, currentX), y = Math.min(drawingZoneRect.startY, currentY);
      const width = Math.abs(drawingZoneRect.startX - currentX), height = Math.abs(drawingZoneRect.startY - currentY);
      setDrawingZoneRect({ ...drawingZoneRect, x, y, width, height });
    } else if (resizingGroupIdRef.current) {
      const groupId = resizingGroupIdRef.current;
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, width: Math.max(150, g.width + dx), height: Math.max(100, g.height + dy) } : g));
    } else if (draggingNodeIdRef.current) {
      setNodes(prevNodes => prevNodes.map(n => (n.id === draggingNodeIdRef.current || selectedNodeIds.includes(n.id)) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n));
    } else if (draggingGroupIdRef.current) {
      const targetIds = [draggingGroupIdRef.current, ...selectedGroupIds];
      
      let allGroupIds = new Set<string>();
      let allNodeIds = new Set<string>();
      targetIds.forEach(id => {
        allGroupIds.add(id);
        const descendants = getDescendants(id, groups, nodes);
        descendants.groupIds.forEach(gid => allGroupIds.add(gid));
        descendants.nodeIds.forEach(nid => allNodeIds.add(nid));
      });
      
      setGroups(prev => prev.map(g => allGroupIds.has(g.id) ? { ...g, position: { x: g.position.x + dx, y: g.position.y + dy } } : g));
      setNodes(prev => prev.map(n => allNodeIds.has(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n));
    } else if (isPanningRef.current) {
      setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    isPanningRef.current = false;
    if (isSelectingRef.current) { isSelectingRef.current = false; setSelectionRect(null); }
    if (isDrawingZoneRef.current) { isDrawingZoneRef.current = false; finalizeDrawingZone(); }
    if (draggingNodeIdRef.current) finalizeNodeDrag();
    if (draggingGroupIdRef.current) finalizeGroupDrag();
    if (resizingGroupIdRef.current) finalizeResize();
    if (isConnectingRef.current) {
        const toNodeId = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-node-id]')?.getAttribute('data-node-id');
        if (toNodeId && newConnector && newConnector.from !== toNodeId) handleNodeMouseUp(e, toNodeId);
        isConnectingRef.current = false; setNewConnector(null);
    }
  };
  
  const handleNodeMouseUp = (e: React.MouseEvent, toNodeId: string) => {
    if (isConnectingRef.current && newConnector && newConnector.from !== toNodeId) {
        setConnectionForFields({ fromNodeId: newConnector.from, toNodeId });
    }
  }

  const handleSaveConnectionFields = (fromNodeId: string, toNodeId: string, selectedFields: Field[]) => {
    setConnectors(prev => [...prev, { from: fromNodeId, to: toNodeId }]);
    setNodes(currentNodes => currentNodes.map(n => n.id === toNodeId ? { ...n, inputFields: [...(n.inputFields || []), ...selectedFields], outputFields: (n.outputFields?.length ? n.outputFields : selectedFields) } : n));
    setConnectionForFields(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const itemString = e.dataTransfer.getData('application/json');
    if (itemString) handleAddNode(JSON.parse(itemString), { x: e.clientX, y: e.clientY });
  }, [handleAddNode]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleWheel = (e: React.WheelEvent) => {
    if (e.target instanceof HTMLElement && (e.target.closest('[data-node-id]') || e.target.closest('svg'))) return;
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.1), 3);
    setPan({ x: pan.x - (x - pan.x) * (newZoom / zoom - 1), y: pan.y - (y - pan.y) * (newZoom / zoom - 1) });
    setZoom(newZoom);
  };
  
  const handleNodeConfigChange = (nodeId: string, newConfig: Partial<PipelineNode>) => setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...newConfig } : n));
  const handleUpdateOperation = (nodeId: string, operation: Operation) => setNodes(prev => prev.map(n => nodeId === n.id ? { ...n, operation } : n));
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnectors(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    setSelectedNodeIds(prev => prev.filter(id => id !== nodeId));
  }, [setNodes, setConnectors]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      setNodes(prev => prev.filter(n => !selectedNodeIds.includes(n.id)));
      setConnectors(prev => prev.filter(c => !selectedNodeIds.includes(c.from) && !selectedNodeIds.includes(c.to)));
      setSelectedNodeIds([]);
    }
    if (selectedGroupIds.length > 0) {
      setGroups(prev => prev.filter(g => !selectedGroupIds.includes(g.id)).map(g => selectedGroupIds.includes(g.parentGroupId!) ? { ...g, parentGroupId: undefined } : g));
      setNodes(prev => prev.map(n => selectedGroupIds.includes(n.groupId!) ? { ...n, groupId: undefined } : n));
      setSelectedGroupIds([]);
    }
  }, [selectedNodeIds, selectedGroupIds, setNodes, setConnectors, setGroups]);

  const handleGeneratePython = useCallback(() => { setGeneratedPythonCode(generatePythonCode(nodes, connectors)); setIsPythonModalOpen(true); }, [nodes, connectors]);
  
  const handleGenerateSpec = async () => {
    setIsSpecModalOpen(true); setIsSpecLoading(true);
    try { const res = await generatePipelineSpec({ nodes, connectors }); setGeneratedSpec(res.specification); } 
    catch (error) { setGeneratedSpec("Failed to generate specification."); } 
    finally { setIsSpecLoading(false); }
  };

  const handleCreateVersion = (name: string) => {
    const newVersion: PipelineVersion = { id: `v${activeLineage.versions.length + 1}`, name, nodes: [...nodes], connectors: [...connectors], groups: [...groups] };
    setLineages(prev => prev.map(l => l.id === activeLineageId ? { ...l, versions: [...l.versions, newVersion] } : l));
    setActiveVersionId(newVersion.id);
  };

  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => { minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y); maxX = Math.max(maxX, n.position.x + NODE_WIDTH); maxY = Math.max(maxY, n.position.y + 200); });
    const padding = 1000;
    setSvgDimensions({ left: minX - padding, top: minY - padding, width: Math.max(maxX - minX + padding * 2, canvasRect.width / zoom), height: Math.max(maxY - minY + padding * 2, canvasRect.height / zoom) });
  }, [nodes, zoom]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) handleDeleteSelected();
      if (e.key.toLowerCase() === 'g' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleCreateGroup(); }
    };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected, handleCreateGroup]);

  const getGroupDepth = useCallback((groupId: string | undefined): number => {
    if (!groupId) return 0;
    const group = groups.find(g => g.id === groupId);
    if (!group) return 0;
    return 1 + getGroupDepth(group.parentGroupId);
  }, [groups]);

  return (
    <div className="flex h-screen w-full flex-col bg-background font-body overflow-hidden">
      <Header activeLineage={activeLineage} activeVersion={activeVersion} versions={activeLineage.versions} activeVersionId={activeVersionId} onVersionChange={setActiveVersionId} onCreateVersion={handleCreateVersion} onGeneratePython={handleGeneratePython} onGenerateSpec={handleGenerateSpec} onImportPipeline={() => {}} onApplyScaffold={() => {}} activeView={activeView} onViewChange={setActiveView} />
      
      {activeView === 'dashboard' ? (
        <LineageDashboard lineages={lineages} onSelectLineage={(id) => { setActiveLineageId(id); setActiveView('editor'); }} onCreateLineage={(name, description) => { const id = `lineage-${Date.now()}`; setLineages(prev => [{ id, name, description, owner: 'Me', lastEdited: 'Just now', versions: [{ id: 'v1', name: 'Initial Design', nodes: [], connectors: [], groups: [] }] }, ...prev]); setActiveLineageId(id); setActiveVersionId('v1'); setActiveView('editor'); }} />
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          <TransformationsCatalogue isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
          
          <main className={cn("flex-1 relative overflow-hidden bg-background/95", isDrawMode ? "cursor-crosshair" : "cursor-grab")} onDrop={handleDrop} onDragOver={handleDragOver} onWheel={handleWheel} ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onContextMenu={e => e.preventDefault()}>
            <div className="absolute inset-0 canvas-grid pointer-events-none" />
            <div className="absolute top-0 left-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}>
              {groups
                .slice()
                .sort((a, b) => getGroupDepth(a.id) - getGroupDepth(b.id))
                .map((group) => {
                  if (isAncestorCollapsed(group.parentGroupId)) return null;
                  return (
                    <GroupZone key={group.id} {...group} onMouseDown={e => handleGroupMouseDown(e, group.id)} onResizeMouseDown={e => handleResizeMouseDown(e, group.id)} onDelete={() => handleDeleteGroup(group.id)} onRename={newName => handleRenameGroup(group.id, newName)} onToggleCollapse={() => handleToggleGroupCollapse(group.id)} isSelected={selectedGroupIds.includes(group.id)} />
                  );
                })}

              <svg className="absolute pointer-events-none overflow-visible" style={{ left: svgDimensions.left, top: svgDimensions.top, width: svgDimensions.width, height: svgDimensions.height }}>
                  {connectors.map((connector, index) => {
                    const fromNode = nodes.find(n => n.id === connector.from), toNode = nodes.find(n => n.id === connector.to);
                    if (!fromNode || !toNode) return null;

                    const fromCollapsedAncestor = getHighestCollapsedAncestor(fromNode.groupId);
                    const toCollapsedAncestor = getHighestCollapsedAncestor(toNode.groupId);
                    
                    if (fromCollapsedAncestor && toCollapsedAncestor && fromCollapsedAncestor.id === toCollapsedAncestor.id) return null;

                    let fromX = fromNode.position.x + NODE_WIDTH, fromY = fromNode.position.y + PORT_Y_OFFSET;
                    if (fromCollapsedAncestor) { fromX = fromCollapsedAncestor.position.x + Math.max(250, fromCollapsedAncestor.width * 0.4); fromY = fromCollapsedAncestor.position.y + 32; }

                    let toX = toNode.position.x, toY = toNode.position.y + PORT_Y_OFFSET;
                    if (toCollapsedAncestor) { toX = toCollapsedAncestor.position.x; toY = toCollapsedAncestor.position.y + 32; }

                    return <Connector key={`${connector.from}-${connector.to}-${index}`} from={{ x: fromX - svgDimensions.left, y: fromY - svgDimensions.top }} to={{ x: toX - svgDimensions.left, y: toY - svgDimensions.top }} isSelected={selectedConnector?.from === connector.from && selectedConnector?.to === connector.to} onClick={() => setSelectedConnector(connector)} />;
                  })}
                  {newConnector && (() => {
                    const fromNode = nodes.find(n => n.id === newConnector.from);
                    if (!fromNode) return null;
                    const fromCollapsedAncestor = getHighestCollapsedAncestor(fromNode.groupId);
                    let fromX = fromNode.position.x + NODE_WIDTH, fromY = fromNode.position.y + PORT_Y_OFFSET;
                    if (fromCollapsedAncestor) { fromX = fromCollapsedAncestor.position.x + Math.max(250, fromCollapsedAncestor.width * 0.4); fromY = fromCollapsedAncestor.position.y + 32; }
                    return <Connector from={{ x: fromX - svgDimensions.left, y: fromY - svgDimensions.top }} to={{ x: newConnector.to.x - svgDimensions.left, y: newConnector.to.y - svgDimensions.top }} className="opacity-50" />;
                  })()}
              </svg>

              {nodes.map((node) => {
                if (isAncestorCollapsed(node.groupId)) return null;
                return <Node key={node.id} {...node} nodes={nodes} onSelect={isShift => handleNodeSelect(node.id, isShift)} onConfigOpen={() => handleOpenConfig(node.id)} onMouseDown={e => handleNodeMouseDown(e, node.id)} onMouseUp={e => handleNodeMouseUp(e, node.id)} onPortMouseDown={e => handlePortMouseDown(e, node.id)} onAddNode={handleAddNode} isSelected={selectedNodeIds.includes(node.id)} onUpdateOperation={handleUpdateOperation} />;
              })}

              {selectionRect && <div className="absolute border border-primary bg-primary/10 pointer-events-none z-[100]" style={{ left: selectionRect.x, top: selectionRect.y, width: selectionRect.width, height: selectionRect.height }} />}
              {drawingZoneRect && <div className="absolute border-2 border-dashed border-primary bg-primary/5 pointer-events-none z-[100] rounded-xl" style={{ left: drawingZoneRect.x, top: drawingZoneRect.y, width: drawingZoneRect.width, height: drawingZoneRect.height }} />}
            </div>

            <ShortcutLegend isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
            <div className="absolute bottom-6 right-6 z-50">
              <div className="glass-panel rounded-2xl flex items-center p-1.5 gap-1 border border-border shadow-2xl">
                  <TooltipProvider>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsDrawMode(!isDrawMode)} className={cn("h-9 w-9 rounded-xl", isDrawMode ? "bg-primary text-primary-foreground" : "hover:bg-muted")}><Square className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top">Dessiner Zone</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleCreateGroup} className="h-9 w-9 rounded-xl hover:bg-muted"><Boxes className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top">Grouper (Ctrl+G)</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleAutoLayout} className="h-9 w-9 rounded-xl hover:bg-muted"><LayoutDashboard className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top">Auto Layout</TooltipContent></Tooltip>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => handleZoom(0.1)}><ZoomIn className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top">Zoom Avant</TooltipContent></Tooltip>
                      <div className="w-14 text-center text-[10px] font-mono font-bold text-muted-foreground bg-muted rounded px-1 py-0.5">{Math.round(zoom * 100)}%</div>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => handleZoom(-0.1)}><ZoomOut className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top">Zoom Arrière</TooltipContent></Tooltip>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={handleFitToScreen}><Crosshair className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top">Adapter l'écran</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={cn("h-9 w-9 text-muted-foreground hover:text-foreground", showShortcuts && "text-primary")} onClick={() => setShowShortcuts(!showShortcuts)}><Keyboard className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top">Raccourcis</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={handleResetCanvas}><RotateCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top">Réinitialiser</TooltipContent></Tooltip>
                  </TooltipProvider>
              </div>
            </div>
          </main>
        </div>
      )}
      
      <NodeConfigurationPanel key={selectedNodeIds.join(',')} node={nodes.find(n => n.id === selectedNodeIds[0])} nodes={nodes} isOpen={isConfigPanelOpen} onClose={() => setIsConfigPanelOpen(false)} onSave={handleNodeConfigChange} onDelete={handleDeleteNode} />
      {connectionForFields && nodes.find(n => n.id === connectionForFields.fromNodeId) && <ConnectionFieldsModal isOpen={!!connectionForFields} fromNode={nodes.find(n => n.id === connectionForFields.fromNodeId)!} toNode={nodes.find(n => n.id === connectionForFields.toNodeId)!} onClose={() => setConnectionForFields(null)} onSave={handleSaveConnectionFields} />}
      <PythonCodeModal isOpen={isPythonModalOpen} onClose={() => setIsPythonModalOpen(false)} code={generatedPythonCode} />
      <SpecModal isOpen={isSpecModalOpen} onClose={() => setIsSpecModalOpen(false)} spec={generatedSpec} isLoading={isSpecLoading} />
    </div>
  );
}
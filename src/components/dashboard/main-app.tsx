'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Header from '@/components/layout/header';
import TransformationsCatalogue from '@/components/sidebar/transformations-catalogue';
import NodeConfigurationPanel from '@/components/sidebar/node-configuration-panel';
import Node from '@/components/data-flow/node';
import Connector from '@/components/data-flow/connector';
import GroupZone from '@/components/data-flow/group-zone';
import DataUploadDialog from '@/components/modals/data-upload-dialog';
import type { ParsedData } from '@/lib/data-uploader';
import { 
  PipelineNode, 
  TransformationItem, 
  Connector as ConnectorType, 
  Field,
  Operation,
  OperationType,
  PipelineVersion,
  mockLineages,
  LineageInfo,
  NodeGroup,
  getDefaultOperation,
  ComplianceAuditResult,
  MissionSpecMetadata,
  createEmptyMissionSpec
} from '@/lib/pipeline-data';
import { computeComplianceAudit } from '@/lib/compliance-audit';
import { layoutPipeline, findFreePosition } from '@/lib/canvas-layout';
import type { ArchitectOutput } from '@/ai/flows/architect-pipeline-flow';
import { executePipelinePreview, PipelinePreviewResult } from '@/lib/pipeline-executor';
import { cn } from '@/lib/utils';
import ConnectionFieldsModal from '@/components/data-flow/connection-fields-modal';
import PythonCodeModal from '@/components/modals/python-code-modal';
import SpecModal from '@/components/modals/spec-modal';
import DataProductSpecModal from '@/components/modals/data-product-spec-modal';
import ExportDialog from '@/components/modals/export-dialog';
import ComplianceAuditPanel from '@/components/panels/compliance-audit-panel';
import MissionSpecModal from '@/components/modals/mission-spec-modal';
import DeliverablesHub, { type DeliverableId } from '@/components/modals/deliverables-hub';
import TemplateMarketplace from '@/components/modals/template-marketplace';
import { type PipelineTemplate } from '@/lib/pipeline-templates';
import { useUser } from '@/firebase';
import { signOut, getAuth } from 'firebase/auth';
import AccountSettingsDialog from '@/components/modals/account-settings-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import DataPreviewPanel from '@/components/panels/data-preview-panel';
import { generatePipelineSpec, generateDataProductSpec } from '@/ai/flows/generate-spec-flow';
import LineageDashboard from '@/components/dashboard/lineage-dashboard';
import { useToast } from '@/hooks/use-toast';
import {
  ZoomIn, ZoomOut, RotateCcw, Crosshair, Keyboard,
  MousePointer2, BoxSelect, Trash2, Group, Square,
  LayoutDashboard, Boxes, Workflow, Wand2, Layers
} from 'lucide-react';
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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarCollapsed(true);
    }
  }, []);

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
  
      
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isAuditPanelOpen, setIsAuditPanelOpen] = useState(false);
  const [isMissionSpecModalOpen, setIsMissionSpecModalOpen] = useState(false);
  const [isDeliverablesHubOpen, setIsDeliverablesHubOpen] = useState(false);
  const [exportInitialTab, setExportInitialTab] = useState('ontology');
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const [isTemplateMarketplaceOpen, setIsTemplateMarketplaceOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTargetNodeIds, setUploadTargetNodeIds] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, PipelinePreviewResult | null>>({});
  const [uploadSampleData, setUploadSampleData] = useState<Record<string, { sourceRows: number; outputRows: number; fields: string[] }>>({});
  const [previewOpen, setPreviewOpen] = useState<{ nodeId: string; open: boolean } | null>(null);

  const handlePreviewOpen = (nodeId: string) => {
    // Generate preview data using the pipeline executor
    const preview = executePipelinePreview(nodeId, nodes, connectors);
    setPreviewOpen({ nodeId, open: true });
    // Update previewData with the generated preview
    setPreviewData(prev => ({
      ...prev,
      [nodeId]: preview
    }));
  };

  const handleNodePreview = (nodeId: string) => {
    handlePreviewOpen(nodeId);
  };

  const handlePreviewClose = () => {
    setPreviewOpen(null);
  };
  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://dataflowcanvas-deploy.vercel.app';
  const { user } = useUser();

  const handleApplyTemplate = (template: PipelineTemplate) => {
    const { connectors } = template;
    const nodes = layoutPipeline(template.nodes, connectors);
    setLineages(prev => prev.map(l =>
      l.id === activeLineageId
        ? { ...l, versions: l.versions.map(v =>
            v.id === activeVersionId ? { ...v, nodes, connectors, groups: [] } : v
          )}
        : l
    ));
    setIsTemplateMarketplaceOpen(false);
  };

  // Import pipeline from JSON file
  const handleImportPipeline = useCallback((data: any) => {
    if (!data?.nodes?.length) return;
    const hasPositions = data.nodes.every((n: any) => n.position);
    const importedNodes = hasPositions ? data.nodes : layoutPipeline(data.nodes, data.connectors || []);
    const importedConnectors = data.connectors || [];
    const importedGroups = data.groups || [];
    setLineages(prev => prev.map(l =>
      l.id === activeLineageId
        ? { ...l, versions: l.versions.map(v =>
            v.id === activeVersionId
              ? { ...v, nodes: importedNodes, connectors: importedConnectors, groups: importedGroups }
              : v
          )}
        : l
    ));
    handleResetCanvas();
  }, [activeLineageId, activeVersionId]);

  // Apply the AI Architect's proposed scaffold (falls back to a bare 3-node
  // stub if called without one, e.g. from a stale caller).
  const handleApplyScaffold = useCallback((scaffold?: ArchitectOutput) => {
    const scaffoldId = Date.now().toString(36);

    let scaffoldNodes: PipelineNode[];
    let scaffoldConnectors: ConnectorType[];

    if (scaffold?.nodes?.length) {
      scaffoldNodes = scaffold.nodes.map((n, i) => ({
        id: `${scaffoldId}-${i}`,
        name: n.name,
        type: n.type,
        position: { x: n.x, y: n.y },
        description: n.description,
        operation: n.operationType ? getDefaultOperation(n.operationType as OperationType) : undefined,
        outputFields: [],
        inputFields: [],
      }));
      scaffoldConnectors = (scaffold.connectors || [])
        .filter(c => scaffoldNodes[c.fromIndex] && scaffoldNodes[c.toIndex])
        .map(c => ({ from: scaffoldNodes[c.fromIndex].id, to: scaffoldNodes[c.toIndex].id }));
    } else {
      scaffoldNodes = [
        { id: `${scaffoldId}-src`, name: "Source", type: "source" as const, position: { x: 100, y: 200 }, outputFields: [], inputFields: [], description: "Data source" },
        { id: `${scaffoldId}-xfm`, name: "Transform", type: "transformation" as const, position: { x: 400, y: 200 }, outputFields: [], inputFields: [], operation: { type: "filter", settings: {} }, description: "Data transformation" },
        { id: `${scaffoldId}-out`, name: "Output", type: "destination" as const, position: { x: 700, y: 200 }, outputFields: [], inputFields: [], description: "Destination" },
      ];
      scaffoldConnectors = [
        { from: `${scaffoldId}-src`, to: `${scaffoldId}-xfm` },
        { from: `${scaffoldId}-xfm`, to: `${scaffoldId}-out` },
      ];
    }

    const laidOutNodes = layoutPipeline(scaffoldNodes, scaffoldConnectors);

    setLineages(prev => prev.map(l =>
      l.id === activeLineageId
        ? { ...l, versions: l.versions.map(v =>
            v.id === activeVersionId
              ? { ...v, nodes: laidOutNodes, connectors: scaffoldConnectors, groups: [] }
              : v
          )}
        : l
    ));
    handleResetCanvas();
  }, [activeLineageId, activeVersionId]);
  const [generatedSpec, setGeneratedSpec] = useState('');
  const [isSpecLoading, setIsSpecLoading] = useState(false);
  const [isProductSpecModalOpen, setIsProductSpecModalOpen] = useState(false);
  const [generatedProductSpec, setGeneratedProductSpec] = useState('');
  const [isProductSpecLoading, setIsProductSpecLoading] = useState(false);

  // Preview removed — fake data was not useful

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
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{ distance: number; zoom: number; midpoint: { x: number; y: number } } | null>(null);

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

    // Check if groupId is descendant of parentGroupId (cycle-safe)
    const isDescendantOf = (childId: string, parentId: string, visited = new Set<string>()): boolean => {
      if (!childId || visited.has(childId)) return false;
      visited.add(childId);
      const childGroup = groups.find(g => g.id === childId);
      if (!childGroup || !childGroup.parentGroupId) return false;
      if (childGroup.parentGroupId === parentId) return true;
      return isDescendantOf(childGroup.parentGroupId, parentId, visited);
    };

    setGroups(prevGroups => {
      return prevGroups.map(group => {
        if (group.id === draggingId || selectedGroupIds.includes(group.id)) {
          const centerX = group.position.x + (group.width / 2);
          const centerY = group.position.y + 32;

          const containingGroups = prevGroups.filter(g => {
            // Exclude the group(s) being dragged and their descendants
            if (selectedGroupIds.includes(g.id)) return false;
            
            // Check if g is a descendant of ANY selected group
            let isDescendantOfSelected = false;
            for (const selectedId of selectedGroupIds) {
              const visited = new Set<string>();
              if (isDescendantOf(g.id, selectedId, visited)) {
                isDescendantOfSelected = true;
                break;
              }
            }
            if (isDescendantOfSelected) return false;
            
            const currentWidth = g.isCollapsed ? Math.max(250, g.width * 0.4) : g.width;
            const currentHeight = g.isCollapsed ? 64 : g.height;
            return centerX >= g.position.x && centerX <= g.position.x + currentWidth &&
                   centerY >= g.position.y && centerY <= g.position.y + currentHeight;
          });

          containingGroups.sort((a, b) => {
              const aLevel = (g: NodeGroup) => { let l = 0, p = g.parentGroupId; while(p){ l++; p = prevGroups.find(x => x.id === p)?.parentGroupId; } return l; };
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

    setNodes(nodes => {
      return nodes.map(node => {
        const centerX = node.position.x + (NODE_WIDTH / 2);
        const centerY = node.position.y + 60;
        const isInside = centerX >= drawingZoneRect.x && centerX <= drawingZoneRect.x + drawingZoneRect.width &&
                        centerY >= drawingZoneRect.y && centerY <= drawingZoneRect.y + drawingZoneRect.height;
        return isInside ? { ...node, groupId: newGroupId } : node;
      });
    });

    setGroups(groups => {
        const updated = groups.map(g => {
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
  }, [drawingZoneRect, groups, setNodes, toast]);

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
  const handleZoomIn = () => handleZoom(0.1);
  const handleZoomOut = () => handleZoom(-0.1);

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

    const PADDING = 100;
    const newNodes = layoutPipeline(nodes, connectors);

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
    
    const operation = item.operationType ? getDefaultOperation(item.operationType) : undefined;
    if (operation && item.defaultSettings) {
      operation.settings = { ...operation.settings, ...item.defaultSettings };
    }

    const freePosition = findFreePosition(nodes, { x, y }, { type: item.type, operation, inputFields: [], outputFields: [] });

    const newNode: PipelineNode = {
      id: `${item.type}-${Date.now()}`,
      name: item.name,
      type: item.type,
      status: 'draft',
      position: freePosition,
      groupId: groupUnder?.id,
      inputFields: [],
      outputFields: [],
      operation,
    };
    setNodes((prev) => [...prev, newNode]);
  }, [pan.x, pan.y, zoom, groups, nodes, setNodes]);

  // Tap-to-add from the catalogue (no HTML5 drag on touch devices): drops the
  // node at the center of the currently visible canvas viewport.
  const handleAddItemTap = useCallback((item: TransformationItem) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    handleAddNode(item, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [handleAddNode]);

  const capturePointer = (e: React.PointerEvent) => {
    try { canvasRef.current?.setPointerCapture(e.pointerId); } catch { /* not capturable (e.g. touch already released) */ }
  };

  const handleNodeMouseDown = (e: React.PointerEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    capturePointer(e);
    handleNodeSelect(nodeId, e.shiftKey);
    draggingNodeIdRef.current = nodeId;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleGroupMouseDown = (e: React.PointerEvent, groupId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    capturePointer(e);
    handleGroupSelect(groupId, e.shiftKey);
    draggingGroupIdRef.current = groupId;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleResizeMouseDown = (e: React.PointerEvent, groupId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    capturePointer(e);
    resizingGroupIdRef.current = groupId;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePortMouseDown = (e: React.PointerEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    capturePointer(e);
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

  const pinchDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const pinchMidpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const handleMouseDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointersRef.current.size === 2) {
        // A second finger landed: abort any single-finger gesture in progress and start a pinch instead.
        isPanningRef.current = false; isSelectingRef.current = false; isDrawingZoneRef.current = false;
        draggingNodeIdRef.current = null; draggingGroupIdRef.current = null; resizingGroupIdRef.current = null;
        setSelectionRect(null); setDrawingZoneRect(null);
        const [p1, p2] = [...activePointersRef.current.values()];
        pinchStateRef.current = { distance: pinchDistance(p1, p2), zoom, midpoint: pinchMidpoint(p1, p2) };
        return;
      }
      if (activePointersRef.current.size > 2) return;
    }

    capturePointer(e);

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

  const handleMouseMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pinchStateRef.current && activePointersRef.current.size === 2) {
      const [p1, p2] = [...activePointersRef.current.values()];
      const newDistance = pinchDistance(p1, p2);
      const midpoint = pinchMidpoint(p1, p2);
      const newZoom = Math.min(Math.max(pinchStateRef.current.zoom * (newDistance / pinchStateRef.current.distance), 0.1), 3);
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = midpoint.x - rect.left, y = midpoint.y - rect.top;
      setPan(prevPan => ({ x: prevPan.x - (x - prevPan.x) * (newZoom / zoom - 1), y: prevPan.y - (y - prevPan.y) * (newZoom / zoom - 1) }));
      setZoom(newZoom);
      return;
    }

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

  const handleMouseUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size < 2) pinchStateRef.current = null;
      if (activePointersRef.current.size > 0) return; // other finger still down, gesture continues
    }

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

  const handleNodeMouseUp = (e: React.PointerEvent, toNodeId: string) => {
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
    // Delete selected connector (link) only —— doesn't touch nodes
    if (selectedConnector) {
      setConnectors(prev => prev.filter(
        c => !(c.from === selectedConnector.from && c.to === selectedConnector.to)
      ));
      setSelectedConnector(null);
      return; // connector deleted, nothing else
    }
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
  }, [selectedConnector, selectedNodeIds, selectedGroupIds, setNodes, setConnectors, setGroups]);

  

  const handleGenerateSpec = async () => {
    setIsSpecModalOpen(true); setIsSpecLoading(true);
    try { const res = await generatePipelineSpec({ nodes, connectors }); setGeneratedSpec(res.specification); }
    catch (error) { setGeneratedSpec(error instanceof Error ? error.message : "Failed to generate specification."); }
    finally { setIsSpecLoading(false); }
  };

  const handleGenerateProductSpec = async () => {
    setIsProductSpecModalOpen(true); setIsProductSpecLoading(true);
    try { const res = await generateDataProductSpec({ nodes, connectors }); setGeneratedProductSpec(res.specification); }
    catch (error) { setGeneratedProductSpec(error instanceof Error ? error.message : "Failed to generate data product specification."); }
    finally { setIsProductSpecLoading(false); }
  };

  const liveAudit = useMemo<ComplianceAuditResult | null>(() => {
    if (nodes.length === 0) return null;
    return computeComplianceAudit(nodes, connectors);
  }, [nodes, connectors]);

  const handleAudit = useCallback(() => {
    setIsAuditPanelOpen(true);
  }, []);

  const handleDeliverableSelect = (id: DeliverableId) => {
    setIsDeliverablesHubOpen(false);
    switch (id) {
      case 'functional-spec': handleGenerateSpec(); break;
      case 'product-spec': handleGenerateProductSpec(); break;
      case 'mission-spec': setIsMissionSpecModalOpen(true); break;
      case 'pyspark': setExportInitialTab('transforms'); setIsExportDialogOpen(true); break;
      case 'dbt': setExportInitialTab('dbt'); setIsExportDialogOpen(true); break;
      case 'ontology': setExportInitialTab('ontology'); setIsExportDialogOpen(true); break;
      case 'pipeline-config': setExportInitialTab('pipeline'); setIsExportDialogOpen(true); break;
    }
  };

  const handleMissionSpecChange = useCallback((metadata: MissionSpecMetadata) => {
    setLineages(prev => prev.map(l => l.id === activeLineageId ? { ...l, missionSpec: metadata } : l));
  }, [activeLineageId, setLineages]);

  // Find all source nodes (category === 'source') and their downstream nodes via connectors
  function handleUploadNode(sourceNodeId: string) {
    // BFS: find all downstream nodes from sourceNodeId using connectors
    const allDownstreamIds: string[] = [sourceNodeId];
    const visited = new Set<string>();
    const queue: string[] = [sourceNodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const downstream = connectors.filter(c => c.from === current).map(c => c.to);
      for (const d of downstream) {
        if (!visited.has(d)) { queue.push(d); allDownstreamIds.push(d); }
      }
    }
    setUploadTargetNodeIds(allDownstreamIds);
    setUploadDialogOpen(true);
  }

  function handleDataLoaded(parsedData: ParsedData) {
    // Inject sampleData into ALL target nodes' corresponding source node first
    setNodes(prev => {
      const sourceNodeId = uploadTargetNodeIds[0];
      return prev.map(n => n.id === sourceNodeId ? { ...n, sampleData: parsedData.rows, inputFields: parsedData.fields, outputFields: parsedData.fields } : n);
    });

    // Run pipeline transforms
    import('@/lib/data-uploader').then(({ applyTransforms, applySingleTransform }) => {
      const results: Record<string, { sourceRows: number; outputRows: number; fields: string[] }> = {};
      
      // For each target node, compute its output data by applying transforms from source
      const sourceNodeId = uploadTargetNodeIds[0];
      // Simple approach: for each target node in pipeline order, apply its operation to input data
      let currentData = parsedData.rows;
      results[sourceNodeId] = { sourceRows: parsedData.rowCount, outputRows: parsedData.rowCount, fields: parsedData.fields.map(f => f.name) };
      
      for (let i = 1; i < uploadTargetNodeIds.length; i++) {
        const nodeId = uploadTargetNodeIds[i];
        const node = nodes.find(n => n.id === nodeId);
        if (node?.operation) {
          currentData = applySingleTransform(currentData, node.operation.type, node.operation.settings);
        }
        const fields = currentData.length > 0 ? Object.keys(currentData[0]) : [];
        results[nodeId] = { sourceRows: parsedData.rowCount, outputRows: currentData.length, fields };
      }
      
      setUploadSampleData(results);
    });
  }

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
      <Header activeLineage={activeLineage} activeVersion={activeVersion} versions={activeLineage.versions} activeVersionId={activeVersionId} onVersionChange={setActiveVersionId} onCreateVersion={handleCreateVersion} onDeliverables={() => setIsDeliverablesHubOpen(true)} onAudit={handleAudit} auditGrade={liveAudit?.grade} auditScore={liveAudit?.score} isArchitectOpen={isArchitectOpen} onArchitectOpenChange={setIsArchitectOpen} onImportPipeline={handleImportPipeline} onApplyScaffold={handleApplyScaffold} onAccountSettings={() => setIsAccountOpen(true)} onShare={() => setIsShareOpen(true)} onTemplates={() => setIsTemplateMarketplaceOpen(true)} activeView={activeView} onViewChange={setActiveView} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onZoomFit={handleResetCanvas} zoom={zoom} />
      
      {activeView === 'dashboard' ? (
        <LineageDashboard lineages={lineages} onSelectLineage={(id) => { setActiveLineageId(id); setActiveView('editor'); }} onCreateLineage={(name, description) => { const id = `lineage-${Date.now()}`; setLineages(prev => [{ id, name, description, owner: 'Me', lastEdited: 'Just now', versions: [{ id: 'v1', name: 'Initial Design', nodes: [], connectors: [], groups: [] }] }, ...prev]); setActiveLineageId(id); setActiveVersionId('v1'); setActiveView('editor'); }} />
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          <TransformationsCatalogue isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} onAddItem={handleAddItemTap} />
          
          <main className={cn("flex-1 relative overflow-hidden bg-background/95 touch-none", isDrawMode ? "cursor-crosshair" : "cursor-grab")} onDrop={handleDrop} onDragOver={handleDragOver} onWheel={handleWheel} ref={canvasRef} onPointerDown={handleMouseDown} onPointerMove={handleMouseMove} onPointerUp={handleMouseUp} onPointerCancel={handleMouseUp} onContextMenu={e => e.preventDefault()}>
            <div className="absolute inset-0 canvas-grid pointer-events-none" />
            {nodes.length === 0 && groups.length === 0 && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none p-4">
                <div
                  className="pointer-events-auto bg-card/95 backdrop-blur-md border rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-xl"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto w-fit p-3 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                    <Workflow className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-bold tracking-tight">Commencez votre pipeline</h2>
                    <p className="text-sm text-muted-foreground">
                      Trois façons de démarrer — le canvas fera le reste.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Button onClick={() => setIsTemplateMarketplaceOpen(true)} className="justify-start gap-2.5 h-10">
                      <Layers className="h-4 w-4" /> Partir d'un template
                    </Button>
                    <Button variant="outline" onClick={() => setIsArchitectOpen(true)} className="justify-start gap-2.5 h-10 text-primary border-primary/30 hover:bg-primary/10">
                      <Wand2 className="h-4 w-4" /> Décrire mon besoin à l'IA
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    …ou glissez une <span className="font-medium text-foreground/80">source</span> depuis le catalogue à gauche.
                  </p>
                </div>
              </div>
            )}
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
                return <Node key={node.id} {...node} nodes={nodes} onSelect={isShift => handleNodeSelect(node.id, isShift)} onConfigOpen={() => handleOpenConfig(node.id)} onMouseDown={e => handleNodeMouseDown(e, node.id)} onMouseUp={e => handleNodeMouseUp(e, node.id)} onPortMouseDown={e => handlePortMouseDown(e, node.id)} onAddNode={handleAddNode} isSelected={selectedNodeIds.includes(node.id)} onUpdateOperation={handleUpdateOperation} onUploadData={handleUploadNode} onPreview={handleNodePreview} />;
              })}

              {selectionRect && <div className="absolute border-2 border-primary/70 bg-primary/[0.06] pointer-events-none z-[100]" style={{ left: selectionRect.x, top: selectionRect.y, width: selectionRect.width, height: selectionRect.height }} />}
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

          <NodeConfigurationPanel connectors={connectors} setConnectors={setConnectors} key={selectedNodeIds.join(',')} node={nodes.find(n => n.id === selectedNodeIds[0])} nodes={nodes} isOpen={isConfigPanelOpen} onClose={() => setIsConfigPanelOpen(false)} onSave={handleNodeConfigChange} onDelete={handleDeleteNode} />
        </div>
      )}
      {connectionForFields && nodes.find(n => n.id === connectionForFields.fromNodeId) && <ConnectionFieldsModal isOpen={!!connectionForFields} fromNode={nodes.find(n => n.id === connectionForFields.fromNodeId)!} toNode={nodes.find(n => n.id === connectionForFields.toNodeId)!} onClose={() => setConnectionForFields(null)} onSave={handleSaveConnectionFields} />}
      <SpecModal isOpen={isSpecModalOpen} onClose={() => setIsSpecModalOpen(false)} spec={generatedSpec} isLoading={isSpecLoading} />
      <DataProductSpecModal isOpen={isProductSpecModalOpen} onClose={() => setIsProductSpecModalOpen(false)} spec={generatedProductSpec} isLoading={isProductSpecLoading} />
      <ExportDialog nodes={nodes} connectors={connectors} open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen} initialTab={exportInitialTab} />
      <ComplianceAuditPanel open={isAuditPanelOpen} onOpenChange={setIsAuditPanelOpen} result={liveAudit} />
      <DeliverablesHub open={isDeliverablesHubOpen} onOpenChange={setIsDeliverablesHubOpen} onSelect={handleDeliverableSelect} />
      <MissionSpecModal
        isOpen={isMissionSpecModalOpen}
        onClose={() => setIsMissionSpecModalOpen(false)}
        pipelineName={activeLineage.name}
        nodes={nodes}
        connectors={connectors}
        metadata={activeLineage.missionSpec || createEmptyMissionSpec()}
        onMetadataChange={handleMissionSpecChange}
      />
      <TemplateMarketplace open={isTemplateMarketplaceOpen} onOpenChange={setIsTemplateMarketplaceOpen} onSelectTemplate={handleApplyTemplate} />
      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Partager le pipeline</DialogTitle>
            <DialogDescription>Copiez le lien pour partager cette vue.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 pt-2">
            <Input readOnly value={shareUrl} className="text-xs bg-muted" />
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DataUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        targetNodeIds={uploadTargetNodeIds}
        onDataLoaded={handleDataLoaded}
      />
      {/* Account Settings */}
      <AccountSettingsDialog
        open={isAccountOpen}
        onOpenChange={setIsAccountOpen}
        currentUser={user}
        onSignOut={() => { signOut(getAuth()); setIsAccountOpen(false); }}
      />
      {/* Data Preview Panel */}
      {previewOpen && (
        <DataPreviewPanel
          preview={previewData[previewOpen.nodeId] || null}
          open={previewOpen.open}
          onOpenChange={(open) => {
            if (!open) setPreviewOpen(null);
            else setPreviewOpen({ ...previewOpen, open });
          }}
          nodeName={nodes.find(n => n.id === previewOpen.nodeId)?.name || 'Unknown Node'}
        />
      )}
    </div>
  );
}
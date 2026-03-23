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
  FilterOperation, 
  JoinOperation, 
  GroupByOperation, 
  SortOperation, 
  SelectColumnsOperation,
  getJoinOutputFields, 
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
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';
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

export default function MainApp() {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'dashboard' | 'editor'>('dashboard');
  const [lineages, setLineages] = useState<LineageInfo[]>(mockLineages);
  const [activeLineageId, setActiveLineageId] = useState<string>('lineage-1');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
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
  
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [generatedPythonCode, setGeneratedPythonCode] = useState('');
  
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [generatedSpec, setGeneratedSpec] = useState('');
  const [isSpecLoading, setIsSpecLoading] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const isSelectingRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const draggingNodeIdRef = useRef<string | null>(null);
  const draggingGroupIdRef = useRef<string | null>(null);
  const resizingGroupIdRef = useRef<string | null>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const isConnectingRef = useRef(false);

  const [connectionForFields, setConnectionForFields] = useState<{fromNodeId: string, toNodeId: string} | null>(null);
  const [svgDimensions, setSvgDimensions] = useState<SvgDimensions>({ width: '100%', height: '100%', top: 0, left: 0 });

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
      setSelectedGroupIds([id]);
      setSelectedNodeIds([]);
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

          const groupUnder = groups.find(g => {
            const currentWidth = g.isCollapsed ? Math.max(250, g.width * 0.4) : g.width;
            const currentHeight = g.isCollapsed ? 64 : g.height;
            
            return centerX >= g.position.x && 
                   centerX <= g.position.x + currentWidth &&
                   centerY >= g.position.y &&
                   centerY <= g.position.y + currentHeight;
          });
          
          return { ...node, groupId: groupUnder ? groupUnder.id : undefined };
        }
        return node;
      });
    });
    draggingNodeIdRef.current = null;
  }, [selectedNodeIds, groups, setNodes]);

  const finalizeResize = useCallback(() => {
    const resizingId = resizingGroupIdRef.current;
    if (!resizingId) return;

    const group = groups.find(g => g.id === resizingId);
    if (!group) return;

    setNodes(currentNodes => {
      return currentNodes.map(node => {
        const centerX = node.position.x + (NODE_WIDTH / 2);
        const centerY = node.position.y + 60;

        const isInside = centerX >= group.position.x && 
                        centerX <= group.position.x + group.width &&
                        centerY >= group.position.y &&
                        centerY <= group.position.y + group.height;

        if (isInside && node.groupId !== group.id) {
          return { ...node, groupId: group.id };
        } else if (!isInside && node.groupId === group.id) {
          return { ...node, groupId: undefined };
        }
        return node;
      });
    });

    resizingGroupIdRef.current = null;
  }, [groups, setNodes]);

  const handleCreateGroup = useCallback(() => {
    if (selectedNodeIds.length < 1) {
      toast({ title: "No Nodes Selected", description: "Select nodes to group them functionally.", variant: "destructive" });
      return;
    }

    const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedNodes.forEach(n => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
      maxY = Math.max(maxY, n.position.y + 150);
    });

    const padding = 60;
    const newGroupId = `group-${Date.now()}`;
    const newGroup: NodeGroup = {
      id: newGroupId,
      name: "New Functional Zone",
      color: "slate",
      position: { x: minX - padding, y: minY - padding },
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      isCollapsed: false
    };

    setGroups(prev => [...prev, newGroup]);
    setNodes(prev => prev.map(n => selectedNodeIds.includes(n.id) ? { ...n, groupId: newGroupId } : n));
    setSelectedGroupIds([newGroupId]);
    
    toast({ title: "Zone Created", description: `Grouped ${selectedNodeIds.length} nodes functionally.` });
  }, [selectedNodeIds, nodes, toast, setGroups, setNodes]);

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
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
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
      maxY = Math.max(maxY, node.position.y + 100);
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

    const levels: Record<string, number> = {};
    const assignLevel = (nodeId: string, level: number) => {
        levels[nodeId] = Math.max(levels[nodeId] || 0, level);
        const downstream = connectors.filter(c => c.from === nodeId);
        downstream.forEach(c => assignLevel(c.to, level + 1));
    };

    const sources = nodes.filter(n => !connectors.some(c => c.to === n.id));
    sources.forEach(s => assignLevel(s.id, 0));

    nodes.forEach(n => {
        if (levels[n.id] === undefined) assignLevel(n.id, 0);
    });

    const levelGroups: Record<number, string[]> = {};
    Object.entries(levels).forEach(([id, level]) => {
        if (!levelGroups[level]) levelGroups[level] = [];
        levelGroups[level].push(id);
    });

    const HORIZONTAL_GAP = 350;
    const VERTICAL_GAP = 180;
    const START_X = 100;
    const START_Y = 100;

    const newNodes = nodes.map(node => {
        const level = levels[node.id];
        const indexInLevel = levelGroups[level].indexOf(node.id);
        
        return {
            ...node,
            position: {
                x: START_X + level * HORIZONTAL_GAP,
                y: START_Y + indexInLevel * VERTICAL_GAP
            }
        };
    });

    const newGroups = groups.map(group => {
      const groupNodes = newNodes.filter(n => n.groupId === group.id);
      if (groupNodes.length === 0) return group;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      groupNodes.forEach(n => {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
        maxY = Math.max(maxY, n.position.y + 150);
      });

      const padding = 60;
      return {
        ...group,
        position: { x: minX - padding, y: minY - padding },
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2
      };
    });

    setNodes(newNodes);
    setGroups(newGroups);
    toast({
        title: "Layout Applied",
        description: "Your design and zones have been arranged hierarchically."
    });
  }, [nodes, connectors, groups, toast, setNodes, setGroups]);
  
  const handleAddNode = useCallback((item: TransformationItem, position: {x: number, y: number}) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    let operation: Operation | undefined = undefined;
    if (item.type === 'transformation' && item.operationType) {
        switch (item.operationType) {
            case 'filter':
                operation = {
                    type: 'filter',
                    settings: { field: '', operator: '==', value: '' }
                } as FilterOperation;
                break;
            case 'join':
                operation = {
                    type: 'join',
                    settings: {
                        leftNodeId: '',
                        rightNodeId: '',
                        joinType: 'inner',
                        condition: { leftField: '', rightField: '' }
                    }
                } as JoinOperation;
                break;
            case 'group_by':
                operation = {
                    type: 'group_by',
                    settings: {
                        groupByFields: [],
                        aggregations: []
                    }
                } as GroupByOperation;
                break;
            case 'sort':
                operation = {
                    type: 'sort',
                    settings: {
                        conditions: []
                    }
                } as SortOperation;
                break;
            case 'select_columns':
                operation = {
                    type: 'select_columns',
                    settings: {
                        selectedFields: []
                    }
                } as SelectColumnsOperation;
                break;
            default:
                operation = { type: item.operationType, settings: {} };
                break;
        }
    }

    const x = (position.x - canvasRect.left - pan.x) / zoom;
    const y = (position.y - canvasRect.top - pan.y) / zoom;

    const centerX = x + (NODE_WIDTH / 2);
    const centerY = y + 60;
    const groupUnder = groups.find(g => {
      const currentWidth = g.isCollapsed ? Math.max(250, g.width * 0.4) : g.width;
      const currentHeight = g.isCollapsed ? 64 : g.height;
      return centerX >= g.position.x && centerX <= g.position.x + currentWidth &&
             centerY >= g.position.y && centerY <= g.position.y + currentHeight;
    });
    
    const newNode: PipelineNode = {
      id: `${item.type}-${Date.now()}`,
      name: item.name,
      type: item.type,
      status: 'draft',
      position: { x, y },
      groupId: groupUnder?.id,
      inputFields: item.type === 'destination' || item.type === 'transformation' || item.type === 'dataset' ? [] : undefined,
      outputFields: item.type === 'source' || item.type === 'transformation' || item.type === 'dataset' ? [] : undefined,
      operation: item.type === 'transformation' ? operation : undefined,
    };
    setNodes((prev) => [...prev, newNode]);
  }, [pan.x, pan.y, zoom, groups, setNodes]);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    const isShift = e.shiftKey;
    handleNodeSelect(nodeId, isShift);

    draggingNodeIdRef.current = nodeId;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleGroupMouseDown = (e: React.MouseEvent, groupId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const isShift = e.shiftKey;
    handleGroupSelect(groupId, isShift);

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
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-id]') || target.closest('[data-port="true"]') || target.closest('[data-connector="true"]')) {
      return;
    }

    if (e.button === 2) {
      isSelectingRef.current = true;
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setSelectionRect({ startX: x, startY: y, x, y, width: 0, height: 0 });
      if (!e.shiftKey) {
        setSelectedNodeIds([]);
        setSelectedGroupIds([]);
      }
    } 
    else if (e.button === 0) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }
    
    setSelectedConnector(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = (e.clientX - lastMousePosRef.current.x) / zoom;
    const dy = (e.clientY - lastMousePosRef.current.y) / zoom;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (isConnectingRef.current && newConnector) {
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setNewConnector({
        ...newConnector,
        to: {
          x: (e.clientX - canvasRect.left - pan.x) / zoom,
          y: (e.clientY - canvasRect.top - pan.y) / zoom,
        }
      });
    } else if (isSelectingRef.current && selectionRect) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = (e.clientX - rect.left - pan.x) / zoom;
      const currentY = (e.clientY - rect.top - pan.y) / zoom;
      
      const x = Math.min(selectionRect.startX, currentX);
      const y = Math.min(selectionRect.startY, currentY);
      const width = Math.abs(selectionRect.startX - currentX);
      const height = Math.abs(selectionRect.startY - currentY);
      
      setSelectionRect({ ...selectionRect, x, y, width, height });
      
      const nodesInRect = nodes.filter(n => {
        const isParentCollapsed = groups.find(g => g.id === n.groupId)?.isCollapsed;
        if (isParentCollapsed) return false;
        return n.position.x >= x && n.position.x <= x + width &&
               n.position.y >= y && n.position.y <= y + height;
      }).map(n => n.id);
      
      setSelectedNodeIds(nodesInRect);
    } else if (resizingGroupIdRef.current) {
      const groupId = resizingGroupIdRef.current;
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            width: Math.max(150, g.width + dx),
            height: Math.max(100, g.height + dy)
          };
        }
        return g;
      }));
    } else if (draggingNodeIdRef.current) {
      const nodeId = draggingNodeIdRef.current;
      setNodes(prevNodes => prevNodes.map(n => {
        if (n.id === nodeId || selectedNodeIds.includes(n.id)) {
          return {
            ...n,
            position: {
              x: n.position.x + dx,
              y: n.position.y + dy
            }
          };
        }
        return n;
      }));
    } else if (draggingGroupIdRef.current) {
      const groupId = draggingGroupIdRef.current;
      setGroups(prev => prev.map(g => {
        if (g.id === groupId || selectedGroupIds.includes(g.id)) {
          return { ...g, position: { x: g.position.x + dx, y: g.position.y + dy } };
        }
        return g;
      }));

      setNodes(prev => prev.map(n => {
        if (n.groupId && (n.groupId === groupId || selectedGroupIds.includes(n.groupId))) {
          return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
        }
        return n;
      }));
    } else if (isPanningRef.current) {
      const newX = e.clientX - panStartRef.current.x;
      const newY = e.clientY - panStartRef.current.y;
      setPan({ x: newX, y: newY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    }
    
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      setSelectionRect(null);
    }
    
    if (draggingNodeIdRef.current) {
      finalizeNodeDrag();
    }

    if (resizingGroupIdRef.current) {
      finalizeResize();
    }

    draggingGroupIdRef.current = null;
    
    if (isConnectingRef.current) {
      const toNodeElement = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-node-id]');
      const toNodeId = toNodeElement?.getAttribute('data-node-id');

      if (toNodeId && newConnector && newConnector.from !== toNodeId) {
        handleNodeMouseUp(e, toNodeId);
      }
      isConnectingRef.current = false;
      setNewConnector(null);
    }
  };
  
  const handleNodeMouseUp = (e: React.MouseEvent, toNodeId: string) => {
    if (isConnectingRef.current && newConnector && newConnector.from !== toNodeId) {
      const fromNode = nodes.find(n => n.id === newConnector.from);
      const toNode = nodes.find(n => n.id === toNodeId);
      
      if (fromNode && toNode && fromNode.type !== 'destination' && toNode.type !== 'source') {
        const newConn = { from: newConnector.from, to: toNodeId };
        const alreadyExists = connectors.some(c => c.from === newConn.from && c.to === newConn.to);
        
        if (!alreadyExists) {
            setConnectionForFields({ fromNodeId: fromNode.id, toNodeId: toNode.id });
        }
      }
    }
  }

  const handleSaveConnectionFields = (fromNodeId: string, toNodeId: string, selectedFields: Field[]) => {
    const updatedConnectors = [...connectors, { from: fromNodeId, to: toNodeId }];
    setConnectors(updatedConnectors);

    setNodes(currentNodes => {
        const toNodeIndex = currentNodes.findIndex(n => n.id === toNodeId);
        if (toNodeIndex === -1) return currentNodes;

        let newNodes = [...currentNodes];
        let toNode = { ...newNodes[toNodeIndex] };

        if (toNode.operation?.type === 'join') {
            const joinOp = { ...toNode.operation } as JoinOperation;
            const parentConnections = updatedConnectors.filter(c => c.to === toNodeId);
            const parentIds = parentConnections.map(c => c.from);

            const leftParentNode = newNodes.find(n => n.id === parentIds[0]);
            const rightParentNode = newNodes.find(n => n.id === parentIds[1]);
            
            joinOp.settings.leftNodeId = leftParentNode?.id || '';
            joinOp.settings.rightNodeId = rightParentNode?.id || '';
            
            const combinedInputFields = [
                ...(leftParentNode?.outputFields || []),
                ...(rightParentNode?.outputFields || [])
            ];
            toNode.inputFields = combinedInputFields;
            
            if (leftParentNode && rightParentNode) {
                toNode.outputFields = getJoinOutputFields(leftParentNode, rightParentNode, joinOp.settings.joinType);
            }
            toNode.operation = joinOp;
        } else {
            const currentInputFields = toNode.inputFields || [];
            const newFields = selectedFields.filter(sf => !currentInputFields.some(cif => cif.name === sf.name));
            toNode.inputFields = [...currentInputFields, ...newFields];
            
            if (toNode.type === 'transformation' && (!toNode.outputFields || toNode.outputFields.length === 0)) {
                toNode.outputFields = toNode.inputFields;
            } else if (toNode.type === 'dataset') {
                toNode.outputFields = toNode.inputFields;
            }
        }

        newNodes[toNodeIndex] = toNode;
        return newNodes;
    });

    setConnectionForFields(null);
};

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const itemString = e.dataTransfer.getData('application/json');
    if (itemString) {
      const item = JSON.parse(itemString);
      const position = { x: e.clientX, y: e.clientY };
      handleAddNode(item, position);
    }
  }, [handleAddNode]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!canvasRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-id]') || target.closest('svg')) {
      return;
    }
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const zoomFactor = 1.1;
    let newZoom: number;

    if (e.deltaY < 0) {
      newZoom = zoom * zoomFactor;
    } else {
      newZoom = zoom / zoomFactor;
    }
    newZoom = Math.min(Math.max(newZoom, 0.1), 3);

    const newPanX = pan.x - (x - pan.x) * (newZoom / zoom - 1);
    const newPanY = pan.y - (y - pan.y) * (newZoom / zoom - 1);

    setZoom(newZoom);
    setPan({x: newPanX, y: newPanY});
  };
  
  const handleNodeConfigChange = (nodeId: string, newConfig: Partial<PipelineNode>) => {
    setNodes(prevNodes => prevNodes.map(n => n.id === nodeId ? { ...n, ...newConfig } : n));
  };
  
  const handleUpdateOperation = (nodeId: string, operation: Operation) => {
      setNodes(prevNodes => prevNodes.map(n => n.id === nodeId ? { ...n, operation } : n));
  };
  
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
      setGroups(prev => prev.filter(g => !selectedGroupIds.includes(g.id)));
      setNodes(prev => prev.map(n => n.groupId && selectedGroupIds.includes(n.groupId) ? { ...n, groupId: undefined } : n));
      setSelectedGroupIds([]);
    }
  }, [selectedNodeIds, selectedGroupIds, setNodes, setConnectors, setGroups]);

  const handleGeneratePython = useCallback(() => {
    const pythonCode = generatePythonCode(nodes, connectors);
    setGeneratedPythonCode(pythonCode);
    setIsPythonModalOpen(true);
  }, [nodes, connectors]);
  
  const handleGenerateSpec = async () => {
    setIsSpecModalOpen(true);
    setIsSpecLoading(true);
    try {
      const res = await generatePipelineSpec({ nodes, connectors });
      setGeneratedSpec(res.specification);
    } catch (error) {
      setGeneratedSpec("Failed to generate specification.");
    } finally {
      setIsSpecLoading(false);
    }
  };

  const handleVersionChange = (id: string) => {
    setActiveVersionId(id);
  };
  
  const selectedNode = useMemo(() => {
    if (selectedNodeIds.length !== 1) return undefined;
    return nodes.find(n => n.id === selectedNodeIds[0]);
  }, [nodes, selectedNodeIds]);
  
  const handleCreateVersion = (name: string) => {
    const newVersion: PipelineVersion = {
      id: `v${activeLineage.versions.length + 1}`,
      name,
      nodes: JSON.parse(JSON.stringify(activeVersion.nodes)),
      connectors: JSON.parse(JSON.stringify(activeVersion.connectors)),
      groups: JSON.parse(JSON.stringify(activeVersion.groups || [])),
    };
    
    setLineages(prev => prev.map(l => 
        l.id === activeLineageId ? { ...l, versions: [...l.versions, newVersion] } : l
    ));
    setActiveVersionId(newVersion.id);
  };

  const handleImportPipeline = (importData: any) => {
    setLineages(currentLineages => currentLineages.map(l => 
      l.id === activeLineageId ? {
        ...l,
        versions: l.versions.map(v => v.id === activeVersionId ? { 
          ...v, 
          nodes: importData.nodes, 
          connectors: importData.connectors,
          groups: importData.groups || []
        } : v)
      } : l
    ));
  };

  const handleApplyScaffold = (scaffold: any) => {
    const newNodes: PipelineNode[] = scaffold.nodes.map((n: any, i: number) => ({
      id: `${n.type}-${Date.now()}-${i}`,
      name: n.name,
      type: n.type,
      status: 'draft',
      position: { x: n.x, y: n.y },
      inputFields: [],
      outputFields: [],
      operation: n.operationType ? { type: n.operationType, settings: {} } : undefined
    }));

    const newConnectors: ConnectorType[] = scaffold.connectors.map((c: any) => ({
      from: newNodes[c.fromIndex].id,
      to: newNodes[c.toIndex].id
    }));

    setNodes(newNodes);
    setConnectors(newConnectors);
    setGroups([]);
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    
    if (nodes.length === 0) {
      setSvgDimensions({ width: '100%', height: '100%', top: 0, left: 0 });
      return;
    }
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + NODE_WIDTH); 
      maxY = Math.max(maxY, node.position.y + 200);  
    });
    
    const padding = 1000;
    const finalMinX = minX - padding;
    const finalMinY = minY - padding;
    const width = maxX - minX + (padding * 2);
    const height = maxY - minY + (padding * 2);
    
    setSvgDimensions({ 
      left: finalMinX,
      top: finalMinY,
      width: Math.max(width, canvasRect.width / zoom), 
      height: Math.max(height, canvasRect.height / zoom)
    });
  }, [nodes, zoom]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        handleDeleteSelected();
      }
      if (e.key.toLowerCase() === 'g' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleCreateGroup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDeleteSelected, handleCreateGroup]);

  const connectionModalSourceNode = nodes.find(n => n.id === connectionForFields?.fromNodeId);

  return (
      <div className="flex h-screen w-full flex-col bg-background font-body overflow-hidden">
        <Header 
          activeLineage={activeLineage}
          activeVersion={activeVersion}
          versions={activeLineage.versions} 
          activeVersionId={activeVersionId} 
          onVersionChange={handleVersionChange} 
          onCreateVersion={handleCreateVersion}
          onGeneratePython={handleGeneratePython}
          onGenerateSpec={handleGenerateSpec}
          onImportPipeline={handleImportPipeline}
          onApplyScaffold={handleApplyScaffold}
          onAutoLayout={handleAutoLayout}
          onGroupSelected={handleCreateGroup}
          activeView={activeView}
          onViewChange={setActiveView}
        />
        
        {activeView === 'dashboard' ? (
          <LineageDashboard 
            lineages={lineages} 
            onSelectLineage={(id) => {
              const l = lineages.find(lin => lin.id === id);
              if (l) {
                setActiveLineageId(id);
                setActiveVersionId(l.versions[0].id);
                setActiveView('editor');
              }
            }}
            onCreateLineage={(name, description) => {
              const newLineage: LineageInfo = {
                id: `lineage-${Date.now()}`,
                name,
                description,
                owner: 'Me',
                lastEdited: 'Just now',
                versions: [{ id: 'v1', name: 'Initial Design', nodes: [], connectors: [], groups: [] }]
              };
              setLineages(prev => [newLineage, ...prev]);
              setActiveLineageId(newLineage.id);
              setActiveVersionId('v1');
              setActiveView('editor');
            }}
          />
        ) : (
          <div className="flex flex-1 overflow-hidden relative">
            <TransformationsCatalogue 
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            
            <main
              className="flex-1 relative overflow-hidden cursor-grab bg-slate-950"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onWheel={handleWheel}
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="absolute inset-0 canvas-grid pointer-events-none" />

              <div
                className="absolute top-0 left-0"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}
              >
                {groups.map((group) => (
                  <GroupZone
                    key={group.id}
                    {...group}
                    onMouseDown={(e) => handleGroupMouseDown(e, group.id)}
                    onResizeMouseDown={(e) => handleResizeMouseDown(e, group.id)}
                    onDelete={() => handleDeleteGroup(group.id)}
                    onRename={(newName) => handleRenameGroup(group.id, newName)}
                    onToggleCollapse={() => handleToggleGroupCollapse(group.id)}
                    isSelected={selectedGroupIds.includes(group.id)}
                  />
                ))}

                <svg
                    className={cn('absolute pointer-events-none overflow-visible')}
                    style={{
                      left: svgDimensions.left,
                      top: svgDimensions.top,
                      width: svgDimensions.width,
                      height: svgDimensions.height
                    }}
                >
                    {connectors.map((connector, index) => {
                      const fromNode = nodes.find((n) => n.id === connector.from);
                      const toNode = nodes.find((n) => n.id === connector.to);
                      if (!fromNode || !toNode) return null;
                      
                      const isFromCollapsed = groups.find(g => g.id === fromNode.groupId)?.isCollapsed;
                      const isToCollapsed = groups.find(g => g.id === toNode.groupId)?.isCollapsed;
                      if (isFromCollapsed || isToCollapsed) return null;

                      return (
                        <Connector 
                          key={`${connector.from}-${connector.to}-${index}`} 
                          from={{ 
                            x: fromNode.position.x + NODE_WIDTH - svgDimensions.left, 
                            y: fromNode.position.y + PORT_Y_OFFSET - svgDimensions.top 
                          }} 
                          to={{ 
                            x: toNode.position.x - svgDimensions.left, 
                            y: toNode.position.y + PORT_Y_OFFSET - svgDimensions.top 
                          }}
                          isSelected={selectedConnector?.from === connector.from && selectedConnector?.to === connector.to}
                          onClick={() => setSelectedConnector(connector)}
                        />
                      );
                    })}
                    {newConnector && (() => {
                      const fromNode = nodes.find(n => n.id === newConnector.from);
                      if (!fromNode) return null;
                      return (
                        <Connector 
                          from={{ 
                            x: fromNode.position.x + NODE_WIDTH - svgDimensions.left, 
                            y: fromNode.position.y + PORT_Y_OFFSET - svgDimensions.top 
                          }} 
                          to={{ 
                            x: newConnector.to.x - svgDimensions.left, 
                            y: newConnector.to.y - svgDimensions.top 
                          }} 
                          className="opacity-50" 
                        />
                      );
                    })()}
                </svg>

                {nodes.map((node) => {
                  const isParentCollapsed = groups.find(g => g.id === node.groupId)?.isCollapsed;
                  if (isParentCollapsed) return null;

                  return (
                    <Node
                      key={node.id}
                      {...node}
                      nodes={nodes}
                      onSelect={(isShift) => handleNodeSelect(node.id, isShift)}
                      onConfigOpen={() => handleOpenConfig(node.id)}
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                      onPortMouseDown={(e) => handlePortMouseDown(e, node.id)}
                      onAddNode={handleAddNode}
                      isSelected={selectedNodeIds.includes(node.id)}
                      onUpdateOperation={handleUpdateOperation}
                    />
                  );
                })}

                {selectionRect && (
                  <div 
                    className="absolute border border-primary bg-primary/10 pointer-events-none z-[100]"
                    style={{
                      left: selectionRect.x,
                      top: selectionRect.y,
                      width: selectionRect.width,
                      height: selectionRect.height
                    }}
                  />
                )}
              </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="glass-panel rounded-2xl flex items-center p-1.5 gap-1 border border-white/10 shadow-2xl">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white" onClick={() => handleZoom(0.1)}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Zoom In</TooltipContent>
                        </Tooltip>
                        
                        <div className="w-14 text-center text-[10px] font-mono font-bold text-muted-foreground bg-white/5 rounded px-1 py-0.5">
                            {Math.round(zoom * 100)}%
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white" onClick={() => handleZoom(-0.1)}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Zoom Out</TooltipContent>
                        </Tooltip>

                        <div className="w-px h-4 bg-white/10 mx-1" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white" onClick={handleFitToScreen}>
                                    <Crosshair className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Fit to Screen</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white" onClick={handleResetCanvas}>
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Reset View</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
              </div>
            </main>
          </div>
        )}
        
        <NodeConfigurationPanel
          key={selectedNodeIds.join(',')}
          node={selectedNode}
          nodes={nodes}
          isOpen={isConfigPanelOpen}
          onClose={() => setIsConfigPanelOpen(false)}
          onSave={handleNodeConfigChange}
          onDelete={handleDeleteNode}
        />
        {connectionForFields && connectionModalSourceNode && (
            <ConnectionFieldsModal
                isOpen={!!connectionForFields}
                fromNode={connectionModalSourceNode}
                toNode={nodes.find(n => n.id === connectionForFields.toNodeId)!}
                onClose={() => setConnectionForFields(null)}
                onSave={handleSaveConnectionFields}
            />
        )}
        <PythonCodeModal 
            isOpen={isPythonModalOpen}
            onClose={() => setIsPythonModalOpen(false)}
            code={generatedPythonCode}
        />
        <SpecModal
            isOpen={isSpecModalOpen}
            onClose={() => setIsSpecModalOpen(false)}
            spec={generatedSpec}
            isLoading={isSpecLoading}
        />
      </div>
  );
}
'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Header from '@/components/layout/header';
import TransformationsCatalogue from '@/components/sidebar/transformations-catalogue';
import NodeConfigurationPanel from '@/components/sidebar/node-configuration-panel';
import Node from '@/components/data-flow/node';
import Connector from '@/components/data-flow/connector';
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
  LineageInfo
} from '@/lib/pipeline-data';
import { cn } from '@/lib/utils';
import ConnectionFieldsModal from '@/components/data-flow/connection-fields-modal';
import PythonCodeModal from '@/components/modals/python-code-modal';
import SpecModal from '@/components/modals/spec-modal';
import { generatePythonCode } from '@/lib/python-generator';
import { generatePipelineSpec } from '@/ai/flows/generate-spec-flow';
import LineageDashboard from '@/components/dashboard/lineage-dashboard';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, Plus, Minus, Maximize, MousePointer2, ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type SvgDimensions = {
  width: number | string;
  height: number | string;
  top: number;
  left: number;
};

// Constant for port positioning (half of node height)
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

  const setNodes = (updater: React.SetStateAction<PipelineNode[]>) => {
    const newNodes = typeof updater === 'function' ? updater(nodes) : updater;
    setLineages(currentLineages => currentLineages.map(l => 
      l.id === activeLineageId ? {
        ...l,
        versions: l.versions.map(v => v.id === activeVersionId ? { ...v, nodes: newNodes } : v)
      } : l
    ));
  };
  
  const setConnectors = (updater: React.SetStateAction<ConnectorType[]>) => {
    const newConnectors = typeof updater === 'function' ? updater(connectors) : updater;
    setLineages(currentLineages => currentLineages.map(l => 
      l.id === activeLineageId ? {
        ...l,
        versions: l.versions.map(v => v.id === activeVersionId ? { ...v, connectors: newConnectors } : v)
      } : l
    ));
  };

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType | null>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [newConnector, setNewConnector] = useState<{ from: string; to: { x: number; y: number } } | null>(null);
  
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [generatedPythonCode, setGeneratedPythonCode] = useState('');
  
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [generatedSpec, setGeneratedSpec] = useState('');
  const [isSpecLoading, setIsSpecLoading] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const draggingNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isConnectingRef = useRef(false);

  const [connectionForFields, setConnectionForFields] = useState<{fromNodeId: string, toNodeId: string} | null>(null);
  const [svgDimensions, setSvgDimensions] = useState<SvgDimensions>({ width: 0, height: 0, top: 0, left: 0 });

  const handleNodeSelect = (id: string) => {
    setSelectedNodeId(id);
    setSelectedConnector(null);
  };

  const handleOpenConfig = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsConfigPanelOpen(true);
  }
  
  const handleConnectorClick = (connector: ConnectorType) => {
    setSelectedConnector(connector);
    setSelectedNodeId(null);
  };

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

  const handleAutoLayout = () => {
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

    setNodes(newNodes);
    toast({
        title: "Layout Applied",
        description: "Your nodes have been arranged hierearchically."
    });
  };
  
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
    
    const newNode: PipelineNode = {
      id: `${item.type}-${Date.now()}`,
      name: item.name,
      type: item.type,
      status: 'draft',
      position: {
        x: (position.x - canvasRect.left - pan.x) / zoom,
        y: (position.y - canvasRect.top - pan.y) / zoom,
      },
      inputFields: item.type === 'destination' || item.type === 'transformation' || item.type === 'dataset' ? [] : undefined,
      outputFields: item.type === 'source' || item.type === 'transformation' || item.type === 'dataset' ? [] : undefined,
      operation: item.type === 'transformation' ? operation : undefined,
    };
    setNodes((prev) => [...prev, newNode]);
  }, [pan.x, pan.y, zoom]);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || isConnectingRef.current) return;

    draggingNodeIdRef.current = nodeId;
    if(canvasRef.current) {
        dragOffsetRef.current = {
            x: e.clientX / zoom - node.position.x,
            y: e.clientY / zoom - node.position.y,
        };
    }
  };

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    isConnectingRef.current = true;
    draggingNodeIdRef.current = null; 
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
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    setSelectedNodeId(null);
    setSelectedConnector(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
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
    } else if (draggingNodeIdRef.current) {
      const nodeId = draggingNodeIdRef.current;
      const newX = e.clientX / zoom - dragOffsetRef.current.x;
      const newY = e.clientY / zoom - dragOffsetRef.current.y;
      setNodes(prevNodes => prevNodes.map(n => n.id === nodeId ? { ...n, position: { x: newX, y: newY } } : n));
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
    
    if (draggingNodeIdRef.current) {
      draggingNodeIdRef.current = null;
    }
    
    if (isConnectingRef.current) {
      const toNodeElement = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-node-id]');
      const toNodeId = toNodeElement?.getAttribute('data-node-id');

      if (toNodeId && newConnector && newConnector.from !== toNodeId) {
        handleNodeMouseUp(e, toNodeId);
      } else {
         isConnectingRef.current = false;
         setNewConnector(null);
      }
    }
  };
  
  const handleNodeMouseUp = (e: React.MouseEvent, toNodeId: string) => {
    e.stopPropagation();
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
    
    isConnectingRef.current = false;
    setNewConnector(null);
    draggingNodeIdRef.current = null;
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
            } else if (leftParentNode) {
                toNode.outputFields = leftParentNode.outputFields;
            } else if (rightParentNode) {
                toNode.outputFields = rightParentNode.outputFields;
            } else {
                toNode.outputFields = [];
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
    setNodes(prevNodes => {
      const updatedNodes = prevNodes.map(n => {
        if (n.id === nodeId) {
          return { ...n, ...newConfig };
        }
        return n;
      });
  
      const propagateUpdates = (nodesToUpdate: PipelineNode[], startNodeId: string): PipelineNode[] => {
        let currentNodes = [...nodesToUpdate];
        const queue = [startNodeId];
        const visited = new Set<string>([startNodeId]);
  
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const currentNode = currentNodes.find(n => n.id === currentId)!;
          
          let newOutputFields = currentNode.outputFields || [];
          if (currentNode.type === 'dataset') {
            newOutputFields = currentNode.inputFields || [];
          } else if (currentNode.operation) {
            switch(currentNode.operation.type) {
              case 'filter':
              case 'sort':
              case 'union':
                newOutputFields = currentNode.inputFields || [];
                break;
              case 'select_columns': {
                const selectOp = currentNode.operation as SelectColumnsOperation;
                newOutputFields = (currentNode.inputFields || []).filter(f => selectOp.settings.selectedFields?.includes(f.name));
                break;
              }
              case 'join': {
                const joinOp = currentNode.operation as JoinOperation;
                const leftNode = currentNodes.find(ln => ln.id === joinOp.settings.leftNodeId);
                const rightNode = currentNodes.find(rn => rn.id === joinOp.settings.rightNodeId);
                if (leftNode && rightNode) {
                  newOutputFields = getJoinOutputFields(leftNode, rightNode, joinOp.settings.joinType);
                }
                break;
              }
              case 'group_by': {
                const groupOp = currentNode.operation as GroupByOperation;
                const calculatedOutput: Field[] = [];
                groupOp.settings.groupByFields.forEach(fieldName => {
                    const field = currentNode.inputFields?.find(f => f.name === fieldName);
                    if(field) calculatedOutput.push(field);
                });
                groupOp.settings.aggregations.forEach(agg => {
                    const originalField = currentNode.inputFields?.find(f => f.name === agg.field);
                    calculatedOutput.push({ name: agg.newName, type: originalField?.type || 'unknown' });
                });
                newOutputFields = calculatedOutput;
                break;
              }
              default:
                 newOutputFields = currentNode.inputFields || [];
                 break;
            }
          }
          
          currentNodes = currentNodes.map(n => n.id === currentId ? {...n, outputFields: newOutputFields} : n);

          const downstreamConnectors = connectors.filter(c => c.from === currentId);
          for (const connector of downstreamConnectors) {
            const downstreamId = connector.to;
            const downstreamNodeIndex = currentNodes.findIndex(n => n.id === downstreamId);
            if (downstreamNodeIndex === -1) continue;

            const parentNodes = connectors
                .filter(c => c.to === downstreamId)
                .map(c => currentNodes.find(n => n.id === c.from))
                .filter((n): n is PipelineNode => !!n);
            
            const newInputFields = parentNodes.flatMap(pn => pn?.outputFields || []);

            currentNodes[downstreamNodeIndex] = { ...currentNodes[downstreamNodeIndex], inputFields: newInputFields };

            if (!visited.has(downstreamId)) {
                visited.add(downstreamId);
                queue.push(downstreamId);
            }
          }
        }
        return currentNodes;
      };
  
      return propagateUpdates(updatedNodes, nodeId);
    });
  };
  
    const handleUpdateOperation = (nodeId: string, operation: Operation) => {
        setNodes(prevNodes => prevNodes.map(n => {
            if (n.id === nodeId) {
                return { ...n, operation };
            }
            return n;
        }));
    };
  
  const handleDeleteNode = (nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;

    const downstreamConnectors = connectors.filter(c => c.from === nodeId);
    const downstreamNodeIds = downstreamConnectors.map(c => c.to);
    const fieldsToRemove = new Set(nodeToDelete.outputFields?.map(f => f.name) || []);

    setNodes(prev => prev.map(n => {
        if (downstreamNodeIds.includes(n.id)) {
            let updatedNode = { ...n };
            updatedNode.inputFields = updatedNode.inputFields?.filter(f => !fieldsToRemove.has(f.name));
            
            if (updatedNode.operation?.type === 'join') {
                const joinOp = { ...updatedNode.operation } as JoinOperation;
                if (joinOp.settings.leftNodeId === nodeId) joinOp.settings.leftNodeId = '';
                if (joinOp.settings.rightNodeId === nodeId) joinOp.settings.rightNodeId = '';
                updatedNode.operation = joinOp;
            }

            return updatedNode;
        }
        return n;
    }).filter(n => n.id !== nodeId)); 

    setConnectors(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));

    if(selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setIsConfigPanelOpen(false);
    }
  };

  const handleDeleteConnector = (connector: ConnectorType) => {
    const fromNode = nodes.find(n => n.id === connector.from);
    
    setNodes(prev => prev.map(n => {
      if (n.id === connector.to) {
        let updatedNode = {...n};
        
        const fieldsToRemove = new Set(fromNode?.outputFields?.map(f => f.name) || []);

        if (updatedNode.inputFields) {
            updatedNode.inputFields = updatedNode.inputFields.filter(f => !fieldsToRemove.has(f.name));
        }

        if (updatedNode.type === 'dataset' || (updatedNode.operation?.type === 'filter')) {
            updatedNode.outputFields = updatedNode.inputFields;
        }

        if (updatedNode.operation?.type === 'join') {
            const joinOp = {...updatedNode.operation} as JoinOperation;
            let wasModified = false;
            if (joinOp.settings.leftNodeId === connector.from) {
                joinOp.settings.leftNodeId = '';
                wasModified = true;
            }
            if (joinOp.settings.rightNodeId === connector.from) {
                joinOp.settings.rightNodeId = '';
                wasModified = true;
            }

            if(wasModified) {
              const leftNode = nodes.find(node => node.id === joinOp.settings.leftNodeId);
              const rightNode = nodes.find(node => node.id === joinOp.settings.rightNodeId);
              
              if (leftNode && rightNode) {
                updatedNode.outputFields = getJoinOutputFields(leftNode, rightNode, joinOp.settings.joinType);
              } else {
                updatedNode.outputFields = leftNode?.outputFields || rightNode?.outputFields || [];
              }
               updatedNode.operation = joinOp;
            }
        }
        return updatedNode;
      }
      return n;
    }));

    setConnectors(prev => prev.filter(c => !(c.from === connector.from && c.to === connector.to)));
    setSelectedConnector(null);
  }

  const handleGeneratePython = useCallback(() => {
    if (!nodes) return;
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
      setGeneratedSpec("Failed to generate specification. Please try again.");
    } finally {
      setIsSpecLoading(false);
    }
  };
  
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return nodes.find(n => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);
  
  const handleCreateVersion = (name: string) => {
    const newVersion: PipelineVersion = {
      id: `v${activeLineage.versions.length + 1}`,
      name,
      nodes: JSON.parse(JSON.stringify(activeVersion.nodes)),
      connectors: JSON.parse(JSON.stringify(activeVersion.connectors)),
    };
    
    setLineages(prev => prev.map(l => 
        l.id === activeLineageId ? { ...l, versions: [...l.versions, newVersion] } : l
    ));
    setActiveVersionId(newVersion.id);
  };

  const handleCreateLineage = (name: string, description: string) => {
    const newLineage: LineageInfo = {
      id: `lineage-${Date.now()}`,
      name,
      description,
      owner: 'Me',
      lastEdited: 'Just now',
      versions: [{
        id: 'v1',
        name: 'Initial Design',
        nodes: [],
        connectors: []
      }]
    };
    setLineages(prev => [newLineage, ...prev]);
    setActiveLineageId(newLineage.id);
    setActiveVersionId('v1');
    setActiveView('editor');
  };

  const handleImportPipeline = (importData: any) => {
    if (!importData.nodes || !importData.connectors) {
      toast({
        variant: "destructive",
        title: "Import Error",
        description: "Invalid pipeline JSON format."
      });
      return;
    }

    setLineages(currentLineages => currentLineages.map(l => 
      l.id === activeLineageId ? {
        ...l,
        versions: l.versions.map(v => v.id === activeVersionId ? { 
          ...v, 
          nodes: importData.nodes, 
          connectors: importData.connectors 
        } : v)
      } : l
    ));

    toast({
      title: "Pipeline Imported",
      description: "Design has been successfully updated from JSON."
    });
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
  };

  const handleSelectLineage = (id: string) => {
    const lineage = lineages.find(l => l.id === id);
    if (lineage) {
      setActiveLineageId(id);
      setActiveVersionId(lineage.versions[0].id);
      setActiveView('editor');
    }
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
      maxX = Math.max(maxX, node.position.x + 256); 
      maxY = Math.max(maxY, node.position.y + 200);  
    });
    
    const padding = 500;
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
  }, [nodes, zoom, pan]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        if (selectedNodeId && !isConfigPanelOpen) {
          handleDeleteNode(selectedNodeId);
        } else if (selectedConnector) {
          handleDeleteConnector(selectedConnector);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, selectedConnector, isConfigPanelOpen, handleDeleteNode, handleDeleteConnector]);

  const connectionModalSourceNode = nodes.find(n => n.id === connectionForFields?.fromNodeId);

  return (
      <div className="flex h-screen w-full flex-col bg-background font-body overflow-hidden">
        <Header 
          activeLineage={activeLineage}
          activeVersion={activeVersion}
          versions={activeLineage.versions} 
          activeVersionId={activeVersionId} 
          onVersionChange={onVersionChange}
          onCreateVersion={handleCreateVersion}
          onGeneratePython={handleGeneratePython}
          onGenerateSpec={handleGenerateSpec}
          onImportPipeline={handleImportPipeline}
          onApplyScaffold={handleApplyScaffold}
          onAutoLayout={handleAutoLayout}
          activeView={activeView}
          onViewChange={setActiveView}
        />
        
        {activeView === 'dashboard' ? (
          <LineageDashboard 
            lineages={lineages} 
            onSelectLineage={handleSelectLineage}
            onCreateLineage={handleCreateLineage}
          />
        ) : (
          <div className="flex flex-1 overflow-hidden relative">
            <TransformationsCatalogue 
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            
            {isSidebarCollapsed && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute left-4 top-4 z-40 h-8 w-8 glass-panel border border-white/10"
                onClick={() => setIsSidebarCollapsed(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

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
            >
              <div className="absolute inset-0 canvas-grid pointer-events-none" />

              <div
                className="absolute top-0 left-0"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}
              >
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
                          onClick={() => handleConnectorClick(connector)}
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

                {nodes.map((node) => (
                  <Node
                    key={node.id}
                    {...node}
                    nodes={nodes}
                    onSelect={() => handleNodeSelect(node.id)}
                    onConfigOpen={() => handleOpenConfig(node.id)}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                    onPortMouseDown={(e) => handlePortMouseDown(e, node.id)}
                    onAddNode={handleAddNode}
                    isSelected={selectedNodeId === node.id}
                    onUpdateOperation={handleUpdateOperation}
                  />
                ))}
              </div>

              {/* Floating Canvas Controls */}
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
          key={selectedNodeId}
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
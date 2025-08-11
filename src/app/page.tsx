
'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Header from '@/components/layout/header';
import TransformationsCatalogue from '@/components/sidebar/transformations-catalogue';
import NodeConfigurationPanel from '@/components/sidebar/node-configuration-panel';
import Node from '@/components/data-flow/node';
import Connector from '@/components/data-flow/connector';
import { nodes as initialNodes, connectors as initialConnectors, PipelineNode, TransformationItem, Connector as ConnectorType, Field, Operation, FilterOperation, JoinOperation } from '@/lib/pipeline-data';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import ConnectionFieldsModal from '@/components/data-flow/connection-fields-modal';

type SvgDimensions = {
  width: number | string;
  height: number | string;
  top: number;
  left: number;
};

export default function DataFlowCanvas() {
  const [nodes, setNodes] = useState<PipelineNode[]>(initialNodes);
  const [connectors, setConnectors] = useState<ConnectorType[]>(initialConnectors);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType | null>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [newConnector, setNewConnector] = useState<{ from: string; to: { x: number; y: number } } | null>(null);
  
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
            default:
                operation = { type: item.operationType, settings: {} };
                break;
        }
    }
    
    const newNode: PipelineNode = {
      id: `${item.type}-${Date.now()}`,
      name: item.name,
      type: item.type,
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
      setConnectors(prev => [...prev, { from: fromNodeId, to: toNodeId }]);
      setNodes(prev => prev.map(node => {
        if (node.id === toNodeId) {
            const currentInputFields = node.inputFields || [];
            const newFields = selectedFields.filter(sf => !currentInputFields.some(cif => cif.name === sf.name));
            const finalFields = [...currentInputFields, ...newFields];
            
            let finalOutputFields = node.outputFields;

            // If it's a join node, we need to handle inputs and operation settings differently
            if (node.operation?.type === 'join') {
                const joinOp = node.operation as JoinOperation;
                const fromNode = nodes.find(n => n.id === fromNodeId);

                // This is a simplified logic. It assumes first two connections are left and right.
                if (!joinOp.settings.leftNodeId) {
                    joinOp.settings.leftNodeId = fromNodeId;
                } else if (!joinOp.settings.rightNodeId) {
                    joinOp.settings.rightNodeId = fromNodeId;
                }

                const leftNode = nodes.find(n => n.id === joinOp.settings.leftNodeId);
                const rightNode = nodes.find(n => n.id === joinOp.settings.rightNodeId);

                finalOutputFields = [
                    ...(leftNode?.outputFields || []),
                    ...(rightNode?.outputFields || [])
                ];

                return { ...node, inputFields: finalFields, outputFields: finalOutputFields, operation: joinOp };

            } else if (node.type === 'transformation' && (!node.outputFields || node.outputFields.length === 0)) {
                finalOutputFields = finalFields;
            } else if (node.type === 'dataset') {
                finalOutputFields = finalFields;
            }

            return { ...node, inputFields: finalFields, outputFields: finalOutputFields };
        }
        return node;
    }));
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
    newZoom = Math.min(Math.max(newZoom, 0.2), 5);

    const newPanX = pan.x - (x - pan.x) * (newZoom / zoom - 1);
    const newPanY = pan.y - (y - pan.y) * (newZoom / zoom - 1);

    setZoom(newZoom);
    setPan({x: newPanX, y: newPanY});
  };
  
  const handleNodeConfigChange = (nodeId: string, newConfig: Partial<PipelineNode>) => {
    setNodes(prevNodes => prevNodes.map(n => {
      if (n.id === nodeId) {
        const updatedNode = { ...n, ...newConfig };
        // For datasets, input and output schemas are the same
        if (updatedNode.type === 'dataset') {
          updatedNode.outputFields = updatedNode.inputFields;
        }
        // For filter operations, output schema is the same as input
        if (updatedNode.operation?.type === 'filter') {
          updatedNode.outputFields = updatedNode.inputFields;
        }
        // For join operation, output is combination of inputs
        if (updatedNode.operation?.type === 'join') {
            const joinOp = updatedNode.operation as JoinOperation;
            const leftNode = nodes.find(ln => ln.id === joinOp.settings.leftNodeId);
            const rightNode = nodes.find(rn => rn.id === joinOp.settings.rightNodeId);
            updatedNode.outputFields = [
                ...(leftNode?.outputFields || []),
                ...(rightNode?.outputFields || [])
            ];
        }

        return updatedNode;
      }
      return n;
    }));
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

    setNodes(prev => prev.filter(n => n.id !== nodeId));
    
    const relatedConnectors = connectors.filter(c => c.from === nodeId || c.to === nodeId);
    setConnectors(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId));
    
    relatedConnectors.forEach(conn => {
        if (conn.from === nodeId) { // Deleting a source node, update downstream nodes
            const downstreamNode = nodes.find(n => n.id === conn.to);
            if (downstreamNode && downstreamNode.inputFields) {
                 const sourceFields = nodeToDelete.outputFields?.map(f => f.name) || [];
                 setNodes(prev => prev.map(n => {
                     if (n.id === conn.to) {
                         const remainingFields = n.inputFields?.filter(f => !sourceFields.includes(f.name))
                         return {...n, inputFields: remainingFields, outputFields: n.type === 'dataset' ? remainingFields : n.outputFields };
                     }
                     return n;
                 }));
            }
        }
    });

    if(selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setIsConfigPanelOpen(false);
    }
  };

  const handleDeleteConnector = (connector: ConnectorType) => {
    setConnectors(prev => prev.filter(c => !(c.from === connector.from && c.to === connector.to)));

    const fromNode = nodes.find(n => n.id === connector.from);
    const toNode = nodes.find(n => n.id === connector.to);
    const fromNodeFields = fromNode?.outputFields?.map(f => f.name) || [];
    
    setNodes(prev => prev.map(n => {
      if (n.id === connector.to) {
        const remainingFields = n.inputFields?.filter(f => !fromNodeFields.includes(f.name));
        let updatedNode = {...n, inputFields: remainingFields};
        
        if (n.type === 'dataset') {
            updatedNode.outputFields = remainingFields;
        }

        if (n.operation?.type === 'join') {
            const joinOp = n.operation as JoinOperation;
            if (joinOp.settings.leftNodeId === connector.from) {
                joinOp.settings.leftNodeId = '';
            }
            if (joinOp.settings.rightNodeId === connector.from) {
                joinOp.settings.rightNodeId = '';
            }
            const leftNode = nodes.find(node => node.id === joinOp.settings.leftNodeId);
            const rightNode = nodes.find(node => node.id === joinOp.settings.rightNodeId);
             updatedNode.outputFields = [
                ...(leftNode?.outputFields || []),
                ...(rightNode?.outputFields || [])
             ];
             updatedNode.operation = joinOp;
        }

        return updatedNode;
      }
      return n;
    }));
    
    setSelectedConnector(null);
  }
  
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return nodes.find(n => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

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
      maxX = Math.max(maxX, node.position.x + 256); // node width (w-64)
      maxY = Math.max(maxY, node.position.y + 200);  // max node height approx
    });
    
    const padding = 200;
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
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-background font-body">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <TransformationsCatalogue />
          <main
            className="flex-1 relative overflow-hidden cursor-grab"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onWheel={handleWheel}
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
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
                        from={{ x: fromNode.position.x - svgDimensions.left, y: fromNode.position.y - svgDimensions.top }} 
                        to={{ x: toNode.position.x - svgDimensions.left, y: toNode.position.y - svgDimensions.top }}
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
                        from={{ x: fromNode.position.x - svgDimensions.left, y: fromNode.position.y - svgDimensions.top }} 
                        to={{ x: newConnector.to.x - svgDimensions.left, y: newConnector.to.y - svgDimensions.top }} 
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
          </main>
        </div>
        <NodeConfigurationPanel
          node={selectedNode}
          nodes={nodes}
          connectors={connectors}
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
      </div>
    </SidebarProvider>
  );
}

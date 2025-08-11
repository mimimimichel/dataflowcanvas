
'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Header from '@/components/layout/header';
import TransformationsCatalogue from '@/components/sidebar/transformations-catalogue';
import NodeConfigurationPanel from '@/components/sidebar/node-configuration-panel';
import Node from '@/components/data-flow/node';
import Connector from '@/components/data-flow/connector';
import { nodes as initialNodes, connectors as initialConnectors, PipelineNode, TransformationItem, Connector as ConnectorType, Field, Operation, FilterOperation, JoinOperation, GroupByOperation, getJoinOutputFields } from '@/lib/pipeline-data';
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
            case 'group_by':
                operation = {
                    type: 'group_by',
                    settings: {
                        groupByFields: [],
                        aggregations: []
                    }
                } as GroupByOperation;
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
      
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        const toNodeIndex = newNodes.findIndex(n => n.id === toNodeId);

        if (toNodeIndex === -1) return prevNodes;

        let toNode = { ...newNodes[toNodeIndex] };
        
        // This combines newly selected fields with existing ones.
        const currentInputFields = toNode.inputFields || [];
        const newFields = selectedFields.filter(sf => !currentInputFields.some(cif => cif.name === sf.name));
        toNode.inputFields = [...currentInputFields, ...newFields];
        
        if (toNode.operation?.type === 'join') {
            const joinOp = { ...toNode.operation } as JoinOperation;
            
            // Assign to left or right node id
            if (!joinOp.settings.leftNodeId) {
                joinOp.settings.leftNodeId = fromNodeId;
            } else if (!joinOp.settings.rightNodeId) {
                joinOp.settings.rightNodeId = fromNodeId;
            }
            toNode.operation = joinOp;

            // This is the crucial fix: we need to find both parent nodes and combine their output fields.
            const otherParentId = joinOp.settings.leftNodeId === fromNodeId ? joinOp.settings.rightNodeId : joinOp.settings.leftNodeId;
            const fromNode = newNodes.find(n => n.id === fromNodeId);
            const otherParentNode = newNodes.find(n => n.id === otherParentId);

            const combinedInputFields = [...(fromNode?.outputFields || [])];
            
            if (otherParentNode) {
                 (otherParentNode.outputFields || []).forEach(otherField => {
                    if(!combinedInputFields.some(f => f.name === otherField.name)) {
                        combinedInputFields.push(otherField);
                    }
                });
            }

            toNode.inputFields = combinedInputFields;
            
            const leftNode = newNodes.find(n => n.id === joinOp.settings.leftNodeId);
            const rightNode = newNodes.find(n => n.id === joinOp.settings.rightNodeId);

            if(leftNode && rightNode) {
              toNode.outputFields = getJoinOutputFields(leftNode, rightNode, joinOp.settings.joinType);
            }
        } else if (toNode.type === 'transformation' && (!toNode.outputFields || toNode.outputFields.length === 0)) {
            toNode.outputFields = toNode.inputFields;
        } else if (toNode.type === 'dataset') {
            toNode.outputFields = toNode.inputFields;
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
    newZoom = Math.min(Math.max(newZoom, 0.2), 5);

    const newPanX = pan.x - (x - pan.x) * (newZoom / zoom - 1);
    const newPanY = pan.y - (y - pan.y) * (newZoom / zoom - 1);

    setZoom(newZoom);
    setPan({x: newPanX, y: newPanY});
  };
  
  const handleNodeConfigChange = (nodeId: string, newConfig: Partial<PipelineNode>) => {
    setNodes(prevNodes => {
      const updatedNodes = prevNodes.map(n => {
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
              const leftNode = prevNodes.find(ln => ln.id === joinOp.settings.leftNodeId);
              const rightNode = prevNodes.find(rn => rn.id === joinOp.settings.rightNodeId);
              if (leftNode && rightNode) {
                updatedNode.outputFields = getJoinOutputFields(leftNode, rightNode, joinOp.settings.joinType);
              }
          }
          
          if (updatedNode.operation?.type === 'group_by') {
              const groupOp = updatedNode.operation as GroupByOperation;
              const newOutputFields: Field[] = [];
              groupOp.settings.groupByFields.forEach(fieldName => {
                  const field = updatedNode.inputFields?.find(f => f.name === fieldName);
                  if(field) newOutputFields.push(field);
              });
              groupOp.settings.aggregations.forEach(agg => {
                  // This is simplified, in reality type would depend on agg type (e.g. count is int)
                  const originalField = updatedNode.inputFields?.find(f => f.name === agg.field);
                  newOutputFields.push({ name: agg.newName, type: originalField?.type || 'unknown' });
              });
              updatedNode.outputFields = newOutputFields;
          }

          return updatedNode;
        }
        return n;
      });

      // After a node is updated, we might need to update its downstream nodes
      const downstreamNodeIds = connectors
        .filter(c => c.from === nodeId)
        .map(c => c.to);

      if (downstreamNodeIds.length > 0) {
        return updatedNodes.map(n => {
          if (downstreamNodeIds.includes(n.id)) {
            // Re-calculate input fields for downstream nodes
            const incomingConnectors = connectors.filter(c => c.to === n.id);
            const parentNodes = incomingConnectors.map(c => updatedNodes.find(un => un.id === c.from));
            const newInputFields = parentNodes.flatMap(pn => pn?.outputFields || []);
            
            return { ...n, inputFields: newInputFields };
          }
          return n;
        });
      }

      return updatedNodes;
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

    // Get connectors to and from the node being deleted
    const relatedConnectors = connectors.filter(c => c.from === nodeId || c.to === nodeId);
    const downstreamConnectors = relatedConnectors.filter(c => c.from === nodeId);

    // Get the fields that will be removed from downstream nodes
    const fieldsToRemove = new Set(nodeToDelete.outputFields?.map(f => f.name) || []);

    // Update downstream nodes
    setNodes(prev => prev.map(n => {
        if (downstreamNodeIds.includes(n.id)) {
            let updatedNode = { ...n };
            // Remove the fields from the deleted node
            updatedNode.inputFields = updatedNode.inputFields?.filter(f => !fieldsToRemove.has(f.name));
            
            // If it's a join node, clear the corresponding source ID
            if (updatedNode.operation?.type === 'join') {
                const joinOp = { ...updatedNode.operation } as JoinOperation;
                if (joinOp.settings.leftNodeId === nodeId) joinOp.settings.leftNodeId = '';
                if (joinOp.settings.rightNodeId === nodeId) joinOp.settings.rightNodeId = '';
                updatedNode.operation = joinOp;
            }

            // TODO: Recalculate output fields for this downstream node
            return updatedNode;
        }
        return n;
    }).filter(n => n.id !== nodeId)); // Finally, remove the node itself

    // Remove all related connectors
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
      </div>
    </SidebarProvider>
  );
}

    
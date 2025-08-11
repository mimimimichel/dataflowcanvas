
'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Header from '@/components/layout/header';
import TransformationsCatalogue from '@/components/sidebar/transformations-catalogue';
import NodeConfigurationPanel from '@/components/sidebar/node-configuration-panel';
import Node from '@/components/data-flow/node';
import Connector from '@/components/data-flow/connector';
import { nodes as initialNodes, connectors as initialConnectors, PipelineNode, TransformationItem, Connector as ConnectorType, Field } from '@/lib/pipeline-data';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export default function DataFlowCanvas() {
  const [nodes, setNodes] = useState<PipelineNode[]>(initialNodes);
  const [connectors, setConnectors] = useState<ConnectorType[]>(initialConnectors);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'consumer' | 'engineer'>('consumer');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [newConnector, setNewConnector] = useState<{ from: string; to: { x: number; y: number } } | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const draggingNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isConnectingRef = useRef(false);

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
  };
  
  const handleAddNode = useCallback((item: TransformationItem, position: {x: number, y: number}) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newNode: PipelineNode = {
      id: `${item.type}-${Date.now()}`,
      name: item.name,
      type: item.type,
      quality: 100,
      position: {
        x: (position.x - canvasRect.left - pan.x) / zoom,
        y: (position.y - canvasRect.top - pan.y) / zoom,
      },
      inputFields: item.type === 'destination' ? [{name: 'new_field', type: 'string'}] : [],
      outputFields: item.type === 'source' ? [{name: 'new_field', type: 'string'}] : [],
      rule: item.type === 'transformation' ? 'SELECT * FROM input' : '',
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
    draggingNodeIdRef.current = null; // Prevent node dragging when connecting
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
    // Only pan if not starting a drag on a node or a port
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-id]') || target.closest('[data-port="true"]')) {
      return;
    }
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
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
        setConnectors(prev => {
          if (prev.some(c => c.from === newConn.from && c.to === newConn.to)) {
            return prev;
          }
          return [...prev, newConn];
        });
      }
    }
    
    isConnectingRef.current = false;
    setNewConnector(null);
    draggingNodeIdRef.current = null;
  }

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
    // Only zoom if the event is directly on the canvas background
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
    setNodes(prevNodes => prevNodes.map(n => n.id === nodeId ? { ...n, ...newConfig } : n));
  };
  
  const selectedNode = useMemo(() => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node && node.type === 'transformation') {
        const incomingConnections = connectors.filter(c => c.to === selectedNodeId);
        const inputFields: Field[] = [];
        incomingConnections.forEach(conn => {
          const sourceNode = nodes.find(n => n.id === conn.from);
          if (sourceNode && sourceNode.outputFields) {
            inputFields.push(...sourceNode.outputFields);
          }
        });
        
        const uniqueInputFields = Array.from(new Map(inputFields.map(item => [item.name, item])).values());
        
        const originalNode = nodes.find(n => n.id === selectedNodeId);
        if (originalNode) {
          const updatedNode = {...originalNode, inputFields: uniqueInputFields};
           if (JSON.stringify(originalNode) !== JSON.stringify(updatedNode)) {
             return updatedNode;
           }
        }
      }
      return node;
    }
    return undefined;
  }, [nodes, connectors, selectedNodeId]);

  const svgDimensions = useMemo(() => {
    if (nodes.length === 0) return { width: '100%', height: '100%', top: 0, left: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 208); // node width
      maxY = Math.max(maxY, node.position.y + 96);  // node height
    });
    return { 
      left: minX - 50,
      top: minY - 50,
      width: maxX - minX + 100, 
      height: maxY - minY + 100
    };
  }, [nodes]);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-background font-body">
        <Header viewMode={viewMode} setViewMode={setViewMode} />
        <div className="flex flex-1 overflow-hidden">
          <TransformationsCatalogue onAddNode={handleAddNode} />
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
                  onClick={() => handleNodeClick(node.id)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                  onPortMouseDown={(e) => handlePortMouseDown(e, node.id)}
                  isSelected={selectedNodeId === node.id}
                />
              ))}
            </div>
          </main>
        </div>
        <NodeConfigurationPanel
          node={selectedNode}
          isOpen={!!selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
          onSave={handleNodeConfigChange}
          viewMode={viewMode}
        />
      </div>
    </SidebarProvider>
  );
}

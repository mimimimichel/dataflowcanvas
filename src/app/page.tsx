
'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Header from '@/components/layout/header';
import TransformationsCatalogue from '@/components/sidebar/transformations-catalogue';
import NodeConfigurationPanel from '@/components/sidebar/node-configuration-panel';
import Node from '@/components/data-flow/node';
import Connector from '@/components/data-flow/connector';
import { nodes as initialNodes, connectors as initialConnectors, PipelineNode, TransformationItem, Connector as ConnectorType } from '@/lib/pipeline-data';
import { SidebarProvider } from '@/components/ui/sidebar';

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
      status: 'healthy',
      quality: 100,
      position: {
        x: (position.x - canvasRect.left - pan.x) / zoom,
        y: (position.y - canvasRect.top - pan.y) / zoom,
      },
    };
    setNodes((prev) => [...prev, newNode]);
  }, [pan.x, pan.y, zoom]);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (e.shiftKey || (e.target as HTMLElement).closest('[data-port]')) {
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

    } else {
        draggingNodeIdRef.current = nodeId;
        if(canvasRef.current) {
            dragOffsetRef.current = {
                x: e.clientX / zoom - node.position.x,
                y: e.clientY / zoom - node.position.y,
            };
        }
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && canvasRef.current) {
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        canvasRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeIdRef.current) {
      const nodeId = draggingNodeIdRef.current;
      const newX = e.clientX / zoom - dragOffsetRef.current.x;
      const newY = e.clientY / zoom - dragOffsetRef.current.y;
      setNodes(prevNodes => prevNodes.map(n => n.id === nodeId ? { ...n, position: { x: newX, y: newY } } : n));
    } else if (isConnectingRef.current && newConnector) {
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setNewConnector({
        ...newConnector,
        to: {
          x: (e.clientX - canvasRect.left - pan.x) / zoom,
          y: (e.clientY - canvasRect.top - pan.y) / zoom,
        }
      });
    } else if (isPanningRef.current) {
      const newX = e.clientX - panStartRef.current.x;
      const newY = e.clientY - panStartRef.current.y;
      setPan({ x: newX, y: newY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    isPanningRef.current = false;
    draggingNodeIdRef.current = null;
    isConnectingRef.current = false;
    setNewConnector(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };
  
  const handleNodeMouseUp = (e: React.MouseEvent, toNodeId: string) => {
    e.stopPropagation();
    if (isConnectingRef.current && newConnector && newConnector.from !== toNodeId) {
      const newConn = { from: newConnector.from, to: toNodeId };
      setConnectors(prev => {
        if (prev.some(c => c.from === newConn.from && c.to === newConn.to)) {
          return prev;
        }
        return [...prev, newConn];
      });
    }
    isConnectingRef.current = false;
    setNewConnector(null);
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
    if (e.target !== canvasRef.current) return;
    e.preventDefault();
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.min(Math.max(newZoom, 0.2), 5));
  };

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-background font-body">
        <Header viewMode={viewMode} setViewMode={setViewMode} />
        <div className="flex flex-1 overflow-hidden">
          <TransformationsCatalogue onAddNode={handleAddNode} />
          <main
            ref={canvasRef}
            className="flex-1 relative overflow-hidden cursor-grab"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onWheel={handleWheel}
          >
            <div
              className="absolute top-0 left-0"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}
            >
              {connectors.map((connector, index) => {
                const fromNode = nodes.find((n) => n.id === connector.from);
                const toNode = nodes.find((n) => n.id === connector.to);
                if (!fromNode || !toNode) return null;
                return <Connector key={`${connector.from}-${connector.to}-${index}`} from={fromNode.position} to={toNode.position} />;
              })}
              {newConnector && (() => {
                const fromNode = nodes.find(n => n.id === newConnector.from);
                if (!fromNode) return null;
                return <Connector from={fromNode.position} to={newConnector.to} className="opacity-50" />;
              })()}
              {nodes.map((node) => (
                <Node
                  key={node.id}
                  {...node}
                  onClick={() => handleNodeClick(node.id)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
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
          viewMode={viewMode}
        />
      </div>
    </SidebarProvider>
  );
}

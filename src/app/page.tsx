
'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Header from '@/components/layout/header';
import TransformationsCatalogue from '@/components/sidebar/transformations-catalogue';
import NodeConfigurationPanel from '@/components/sidebar/node-configuration-panel';
import Node from '@/components/data-flow/node';
import Connector from '@/components/data-flow/connector';
import { nodes as initialNodes, connectors as initialConnectors, PipelineNode, TransformationItem } from '@/lib/pipeline-data';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function DataFlowCanvas() {
  const [nodes, setNodes] = useState<PipelineNode[]>(initialNodes);
  const [connectors, setConnectors] = useState(initialConnectors);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'consumer' | 'engineer'>('consumer');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  const mainRef = useRef<HTMLElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
  };
  
  const handleAddNode = (item: TransformationItem, position: {x: number, y: number}) => {
    const newNode: PipelineNode = {
      id: `${item.type}-${Date.now()}`,
      name: item.name,
      type: item.type,
      status: 'healthy',
      quality: 100,
      position: {
        x: position.x - pan.x - 256, // Adjust for sidebar and pan
        y: position.y - pan.y - 64, // Adjust for header and pan
      },
    };
    setNodes((prev) => [...prev, newNode]);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== mainRef.current) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    panStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const itemString = e.dataTransfer.getData('application/json');
    if (itemString) {
      const item = JSON.parse(itemString);
      const position = { x: e.clientX, y: e.clientY };
      handleAddNode(item, position);
    }
  }, [pan]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
            ref={mainRef}
            className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div
              className="absolute inset-0"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
            >
              {connectors.map((connector) => {
                const fromNode = nodes.find((n) => n.id === connector.from);
                const toNode = nodes.find((n) => n.id === connector.to);
                if (!fromNode || !toNode) return null;
                return <Connector key={`${connector.from}-${connector.to}`} from={fromNode.position} to={toNode.position} />;
              })}
              {nodes.map((node) => (
                <Node
                  key={node.id}
                  {...node}
                  onClick={() => handleNodeClick(node.id)}
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

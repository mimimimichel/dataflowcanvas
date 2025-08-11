'use client';

import React, { useState, useMemo } from 'react';
import Header from '@/components/layout/header';
import TransformationsCatalogue from '@/components/sidebar/transformations-catalogue';
import NodeConfigurationPanel from '@/components/sidebar/node-configuration-panel';
import Node from '@/components/data-flow/node';
import Connector from '@/components/data-flow/connector';
import { nodes as initialNodes, connectors as initialConnectors, PipelineNode } from '@/lib/pipeline-data';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';

export default function DataFlowCanvas() {
  const [nodes, setNodes] = useState<PipelineNode[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'consumer' | 'engineer'>('consumer');

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
  };

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-background font-body">
        <Header viewMode={viewMode} setViewMode={setViewMode} />
        <div className="flex flex-1 overflow-hidden">
          <TransformationsCatalogue />
          <main className="flex-1 relative overflow-auto">
            <div className="absolute inset-0">
              {initialConnectors.map((connector) => {
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

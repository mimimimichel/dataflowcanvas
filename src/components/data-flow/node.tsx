
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Database, Cog, DatabaseZap, Icon, Layers, SlidersHorizontal } from 'lucide-react';
import Port from './port';
import { Button } from '@/components/ui/button';
import { TransformationItem } from '@/lib/pipeline-data';

export type NodeType = 'source' | 'transformation' | 'destination' | 'dataset';

interface NodeProps {
  id: string;
  name: string;
  type: NodeType;
  position: { x: number; y: number };
  onClick: () => void;
  onConfigClick: () => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onPortMouseDown: (event: React.MouseEvent) => void;
  onAddNode: (item: TransformationItem, position: { x: number; y: number }) => void;
  isSelected: boolean;
}

const typeConfig: Record<NodeType, { icon: Icon; color: string; }> = {
  source: { icon: Database, color: 'bg-blue-500' },
  transformation: { icon: Cog, color: 'bg-purple-500' },
  destination: { icon: DatabaseZap, color: 'bg-green-500' },
  dataset: { icon: Layers, color: 'bg-yellow-500' },
};

const Node: React.FC<NodeProps> = ({ id, name, type, position, onClick, onConfigClick, onMouseDown, onMouseUp, onPortMouseDown, isSelected }) => {
  const TypeIcon = typeConfig[type].icon;
  
  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }

  const handleConfigClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfigClick();
  }

  return (
    <div
      className="absolute transition-all duration-300 group"
      style={{ top: position.y, left: position.x }}
      onClick={handleNodeClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      data-node-id={id}
    >
      <Card
        className={cn(
          'w-52 h-20 shadow-lg hover:shadow-xl transition-shadow cursor-grab active:cursor-grabbing border-2 relative flex items-center justify-center p-2',
          isSelected ? 'border-primary shadow-2xl scale-105' : 'border-transparent'
        )}
      >
        {type !== 'source' && (
          <Port 
            type="in"
            onMouseDown={onPortMouseDown}
          />
        )}
        <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md', typeConfig[type].color)}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium leading-tight text-center break-words">{name}</p>
          </div>
        {type !== 'destination' && (
          <Port 
            type="out"
            onMouseDown={onPortMouseDown}
          />
        )}
        <Button 
          data-config-button="true"
          variant="ghost" 
          size="icon" 
          className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleConfigClick}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
};

export default Node;

    
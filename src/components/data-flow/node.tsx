
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Database, Cog, DatabaseZap, Icon, Layers, SlidersHorizontal } from 'lucide-react';
import Port from './port';
import { Button } from '@/components/ui/button';

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
          'w-52 h-24 shadow-lg hover:shadow-xl transition-shadow cursor-grab active:cursor-grabbing border-2 relative',
          isSelected ? 'border-primary shadow-2xl scale-105' : 'border-transparent'
        )}
      >
        {type !== 'source' && (
          <Port 
            type="in"
            onMouseDown={onPortMouseDown}
          />
        )}
        <CardHeader className="p-3">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-md', typeConfig[type].color)}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-base font-medium leading-tight">{name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
        </CardContent>
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

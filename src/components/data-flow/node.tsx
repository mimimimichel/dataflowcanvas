
'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Database, Cog, DatabaseZap, Icon, Layers, SlidersHorizontal } from 'lucide-react';
import Port from './port';
import { TransformationItem, PipelineNode } from '@/lib/pipeline-data';

export type NodeType = 'source' | 'transformation' | 'destination' | 'dataset';

interface NodeProps extends PipelineNode {
  onSelect: () => void;
  onConfigOpen: () => void;
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

const Node: React.FC<NodeProps> = ({ id, name, type, position, rule, inputFields, outputFields, onSelect, onConfigOpen, onMouseDown, onMouseUp, onPortMouseDown, isSelected }) => {
  const TypeIcon = typeConfig[type].icon;
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
    onSelect();
  }

  const handleConfigClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfigOpen();
  }
  
  const renderOverview = () => {
    switch(type) {
        case 'transformation':
            return <div className="p-2 text-xs font-mono bg-muted rounded-md overflow-hidden">{rule || 'No rule defined'}</div>;
        case 'source':
            return <p className="text-xs text-muted-foreground">{outputFields?.length ?? 0} output fields</p>;
        case 'destination':
            return <p className="text-xs text-muted-foreground">{inputFields?.length ?? 0} input fields</p>;
        case 'dataset':
             return <p className="text-xs text-muted-foreground">{inputFields?.length ?? 0} fields</p>;
        default:
            return null;
    }
  }

  return (
    <div
      className="absolute transition-all duration-300 group"
      style={{ top: position.y, left: position.x }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      data-node-id={id}
    >
      <Card
        onClick={handleNodeClick}
        className={cn(
          'w-52 shadow-lg hover:shadow-xl transition-all duration-300 border-2 relative flex flex-col justify-between cursor-pointer',
          isSelected ? 'border-primary shadow-2xl' : 'border-transparent',
          isExpanded ? 'h-auto' : 'h-20'
        )}
      >
        <div className="flex items-center gap-2 p-2">
            <div className={cn('p-1.5 rounded-md self-start', typeConfig[type].color)}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium leading-tight text-left break-words flex-1">{name}</p>
        </div>

        {isExpanded && (
            <CardContent className="p-2 pt-0">
                {renderOverview()}
            </CardContent>
        )}
        
        {type !== 'source' && (
          <Port 
            type="in"
            onMouseDown={onPortMouseDown}
          />
        )}

        {type !== 'destination' && (
          <Port 
            type="out"
            onMouseDown={onPortMouseDown}
          />
        )}
        
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-0 right-0 h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={handleConfigClick}
        >
            <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </Card>
    </div>
  );
};

export default Node;

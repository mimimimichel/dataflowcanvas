
'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Database, Cog, DatabaseZap, Icon, Layers, SlidersHorizontal, GitCompare, Group as GroupIcon, ChevronDown } from 'lucide-react';
import Port from './port';
import { TransformationItem, PipelineNode, Field, Operation } from '@/lib/pipeline-data';
import FilterOperation from '@/components/operations/filter-operation';
import JoinOperation from '@/components/operations/join-operation';
import GroupByOperation from '@/components/operations/group-by-operation';

export type NodeType = 'source' | 'transformation' | 'destination' | 'dataset';

interface NodeProps extends PipelineNode {
  nodes: PipelineNode[];
  onSelect: () => void;
  onConfigOpen: () => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onPortMouseDown: (event: React.MouseEvent) => void;
  onAddNode: (item: TransformationItem, position: { x: number; y: number }) => void;
  isSelected: boolean;
  onUpdateOperation: (nodeId: string, operation: Operation) => void;
}

const typeConfig: Record<NodeType, { icon: Icon; color: string; }> = {
  source: { icon: Database, color: 'bg-blue-500' },
  transformation: { icon: GitCompare, color: 'bg-purple-500' },
  destination: { icon: DatabaseZap, color: 'bg-green-500' },
  dataset: { icon: Layers, color: 'bg-yellow-500' },
};

const SchemaOverview: React.FC<{fields: Field[]}> = ({ fields }) => {
    if (!fields || fields.length === 0) {
        return <p className="text-xs text-muted-foreground text-center p-2">No fields defined</p>;
    }
    return (
        <div className="p-2 bg-muted rounded-md">
            <div className="space-y-1">
                {fields.map(field => (
                    <div key={field.name} className="flex justify-between items-center text-xs">
                        <span className="font-mono text-foreground truncate" title={field.name}>{field.name}</span>
                        <span className="font-mono text-muted-foreground flex-shrink-0 ml-2">{field.type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Node: React.FC<NodeProps> = ({ id, name, type, position, operation, inputFields, outputFields, onSelect, onConfigOpen, onMouseDown, onMouseUp, onPortMouseDown, isSelected, onUpdateOperation, nodes }) => {
  
  const getIconForOperation = (op?: Operation) => {
    if(!op) return typeConfig[type].icon || Cog;
    switch(op.type){
        case 'join': return GitCompare;
        case 'group_by': return GroupIcon;
        default: return typeConfig[type].icon || Cog;
    }
  }
  
  const TypeIcon = getIconForOperation(operation);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleConfigClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfigOpen();
  }

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }
  
  const renderOverview = () => {
    switch(type) {
        case 'transformation':
            if (!operation) return <div className="p-2 text-xs font-mono bg-muted rounded-md">No operation configured</div>;
            switch(operation.type) {
                case 'filter':
                    return <FilterOperation operation={operation} inputFields={inputFields || []} onUpdate={(op) => onUpdateOperation(id, op)} />;
                case 'join':
                    return <JoinOperation operation={operation} nodes={nodes} />;
                case 'group_by':
                    return <GroupByOperation operation={operation} />;
                default:
                    return <div className="p-2 text-xs font-mono bg-muted rounded-md">Unsupported operation</div>;
            }
        case 'source':
            return <SchemaOverview fields={outputFields || []} />;
        case 'destination':
            return <SchemaOverview fields={inputFields || []} />;
        case 'dataset':
             return <SchemaOverview fields={inputFields || []} />;
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
        onClick={onSelect}
        className={cn(
          'w-64 shadow-lg hover:shadow-xl transition-all duration-300 border-2 relative flex flex-col justify-between cursor-pointer',
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
            className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={handleConfigClick}
        >
            <SlidersHorizontal className="w-4 h-4" />
        </Button>
        <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
                "absolute bottom-1 right-1 h-7 w-7",
                isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={handleToggleExpand}
        >
            <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      </Card>
    </div>
  );
};

export default Node;

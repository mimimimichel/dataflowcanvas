'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Database, Cog, DatabaseZap, Icon, Layers, SlidersHorizontal, GitCompare, Group as GroupIcon, ChevronDown, ArrowRightLeft, Filter, SortAsc, Table, Combine, Server, Pin } from 'lucide-react';
import Port from './port';
import { TransformationItem, PipelineNode, Field, Operation, transformations, advancedTransformations } from '@/lib/pipeline-data';
import FilterOperation from '@/components/operations/filter-operation';
import JoinOperation from '@/components/operations/join-operation';
import GroupByOperation from '@/components/operations/group-by-operation';
import SortOperation from '@/components/operations/sort-operation';

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
  source: { icon: Database, color: 'bg-blue-600' },
  transformation: { icon: GitCompare, color: 'bg-amber-600' },
  destination: { icon: DatabaseZap, color: 'bg-emerald-600' },
  dataset: { icon: Layers, color: 'bg-violet-600' },
};

const SchemaOverview: React.FC<{fields: Field[]}> = ({ fields }) => {
    if (!fields || fields.length === 0) {
        return <p className="text-xs text-muted-foreground text-center p-2">No fields defined</p>;
    }
    return (
        <div className="p-2 bg-muted/30 rounded-md border border-white/5">
            <div className="space-y-1">
                {fields.map(field => (
                    <div key={field.name} className="flex justify-between items-center text-[10px]">
                        <span className="font-mono text-foreground/80 truncate" title={field.name}>{field.name}</span>
                        <span className="font-mono text-muted-foreground/60 flex-shrink-0 ml-2">{field.type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Node: React.FC<NodeProps> = ({ id, name, type, position, operation, inputFields, outputFields, system, location, onSelect, onConfigOpen, onMouseDown, onMouseUp, onPortMouseDown, isSelected, onUpdateOperation, nodes }) => {
  
  const getIconForOperation = (op?: Operation) => {
    if(!op || type !== 'transformation') return typeConfig[type].icon || Cog;

    const advancedItems = Array.isArray(advancedTransformations) ? advancedTransformations.flatMap(c => c.items) : [];
    const allTransformations = [
      ...transformations.common,
      ...advancedItems
    ];
    const transformationInfo = allTransformations.find(t => t.operationType === op.type);
    
    return transformationInfo?.icon || typeConfig[type].icon || Cog;
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
            if (!operation) return <div className="p-2 text-xs font-mono bg-muted/20 rounded-md border border-white/5">No operation configured</div>;
            switch(operation.type) {
                case 'filter':
                    return <FilterOperation operation={operation} inputFields={inputFields || []} onUpdate={(op) => onUpdateOperation(id, op)} />;
                case 'join':
                    return <JoinOperation operation={operation} nodes={nodes} />;
                case 'group_by':
                    return <GroupByOperation operation={operation} />;
                case 'sort':
                    return <SortOperation operation={operation} />;
                case 'no_op':
                    return <SchemaOverview fields={inputFields || []} />;
                default:
                    return <div className="p-2 text-xs font-mono bg-muted/20 rounded-md border border-white/5">Overview not available.</div>;
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
          'w-64 shadow-2xl hover:shadow-primary/5 transition-all duration-300 border-2 relative flex flex-col justify-between cursor-pointer backdrop-blur-md bg-card/90',
          'bg-gradient-to-br from-white/[0.05] to-transparent',
          isSelected ? 'border-accent shadow-accent/20 accent-glow scale-[1.02]' : 'border-white/20',
        )}
      >
        <div className="flex items-center gap-2 p-3">
            <div className={cn('p-1.5 rounded-lg self-start shadow-inner border border-white/10', typeConfig[type].color)}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight text-left truncate text-white">{name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold opacity-70">{type}</p>
            </div>
        </div>

        {(system || location) && (type === 'source' || type === 'dataset' || type === 'destination') && (
            <div className="px-3 pb-3 space-y-1">
                {system && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        <Server className="w-3 h-3 flex-shrink-0 text-primary"/>
                        <span className="truncate font-medium" title={system}>{system}</span>
                    </div>
                )}
                {location && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        <Pin className="w-3 h-3 flex-shrink-0 text-primary"/>
                        <span className="truncate font-medium" title={location}>{location}</span>
                    </div>
                )}
            </div>
        )}

        {isExpanded && (
            <CardContent className="p-3 pt-0">
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
        
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 glass-panel hover:bg-white/10 text-white rounded-md border border-white/10"
                onClick={handleConfigClick}
            >
                <SlidersHorizontal className="w-3.5 h-3.5" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 glass-panel hover:bg-white/10 text-white rounded-md border border-white/10"
                onClick={handleToggleExpand}
            >
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default Node;

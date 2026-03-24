'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Database, Cog, DatabaseZap, Icon, Layers, SlidersHorizontal, GitCompare, Group as GroupIcon, ChevronDown, ArrowRightLeft, Filter, SortAsc, Table, Combine, Server, Pin, Copy, Activity, ShieldCheck, Clock3 } from 'lucide-react';
import Port from './port';
import { TransformationItem, PipelineNode, Field, Operation, transformations, advancedTransformations, SelectColumnsOperation as SelectColumnsType, UnionOperation as UnionType, DesignStatus } from '@/lib/pipeline-data';
import FilterOperation from '@/components/operations/filter-operation';
import JoinOperation from '@/components/operations/join-operation';
import GroupByOperation from '@/components/operations/group-by-operation';
import SortOperation from '@/components/operations/sort-operation';
import SelectColumnsOperation from '@/components/operations/select-columns-operation';
import UnionOperation from '@/components/operations/union-operation';
import { Badge } from '@/components/ui/badge';

export type NodeType = 'source' | 'transformation' | 'destination' | 'dataset';

interface NodeProps extends PipelineNode {
  nodes: PipelineNode[];
  onSelect: (isShift: boolean) => void;
  onConfigOpen: () => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onPortMouseDown: (event: React.MouseEvent) => void;
  onAddNode: (item: TransformationItem, position: { x: number; y: number }) => void;
  isSelected: boolean;
  onUpdateOperation: (nodeId: string, operation: Operation) => void;
}

const typeConfig: Record<NodeType, { icon: Icon; color: string; border: string; glow: string; }> = {
  source: { 
    icon: Database, 
    color: 'bg-blue-600', 
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/10'
  },
  transformation: { 
    icon: GitCompare, 
    color: 'bg-amber-600', 
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/10'
  },
  destination: { 
    icon: DatabaseZap, 
    color: 'bg-emerald-600', 
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/10'
  },
  dataset: { 
    icon: Layers, 
    color: 'bg-violet-600', 
    border: 'border-violet-500/40',
    glow: 'shadow-violet-500/10'
  },
};

const statusColors: Record<DesignStatus, string> = {
  draft: 'bg-slate-500/20 text-slate-500 border-slate-500/30',
  review: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  ready: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
};

const SchemaOverview: React.FC<{fields: Field[]}> = ({ fields }) => {
    if (!fields || fields.length === 0) {
        return <p className="text-xs text-muted-foreground text-center p-2">No fields defined</p>;
    }
    return (
        <div className="p-2 bg-muted/30 rounded-md border border-border">
            <div className="space-y-1">
                {fields.slice(0, 8).map(field => (
                    <div key={field.name} className="flex justify-between items-center text-[10px]">
                        <span className="font-mono text-foreground/80 truncate" title={field.name}>{field.name}</span>
                        <span className="font-mono text-muted-foreground/60 flex-shrink-0 ml-2">{field.type}</span>
                    </div>
                ))}
                {fields.length > 8 && (
                    <p className="text-[9px] text-muted-foreground italic text-center pt-1">+{fields.length - 8} more fields</p>
                )}
            </div>
        </div>
    );
};

const Node: React.FC<NodeProps> = ({ id, name, type, position, operation, inputFields, outputFields, system, location, status = 'draft', qualityMetrics, onSelect, onConfigOpen, onMouseDown, onMouseUp, onPortMouseDown, isSelected, onUpdateOperation, nodes, onAddNode }) => {
  
  const getIconForOperation = (op?: Operation) => {
    if(!op || type !== 'transformation') return typeConfig[type].icon || Cog;

    const common = transformations.common;
    const advanced = advancedTransformations ? advancedTransformations.flatMap(c => c.items) : [];
    const allTransformations = [...common, ...advanced];
    
    const transformationInfo = allTransformations.find(t => t.operationType === op.type);
    
    return transformationInfo?.icon || typeConfig[type].icon || Cog;
  }
  
  const TypeIcon = getIconForOperation(operation);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(e.shiftKey);
  }

  const handleConfigClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfigOpen();
  }

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const item: TransformationItem = {
        name: `${name} (Copy)`,
        icon: TypeIcon,
        type: type,
        operationType: operation?.type
    };
    onAddNode(item, { x: position.x + 40, y: position.y + 40 });
  }
  
  const renderOverview = () => {
    switch(type) {
        case 'transformation':
            if (!operation) return <div className="p-2 text-xs font-mono bg-muted/20 rounded-md border border-border">No operation configured</div>;
            switch(operation.type) {
                case 'filter':
                    return <FilterOperation operation={operation} inputFields={inputFields || []} onUpdate={(op) => onUpdateOperation(id, op)} />;
                case 'join':
                    return <JoinOperation operation={operation} nodes={nodes} />;
                case 'group_by':
                    return <GroupByOperation operation={operation} />;
                case 'sort':
                    return <SortOperation operation={operation} />;
                case 'select_columns':
                    return <SelectColumnsOperation operation={operation as SelectColumnsType} />;
                case 'union':
                    return <UnionOperation operation={operation as UnionType} />;
                case 'no_op':
                    return <SchemaOverview fields={inputFields || []} />;
                default:
                    return <div className="p-2 text-xs font-mono bg-muted/20 rounded-md border border-border">Overview not available.</div>;
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
      className="absolute group z-10"
      style={{ top: position.y, left: position.x }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      data-node-id={id}
    >
      <Card
        onClick={handleNodeClick}
        className={cn(
          'w-64 border-2 relative flex flex-col justify-between cursor-pointer backdrop-blur-md bg-card/90 shadow-2xl',
          'bg-gradient-to-br from-foreground/[0.03] to-transparent',
          typeConfig[type].glow,
          isSelected 
            ? 'border-primary shadow-primary/20 accent-glow scale-[1.02] transition-transform duration-200' 
            : cn('group-hover:scale-[1.01] transition-transform duration-200', typeConfig[type].border),
        )}
      >
        <div className="flex items-center gap-2 p-3">
            <div className={cn('p-1.5 rounded-lg self-start shadow-inner border border-white/10', typeConfig[type].color)}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight text-left truncate text-foreground">{name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold opacity-70">{type}</p>
                  <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1 py-0 border leading-none capitalize", statusColors[status])}>
                    {status}
                  </Badge>
                </div>
            </div>
        </div>

        {(system || location) && (type === 'source' || type === 'dataset' || type === 'destination') && (
            <div className="px-3 pb-3 space-y-1">
                {system && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded border border-border">
                        <Server className="w-3 h-3 flex-shrink-0 text-primary"/>
                        <span className="truncate font-medium" title={system}>{system}</span>
                    </div>
                )}
                {location && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded border border-border">
                        <Pin className="w-3 h-3 flex-shrink-0 text-primary"/>
                        <span className="truncate font-medium" title={location}>{location}</span>
                    </div>
                )}
            </div>
        )}

        {qualityMetrics && (
          <div className="px-3 pb-3">
             <div className="flex items-center gap-3 p-1.5 bg-blue-500/5 border border-blue-500/10 rounded-md">
                {qualityMetrics.completeness && (
                  <div className="flex flex-col">
                    <span className="text-[8px] text-muted-foreground/60 uppercase">Completeness</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">{qualityMetrics.completeness}%</span>
                  </div>
                )}
                {qualityMetrics.freshness && (
                  <div className="flex flex-col">
                    <span className="text-[8px] text-muted-foreground/60 uppercase">Freshness</span>
                    <span className="text-[10px] font-mono text-blue-500 font-bold">{qualityMetrics.freshness}</span>
                  </div>
                )}
             </div>
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
                className="h-7 w-7 glass-panel hover:bg-muted text-foreground rounded-md border border-border"
                onClick={handleDuplicate}
                title="Duplicate Node"
            >
                <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 glass-panel hover:bg-muted text-foreground rounded-md border border-border"
                onClick={handleConfigClick}
                title="Configuration"
            >
                <SlidersHorizontal className="w-3.5 h-3.5" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 glass-panel hover:bg-muted text-foreground rounded-md border border-border"
                onClick={handleToggleExpand}
                title={isExpanded ? "Collapse" : "Expand Details"}
            >
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isExpanded && "rotate-180")} />
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default Node;
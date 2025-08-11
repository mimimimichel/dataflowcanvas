
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Database, Cog, DatabaseZap, CheckCircle2, AlertTriangle, XCircle, Icon } from 'lucide-react';
import Port from './port';

export type NodeType = 'source' | 'transformation' | 'destination';
export type NodeStatus = 'healthy' | 'warning' | 'error';

interface NodeProps {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  quality: number;
  position: { x: number; y: number };
  onClick: () => void;
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseUp: (event: React.MouseEvent) => void;
  onPortMouseDown: (event: React.MouseEvent) => void;
  isSelected: boolean;
}

const typeConfig: Record<NodeType, { icon: Icon; color: string; }> = {
  source: { icon: Database, color: 'bg-blue-500' },
  transformation: { icon: Cog, color: 'bg-purple-500' },
  destination: { icon: DatabaseZap, color: 'bg-green-500' },
};

const statusConfig: Record<NodeStatus, { icon: Icon; color: string; text: string }> = {
  healthy: { icon: CheckCircle2, color: 'text-green-500', text: 'Healthy' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', text: 'Warning' },
  error: { icon: XCircle, color: 'text-red-500', text: 'Error' },
};

const Node: React.FC<NodeProps> = ({ id, name, type, status, quality, position, onClick, onMouseDown, onMouseUp, onPortMouseDown, isSelected }) => {
  const TypeIcon = typeConfig[type].icon;
  const StatusIcon = statusConfig[status].icon;
  
  const handleNodeClick = (e: React.MouseEvent) => {
    // Prevent click from propagating to canvas when clicking on a node.
    e.stopPropagation();
    onClick();
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
            <div className="flex items-center justify-between text-xs">
                <div className={cn("flex items-center gap-1", statusConfig[status].color)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{statusConfig[status].text}</span>
                </div>
                <Badge variant={quality > 95 ? "default" : "destructive"} className={cn(
                    quality > 95 ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800",
                    "border-none"
                )}>
                    Quality: {quality}%
                </Badge>
            </div>
        </CardContent>
        {type !== 'destination' && (
          <Port 
            type="out"
            onMouseDown={onPortMouseDown}
          />
        )}
      </Card>
    </div>
  );
};

export default Node;

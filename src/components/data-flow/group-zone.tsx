'use client';

import React from 'react';
import { NodeGroup } from '@/lib/pipeline-data';
import { cn } from '@/lib/utils';
import { Maximize2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GroupZoneProps extends NodeGroup {
  onMouseDown: (e: React.MouseEvent) => void;
  onDelete: () => void;
  isSelected?: boolean;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/5 border-blue-500/20 text-blue-400',
  amber: 'bg-amber-500/5 border-amber-500/20 text-amber-400',
  emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400',
  violet: 'bg-violet-500/5 border-violet-500/20 text-violet-400',
  slate: 'bg-slate-500/5 border-slate-500/20 text-slate-400',
};

const GroupZone: React.FC<GroupZoneProps> = ({ id, name, color, position, width, height, onMouseDown, onDelete, isSelected }) => {
  const colorClass = colorMap[color] || colorMap.slate;

  return (
    <div
      className={cn(
        "absolute rounded-3xl border-2 border-dashed transition-colors duration-300 group/zone z-0",
        colorClass,
        isSelected && "border-primary/50 border-solid bg-white/[0.02]"
      )}
      style={{
        top: position.y,
        left: position.x,
        width: width,
        height: height,
      }}
      onMouseDown={onMouseDown}
    >
      <div className="absolute top-4 left-6 flex items-center gap-3 select-none pointer-events-none">
        <div className={cn("p-1.5 rounded-lg bg-current opacity-10")} />
        <h3 className="font-bold text-lg uppercase tracking-widest opacity-60">{name}</h3>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover/zone:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Resize Handle Placeholder */}
      <div className="absolute bottom-4 right-4 text-muted-foreground opacity-20 pointer-events-none">
        <Maximize2 className="h-4 w-4 rotate-90" />
      </div>
    </div>
  );
};

export default GroupZone;
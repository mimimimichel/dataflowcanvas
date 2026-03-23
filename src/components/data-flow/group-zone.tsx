'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NodeGroup } from '@/lib/pipeline-data';
import { cn } from '@/lib/utils';
import { Maximize2, Trash2, ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GroupZoneProps extends NodeGroup {
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onToggleCollapse: () => void;
  isSelected?: boolean;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/5 border-blue-500/20 text-blue-400',
  amber: 'bg-amber-500/5 border-amber-500/20 text-amber-400',
  emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400',
  violet: 'bg-violet-500/5 border-violet-500/20 text-violet-400',
  slate: 'bg-slate-500/5 border-slate-500/20 text-slate-400',
};

const GroupZone: React.FC<GroupZoneProps> = ({ 
  id, 
  name, 
  color, 
  position, 
  width, 
  height, 
  isCollapsed,
  onMouseDown, 
  onResizeMouseDown,
  onDelete, 
  onRename,
  onToggleCollapse,
  isSelected 
}) => {
  const colorClass = colorMap[color] || colorMap.slate;
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    if (tempName.trim()) {
      onRename(tempName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') {
      setTempName(name);
      setIsEditing(false);
    }
  };

  const currentHeight = isCollapsed ? 64 : height;
  const currentWidth = isCollapsed ? Math.max(250, width * 0.4) : width;

  return (
    <div
      className={cn(
        "absolute rounded-3xl border-2 border-dashed group/zone z-0 transition-[width,height] duration-0",
        colorClass,
        isSelected && "border-primary/50 border-solid bg-white/[0.02]",
        isCollapsed && "border-solid bg-card/40 backdrop-blur-sm"
      )}
      style={{
        top: position.y,
        left: position.x,
        width: currentWidth,
        height: currentHeight,
      }}
      onMouseDown={onMouseDown}
    >
      <div className="absolute top-4 left-6 flex items-center gap-3 select-none w-[calc(100%-100px)]">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 pointer-events-auto hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {isCollapsed && <Folder className="h-4 w-4 opacity-50 shrink-0" />}

        {isEditing ? (
          <Input
            ref={inputRef}
            className="h-7 bg-black/40 border-primary/30 text-xs font-bold uppercase tracking-widest pointer-events-auto"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 
            className="font-bold text-sm md:text-lg uppercase tracking-widest opacity-60 truncate cursor-text pointer-events-auto"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {name}
          </h3>
        )}
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover/zone:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive text-muted-foreground pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {!isCollapsed && (
        <div 
          className="absolute bottom-4 right-4 text-muted-foreground opacity-40 hover:opacity-100 transition-opacity cursor-nwse-resize pointer-events-auto p-1"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeMouseDown(e);
          }}
        >
          <Maximize2 className="h-5 w-5 rotate-90" />
        </div>
      )}
      
      {isCollapsed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
           <span className="text-[10px] font-mono opacity-30 uppercase tracking-tighter">Nodes Minimized</span>
        </div>
      )}
    </div>
  );
};

export default GroupZone;
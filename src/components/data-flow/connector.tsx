import React from 'react';
import { cn } from '@/lib/utils';

type Position = {
  x: number;
  y: number;
};

interface ConnectorProps {
  from: Position;
  to: Position;
  className?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const NODE_WIDTH = 256; // Matching Node component w-64
const NODE_HEIGHT = 90; // Approximate height for compact view
const PORT_OFFSET_Y = NODE_HEIGHT / 2;
const PORT_OFFSET_X_OUT = NODE_WIDTH;
const PORT_OFFSET_X_IN = 0;

const Connector: React.FC<ConnectorProps> = ({ from, to, className, isSelected, onClick }) => {
  const fromWithNodeOffset = { x: from.x + PORT_OFFSET_X_OUT, y: from.y + PORT_OFFSET_Y };
  const toWithNodeOffset = { x: to.x + PORT_OFFSET_X_IN, y: to.y + PORT_OFFSET_Y };

  const path = `M ${fromWithNodeOffset.x} ${fromWithNodeOffset.y} C ${fromWithNodeOffset.x + 80} ${fromWithNodeOffset.y} ${toWithNodeOffset.x - 80} ${toWithNodeOffset.y} ${toWithNodeOffset.x} ${toWithNodeOffset.y}`;
  
  return (
    <g 
      className={cn("pointer-events-auto cursor-pointer", className)} 
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      data-connector="true"
    >
       <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="16"
      />
      <path
        d={path}
        fill="none"
        stroke={isSelected ? "hsl(var(--accent))" : "white"}
        strokeWidth={isSelected ? 4 : 2}
        strokeOpacity={isSelected ? 1 : 0.2}
        className={cn(!isSelected && "connector-path")}
      />
      {isSelected && (
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="8"
          strokeOpacity="0.2"
          className="blur-sm"
        />
      )}
    </g>
  );
};

export default Connector;

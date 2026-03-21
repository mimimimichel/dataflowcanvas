import React, { useId } from 'react';
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
  const uniqueId = useId();
  const gradientId = `flow-gradient-${uniqueId.replace(/:/g, '')}`;
  
  const fromWithNodeOffset = { x: from.x + PORT_OFFSET_X_OUT, y: from.y + PORT_OFFSET_Y };
  const toWithNodeOffset = { x: to.x + PORT_OFFSET_X_IN, y: to.y + PORT_OFFSET_Y };

  // Control points for the Bezier curve to create a smooth S-shape
  const cp1x = fromWithNodeOffset.x + 80;
  const cp1y = fromWithNodeOffset.y;
  const cp2x = toWithNodeOffset.x - 80;
  const cp2y = toWithNodeOffset.y;

  const path = `M ${fromWithNodeOffset.x} ${fromWithNodeOffset.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${toWithNodeOffset.x} ${toWithNodeOffset.y}`;
  
  return (
    <g 
      className={cn("pointer-events-auto cursor-pointer", className)} 
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      data-connector="true"
    >
      <defs>
        <linearGradient 
          id={gradientId} 
          gradientUnits="userSpaceOnUse" 
          x1={fromWithNodeOffset.x} 
          y1={fromWithNodeOffset.y} 
          x2={toWithNodeOffset.x} 
          y2={toWithNodeOffset.y}
        >
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>

      {/* Hidden wide path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth="16"
      />

      {/* The visible animated flow path with gradient */}
      <path
        d={path}
        fill="none"
        stroke={isSelected ? "hsl(var(--accent))" : `url(#${gradientId})`}
        strokeWidth={isSelected ? 4 : 2.5}
        strokeOpacity={isSelected ? 1 : 0.6}
        className={cn(!isSelected && "connector-path")}
        strokeLinecap="round"
      />

      {/* Selection Glow */}
      {isSelected && (
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="10"
          strokeOpacity="0.2"
          className="blur-md"
        />
      )}
    </g>
  );
};

export default Connector;

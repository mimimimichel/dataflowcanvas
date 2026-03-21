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

const Connector: React.FC<ConnectorProps> = ({ from, to, className, isSelected, onClick }) => {
  const uniqueId = useId();
  const gradientId = `flow-gradient-${uniqueId.replace(/:/g, '')}`;
  
  // Control points for the Bezier curve to create a smooth S-shape
  const cp1x = from.x + 80;
  const cp1y = from.y;
  const cp2x = to.x - 80;
  const cp2y = to.y;

  const path = `M ${from.x} ${from.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${to.x} ${to.y}`;
  
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
          x1={from.x} 
          y1={from.y} 
          x2={to.x} 
          y2={to.y}
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

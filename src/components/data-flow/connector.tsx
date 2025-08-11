
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

const NODE_WIDTH = 208; // w-52
const NODE_HEIGHT = 96; // h-24
const PORT_OFFSET_Y = NODE_HEIGHT / 2;
const PORT_OFFSET_X_OUT = NODE_WIDTH;
const PORT_OFFSET_X_IN = 0;

const Connector: React.FC<ConnectorProps> = ({ from, to, className, isSelected, onClick }) => {
  const fromWithNodeOffset = { x: from.x + PORT_OFFSET_X_OUT, y: from.y + PORT_OFFSET_Y };
  const toWithNodeOffset = { x: to.x + PORT_OFFSET_X_IN, y: to.y + PORT_OFFSET_Y };

  const path = `M ${fromWithNodeOffset.x} ${fromWithNodeOffset.y} C ${fromWithNodeOffset.x + 50} ${fromWithNodeOffset.y} ${toWithNodeOffset.x - 50} ${toWithNodeOffset.y} ${toWithNodeOffset.x} ${toWithNodeOffset.y}`;
  
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
        strokeWidth="12"
      />
      <path
        d={path}
        fill="none"
        stroke={isSelected ? "hsl(var(--ring))" : "hsl(var(--primary) / 0.5)"}
        strokeWidth={isSelected ? 3 : 2}
        className={cn(!isSelected && "connector-path")}
      />
    </g>
  );
};

export default Connector;

    
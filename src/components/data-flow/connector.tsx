
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
}

const Connector: React.FC<ConnectorProps> = ({ from, to, className }) => {
  const fromWithNodeOffset = { x: from.x + 208, y: from.y + 48 }; // width of node
  const toWithNodeOffset = { x: to.x, y: to.y + 48 };

  const path = `M ${fromWithNodeOffset.x} ${fromWithNodeOffset.y} C ${fromWithNodeOffset.x + 50} ${fromWithNodeOffset.y} ${toWithNodeOffset.x - 50} ${toWithNodeOffset.y} ${toWithNodeOffset.x} ${toWithNodeOffset.y}`;
  
  return (
    <svg
      className={cn('absolute top-0 left-0 w-[1px] h-[1px] pointer-events-none overflow-visible', className)}
    >
      <path
        d={path}
        fill="none"
        stroke="hsl(var(--primary) / 0.5)"
        strokeWidth="2"
        className="connector-path"
      />
    </svg>
  );
};

export default Connector;

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
  const padding = 10;
  const fromWithNodeOffset = { x: from.x + 180, y: from.y + 40 }; // width of node + padding
  const toWithNodeOffset = { x: to.x - padding, y: to.y + 40 }; // padding

  const path = `M ${fromWithNodeOffset.x} ${fromWithNodeOffset.y} C ${fromWithNodeOffset.x + 50} ${fromWithNodeOffset.y} ${toWithNodeOffset.x - 50} ${toWithNodeOffset.y} ${toWithNodeOffset.x} ${toWithNodeOffset.y}`;
  
  return (
    <svg
      className={cn('absolute top-0 left-0 w-full h-full pointer-events-none', className)}
      style={{ overflow: 'visible' }}
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

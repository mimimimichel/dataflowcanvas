
'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface PortProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'in' | 'out';
}

const Port: React.FC<PortProps> = ({ type, ...props }) => {
  return (
    <div
      {...props}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (props.onMouseDown) props.onMouseDown(e);
      }}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary/50 border-2 border-primary/80 cursor-crosshair',
        'hover:bg-primary hover:scale-125 transition-all',
        type === 'in' ? '-left-2' : '-right-2',
        'opacity-0 group-hover:opacity-100'
      )}
    />
  );
};

export default Port;

'use client';

import React from 'react';
import { UnionOperation as UnionOperationType } from '@/lib/pipeline-data';
import { Layers } from 'lucide-react';

interface UnionOperationProps {
  operation: UnionOperationType;
}

const UnionOperation: React.FC<UnionOperationProps> = () => {
  return (
    <div className="p-3 bg-muted rounded-md flex flex-col items-center gap-2 text-center">
       <Layers className="w-5 h-5 text-primary opacity-50" />
       <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Stacking Rows</p>
       <span className="text-[9px] text-muted-foreground/60 italic">Aligns columns by name</span>
    </div>
  );
};

export default UnionOperation;
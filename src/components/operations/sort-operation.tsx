
'use client';

import React from 'react';
import { SortOperation as SortOperationType } from '@/lib/pipeline-data';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface SortOperationProps {
  operation: SortOperationType;
}

const SortOperation: React.FC<SortOperationProps> = ({ operation }) => {
  const { conditions } = operation.settings;
  return (
    <div className="p-2 space-y-2 bg-muted rounded-md text-xs">
      <div>
        <span className="font-semibold">SORT BY:</span>
        <div className="flex flex-col gap-1 mt-1">
            {conditions.length > 0 ? (
                conditions.map((cond, i) => (
                    <div key={i} className="flex items-center gap-1">
                       <Badge variant="secondary" className="font-mono">{cond.field}</Badge>
                       {cond.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-green-500"/> : <ArrowDown className="w-3 h-3 text-red-500"/>}
                    </div>
                ))
            ) : (
                <span className="text-muted-foreground">Not configured</span>
            )}
        </div>
      </div>
    </div>
  );
};

export default SortOperation;

'use client';

import React from 'react';
import { SelectColumnsOperation as SelectColumnsOperationType } from '@/lib/pipeline-data';
import { Badge } from '@/components/ui/badge';

interface SelectColumnsOperationProps {
  operation: SelectColumnsOperationType;
}

const SelectColumnsOperation: React.FC<SelectColumnsOperationProps> = ({ operation }) => {
  const { selectedFields } = operation.settings;
  return (
    <div className="p-2 space-y-2 bg-muted rounded-md text-xs">
      <div>
        <span className="font-semibold text-foreground/70 text-[10px] uppercase tracking-wider">KEEPING:</span>
        <div className="flex flex-wrap gap-1 mt-1.5">
            {selectedFields && selectedFields.length > 0 ? (
                selectedFields.map(field => <Badge key={field} variant="secondary" className="font-mono text-[9px] h-4 px-1.5">{field}</Badge>)
            ) : (
                <span className="text-muted-foreground italic">No columns selected</span>
            )}
        </div>
      </div>
    </div>
  );
};

export default SelectColumnsOperation;
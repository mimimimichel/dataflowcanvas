
'use client';

import React from 'react';
import { GroupByOperation as GroupByOperationType } from '@/lib/pipeline-data';
import { Badge } from '@/components/ui/badge';

interface GroupByOperationProps {
  operation: GroupByOperationType;
}

const GroupByOperation: React.FC<GroupByOperationProps> = ({ operation }) => {
  const groupByFields = operation.settings.groupByFields || [];
  const aggregations = operation.settings.aggregations || [];
  return (
    <div className="p-2 space-y-2 bg-muted rounded-md text-xs">
      <div>
        <span className="font-semibold">GROUP BY:</span>
        <div className="flex flex-wrap gap-1 mt-1">
            {groupByFields.length > 0 ? (
                groupByFields.map(field => <Badge key={field} variant="secondary" className="font-mono">{field}</Badge>)
            ) : (
                <span className="text-muted-foreground">Not configured</span>
            )}
        </div>
      </div>
       <div>
        <span className="font-semibold">AGGREGATE:</span>
        <div className="flex flex-col gap-1 mt-1">
            {aggregations.length > 0 ? (
                aggregations.map((agg, i) => (
                    <div key={i} className="font-mono">
                       <Badge variant="outline" className="mr-1">{agg.type.toUpperCase()}</Badge> 
                       ({agg.field}) as <strong>{agg.newName}</strong>
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

export default GroupByOperation;

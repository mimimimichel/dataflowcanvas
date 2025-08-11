
'use client';

import React from 'react';
import { JoinOperation as JoinOperationType, PipelineNode } from '@/lib/pipeline-data';
import { GitCompare, Database } from 'lucide-react';

interface JoinOperationProps {
  operation: JoinOperationType;
  nodes: PipelineNode[];
}

const JoinOperation: React.FC<JoinOperationProps> = ({ operation, nodes }) => {
  const leftNode = nodes.find(n => n.id === operation.settings.leftNodeId);
  const rightNode = nodes.find(n => n.id === operation.settings.rightNodeId);

  const leftNodeName = leftNode?.name || operation.settings.leftNodeId;
  const rightNodeName = rightNode?.name || operation.settings.rightNodeId;

  return (
    <div className="p-2 space-y-2 bg-muted rounded-md text-xs">
        <div className="flex items-center justify-center gap-2">
            <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-background w-24">
                <Database className="w-5 h-5 text-blue-500" />
                <span className="font-mono truncate" title={leftNodeName}>{leftNodeName}</span>
            </div>
            <div className="flex flex-col items-center">
                 <GitCompare className="w-5 h-5 text-purple-500" />
                 <span className="text-purple-500 font-semibold uppercase">{operation.settings.joinType}</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-background w-24">
                <Database className="w-5 h-5 text-blue-500" />
                <span className="font-mono truncate" title={rightNodeName}>{rightNodeName}</span>
            </div>
        </div>
         <div className="text-center font-mono pt-1 text-muted-foreground">
            ON {operation.settings.condition.leftField || '?'} = {operation.settings.condition.rightField || '?'}
        </div>
    </div>
  );
};

export default JoinOperation;

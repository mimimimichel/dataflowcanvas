
'use client';

import React from 'react';
import { PipelineNode, JoinOperation as JoinOperationType, JoinType } from '@/lib/pipeline-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';

interface JoinOperationEditorProps {
  operationSettings: JoinOperationType;
  leftNode: PipelineNode;
  rightNode: PipelineNode;
  onUpdate: (operation: JoinOperationType) => void;
}

const JoinOperationEditor: React.FC<JoinOperationEditorProps> = ({ operationSettings, leftNode, rightNode, onUpdate }) => {
  const joinTypes: JoinType[] = ['inner', 'left', 'right', 'full'];

  const handleSettingChange = (key: keyof JoinOperationType['settings'], value: any) => {
    onUpdate({
      ...operationSettings,
      settings: {
        ...operationSettings.settings,
        [key]: value,
      },
    });
  };
  
   const handleConditionChange = (key: keyof JoinOperationType['settings']['condition'], value: any) => {
    onUpdate({
      ...operationSettings,
      settings: {
        ...operationSettings.settings,
        condition: {
            ...operationSettings.settings.condition,
            [key]: value
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label>Join Type</Label>
        <Select
          value={operationSettings.settings.joinType}
          onValueChange={(value: JoinType) => handleSettingChange('joinType', value)}
        >
          <SelectTrigger className="flex-1 h-9">
            <SelectValue placeholder="Select join type" />
          </SelectTrigger>
          <SelectContent>
            {joinTypes.map(type => (
              <SelectItem key={type} value={type} className="uppercase">
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid w-full items-center gap-1.5">
          <Label>Left Field ({leftNode.name})</Label>
          <Select
            value={operationSettings.settings.condition.leftField}
            onValueChange={(value) => handleConditionChange('leftField', value)}
          >
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {leftNode.outputFields?.map(field => (
                <SelectItem key={field.name} value={field.name}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label>Right Field ({rightNode.name})</Label>
          <Select
            value={operationSettings.settings.condition.rightField}
            onValueChange={(value) => handleConditionChange('rightField', value)}
          >
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {rightNode.outputFields?.map(field => (
                <SelectItem key={field.name} value={field.name}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default JoinOperationEditor;

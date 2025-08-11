
'use client';

import React from 'react';
import { PipelineNode, JoinOperation as JoinOperationType, JoinType } from '@/lib/pipeline-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '@/components/ui/select';
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
  
   const handleConditionChange = (key: 'leftField' | 'rightField', value: string) => {
    // The value is expected to be in "nodeId:fieldName" format, but we only need the fieldName.
    const fieldName = value.split(':')[1] || value;
    onUpdate({
      ...operationSettings,
      settings: {
        ...operationSettings.settings,
        condition: {
            ...operationSettings.settings.condition,
            [key]: fieldName
        }
      },
    });
  };

  const renderFieldOptions = () => (
    <>
        <SelectGroup>
            <Label className="px-2 py-1.5 text-xs font-semibold">{leftNode.name}</Label>
            {(leftNode.outputFields || []).map(field => (
                <SelectItem key={`${leftNode.id}:${field.name}`} value={`${leftNode.id}:${field.name}`}>
                {field.name}
                </SelectItem>
            ))}
        </SelectGroup>
        <SelectGroup>
            <Label className="px-2 py-1.5 text-xs font-semibold">{rightNode.name}</Label>
            {(rightNode.outputFields || []).map(field => (
                <SelectItem key={`${rightNode.id}:${field.name}`} value={`${rightNode.id}:${field.name}`}>
                {field.name}
                </SelectItem>
            ))}
        </SelectGroup>
    </>
  );

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

       <Label>Join Condition</Label>
      <div className="flex items-center gap-2">
        <div className="flex-1 grid w-full items-center gap-1.5">
          <Select
            value={operationSettings.settings.condition.leftField ? `any:${operationSettings.settings.condition.leftField}` : ''}
            onValueChange={(value) => handleConditionChange('leftField', value)}
          >
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
                {renderFieldOptions()}
            </SelectContent>
          </Select>
        </div>
        <span className="font-mono">=</span>
        <div className="flex-1 grid w-full items-center gap-1.5">
          <Select
            value={operationSettings.settings.condition.rightField ? `any:${operationSettings.settings.condition.rightField}` : ''}
            onValueChange={(value) => handleConditionChange('rightField', value)}
          >
            <SelectTrigger className="flex-1 h-9">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
                {renderFieldOptions()}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default JoinOperationEditor;

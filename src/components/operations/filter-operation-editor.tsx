
'use client';

import React from 'react';
import { Field, FilterOperation as FilterOperationType } from '@/lib/pipeline-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '../ui/label';

interface FilterOperationEditorProps {
  operation: FilterOperationType;
  inputFields: Field[];
  onUpdate: (operation: FilterOperationType) => void;
}

const FilterOperationEditor: React.FC<FilterOperationEditorProps> = ({ operation, inputFields, onUpdate }) => {

  const handleSettingChange = (key: keyof FilterOperationType['settings'], value: any) => {
    onUpdate({
      ...operation,
      settings: {
        ...operation.settings,
        [key]: value,
      },
    });
  };
  
  const operators = ['==', '!=', '>', '<', '>=', '<='];
  const selectedFieldType = inputFields.find(f => f.name === operation.settings.field)?.type;
  
  const renderValueInput = () => {
    if (selectedFieldType === 'boolean') {
        return (
            <Select
                value={String(operation.settings.value)}
                onValueChange={(value) => handleSettingChange('value', value === 'true')}
            >
                <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                </SelectContent>
            </Select>
        )
    }
    
    return (
        <Input
            type={selectedFieldType === 'integer' || selectedFieldType === 'float' ? 'number' : 'text'}
            placeholder="Value"
            value={String(operation.settings.value)}
            onChange={(e) => handleSettingChange('value', e.target.value)}
            className="flex-1 h-9"
        />
    )
  }

  return (
    <div className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
            <Label>Field</Label>
            <Select 
                value={operation.settings.field}
                onValueChange={(value) => handleSettingChange('field', value)}
            >
                <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                    {inputFields.map(field => (
                        <SelectItem key={field.name} value={field.name}>
                            {field.name} ({field.type})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
       <div className="grid w-full items-center gap-1.5">
            <Label>Operator</Label>
            <Select
                 value={operation.settings.operator}
                 onValueChange={(value) => handleSettingChange('operator', value)}
            >
                <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                     {operators.map(op => (
                        <SelectItem key={op} value={op} className="font-mono">
                            {op}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
         <div className="grid w-full items-center gap-1.5">
            <Label>Value</Label>
            {renderValueInput()}
        </div>
    </div>
  );
};

export default FilterOperationEditor;

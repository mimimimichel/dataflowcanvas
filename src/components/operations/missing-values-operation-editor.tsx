'use client';

import React from 'react';
import { Field, MissingValuesOperation } from '@/lib/pipeline-data';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Input } from '../ui/input';

interface MissingValuesOperationEditorProps {
  operation: MissingValuesOperation;
  inputFields: Field[];
  onUpdate: (operation: MissingValuesOperation) => void;
}

const MissingValuesOperationEditor: React.FC<MissingValuesOperationEditorProps> = ({ operation, inputFields, onUpdate }) => {
  const handleToggleColumn = (colName: string, checked: boolean) => {
    const currentCols = operation.settings.columns || [];
    let newCols;
    if (checked) {
      newCols = [...currentCols, colName];
    } else {
      newCols = currentCols.filter(c => c !== colName);
    }
    onUpdate({
      ...operation,
      settings: { ...operation.settings, columns: newCols },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Strategy</Label>
        <RadioGroup 
          value={operation.settings.strategy} 
          onValueChange={(v: 'drop' | 'fill') => onUpdate({ ...operation, settings: { ...operation.settings, strategy: v } })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="drop" id="drop" />
            <Label htmlFor="drop" className="font-normal text-xs">Drop Rows with Nulls</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fill" id="fill" />
            <Label htmlFor="fill" className="font-normal text-xs">Fill Nulls with Constant</Label>
          </div>
        </RadioGroup>
      </div>

      {operation.settings.strategy === 'fill' && (
        <div className="space-y-2">
          <Label htmlFor="fillValue">Constant Value</Label>
          <Input 
            id="fillValue" 
            placeholder="0, 'N/A', etc." 
            value={String(operation.settings.fillValue || '')}
            onChange={(e) => onUpdate({ ...operation, settings: { ...operation.settings, fillValue: e.target.value } })}
            className="h-8 text-xs bg-muted/30"
          />
        </div>
      )}

      <div className="grid gap-3">
        <Label>Target Columns</Label>
        <div className="grid gap-2 p-3 bg-muted/30 rounded-lg border border-border max-h-[200px] overflow-y-auto">
          {inputFields.map(field => (
            <div key={field.name} className="flex items-center gap-2 hover:bg-white/5 p-1 rounded transition-colors">
              <Checkbox
                id={`mv-${field.name}`}
                checked={operation.settings.columns?.includes(field.name)}
                onCheckedChange={(checked) => handleToggleColumn(field.name, !!checked)}
              />
              <label htmlFor={`mv-${field.name}`} className="text-xs font-mono flex-1 cursor-pointer">
                {field.name}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MissingValuesOperationEditor;
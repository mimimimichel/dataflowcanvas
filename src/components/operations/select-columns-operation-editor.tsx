'use client';

import React from 'react';
import { Field, SelectColumnsOperation as SelectColumnsOperationType } from '@/lib/pipeline-data';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

interface SelectColumnsOperationEditorProps {
  operation: SelectColumnsOperationType;
  inputFields: Field[];
  onUpdate: (operation: SelectColumnsOperationType) => void;
}

const SelectColumnsOperationEditor: React.FC<SelectColumnsOperationEditorProps> = ({ operation, inputFields, onUpdate }) => {
  const handleToggleField = (fieldName: string, checked: boolean) => {
    const currentFields = operation.settings.selectedFields || [];
    let newFields;
    if (checked) {
      newFields = [...currentFields, fieldName];
    } else {
      newFields = currentFields.filter(f => f !== fieldName);
    }
    onUpdate({
      ...operation,
      settings: { ...operation.settings, selectedFields: newFields },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <Label>Selected Columns</Label>
        <div className="grid gap-2 p-3 bg-white/5 rounded-lg border border-white/10 max-h-[300px] overflow-y-auto">
          {inputFields.map(field => (
            <div key={field.name} className="flex items-center gap-2 hover:bg-white/5 p-1 rounded transition-colors">
              <Checkbox
                id={`select-${field.name}`}
                checked={operation.settings.selectedFields?.includes(field.name)}
                onCheckedChange={(checked) => handleToggleField(field.name, !!checked)}
              />
              <label htmlFor={`select-${field.name}`} className="text-sm font-mono flex-1 cursor-pointer">
                {field.name} <span className="text-xs text-muted-foreground opacity-60">({field.type})</span>
              </label>
            </div>
          ))}
          {inputFields.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No input fields detected</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectColumnsOperationEditor;
'use client';

import React from 'react';
import { Field, DeduplicationOperation } from '@/lib/pipeline-data';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

interface DeduplicationOperationEditorProps {
  operation: DeduplicationOperation;
  inputFields: Field[];
  onUpdate: (operation: DeduplicationOperation) => void;
}

const DeduplicationOperationEditor: React.FC<DeduplicationOperationEditorProps> = ({ operation, inputFields, onUpdate }) => {
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
    <div className="space-y-4">
      <div className="grid gap-3">
        <Label>Unique Columns</Label>
        <p className="text-[10px] text-muted-foreground">Rows will be considered duplicates if all selected columns match. Select none to deduplicate on all columns.</p>
        <div className="grid gap-2 p-3 bg-muted/30 rounded-lg border border-border max-h-[300px] overflow-y-auto">
          {inputFields.map(field => (
            <div key={field.name} className="flex items-center gap-2 hover:bg-white/5 p-1 rounded transition-colors">
              <Checkbox
                id={`dedup-${field.name}`}
                checked={operation.settings.columns?.includes(field.name)}
                onCheckedChange={(checked) => handleToggleColumn(field.name, !!checked)}
              />
              <label htmlFor={`dedup-${field.name}`} className="text-xs font-mono flex-1 cursor-pointer">
                {field.name}
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

export default DeduplicationOperationEditor;

'use client';

import React from 'react';
import { Field, SortOperation as SortOperationType, SortCondition, SortDirection } from '@/lib/pipeline-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '../ui/label';
import { Trash2, PlusCircle, ArrowDown, ArrowUp } from 'lucide-react';

interface SortOperationEditorProps {
  operation: SortOperationType;
  inputFields: Field[];
  onUpdate: (operation: SortOperationType) => void;
}

const SortOperationEditor: React.FC<SortOperationEditorProps> = ({ operation, inputFields, onUpdate }) => {

  const handleConditionChange = (index: number, key: keyof SortCondition, value: any) => {
    const newConditions = [...operation.settings.conditions];
    newConditions[index] = { ...newConditions[index], [key]: value };
    onUpdate({
      ...operation,
      settings: { ...operation.settings, conditions: newConditions },
    });
  };
  
  const addCondition = () => {
    const newCond: SortCondition = { field: '', direction: 'asc' };
    onUpdate({
        ...operation,
        settings: { ...operation.settings, conditions: [...operation.settings.conditions, newCond] },
    });
  };

  const removeCondition = (index: number) => {
    const newConditions = operation.settings.conditions.filter((_, i) => i !== index);
     onUpdate({
      ...operation,
      settings: { ...operation.settings, conditions: newConditions },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Sort Conditions</Label>
        <div className="space-y-2">
          {operation.settings.conditions.map((cond, index) => (
            <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
              <Select value={cond.field} onValueChange={(v) => handleConditionChange(index, 'field', v)}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {inputFields.map(field => (
                    <SelectItem key={field.name} value={field.name}>{field.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={cond.direction} onValueChange={(v: SortDirection) => handleConditionChange(index, 'direction', v)}>
                <SelectTrigger className="w-28 h-9">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc"><div className="flex items-center gap-2"><ArrowUp className="w-4 h-4"/> Ascending</div></SelectItem>
                  <SelectItem value="desc"><div className="flex items-center gap-2"><ArrowDown className="w-4 h-4"/> Descending</div></SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" onClick={() => removeCondition(index)} className="h-9 w-9">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addCondition} className="w-full">
            <PlusCircle className="mr-2" />
            Add Sort Condition
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SortOperationEditor;

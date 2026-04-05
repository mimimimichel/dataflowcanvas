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
  const settings = operation.settings || { conditions: [] };
  const conditions = settings.conditions || [];

  const handleConditionChange = (index: number, key: keyof SortCondition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [key]: value };
    onUpdate({
      ...operation,
      settings: { ...settings, conditions: newConditions },
    });
  };
  
  const addCondition = () => {
    const newCond: SortCondition = { field: inputFields[0]?.name || '', direction: 'asc' };
    onUpdate({
        ...operation,
        settings: { ...settings, conditions: [...conditions, newCond] },
    });
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
     onUpdate({
      ...operation,
      settings: { ...settings, conditions: newConditions },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Sort Conditions</Label>
        <div className="space-y-3 mt-2">
          {conditions.map((cond, index) => (
            <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/10">
              <Select value={cond.field} onValueChange={(v) => handleConditionChange(index, 'field', v)}>
                <SelectTrigger className="flex-1 h-9 bg-muted/30 border-border">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {inputFields.map(field => (
                    <SelectItem key={field.name} value={field.name}>{field.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={cond.direction} onValueChange={(v: SortDirection) => handleConditionChange(index, 'direction', v)}>
                <SelectTrigger className="w-32 h-9 bg-muted/30 border-border">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">
                    <div className="flex items-center gap-2"><ArrowUp className="w-3 h-3 text-emerald-500"/> Ascending</div>
                  </SelectItem>
                  <SelectItem value="desc">
                    <div className="flex items-center gap-2"><ArrowDown className="w-3 h-3 text-amber-500"/> Descending</div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" onClick={() => removeCondition(index)} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addCondition} className="w-full border-dashed bg-transparent hover:bg-muted/30">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Sort Rule
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SortOperationEditor;

'use client';

import React from 'react';
import { Field, FilterOperation as FilterOperationType } from '@/lib/pipeline-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface FilterOperationProps {
  operation: FilterOperationType;
  inputFields: Field[];
  onUpdate: (operation: FilterOperationType) => void;
}

const FilterOperation: React.FC<FilterOperationProps> = ({ operation, inputFields, onUpdate }) => {

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

  return (
    <div className="p-2 space-y-2 bg-muted rounded-md">
       <div className="flex items-center gap-2">
            <Select 
                value={operation.settings.field}
                onValueChange={(value) => handleSettingChange('field', value)}
            >
                <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                    {inputFields.map(field => (
                        <SelectItem key={field.name} value={field.name} className="text-xs">
                            {field.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                 value={operation.settings.operator}
                 onValueChange={(value) => handleSettingChange('operator', value)}
            >
                <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue placeholder="Op" />
                </SelectTrigger>
                <SelectContent>
                     {operators.map(op => (
                        <SelectItem key={op} value={op} className="text-xs font-mono">
                            {op}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                type="text"
                placeholder="Value"
                value={String(operation.settings.value)}
                onChange={(e) => handleSettingChange('value', e.target.value)}
                className="flex-1 h-8 text-xs"
            />
       </div>
    </div>
  );
};

export default FilterOperation;

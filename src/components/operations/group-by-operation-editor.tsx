'use client';

import React from 'react';
import { Field, GroupByOperation as GroupByOperationType, Aggregation, AggregationType } from '@/lib/pipeline-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '../ui/label';
import { Trash2, PlusCircle } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface GroupByOperationEditorProps {
  operation: GroupByOperationType;
  inputFields: Field[];
  onUpdate: (operation: GroupByOperationType) => void;
}

const GroupByOperationEditor: React.FC<GroupByOperationEditorProps> = ({ operation, inputFields, onUpdate }) => {
  const settings = operation.settings || { groupByFields: [], aggregations: [] };
  const groupByFields = settings.groupByFields || [];
  const aggregations = settings.aggregations || [];

  const handleGroupByChange = (field: string, checked: boolean) => {
    let newFields;
    if (checked) {
      newFields = [...groupByFields, field];
    } else {
      newFields = groupByFields.filter(f => f !== field);
    }
    onUpdate({
      ...operation,
      settings: { ...settings, groupByFields: newFields },
    });
  };

  const handleAggregationChange = (index: number, key: keyof Aggregation, value: any) => {
    const newAggregations = [...aggregations];
    newAggregations[index] = { ...newAggregations[index], [key]: value };
    onUpdate({
      ...operation,
      settings: { ...settings, aggregations: newAggregations },
    });
  };

  const addAggregation = () => {
    const newAgg: Aggregation = { field: '', type: 'sum', newName: '' };
    onUpdate({
      ...operation,
      settings: { ...settings, aggregations: [...aggregations, newAgg] },
    });
  };

  const removeAggregation = (index: number) => {
    const newAggregations = aggregations.filter((_, i) => i !== index);
    onUpdate({
      ...operation,
      settings: { ...settings, aggregations: newAggregations },
    });
  };

  const aggregationTypes: AggregationType[] = ['sum', 'avg', 'count', 'min', 'max'];
  const numericFields = inputFields.filter(f => f.type === 'integer' || f.type === 'float');

  return (
    <div className="space-y-4">
      <div>
        <Label>Group By Fields</Label>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal h-9 bg-muted/30">
                    <span className="truncate">
                        {groupByFields.join(', ') || 'Select fields to group by'}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <div className="p-2 space-y-1">
                    {inputFields.map(field => (
                        <div key={field.name} className="flex items-center gap-2">
                            <Checkbox
                                id={`groupby-${field.name}`}
                                checked={groupByFields.includes(field.name)}
                                onCheckedChange={(checked) => handleGroupByChange(field.name, !!checked)}
                            />
                            <Label htmlFor={`groupby-${field.name}`} className="font-normal">{field.name}</Label>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label>Aggregations</Label>
        <div className="space-y-2 mt-2">
          {aggregations.map((agg, index) => (
            <div key={index} className="flex flex-col gap-2 p-3 border rounded-md bg-muted/10">
              <div className="flex items-center gap-2">
                <Select value={agg.type} onValueChange={(v: AggregationType) => handleAggregationChange(index, 'type', v)}>
                  <SelectTrigger className="w-24 h-8 text-xs bg-muted/30">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {aggregationTypes.map(type => (
                      <SelectItem key={type} value={type} className="uppercase text-xs">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <span className="text-xs">of</span>
                <Select value={agg.field} onValueChange={(v) => handleAggregationChange(index, 'field', v)}>
                  <SelectTrigger className="flex-1 h-8 text-xs bg-muted/30">
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    { (agg.type === 'count' ? inputFields : numericFields).map(field => (
                      <SelectItem key={field.name} value={field.name} className="text-xs">{field.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs whitespace-nowrap">as</span>
                <Input
                  value={agg.newName}
                  onChange={(e) => handleAggregationChange(index, 'newName', e.target.value)}
                  placeholder="new_field_name"
                  className="flex-1 h-8 text-xs bg-muted/30"
                />
                <Button variant="ghost" size="icon" onClick={() => removeAggregation(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addAggregation} className="w-full mt-2">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Aggregation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupByOperationEditor;
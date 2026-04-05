'use client';

import React from 'react';
import { Field, BaseOperation } from '@/lib/pipeline-data';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface GenericOperationEditorProps {
  operation: BaseOperation;
  inputFields: Field[];
  onUpdate: (operation: BaseOperation) => void;
}

const GenericOperationEditor: React.FC<GenericOperationEditorProps> = ({ operation, onUpdate }) => {
  const settings = operation.settings || {};

  const handleUpdateSetting = (key: string, value: any) => {
    onUpdate({
      ...operation,
      settings: { ...settings, [key]: value },
    });
  };

  const handleAddSetting = () => {
    const newKey = `param_${Object.keys(settings).length + 1}`;
    handleUpdateSetting(newKey, '');
  };

  const handleRemoveSetting = (key: string) => {
    const newSettings = { ...settings };
    delete newSettings[key];
    onUpdate({
      ...operation,
      settings: newSettings,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Parameters</Label>
        <Button variant="ghost" size="sm" onClick={handleAddSetting} className="h-7 text-[10px] gap-1">
          <Plus className="h-3 w-3" /> Add Param
        </Button>
      </div>
      
      <div className="space-y-3">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1">
              <Input 
                className="h-8 text-xs font-mono bg-muted/30" 
                value={key} 
                onChange={(e) => {
                   const newKey = e.target.value;
                   if (newKey !== key) {
                      const newSettings = { ...settings };
                      newSettings[newKey] = newSettings[key];
                      delete newSettings[key];
                      onUpdate({ ...operation, settings: newSettings });
                   }
                }}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Input 
                className="h-8 text-xs bg-muted/30" 
                value={String(value)} 
                onChange={(e) => handleUpdateSetting(key, e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleRemoveSetting(key)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {Object.keys(settings).length === 0 && (
          <p className="text-[10px] text-muted-foreground italic text-center py-4 bg-muted/20 rounded-lg border border-dashed">
            No custom parameters defined. Click "Add Param" to configure.
          </p>
        )}
      </div>
    </div>
  );
};

export default GenericOperationEditor;
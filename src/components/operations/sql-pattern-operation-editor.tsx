'use client';

import React from 'react';
import { Field, SqlPatternOperation } from '@/lib/pipeline-data';
import { transformationPatterns, getPattern, renderPatternSql } from '@/lib/transformation-patterns';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface SqlPatternOperationEditorProps {
  operation: SqlPatternOperation;
  inputFields: Field[];
  onUpdate: (operation: SqlPatternOperation) => void;
}

const SqlPatternOperationEditor: React.FC<SqlPatternOperationEditorProps> = ({ operation, onUpdate }) => {
  const pattern = getPattern(operation.settings.patternId);

  const handlePatternChange = (patternId: string) => {
    onUpdate({ ...operation, settings: { patternId, params: {} } });
  };

  const handleParamChange = (name: string, value: string) => {
    onUpdate({
      ...operation,
      settings: { ...operation.settings, params: { ...operation.settings.params, [name]: value } },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>SQL Pattern</Label>
        <Select value={operation.settings.patternId || undefined} onValueChange={handlePatternChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Choose a pattern..." />
          </SelectTrigger>
          <SelectContent>
            {transformationPatterns.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pattern && <p className="text-[10px] text-muted-foreground">{pattern.description}</p>}
      </div>

      {pattern && (
        <>
          <div className="grid gap-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Parameters</Label>
            {pattern.parameters.map(param => (
              <div key={param.name} className="grid gap-1">
                <Label htmlFor={`pattern-param-${param.name}`} className="text-xs">{param.label}</Label>
                <Input
                  id={`pattern-param-${param.name}`}
                  className="h-8 text-xs font-mono"
                  placeholder={param.placeholder}
                  value={operation.settings.params?.[param.name] || ''}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SQL Preview</Label>
            <pre className="text-[11px] font-mono leading-relaxed p-3 rounded-lg bg-muted/30 border border-border overflow-x-auto whitespace-pre">
              {renderPatternSql(pattern, operation.settings.params || {})}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};

export default SqlPatternOperationEditor;

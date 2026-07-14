'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

export interface FieldSpec<T> {
  key: keyof T;
  label: string;
  multiline?: boolean;
}

interface EntryListEditorProps<T extends object> {
  entries: T[];
  fields: FieldSpec<T>[];
  onChange: (entries: T[]) => void;
  newEntry: () => T;
  emptyLabel: string;
}

/** Generic editable list of records (ADRs, runbook entries, doc links, versions...) with add/remove rows. */
export function EntryListEditor<T extends object>({
  entries, fields, onChange, newEntry, emptyLabel,
}: EntryListEditorProps<T>) {
  const update = (idx: number, key: keyof T, value: string) => {
    const next = entries.slice();
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  const remove = (idx: number) => onChange(entries.filter((_, i) => i !== idx));
  const strVal = (entry: T, key: keyof T): string => (entry[key] as unknown as string) || '';

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground italic text-center py-6 bg-muted/20 rounded-lg border border-dashed">{emptyLabel}</p>
      )}
      {entries.map((entry, idx) => (
        <div key={idx} className="p-3 rounded-lg border border-border bg-muted/10 space-y-2 relative">
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6 absolute right-2 top-2 text-muted-foreground hover:text-destructive"
            onClick={() => remove(idx)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <div className="grid grid-cols-2 gap-2 pr-8">
            {fields.map(f => (
              <div key={String(f.key)} className={f.multiline ? 'col-span-2 space-y-1' : 'space-y-1'}>
                <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                {f.multiline ? (
                  <Textarea
                    className="text-xs min-h-[60px]"
                    value={strVal(entry, f.key)}
                    onChange={(e) => update(idx, f.key, e.target.value)}
                  />
                ) : (
                  <Input
                    className="h-8 text-xs"
                    value={strVal(entry, f.key)}
                    onChange={(e) => update(idx, f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5" onClick={() => onChange([...entries, newEntry()])}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
      </Button>
    </div>
  );
}

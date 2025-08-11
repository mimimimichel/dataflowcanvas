
'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { PipelineNode, Field } from '@/lib/pipeline-data';
import { AreaChart, SlidersHorizontal, Table, Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface NodeConfigurationPanelProps {
  node: PipelineNode | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, newConfig: Partial<PipelineNode>) => void;
  viewMode: 'consumer' | 'engineer';
}

const StatsDisplay: React.FC<{ node: PipelineNode }> = ({ node }) => (
  <div className="space-y-4 text-sm mt-4">
    <div className="flex justify-between">
      <span className="text-muted-foreground">Status:</span>
      <span className="font-medium capitalize">{node.status}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Data Quality Score:</span>
      <span className="font-medium">{node.quality}%</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Records Processed (24h):</span>
      <span className="font-medium">1,234,567</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Average Latency:</span>
      <span className="font-medium">120ms</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Last Run:</span>
      <span className="font-medium">5 minutes ago</span>
    </div>
  </div>
);

const SchemaEditor: React.FC<{ fields: Field[], onFieldsChange: (fields: Field[]) => void, isEditable: boolean }> = ({ fields, onFieldsChange, isEditable }) => {
  const handleFieldChange = (index: number, field: keyof Field, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [field]: value };
    onFieldsChange(newFields);
  };

  const addField = () => {
    onFieldsChange([...fields, { name: 'new_field', type: 'string' }]);
  };

  const removeField = (index: number) => {
    onFieldsChange(fields.filter((_, i) => i !== index));
  };
  
  return (
    <div className="space-y-2">
      <UiTable>
        <TableHeader>
          <TableRow>
            <TableHead>Field Name</TableHead>
            <TableHead>Type</TableHead>
            {isEditable && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={index}>
              <TableCell>
                <Input 
                  value={field.name} 
                  onChange={e => handleFieldChange(index, 'name', e.target.value)} 
                  disabled={!isEditable}
                  className="h-8"
                />
              </TableCell>
              <TableCell>
                 <Input 
                  value={field.type} 
                  onChange={e => handleFieldChange(index, 'type', e.target.value)} 
                  disabled={!isEditable}
                  className="h-8"
                />
              </TableCell>
              {isEditable && (
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeField(index)} className="h-8 w-8">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </UiTable>
      {isEditable && (
        <Button variant="outline" size="sm" onClick={addField} className="w-full">
          <PlusCircle className="mr-2" />
          Add Field
        </Button>
      )}
    </div>
  );
};

const NodeConfigurationPanel: React.FC<NodeConfigurationPanelProps> = ({ node, isOpen, onClose, onSave, viewMode }) => {
  const { toast } = useToast();
  const [nodeName, setNodeName] = useState('');
  const [rule, setRule] = useState('');
  const [outputFields, setOutputFields] = useState<Field[]>([]);
  const [inputFields, setInputFields] = useState<Field[]>([]);


  useEffect(() => {
    if (node) {
      setNodeName(node.name);
      setRule(node.rule || '');
      setOutputFields(node.outputFields || []);
      setInputFields(node.inputFields || []);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    const newConfig: Partial<PipelineNode> = { name: nodeName };
    if (node.type === 'transformation') {
        newConfig.rule = rule;
    }
    if (node.type === 'source' || node.type === 'transformation') {
        newConfig.outputFields = outputFields;
    }
     if (node.type === 'destination') {
        newConfig.inputFields = inputFields;
    }

    onSave(node.id, newConfig);
    toast({
      title: "Configuration Saved",
      description: `Changes to "${nodeName}" have been saved.`
    });
    onClose();
  }
  
  const isSchemaEditable = node.type === 'source' || (node.type === 'destination' && viewMode === 'engineer');
  const isRuleEditable = node.type === 'transformation' && viewMode === 'engineer';
  
  const renderConfigContent = () => {
    switch(node.type) {
      case 'source':
        return (
          <>
            <h3 className="text-md font-medium mb-2">Output Schema</h3>
            <SchemaEditor fields={outputFields} onFieldsChange={setOutputFields} isEditable={viewMode === 'engineer'} />
          </>
        );
      case 'transformation':
        return (
          <>
            <h3 className="text-md font-medium mb-2">Input Schema (Read-only)</h3>
            <SchemaEditor fields={inputFields} onFieldsChange={() => {}} isEditable={false} />
            <Separator className="my-4"/>
            <div className="space-y-2">
                <Label htmlFor="transform-rule">Transformation Rule (SQL-like)</Label>
                <Textarea id="transform-rule" value={rule} onChange={e => setRule(e.target.value)} rows={6} disabled={!isRuleEditable} />
            </div>
            <Separator className="my-4"/>
            <h3 className="text-md font-medium mb-2">Output Schema (Inferred)</h3>
             <p className="text-sm text-muted-foreground mb-2">The output schema is typically inferred by the system after running the transformation. You can manually define it if needed.</p>
            <SchemaEditor fields={outputFields} onFieldsChange={setOutputFields} isEditable={viewMode === 'engineer'} />
          </>
        );
      case 'destination':
        return (
          <>
            <h3 className="text-md font-medium mb-2">Input Schema</h3>
            <SchemaEditor fields={inputFields} onFieldsChange={setInputFields} isEditable={viewMode === 'engineer'} />
          </>
        );
      default:
        return null;
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg w-full">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">Configure: {node.name}</SheetTitle>
          <SheetDescription>
            {viewMode === 'engineer'
              ? 'Modify configurations, rules, and schemas for this node.'
              : 'View aggregated statistics and schemas for this node.'}
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <Tabs defaultValue={viewMode === 'engineer' ? 'config' : 'stats'} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stats"><AreaChart className="mr-2"/> Statistics</TabsTrigger>
            <TabsTrigger value="config" disabled={viewMode === 'consumer'}><SlidersHorizontal className="mr-2"/> Configuration</TabsTrigger>
          </TabsList>
          <TabsContent value="stats">
             <StatsDisplay node={node} />
          </TabsContent>
          <TabsContent value="config">
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="node-name">Node Name</Label>
                <Input type="text" id="node-name" value={nodeName} onChange={(e) => setNodeName(e.target.value)} disabled={viewMode === 'consumer'} />
              </div>
              <Separator className="my-4"/>
              {renderConfigContent()}
            </div>
          </TabsContent>
        </Tabs>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={viewMode === 'consumer'}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default NodeConfigurationPanel;


'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PipelineNode, Field, Operation, FilterOperation } from '@/lib/pipeline-data';
import { Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import FilterOperationEditor from '@/components/operations/filter-operation-editor';


interface NodeConfigurationPanelProps {
  node: PipelineNode | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, newConfig: Partial<PipelineNode>) => void;
  onDelete: (nodeId: string) => void;
}

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
          {(fields || []).map((field, index) => (
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

const NodeConfigurationPanel: React.FC<NodeConfigurationPanelProps> = ({ node, isOpen, onClose, onSave, onDelete }) => {
  const { toast } = useToast();
  const [nodeName, setNodeName] = useState('');
  const [operation, setOperation] = useState<Operation | undefined>();
  const [outputFields, setOutputFields] = useState<Field[]>([]);
  const [inputFields, setInputFields] = useState<Field[]>([]);


  useEffect(() => {
    if (node) {
      setNodeName(node.name);
      setOperation(node.operation);
      setOutputFields(node.outputFields || []);
      setInputFields(node.inputFields || []);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    const newConfig: Partial<PipelineNode> = { name: nodeName };
    if (node.type === 'transformation') {
        newConfig.operation = operation;
        // For filter operations, output schema is the same as input
        if(operation?.type === 'filter') {
            newConfig.outputFields = inputFields;
        } else {
            newConfig.outputFields = outputFields;
        }
    }
    if (node.type === 'source') {
        newConfig.outputFields = outputFields;
    }
    if (node.type === 'dataset') {
      newConfig.inputFields = inputFields;
      newConfig.outputFields = inputFields; // a dataset's output is its input
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
  
  const handleDelete = () => {
    onDelete(node.id);
    toast({
      title: "Node Deleted",
      description: `"${nodeName}" has been removed from the pipeline.`
    });
    onClose();
  }
  
  const renderConfigContent = () => {
    switch(node.type) {
      case 'source':
        return (
          <>
             {node.name === 'File Source' && (
              <div className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="file-path">File Path</Label>
                  <Input type="text" id="file-path" placeholder="/path/to/your/file.csv" />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="file-type">File Type</Label>
                  <Input type="text" id="file-type" placeholder="e.g., CSV, JSON, Parquet" />
                </div>
                <Separator/>
              </div>
            )}
            <h3 className="text-md font-medium mb-2">Output Schema</h3>
            <SchemaEditor fields={outputFields} onFieldsChange={setOutputFields} isEditable={true} />
          </>
        );
      case 'transformation':
        return (
          <>
            <h3 className="text-md font-medium mb-2">Input Schema</h3>
            <SchemaEditor fields={inputFields} onFieldsChange={setInputFields} isEditable={false} />
            <Separator className="my-4"/>
            <h3 className="text-md font-medium mb-2">Transformation Operation</h3>
            {operation?.type === 'filter' && (
              <FilterOperationEditor 
                operation={operation as FilterOperation}
                inputFields={inputFields}
                onUpdate={(op) => setOperation(op)}
              />
            )}
            {operation?.type === 'join' && (
               <p className="text-sm text-muted-foreground">Join configuration is not yet available in this panel.</p>
            )}
            {!operation && (
              <p className="text-sm text-muted-foreground">No operation configured for this transformation.</p>
            )}
            <Separator className="my-4"/>
            <h3 className="text-md font-medium mb-2">Output Schema</h3>
             <p className="text-sm text-muted-foreground mb-2">Define the fields produced by this transformation.</p>
            <SchemaEditor 
                fields={outputFields} 
                onFieldsChange={setOutputFields} 
                isEditable={operation?.type !== 'filter'} 
            />
          </>
        );
       case 'dataset':
        return (
          <>
            <h3 className="text-md font-medium mb-2">Dataset Schema</h3>
            <p className="text-sm text-muted-foreground mb-2">The schema is defined by its inputs. You can rename fields here.</p>
            <SchemaEditor fields={inputFields} onFieldsChange={setInputFields} isEditable={true} />
          </>
        );
      case 'destination':
        return (
          <>
            <h3 className="text-md font-medium mb-2">Input Schema</h3>
            <SchemaEditor fields={inputFields} onFieldsChange={setInputFields} isEditable={false} />
          </>
        );
      default:
        return null;
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">Configure: {node.name}</SheetTitle>
          <SheetDescription>
            Modify configurations, rules, and schemas for this node.
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto pr-6 -mr-6 py-4">
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="node-name">Node Name</Label>
                <Input type="text" id="node-name" value={nodeName} onChange={(e) => setNodeName(e.target.value)} />
            </div>
            <Separator className="my-4"/>
            {renderConfigContent()}
          </div>
        </div>
        <SheetFooter className="mt-6 border-t pt-4">
            <div className="flex justify-between w-full">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive"><Trash2 className="mr-2"/> Delete Node</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            <strong> {node.name} </strong> node and remove its connections.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default NodeConfigurationPanel;


'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PipelineNode, Field, Operation, FilterOperation, JoinOperation, Connector, GroupByOperation, getJoinOutputFields } from '@/lib/pipeline-data';
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
import JoinOperationEditor from '@/components/operations/join-operation-editor';
import GroupByOperationEditor from '@/components/operations/group-by-operation-editor';


interface NodeConfigurationPanelProps {
  node: PipelineNode | undefined;
  nodes: PipelineNode[];
  connectors: Connector[];
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

const NodeConfigurationPanel: React.FC<NodeConfigurationPanelProps> = ({ node, nodes, connectors, isOpen, onClose, onSave, onDelete }) => {
  const { toast } = useToast();
  const [currentNode, setCurrentNode] = useState<Partial<PipelineNode> | undefined>();

  useEffect(() => {
    if (node) {
      // Create a deep copy to avoid direct state mutation
      setCurrentNode(JSON.parse(JSON.stringify(node)));
    }
  }, [node]);

  const sourceNodesForJoin = useMemo(() => {
    if (!currentNode || currentNode.operation?.type !== 'join') return { left: undefined, right: undefined };
    const joinOp = currentNode.operation as JoinOperation;
    const left = nodes.find(n => n.id === joinOp.settings.leftNodeId);
    const right = nodes.find(n => n.id === joinOp.settings.rightNodeId);
    return { left, right };
  }, [currentNode, nodes]);

  if (!node || !currentNode) return null;

  const handleSave = () => {
    onSave(node.id, currentNode);
    toast({
      title: "Configuration Saved",
      description: `Changes to "${currentNode.name}" have been saved.`
    });
    onClose();
  }
  
  const handleDelete = () => {
    onDelete(node.id);
    toast({
      title: "Node Deleted",
      description: `"${node.name}" has been removed from the pipeline.`
    });
    onClose();
  }

  const handleUpdate = (field: keyof PipelineNode, value: any) => {
    setCurrentNode(prev => (prev ? { ...prev, [field]: value } : undefined));
  };
  
  const handleOperationUpdate = (updatedOperation: Operation) => {
    const newConfig: Partial<PipelineNode> = { operation: updatedOperation };

    if (updatedOperation.type === 'filter') {
      newConfig.outputFields = currentNode.inputFields;
    } else if (updatedOperation.type === 'join') {
      const joinOp = updatedOperation as JoinOperation;
      const leftNode = nodes.find(n => n.id === joinOp.settings.leftNodeId);
      const rightNode = nodes.find(n => n.id === joinOp.settings.rightNodeId);
      if (leftNode && rightNode) {
        newConfig.outputFields = getJoinOutputFields(leftNode, rightNode, joinOp.settings.joinType);
      }
    } else if (updatedOperation.type === 'group_by' && currentNode.inputFields) {
      const groupOp = updatedOperation as GroupByOperation;
      const newOutputFields: Field[] = [];
      groupOp.settings.groupByFields.forEach(fieldName => {
          const field = currentNode.inputFields!.find(f => f.name === fieldName);
          if(field) newOutputFields.push(field);
      });
      groupOp.settings.aggregations.forEach(agg => {
          const originalField = currentNode.inputFields!.find(f => f.name === agg.field);
          newOutputFields.push({ name: agg.newName, type: originalField?.type || 'unknown' });
      });
      newConfig.outputFields = newOutputFields;
    }
    
    setCurrentNode(prev => (prev ? { ...prev, ...newConfig } : undefined));
  }
  
  const renderConfigContent = () => {
    switch(currentNode.type) {
      case 'source':
        return (
          <>
             {currentNode.name === 'File Source' && (
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
            <SchemaEditor fields={currentNode.outputFields || []} onFieldsChange={(fields) => handleUpdate('outputFields', fields)} isEditable={true} />
          </>
        );
      case 'transformation':
        const renderOperationEditor = () => {
            if (!currentNode.operation) {
                return <p className="text-sm text-muted-foreground">No operation configured for this transformation.</p>;
            }

            switch(currentNode.operation.type) {
                case 'filter':
                    return (
                        <FilterOperationEditor 
                            operation={currentNode.operation as FilterOperation}
                            inputFields={currentNode.inputFields || []}
                            onUpdate={handleOperationUpdate}
                        />
                    );
                case 'join':
                     if (sourceNodesForJoin.left && sourceNodesForJoin.right) {
                        return (
                            <JoinOperationEditor
                                operation={currentNode.operation as JoinOperation}
                                leftNode={sourceNodesForJoin.left}
                                rightNode={sourceNodesForJoin.right}
                                onUpdate={handleOperationUpdate}
                            />
                        );
                     }
                     return <p className="text-sm text-muted-foreground">Please connect two nodes to configure the join.</p>
                case 'group_by':
                    return (
                        <GroupByOperationEditor
                            operation={currentNode.operation as GroupByOperation}
                            inputFields={currentNode.inputFields || []}
                            onUpdate={handleOperationUpdate}
                        />
                    );
                default:
                    return <p className="text-sm text-muted-foreground">Configuration for '{currentNode.operation.type}' is not yet available.</p>;
            }
        };

        return (
          <>
            <h3 className="text-md font-medium mb-2">Input Schema</h3>
            <SchemaEditor fields={currentNode.inputFields || []} onFieldsChange={(fields) => handleUpdate('inputFields', fields)} isEditable={false} />
            <Separator className="my-4"/>
            <h3 className="text-md font-medium mb-2">Transformation Operation</h3>
            {renderOperationEditor()}
            <Separator className="my-4"/>
            <h3 className="text-md font-medium mb-2">Output Schema</h3>
             <p className="text-sm text-muted-foreground mb-2">The output schema is automatically determined by the operation.</p>
            <SchemaEditor 
                fields={currentNode.outputFields || []} 
                onFieldsChange={(fields) => handleUpdate('outputFields', fields)} 
                isEditable={false} 
            />
          </>
        );
       case 'dataset':
        return (
          <>
            <h3 className="text-md font-medium mb-2">Dataset Schema</h3>
            <p className="text-sm text-muted-foreground mb-2">The schema is defined by its inputs. You can rename fields here.</p>
            <SchemaEditor fields={currentNode.inputFields || []} onFieldsChange={(fields) => handleUpdate('inputFields', fields)} isEditable={true} />
          </>
        );
      case 'destination':
        return (
          <>
            <h3 className="text-md font-medium mb-2">Input Schema</h3>
            <SchemaEditor fields={currentNode.inputFields || []} onFieldsChange={(fields) => handleUpdate('inputFields', fields)} isEditable={false} />
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
          <SheetTitle className="text-xl">Configure: {currentNode.name}</SheetTitle>
          <SheetDescription>
            Modify configurations, rules, and schemas for this node.
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto pr-6 -mr-6 py-4">
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="node-name">Node Name</Label>
                <Input type="text" id="node-name" value={currentNode.name} onChange={(e) => handleUpdate('name', e.target.value)} />
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
                            <strong> {currentNode.name} </strong> node and remove its connections.
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

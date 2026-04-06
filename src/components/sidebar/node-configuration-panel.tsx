'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  PipelineNode, Field, Operation, FilterOperation, JoinOperation, 
  GroupByOperation, SortOperation, SelectColumnsOperation, UnionOperation, 
  DeduplicationOperation, MissingValuesOperation, getJoinOutputFields, DesignStatus, DataQualityMetrics, Connector as ConnectorType 
} from '@/lib/pipeline-data';
import { Trash2, PlusCircle, Activity, ShieldCheck, Clock3, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import SortOperationEditor from '@/components/operations/sort-operation-editor';
import SelectColumnsOperationEditor from '@/components/operations/select-columns-operation-editor';
import DeduplicationOperationEditor from '@/components/operations/deduplication-operation-editor';
import MissingValuesOperationEditor from '@/components/operations/missing-values-operation-editor';
import GenericOperationEditor from '@/components/operations/generic-operation-editor';



const AddConnectorRow: React.FC<{ nodeId?: string; nodes: {id: string; name: string}[]; connectors: ConnectorType[]; setConnectors: React.Dispatch<React.SetStateAction<ConnectorType[]>> }> = ({ nodeId, nodes, connectors, setConnectors }) => {
  const [direction, setDirection] = useState<'from' | 'to'>('to');
  const [targetId, setTargetId] = useState('');
  
  if (!nodeId) return null;
  
  const handleAdd = () => {
    if (!targetId) return;
    const newConn = direction === 'to' 
      ? { from: nodeId, to: targetId }
      : { from: targetId, to: nodeId };
    const exists = connectors.some(c => c.from === newConn.from && c.to === newConn.to);
    if (exists) return;
    setConnectors(prev => [...prev, newConn]);
    setTargetId('');
  };

  const availableTargets = nodes.filter(n => 
    !connectors.some(c => direction === 'to' ? (c.from === nodeId && c.to === n.id) : (c.from === n.id && c.to === nodeId))
  );

  if (availableTargets.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-green-500/5 rounded border border-green-500/20">
      <Badge variant="outline" className="text-[9px] text-green-400">+</Badge>
      <Select value={direction} onValueChange={(v: 'from' | 'to') => { setDirection(v); setTargetId(''); }}>
        <SelectTrigger className="h-7 text-xs w-20 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="to" className="text-xs">→ To</SelectItem>
          <SelectItem value="from" className="text-xs">← From</SelectItem>
        </SelectContent>
      </Select>
      <Select value={targetId} onValueChange={setTargetId}>
        <SelectTrigger className="h-7 text-xs flex-1 bg-background">
          <SelectValue placeholder="Select node..." />
        </SelectTrigger>
        <SelectContent>
          {availableTargets.map(n => (
            <SelectItem key={n.id} value={n.id} className="text-xs">{n.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" className="h-7 text-xs" disabled={!targetId} onClick={handleAdd}>Add</Button>
    </div>
  );
};


interface NodeConfigurationPanelProps {
  node: PipelineNode | undefined;
  nodes: PipelineNode[];
  connectors: ConnectorType[];
  setConnectors: React.Dispatch<React.SetStateAction<ConnectorType[]>>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, newConfig: Partial<PipelineNode>) => void;
  onDelete: (nodeId: string) => void;
}

const typeBadgeColor = (t: string) => {
  const m: Record<string, string> = { string: 'text-blue-400', int: 'text-emerald-400', long: 'text-emerald-400', double: 'text-amber-400', float: 'text-amber-400', boolean: 'text-pink-400', date: 'text-violet-400', timestamp: 'text-violet-400' };
  return m[t] || 'text-muted-foreground';
};

const DATA_TYPES = ['string', 'int', 'long', 'double', 'float', 'boolean', 'date', 'timestamp', 'array', 'object'] as const;

const SchemaEditor: React.FC<{ fields: Field[], onFieldsChange: (fields: Field[]) => void, isEditable: boolean }> = ({ fields, onFieldsChange, isEditable }) => {
  const handleFieldChange = (index: number, field: keyof Field, value: string | boolean) => {
    const newFields = [...(fields || [])];
    newFields[index] = { ...newFields[index], [field]: value };
    onFieldsChange(newFields);
  };

  const addField = () => {
    onFieldsChange([...(fields || []), { name: 'new_field', type: 'string' }]);
  };

  const removeField = (index: number) => {
    onFieldsChange((fields || []).filter((_, i) => i !== index));
  };
  
  const toggleNullable = (index: number) => {
    const newFields = [...(fields || [])];
    newFields[index] = { ...newFields[index], nullable: !newFields[index].nullable };
    onFieldsChange(newFields);
  };
  
  if (!fields || fields.length === 0) {
    return (
      <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 rounded border border-dashed">
        No fields defined{isEditable && ' — Add one below'}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <UiTable>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs w-12">Null</TableHead>
            {isEditable && <TableHead className="w-8"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={index}>
              <TableCell>
                {isEditable ? (
                  <Input value={field.name} onChange={e => handleFieldChange(index, 'name', e.target.value)} className="h-7 text-xs bg-muted/30 font-mono" />
                ) : (
                  <span className="text-xs font-mono">{field.name}</span>
                )}
              </TableCell>
              <TableCell>
                {isEditable ? (
                  <Select value={field.type} onValueChange={(v) => handleFieldChange(index, 'type', v)}>
                    <SelectTrigger className="h-7 text-xs bg-muted/30 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-mono">
                      {DATA_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded", typeBadgeColor(field.type))}>{field.type}</span>
                )}
              </TableCell>
              <TableCell>
                {isEditable ? (
                  <Button variant="ghost" size="icon" onClick={() => toggleNullable(index)} className={cn("h-7 w-7", field.nullable ? "text-amber-500" : "text-muted-foreground/40")}>
                    <span className="text-[9px] font-bold">{field.nullable ? 'N' : '—'}</span>
                  </Button>
                ) : (
                  <span className={cn("text-[9px] px-1", field.nullable ? "text-amber-500" : "text-muted-foreground/40")}>{field.nullable ? 'nullable' : ''}</span>
                )}
              </TableCell>
              {isEditable && (
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeField(index)} className="h-7 w-6 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </UiTable>
      {isEditable && (
        <Button variant="outline" size="sm" onClick={addField} className="w-full h-7 text-xs">
          <PlusCircle className="mr-1 w-3 h-3" />
          Add Field
        </Button>
      )}
    </div>
  );
};

const NodeConfigurationPanel: React.FC<NodeConfigurationPanelProps> = ({ node, nodes, connectors, setConnectors, isOpen, onClose, onSave, onDelete }) => {
  const { toast } = useToast();
  const [draftNode, setDraftNode] = useState<Partial<PipelineNode>>({});

  useEffect(() => {
    if(isOpen) {
        setDraftNode({});
    }
  }, [isOpen, node]);

  const sourceNodesForJoin = useMemo(() => {
    const operation = draftNode.operation || node?.operation;
    if (!node || !operation || operation.type !== 'join') return { left: undefined, right: undefined };
    
    const joinOp = operation as JoinOperation;
    const left = nodes.find(n => n.id === joinOp.settings.leftNodeId);
    const right = nodes.find(n => n.id === joinOp.settings.rightNodeId);
    return { left, right };
  }, [node, nodes, draftNode.operation]);

  if (!node) return null;

  const displayNode = { ...node, ...draftNode };

  const handleSave = () => {
    onSave(node.id, draftNode);
    toast({
      title: "Configuration Saved",
      description: `Changes to "${displayNode.name}" have been saved.`
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
    setDraftNode(prev => ({ ...prev, [field]: value }));
  };

  const handleQualityUpdate = (key: keyof DataQualityMetrics, value: any) => {
    const currentMetrics = displayNode.qualityMetrics || {};
    handleUpdate('qualityMetrics', { ...currentMetrics, [key]: value });
  }
  
  const handleOperationUpdate = (updatedOperation: Operation) => {
    const newConfig: Partial<PipelineNode> = { operation: updatedOperation };
    const effectiveOperation = { ...displayNode.operation, ...updatedOperation } as Operation;
    const effectiveInputFields = displayNode.inputFields || [];

    // Auto-propagate schema based on operation type
    const passThroughTypes = ['filter', 'sort', 'union', 'deduplication', 'handle_missing_values', 'no_op', 'normalize_formats', 'fix_typos', 'quality_control', 'standardize_strings'];
    
    if (passThroughTypes.includes(effectiveOperation.type)) {
      newConfig.outputFields = effectiveInputFields;
    } else if (effectiveOperation.type === 'join') {
      const joinOp = effectiveOperation as JoinOperation;
      const leftNode = nodes.find(n => n.id === joinOp.settings.leftNodeId);
      const rightNode = nodes.find(n => n.id === joinOp.settings.rightNodeId);
      if (leftNode && rightNode) {
        newConfig.outputFields = getJoinOutputFields(leftNode, rightNode, joinOp.settings.joinType);
      }
    } else if (effectiveOperation.type === 'group_by') {
      const groupOp = effectiveOperation as GroupByOperation;
      const newOutputFields: Field[] = [];
      (groupOp.settings.groupByFields || []).forEach(fieldName => {
          const field = effectiveInputFields.find(f => f.name === fieldName);
          if(field) newOutputFields.push(field);
      });
      (groupOp.settings.aggregations || []).forEach(agg => {
          const originalField = effectiveInputFields.find(f => f.name === agg.field);
          newOutputFields.push({ name: agg.newName, type: originalField?.type || 'unknown' });
      });
      newConfig.outputFields = newOutputFields;
    } else if (effectiveOperation.type === 'select_columns') {
      const selectOp = effectiveOperation as SelectColumnsOperation;
      newConfig.outputFields = effectiveInputFields.filter(f => selectOp.settings.selectedFields?.includes(f.name));
    } else {
        newConfig.outputFields = effectiveInputFields;
    }
    
    setDraftNode(prev => ({ ...prev, ...newConfig }));
  }
  
  const renderOperationEditor = () => {
      const operation = displayNode.operation;
      if (!operation) {
          return (
              <div className="p-4 bg-muted/20 border border-dashed rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Select a transformation type from the catalogue to configure it.</p>
              </div>
          );
      }

      switch(operation.type) {
          case 'filter':
              return <FilterOperationEditor operation={operation as FilterOperation} inputFields={displayNode.inputFields || []} onUpdate={handleOperationUpdate} />;
          case 'join': {
               const { left, right } = sourceNodesForJoin;
               if (left && right) {
                  return <JoinOperationEditor operationSettings={operation as JoinOperation} leftNode={left} rightNode={right} onUpdate={handleOperationUpdate} />;
               }
               return <p className="text-sm text-muted-foreground italic bg-muted/20 p-4 rounded border">Connect two sources to this node to configure the join parameters.</p>;
          }
          case 'group_by':
              return <GroupByOperationEditor operation={operation as GroupByOperation} inputFields={displayNode.inputFields || []} onUpdate={handleOperationUpdate} />;
          case 'sort':
              return <SortOperationEditor operation={operation as SortOperation} inputFields={displayNode.inputFields || []} onUpdate={handleOperationUpdate} />;
          case 'select_columns':
              return <SelectColumnsOperationEditor operation={operation as SelectColumnsOperation} inputFields={displayNode.inputFields || []} onUpdate={handleOperationUpdate} />;
          case 'deduplication':
              return <DeduplicationOperationEditor operation={operation as DeduplicationOperation} inputFields={displayNode.inputFields || []} onUpdate={handleOperationUpdate} />;
          case 'handle_missing_values':
              return <MissingValuesOperationEditor operation={operation as MissingValuesOperation} inputFields={displayNode.inputFields || []} onUpdate={handleOperationUpdate} />;
          case 'union':
              return <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-border text-center"><p className="text-sm text-muted-foreground italic">Stacking rows from multiple input sources. No additional configuration needed.</p></div>;
          default:
              return <GenericOperationEditor operation={operation} inputFields={displayNode.inputFields || []} onUpdate={handleOperationUpdate} />;
      }
  };

  // Connector editing
  const nodeConnectors = useMemo(() => {
    if (!node) return { incoming: [], outgoing: [] };
    return {
      incoming: connectors.filter(c => c.to === node.id),
      outgoing: connectors.filter(c => c.from === node.id),
    };
  }, [node, connectors]);

  const handleReconnectConnector = (oldFrom: string, oldTo: string, newFrom: string, newTo: string) => {
    // Remove old connector, add new one
    setConnectors(prev => prev.filter(c => !(c.from === oldFrom && c.to === oldTo)));
    setConnectors(prev => [...prev, { from: newFrom, to: newTo }]);
    toast({ title: "Connector updated", description: `Reconnected from "${nodes.find(n => n.id === newFrom)?.name || newFrom}" to "${nodes.find(n => n.id === newTo)?.name || newTo}"` });
  };

  const renderConnectorsSection = () => {
    const allNodeIds = nodes.filter(n => n.id !== node?.id).map(n => ({ id: n.id, name: n.name }));
    if (allNodeIds.length === 0) return null;

    return (
      <>
        <Separator className="my-4"/>
        <h3 className="text-md font-medium mb-2 flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" /> Connections
        </h3>
        
        {nodeConnectors.incoming.length === 0 && nodeConnectors.outgoing.length === 0 && (
          <p className="text-xs text-muted-foreground mb-3">No connections yet.</p>
        )}

        {/* Incoming connections */}
        {nodeConnectors.incoming.map((conn, i) => (
          <div key={`in-${i}`} className="flex items-center gap-2 p-2 bg-muted/20 rounded border border-border mb-2">
            <Badge variant="outline" className="text-[9px]">IN</Badge>
            <Select value={conn.from} onValueChange={(newFrom) => handleReconnectConnector(conn.from, conn.to, newFrom, conn.to)}>
              <SelectTrigger className="h-7 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nodes.filter(n => n.id !== node?.id).map(n => (
                  <SelectItem key={n.id} value={n.id} className="text-xs">{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">→</span>
            <span className="text-xs font-mono truncate">{node?.name}</span>
          </div>
        ))}

        {/* Outgoing connections */}
        {nodeConnectors.outgoing.map((conn, i) => (
          <div key={`out-${i}`} className="flex items-center gap-2 p-2 bg-muted/20 rounded border border-border mb-2">
            <Badge variant="outline" className="text-[9px]">OUT</Badge>
            <span className="text-xs font-mono truncate">{node?.name}</span>
            <span className="text-[10px] text-muted-foreground">→</span>
            <Select value={conn.to} onValueChange={(newTo) => handleReconnectConnector(conn.from, conn.to, conn.from, newTo)}>
              <SelectTrigger className="h-7 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nodes.filter(n => n.id !== node?.id).map(n => (
                  <SelectItem key={n.id} value={n.id} className="text-xs">{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        {/* Add new connector section */}
        <AddConnectorRow nodeId={node?.id} nodes={allNodeIds} connectors={connectors} setConnectors={setConnectors} />
      </>
    );
  };

  const renderConfigContent = () => {
    switch(displayNode.type) {
      case 'source':
        return (
          <>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="system">System</Label>
                <Input type="text" id="system" placeholder="e.g., PostgreSQL, S3, BigQuery" value={displayNode.system || ''} onChange={(e) => handleUpdate('system', e.target.value)} className="bg-muted/30" />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input type="text" id="location" placeholder="e.g., prod-db-1, /path/to/data" value={displayNode.location || ''} onChange={(e) => handleUpdate('location', e.target.value)} className="bg-muted/30" />
              </div>
              <Separator/>
            </div>
            <h3 className="text-md font-medium mb-2 mt-4">Output Schema</h3>
            <SchemaEditor fields={displayNode.outputFields || []} onFieldsChange={(fields) => handleUpdate('outputFields', fields)} isEditable={true} />
          </>
        );
      case 'transformation':
        return (
          <>
            <h3 className="text-md font-medium mb-2">Input Schema</h3>
            <SchemaEditor fields={displayNode.inputFields || []} onFieldsChange={(fields) => handleUpdate('inputFields', fields)} isEditable={false} />
            <Separator className="my-4"/>
            <h3 className="text-md font-medium mb-2">Transformation Operation</h3>
            {renderOperationEditor()}
            <Separator className="my-4"/>
            <h3 className="text-md font-medium mb-2">Output Schema</h3>
             <p className="text-[10px] text-muted-foreground mb-2">Calculated based on the selected transformation.</p>
            <SchemaEditor 
                fields={displayNode.outputFields || []} 
                onFieldsChange={(fields) => handleUpdate('outputFields', fields)} 
                isEditable={false} 
            />
          </>
        );
       case 'dataset':
        return (
          <>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="system">System</Label>
                <Input type="text" id="system" placeholder="e.g., In-Memory, Redis" value={displayNode.system || ''} onChange={(e) => handleUpdate('system', e.target.value)} className="bg-muted/30" />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input type="text" id="location" placeholder="e.g., default-cache" value={displayNode.location || ''} onChange={(e) => handleUpdate('location', e.target.value)} className="bg-muted/30" />
              </div>
              <Separator/>
            </div>
            <h3 className="text-md font-medium mb-2 mt-4">Dataset Schema</h3>
            <SchemaEditor fields={displayNode.inputFields || []} onFieldsChange={(fields) => handleUpdate('inputFields', fields)} isEditable={true} />
          </>
        );
      case 'destination':
        return (
          <>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="system">System</Label>
                <Input type="text" id="system" placeholder="e.g., BigQuery, Snowflake" value={displayNode.system || ''} onChange={(e) => handleUpdate('system', e.target.value)} className="bg-muted/30" />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="location">Location</Label>
                <Input type="text" id="location" placeholder="e.g., analytics-project.dataset.table" value={displayNode.location || ''} onChange={(e) => handleUpdate('location', e.target.value)} className="bg-muted/30" />
              </div>
              <Separator/>
            </div>
            <h3 className="text-md font-medium mb-2 mt-4">Input Schema</h3>
            <SchemaEditor fields={displayNode.inputFields || []} onFieldsChange={(fields) => handleUpdate('inputFields', fields)} isEditable={false} />
          </>
        );
      default:
        return null;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[85vh] flex flex-col glass-panel">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl">Configure: {displayNode.name}</DialogTitle>
          <DialogDescription>
            Modify configurations, rules, and design specifications.
          </DialogDescription>
        </DialogHeader>
        <Separator className="bg-border/50" />
        <div className="flex-1 overflow-y-auto pr-6 -mr-6 py-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <Label htmlFor="node-name">Node Name</Label>
                  <Input type="text" id="node-name" value={displayNode.name} onChange={(e) => handleUpdate('name', e.target.value)} className="bg-muted/30" />
               </div>
               <div className="space-y-1.5">
                  <Label htmlFor="status">Design Status</Label>
                  <Select value={displayNode.status} onValueChange={(v: DesignStatus) => handleUpdate('status', v)}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="ready">Production Ready</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </div>

            <div className="space-y-3 p-4 bg-primary/5 border border-primary/10 rounded-xl">
               <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3" /> Quality Targets (SLAs)
               </h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Target Completeness (%)</Label>
                    <Input 
                      type="number" 
                      placeholder="99.9" 
                      value={displayNode.qualityMetrics?.completeness || ''} 
                      onChange={(e) => handleQualityUpdate('completeness', parseFloat(e.target.value))}
                      className="h-8 text-xs bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase">Target Freshness</Label>
                    <Input 
                      type="text" 
                      placeholder="1h, 15m, 1d" 
                      value={displayNode.qualityMetrics?.freshness || ''} 
                      onChange={(e) => handleQualityUpdate('freshness', e.target.value)}
                      className="h-8 text-xs bg-muted/30"
                    />
                  </div>
               </div>
            </div>

            <Separator className="bg-border/50"/>
            {renderConfigContent()}
          </div>
        </div>

            {/* Connections Section - shown for all node types */}
            {renderConnectorsSection()}
          
        <DialogFooter className="mt-6 border-t border-border pt-4">
            <div className="flex justify-between w-full">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4"/> Delete Node</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-panel border-border">
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            <strong> {displayNode.name} </strong> node and remove its connections.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel className="bg-muted/30 border-border">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose} className="border-border bg-muted/20">Cancel</Button>
                    <Button onClick={handleSave} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">Save Changes</Button>
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NodeConfigurationPanel;

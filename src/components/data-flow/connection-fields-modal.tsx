
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PipelineNode, Field } from '@/lib/pipeline-data';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConnectionFieldsModalProps {
  isOpen: boolean;
  fromNode: PipelineNode;
  toNode: PipelineNode;
  onClose: () => void;
  onSave: (fromNodeId: string, toNodeId: string, selectedFields: Field[]) => void;
}

const ConnectionFieldsModal: React.FC<ConnectionFieldsModalProps> = ({ isOpen, fromNode, toNode, onClose, onSave }) => {
  const [selectedFields, setSelectedFields] = useState<Field[]>([]);

  useEffect(() => {
    // Pre-select all fields by default when the modal opens
    if (fromNode?.outputFields) {
      setSelectedFields(fromNode.outputFields);
    }
  }, [fromNode]);

  if (!fromNode || !toNode) {
    return null;
  }

  const handleToggleField = (field: Field) => {
    setSelectedFields(prev => {
      if (prev.some(f => f.name === field.name)) {
        return prev.filter(f => f.name !== field.name);
      } else {
        return [...prev, field];
      }
    });
  };

  const handleSave = () => {
    onSave(fromNode.id, toNode.id, selectedFields);
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFields(fromNode.outputFields || []);
    } else {
      setSelectedFields([]);
    }
  };

  const allFieldsSelected = (fromNode.outputFields?.length ?? 0) === selectedFields.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Fields for {toNode.name}</DialogTitle>
          <DialogDescription>
            Select the fields from "{fromNode.name}" to use as input for "{toNode.name}".
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-60 w-full rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={allFieldsSelected} 
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Field Name</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(fromNode.outputFields || []).map(field => (
                <TableRow key={field.name}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFields.some(f => f.name === field.name)}
                      onCheckedChange={() => handleToggleField(field)}
                    />
                  </TableCell>
                  <TableCell>{field.name}</TableCell>
                  <TableCell>{field.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionFieldsModal;

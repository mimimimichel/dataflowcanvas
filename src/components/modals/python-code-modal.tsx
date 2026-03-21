
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PythonCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
}

const PythonCodeModal: React.FC<PythonCodeModalProps> = ({ isOpen, onClose, code }) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Palantir Foundry transform is ready to be pasted.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Palantir Foundry Transform (PySpark)</DialogTitle>
          <DialogDescription>
            This script is ready to be used in a Foundry Repository. It uses the @transform_df decorator for clean data processing.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
            <ScrollArea className="h-[500px] w-full rounded-md border bg-slate-950 p-4 font-mono text-xs text-slate-50">
                <pre>{code}</pre>
            </ScrollArea>
            <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8 bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-400"
                onClick={handleCopy}
            >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleCopy}>Copy Code</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PythonCodeModal;

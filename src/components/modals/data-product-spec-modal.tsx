'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataProductSpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  spec: string;
  isLoading: boolean;
}

const DataProductSpecModal: React.FC<DataProductSpecModalProps> = ({ isOpen, onClose, spec, isLoading }) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(spec);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "Data product spec copied as YAML." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([spec], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data-product-spec.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Data Product Specification</DialogTitle>
          <DialogDescription>
            AI-generated ODPS / DPDS / BITOL spec, unified in YAML, derived from your visual pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative min-h-[400px] border rounded-md bg-card overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/50 backdrop-blur-sm z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium animate-pulse text-muted-foreground">Deriving the data product spec from your pipeline...</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-full w-full p-6">
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground/90">{spec}</pre>
              </ScrollArea>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8 bg-background/80 backdrop-blur-sm border shadow-sm"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!isLoading && (
            <>
              <Button variant="outline" onClick={handleDownload}><Download className="h-4 w-4 mr-1.5" /> Download YAML</Button>
              <Button onClick={handleCopy}>Copy YAML</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataProductSpecModal;

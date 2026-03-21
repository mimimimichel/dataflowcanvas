'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SpecModalProps {
  isOpen: boolean;
  onClose: () => void;
  spec: string;
  isLoading: boolean;
}

const SpecModal: React.FC<SpecModalProps> = ({ isOpen, onClose, spec, isLoading }) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(spec);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Functional specification copied as Markdown.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pipeline Functional Specification</DialogTitle>
          <DialogDescription>
            AI-generated documentation based on your visual design.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 relative min-h-[400px] border rounded-md bg-card overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/50 backdrop-blur-sm z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium animate-pulse text-muted-foreground">AI is analyzing your pipeline...</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-full w-full p-6">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                  {spec}
                </div>
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
          {!isLoading && <Button onClick={handleCopy}>Copy Markdown</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SpecModal;

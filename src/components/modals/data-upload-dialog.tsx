'use client';

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Table, CheckCircle2, AlertTriangle, Loader2, Eye } from 'lucide-react';
import { parseFile, ParsedData } from '@/lib/data-uploader';

interface DataUploadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetNodeIds: string[];
  onDataLoaded: (data: ParsedData) => void;
}

const DataUploadDialog: React.FC<DataUploadDialogProps> = ({
  open,
  onOpenChange,
  targetNodeIds,
  onDataLoaded
}) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(csv|json)$/i)) {
      setError('Veuillez sélectionner un fichier CSV ou JSON');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      setFileContent(text);

      const format = file.name.endsWith('.json') ? 'json' : 'csv';
      const result = parseFile(text, format);
      setParsedData(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du traitement du fichier');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.match(/\.(csv|json)$/i)) {
      setError('Veuillez déposer un fichier CSV ou JSON');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const text = await file.text();
      setFileContent(text);

      const format = file.name.endsWith('.json') ? 'json' : 'csv';
      const result = parseFile(text, format);
      setParsedData(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du traitement du fichier');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeFile = () => {
    setStep('upload');
    setFileContent(null);
    setParsedData(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadData = () => {
    if (parsedData) {
      onDataLoaded(parsedData);
      onOpenChange(false);
      // Reset state
      setStep('upload');
      setFileContent(null);
      setParsedData(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{step === 'upload' ? 'Téléverser des données' : 'Aperçu des données'}</DialogTitle>
          <DialogDescription>
            Téléchargez un fichier CSV ou JSON pour commencer
          </DialogDescription>
        </DialogHeader>
        
        {step === 'upload' ? (
          <div className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border/50 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Glissez-déposez votre fichier ici</p>
              <p className="text-sm text-muted-foreground mt-2">
                ou cliquez pour sélectionner un fichier
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 btn-link text-sm text-primary hover:underline"
              >
                Parcourir les fichiers
              </button>
            </div>
            
            {error && (
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
              <Badge variant="secondary">
                {parsedData!.fields.length} colonnes
              </Badge>
              <Badge variant="secondary">
                {parsedData!.rowCount.toLocaleString()} lignes
              </Badge>
              {parsedData!.errors.length > 0 && (
                <Badge variant="destructive">
                  {parsedData!.errors.length} avertissements
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {parsedData!.fields.map((field, index) => (
                <div key={index} className="bg-muted px-3 py-2 rounded">
                  <div className="font-medium">{field.name}</div>
                  <div className="text-muted-foreground text-sm">{field.type}</div>
                </div>
              ))}
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Aperçu des données</h3>
                <button
                  onClick={handleChangeFile}
                  className="text-sm text-muted-foreground hover:text-muted-foreground/80"
                >
                  Changer de fichier
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      {parsedData!.fields.map((field, index) => (
                        <th
                          key={index}
                          className="px-3 py-2 text-left text-xs font-medium text-muted-foreground truncate max-w-[30ch]"
                        >
                          {field.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData!.rows.slice(0, 20).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {parsedData!.fields.map((field, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-3 py-2 text-xs truncate max-w-[30ch] align-middle"
                          >
                            {row[field.name] === null || row[field.name] === undefined ? (
                              <i className="text-muted-foreground">null</i>
                            ) : (
                              String(row[field.name])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsedData!.rows.length === 0 && (
                      <tr>
                        <td colSpan={parsedData!.fields.length} className="px-3 py-2 text-center text-muted-foreground">
                          Aucune donnée disponible
                        </td>
                      </tr>
                    )}
                    {parsedData!.rows.length > 20 && (
                      <tr>
                        <td colSpan={parsedData!.fields.length} className="px-3 py-2 text-center text-muted-foreground">
                          Et {parsedData!.rows.length - 20} autres lignes...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={handleChangeFile}
                className="w-full"
              >
                Changer de fichier
              </Button>
              <Button
                onClick={handleLoadData}
                
                className="w-full mt-3"
              >
                Charger {parsedData!.rowCount.toLocaleString()} lignes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DataUploadDialog;
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface ParsedContact {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { email: string; error: string }[];
  totalErrors: number;
}

export function ImportDialog({
  open,
  onOpenChange,
  onImported,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0];
    if (!csvFile) return;

    setFile(csvFile);
    setResult(null);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const contacts: ParsedContact[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any, index: number) => {
          // Try to find email field (case-insensitive)
          const email =
            row.email || row.Email || row.EMAIL || row['Email Address'];

          if (!email || !email.includes('@')) {
            errors.push(`Row ${index + 2}: Invalid or missing email`);
            return;
          }

          contacts.push({
            email: email.trim().toLowerCase(),
            firstName:
              row.firstName ||
              row.first_name ||
              row['First Name'] ||
              row.firstname ||
              undefined,
            lastName:
              row.lastName ||
              row.last_name ||
              row['Last Name'] ||
              row.lastname ||
              undefined,
          });
        });

        if (errors.length > 0 && contacts.length === 0) {
          toast.error('Could not parse any valid contacts from the file');
          setFile(null);
          return;
        }

        setParsedContacts(contacts);
        if (errors.length > 0) {
          toast.warning(`${errors.length} rows could not be parsed`);
        }
      },
      error: (error) => {
        toast.error('Failed to parse CSV file');
        console.error(error);
        setFile(null);
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    disabled: importing,
  });

  const handleImport = async () => {
    if (parsedContacts.length === 0) return;

    setImporting(true);
    setProgress(0);

    try {
      // Import in batches of 500
      const BATCH_SIZE = 500;
      let totalImported = 0;
      let totalSkipped = 0;
      const allErrors: { email: string; error: string }[] = [];

      for (let i = 0; i < parsedContacts.length; i += BATCH_SIZE) {
        const batch = parsedContacts.slice(i, i + BATCH_SIZE);

        const response = await fetch('/api/contacts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contacts: batch,
            skipDuplicates: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to import contacts');
        }

        const data = await response.json();
        totalImported += data.imported;
        totalSkipped += data.skipped;
        allErrors.push(...data.errors);

        setProgress(Math.round(((i + batch.length) / parsedContacts.length) * 100));
      }

      setResult({
        imported: totalImported,
        skipped: totalSkipped,
        errors: allErrors.slice(0, 10),
        totalErrors: allErrors.length,
      });

      if (totalImported > 0) {
        toast.success(`Successfully imported ${totalImported} contacts`);
      }
    } catch (error) {
      toast.error('Failed to import contacts');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (importing) return;
    setFile(null);
    setParsedContacts([]);
    setResult(null);
    setProgress(0);
    onOpenChange(false);
    if (result && result.imported > 0) {
      onImported();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import contacts. The file should have an
            &quot;email&quot; column, and optionally &quot;firstName&quot; and
            &quot;lastName&quot; columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                  ${importing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="h-10 w-10 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {parsedContacts.length} contacts found
                      </p>
                    </div>
                    {!importing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setParsedContacts([]);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive
                        ? 'Drop the file here'
                        : 'Drag & drop a CSV file, or click to select'}
                    </p>
                  </div>
                )}
              </div>

              {/* Progress */}
              {importing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importing contacts...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={importing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={parsedContacts.length === 0 || importing}
                >
                  {importing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Import {parsedContacts.length > 0 && `(${parsedContacts.length})`}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Results */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle2 className="h-8 w-8" />
                  <div>
                    <p className="font-semibold text-lg">Import Complete</p>
                    <p className="text-sm text-muted-foreground">
                      {result.imported} contacts imported
                    </p>
                  </div>
                </div>

                {result.skipped > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    {result.skipped} duplicates skipped
                  </div>
                )}

                {result.totalErrors > 0 && (
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <p className="text-sm font-medium text-destructive">
                      {result.totalErrors} errors occurred
                    </p>
                    <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                      {result.errors.map((err, i) => (
                        <li key={i}>
                          {err.email}: {err.error}
                        </li>
                      ))}
                      {result.totalErrors > 10 && (
                        <li>... and {result.totalErrors - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

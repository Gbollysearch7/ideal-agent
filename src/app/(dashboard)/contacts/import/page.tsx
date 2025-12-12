'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function ImportContactsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/contacts');
        }, 2000);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-medium tracking-tight">
            Import Contacts
          </h1>
          <p className="text-muted-foreground">
            Upload a CSV file to import contacts in bulk
          </p>
        </div>
      </div>

      {/* Upload Card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-medium tracking-tight">
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Your CSV should have columns for: email, first_name, last_name
            (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {uploadSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-success/10 mb-4 rounded-full p-4">
                <CheckCircle className="text-success h-8 w-8" />
              </div>
              <p className="text-lg font-medium">Import Successful!</p>
              <p className="text-muted-foreground">
                Redirecting to contacts...
              </p>
            </div>
          ) : (
            <>
              <div className="border-border rounded-lg border-2 border-dashed p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="bg-muted mb-4 rounded-full p-4">
                    <Upload className="text-muted-foreground h-8 w-8" />
                  </div>
                  <Label
                    htmlFor="file-upload"
                    className="text-primary cursor-pointer hover:underline"
                  >
                    Click to upload
                  </Label>
                  <p className="text-muted-foreground mt-1 text-sm">
                    or drag and drop your CSV file here
                  </p>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {file && (
                <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
                  <FileText className="text-muted-foreground h-5 w-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              )}

              <Button
                className="h-12 w-full"
                disabled={!file || isUploading}
                onClick={handleUpload}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Contacts
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

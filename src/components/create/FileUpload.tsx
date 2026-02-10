'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileImage, FileText, X } from 'lucide-react';
import { useCreateStore } from '@/store/useCreateStore';
import { compressImageDataUrl } from '@/lib/image-utils';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function FileUpload() {
  const { previewUrl, setPreviewUrl, reset } = useCreateStore();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Bitte lade eine PDF, PNG oder JPG Datei hoch.');
        return;
      }

      if (file.size > MAX_SIZE) {
        setError('Die Datei ist zu groß. Maximal 10 MB erlaubt.');
        return;
      }

      if (file.type === 'application/pdf') {
        // Dynamic import of PDF.js for PDF files
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const page = await pdf.getPage(1);

          const scale = 2;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context not available');

          await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
          const dataUrl = canvas.toDataURL('image/png');
          // Compress before storing to fit sessionStorage limits
          const compressed = await compressImageDataUrl(dataUrl).catch(() => dataUrl);
          setPreviewUrl(compressed);
        } catch {
          setError('Die PDF konnte nicht gelesen werden. Versuche ein anderes Format.');
        }
      } else {
        // Image file — compress before storing to fit sessionStorage limits
        const reader = new FileReader();
        reader.onload = async (e) => {
          const result = e.target?.result as string;
          const compressed = await compressImageDataUrl(result).catch(() => result);
          setPreviewUrl(compressed);
        };
        reader.onerror = () => setError('Die Datei konnte nicht gelesen werden.');
        reader.readAsDataURL(file);
      }
    },
    [setPreviewUrl]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  if (previewUrl) {
    return (
      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <img
            src={previewUrl}
            alt="Grundriss Vorschau"
            className="w-full object-contain max-h-[500px]"
          />
        </div>
        <button
          onClick={() => {
            reset();
            if (inputRef.current) inputRef.current.value = '';
          }}
          className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110"
          aria-label="Datei entfernen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-all duration-200 ${
          dragActive
            ? 'border-brand bg-brand/5 scale-[1.01]'
            : 'border-border hover:border-brand/50 hover:bg-surface'
        }`}
      >
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
            dragActive ? 'bg-brand/20 text-brand' : 'bg-surface text-muted group-hover:text-brand'
          }`}
        >
          <Upload className="h-6 w-6" />
        </div>

        <div className="text-center">
          <p className="text-base font-medium">
            {dragActive ? 'Hier ablegen' : 'Grundriss hochladen'}
          </p>
          <p className="mt-1 text-sm text-muted">
            Drag & Drop oder klicken zum Auswählen
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <FileImage className="h-3.5 w-3.5" /> PNG, JPG
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> PDF
          </span>
          <span>Max. 10 MB</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

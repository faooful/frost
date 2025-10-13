'use client';

import { useEffect } from 'react';

interface PDFViewerProps {
  filePath: string;
  onTextExtracted?: (text: string, invoiceData: any) => void;
}

export function PDFViewer({ filePath, onTextExtracted }: PDFViewerProps) {
  useEffect(() => {
    // Extract text in the background when component mounts
    extractPDFText();
  }, [filePath]);

  const extractPDFText = async () => {
    try {
      const response = await fetch('/api/pdf/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });

      if (response.ok) {
        const data = await response.json();
        if (onTextExtracted) {
          onTextExtracted(data.text, data.invoiceData);
        }
      }
    } catch (err) {
      console.error('Error extracting PDF text:', err);
    }
  };

  return (
    <div className="w-full h-full bg-gray-900">
      <iframe
        src={`/api/pdf/serve?path=${encodeURIComponent(filePath)}#view=FitH&toolbar=0&navpanes=0&scrollbar=1`}
        className="w-full h-full border-0"
        title="PDF Preview"
      />
    </div>
  );
}


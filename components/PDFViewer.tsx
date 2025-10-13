'use client';

import { useState, useEffect } from 'react';

interface PDFViewerProps {
  filePath: string;
  onTextExtracted?: (text: string, invoiceData: any) => void;
}

export function PDFViewer({ filePath, onTextExtracted }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  useEffect(() => {
    // Extract text when component mounts
    extractPDFText();
    setIsLoading(false);
  }, [filePath]);

  const extractPDFText = async () => {
    try {
      console.log('Extracting PDF from:', filePath);
      const response = await fetch('/api/pdf/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });

      console.log('Extract response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Extracted data:', data);
        setExtractedData(data);
        if (onTextExtracted) {
          onTextExtracted(data.text, data.invoiceData);
        }
      } else {
        const errorData = await response.json();
        console.error('Extract error:', errorData);
        setError(errorData.error || 'Failed to extract PDF');
      }
    } catch (err) {
      console.error('Error extracting PDF text:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract PDF');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Debug: Show extraction status */}
      {extractedData && (
        <div className="mb-2 p-2 bg-gray-800 border border-gray-700 rounded text-xs">
          <div className="text-green-400">✓ PDF text extracted ({extractedData.pageCount || 0} pages)</div>
          {extractedData.text && (
            <>
              <div className="text-gray-400 mt-1">Text length: {extractedData.text.length} characters</div>
              <details className="mt-2">
                <summary className="text-blue-400 cursor-pointer hover:text-blue-300">Show extracted text</summary>
                <pre className="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                  {extractedData.text}
                </pre>
              </details>
            </>
          )}
        </div>
      )}

      {/* Invoice Data Summary */}
      {extractedData?.invoiceData && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-md">
          <h3 className="text-blue-300 text-sm font-semibold mb-2">📄 Invoice Data Extracted</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {extractedData.invoiceData.invoiceNumber && (
              <div>
                <span className="text-gray-400">Invoice #:</span>
                <span className="text-white ml-2">{extractedData.invoiceData.invoiceNumber}</span>
              </div>
            )}
            {extractedData.invoiceData.date && (
              <div>
                <span className="text-gray-400">Date:</span>
                <span className="text-white ml-2">{extractedData.invoiceData.date}</span>
              </div>
            )}
            {extractedData.invoiceData.subtotal !== null && extractedData.invoiceData.subtotal !== undefined && (
              <div>
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white ml-2">£{extractedData.invoiceData.subtotal.toFixed(2)}</span>
              </div>
            )}
            {extractedData.invoiceData.tax !== null && extractedData.invoiceData.tax !== undefined && (
              <div>
                <span className="text-gray-400">VAT:</span>
                <span className="text-white ml-2">£{extractedData.invoiceData.tax.toFixed(2)}</span>
              </div>
            )}
            {extractedData.invoiceData.totalAmount !== null && extractedData.invoiceData.totalAmount !== undefined && (
              <div>
                <span className="text-gray-400">Total:</span>
                <span className="text-blue-400 ml-2 font-semibold">
                  £{extractedData.invoiceData.totalAmount.toFixed(2)}
                </span>
              </div>
            )}
            {extractedData.invoiceData.paid !== null && extractedData.invoiceData.paid !== undefined && (
              <div>
                <span className="text-gray-400">Paid:</span>
                <span className="text-white ml-2">£{extractedData.invoiceData.paid.toFixed(2)}</span>
              </div>
            )}
            {extractedData.invoiceData.balanceDue !== null && extractedData.invoiceData.balanceDue !== undefined && (
              <div>
                <span className="text-gray-400">Balance Due:</span>
                <span className="text-green-400 ml-2 font-semibold">
                  £{extractedData.invoiceData.balanceDue.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          {extractedData.invoiceData.lineItems?.length > 0 && (
            <div className="mt-2">
              <span className="text-gray-400 text-xs">Line Items: {extractedData.invoiceData.lineItems.length}</span>
            </div>
          )}
        </div>
      )}

      {/* Show if no invoice data found but text was extracted */}
      {extractedData?.text && !extractedData?.invoiceData?.invoiceNumber && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
          <h3 className="text-yellow-300 text-sm font-semibold mb-2">⚠️ No Invoice Data Detected</h3>
          <p className="text-gray-400 text-xs">Text was extracted but no invoice-specific data found. The text is still available for AI analysis.</p>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 flex flex-col items-center bg-gray-800/50 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-400">Loading PDF...</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-red-400">
            Error loading PDF: {error}
          </div>
        )}

        {/* PDF Preview using iframe */}
        <div className="flex-1 w-full">
          <iframe
            src={`/api/pdf/serve?path=${encodeURIComponent(filePath)}`}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        </div>
      </div>
    </div>
  );
}


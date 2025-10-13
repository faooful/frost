'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const PixelBlast = dynamic(() => import('./PixelBlast'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-900">
      <p className="text-white text-sm font-mono">Loading effect...</p>
    </div>
  )
});

interface LineItem {
  description: string;
  amount: number;
  source?: string; // Which invoice this came from
  sourceFile?: string; // The actual filename/path
}

interface Receipt {
  filename: string;
  filePath: string;
  invoiceData: {
    invoiceNumber: string | null;
    date: string | null;
    totalAmount: number | null;
    subtotal: number | null;
    tax: number | null;
    balanceDue: number | null;
    paid: number | null;
    lineItems: LineItem[];
    vendor: string | null;
  };
  error?: string;
}

interface ReceiptPanelProps {
  onFileSelect?: (filename: string) => void;
}

export function ReceiptPanel({ onFileSelect }: ReceiptPanelProps = {}) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [consolidatedLineItems, setConsolidatedLineItems] = useState<LineItem[]>([]);
  const [totalVAT, setTotalVAT] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [needsReanalysis, setNeedsReanalysis] = useState(false);
  const [cachedFileList, setCachedFileList] = useState<string[]>([]);
  const [asciiFrame, setAsciiFrame] = useState(0);

  useEffect(() => {
    checkCacheAndFetch();
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setAsciiFrame((prev) => (prev + 1) % 8);
    }, 150);

    return () => clearInterval(interval);
  }, [isLoading]);

  const checkCacheAndFetch = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Try to load from cache first
      const cacheResponse = await fetch('/api/receipts/cache');
      const cacheData = await cacheResponse.json();
      
      if (cacheData.success && cacheData.data) {
        // Load cached data immediately for instant display (no animation)
        const cached = cacheData.data;
        setReceipts(cached.receipts || []);
        setConsolidatedLineItems(cached.consolidatedLineItems || []);
        setTotalVAT(cached.totalVAT || 0);
        setGrandTotal(cached.grandTotal || 0);
        setCachedFileList(cached.fileList || []);
        setIsLoading(false);
        
        // Step 2: Check if there are new PDFs in the data folder
        const filesResponse = await fetch('/api/files');
        const filesData = await filesResponse.json();
        const currentPDFs = filesData.files
          .filter((f: any) => f.extension === '.pdf')
          .map((f: any) => f.name)
          .sort();
        
        const cachedPDFs = (cached.fileList || []).sort();
        
        // Compare file lists
        const hasNewFiles = JSON.stringify(currentPDFs) !== JSON.stringify(cachedPDFs);
        
        if (hasNewFiles) {
          console.log('New PDFs detected - re-analysis needed');
          setNeedsReanalysis(true);
        }
      } else {
        // No cache found, fetch fresh data
        await fetchAndCacheReceipts();
      }
    } catch (error) {
      console.error('Error checking cache:', error);
      // Fallback to fresh fetch on error
      await fetchAndCacheReceipts();
    }
  };

  const fetchAndCacheReceipts = async () => {
    // Show the animation for at least 3 seconds (gives time for PixelBlast to load)
    const startTime = Date.now();
    const minDisplayTime = 3000;
    
    try {
      setIsLoading(true);
      setNeedsReanalysis(false);
      
      const response = await fetch('/api/receipts/all');
      
      if (response.ok) {
        const data = await response.json();
        setReceipts(data.receipts || []);
        
        // Consolidate all line items from all receipts
        const allLineItems: LineItem[] = [];
        let vat = 0;
        let total = 0;
        
        data.receipts.forEach((receipt: Receipt) => {
          // Add line items with source tracking
          if (receipt.invoiceData?.lineItems && receipt.invoiceData.lineItems.length > 0) {
            receipt.invoiceData.lineItems.forEach(item => {
              allLineItems.push({
                ...item,
                source: receipt.invoiceData.invoiceNumber || receipt.filename,
                sourceFile: receipt.filename
              });
            });
          }
          
          // Sum up VAT
          if (receipt.invoiceData?.tax) {
            vat += receipt.invoiceData.tax;
          }
          
          // Sum up totals (use totalAmount or balanceDue)
          if (receipt.invoiceData?.totalAmount) {
            total += receipt.invoiceData.totalAmount;
          } else if (receipt.invoiceData?.balanceDue) {
            total += receipt.invoiceData.balanceDue;
          }
        });
        
        setConsolidatedLineItems(allLineItems);
        setTotalVAT(vat);
        setGrandTotal(total);
        
        // Get list of PDF filenames for comparison
        const fileList = data.receipts.map((r: Receipt) => r.filename);
        setCachedFileList(fileList);
        
        // Save to cache
        await fetch('/api/receipts/cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receipts: data.receipts,
            consolidatedLineItems: allLineItems,
            totalVAT: vat,
            grandTotal: total,
            fileList,
          }),
        });
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      // Ensure animation shows for minimum time
      const elapsed = Date.now() - startTime;
      const remainingTime = minDisplayTime - elapsed;
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full relative overflow-hidden bg-gray-900">
        <div style={{ position: 'absolute', inset: 0 }}>
          <PixelBlast
            variant="circle"
            pixelSize={6}
            color="#B19EEF"
            patternScale={3}
            patternDensity={1.2}
            pixelSizeJitter={0.5}
            enableRipples={true}
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid={true}
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.6}
            edgeFade={0.25}
            transparent={true}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10, pointerEvents: 'none' }}>
          <p className="text-white text-sm font-mono">Analyzing receipts...</p>
        </div>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No invoices found.</p>
        <p className="text-sm mt-2">Add PDF invoices to the data folder to see them here.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto receipt-mono">
      {/* Re-analysis Banner */}
      {needsReanalysis && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold text-yellow-400 mb-1">📄 New PDFs detected</p>
              <p className="text-yellow-200/80">
                New invoice files have been added to the data folder. Re-analyze to include them in the receipt.
              </p>
            </div>
            <button
              onClick={fetchAndCacheReceipts}
              className="ml-4 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
            >
              Re-analyze
            </button>
          </div>
        </div>
      )}

      {/* All Line Items */}
      <div className="flex-1 mb-6">
        {consolidatedLineItems.length > 0 ? (
          <div className="space-y-1">
            {consolidatedLineItems.map((item, index) => (
              <div key={index} className="flex justify-between items-start py-1">
                <div className="flex-1">
                  <p className="text-gray-200">{item.description}</p>
                  {item.source && (
                    <p className="text-gray-500 mt-0.5">
                      {item.sourceFile && onFileSelect ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onFileSelect(item.sourceFile!);
                          }}
                          style={{ 
                            all: 'unset', 
                            color: '#6b7280',
                            textDecoration: 'underline', 
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: 'inherit'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#9ca3af'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                        >
                          {item.source}
                        </button>
                      ) : (
                        item.source
                      )}
                    </p>
                  )}
                </div>
                <p className="text-white ml-4">£{item.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No line items could be extracted from the invoices</p>
        )}
      </div>

      {/* Totals Section */}
      <div className="mt-auto pt-4">
        <div className="space-y-1">
          {/* Subtotal - calculated from line items */}
          {consolidatedLineItems.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Subtotal ({consolidatedLineItems.length} items):</span>
              <span className="text-white">
                £{consolidatedLineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
              </span>
            </div>
          )}
          
          {/* VAT */}
          {totalVAT > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Total VAT:</span>
              <span className="text-white">£{totalVAT.toFixed(2)}</span>
            </div>
          )}
          
          {/* Grand Total */}
          <div className="flex justify-between pt-2">
            <span className="text-gray-200">TOTAL:</span>
            <span className="text-green-400">
              £{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LineItem {
  description: string;
  amount: number;
  source?: string; // Which invoice this came from
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

export function ReceiptPanel() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [consolidatedLineItems, setConsolidatedLineItems] = useState<LineItem[]>([]);
  const [totalVAT, setTotalVAT] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [needsReanalysis, setNeedsReanalysis] = useState(false);
  const [cachedFileList, setCachedFileList] = useState<string[]>([]);

  useEffect(() => {
    checkCacheAndFetch();
  }, []);

  const checkCacheAndFetch = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Try to load from cache first
      const cacheResponse = await fetch('/api/receipts/cache');
      const cacheData = await cacheResponse.json();
      
      if (cacheData.success && cacheData.data) {
        // Load cached data immediately for instant display
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
                source: receipt.invoiceData.invoiceNumber || receipt.filename
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
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        {/* Skeleton Header */}
        <div className="mb-6 pb-4 border-b-2 border-gray-600">
          <Skeleton className="h-8 w-64 mb-2 bg-gray-700" />
          <Skeleton className="h-4 w-32 bg-gray-700" />
        </div>
        
        {/* Skeleton Line Items */}
        <div className="flex-1 mb-6">
          <Skeleton className="h-4 w-24 mb-3 bg-gray-700" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-start py-2 border-b border-gray-700/50">
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2 bg-gray-700" />
                  <Skeleton className="h-3 w-1/3 bg-gray-700" />
                </div>
                <Skeleton className="h-4 w-16 ml-4 bg-gray-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Totals */}
        <div className="mt-auto pt-6 border-t-2 border-gray-600">
          <div className="space-y-3">
            <Skeleton className="h-5 w-full bg-gray-700" />
            <Skeleton className="h-5 w-full bg-gray-700" />
            <div className="pt-3 mt-3 border-t-2 border-gray-600">
              <Skeleton className="h-10 w-full bg-gray-700" />
            </div>
          </div>
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
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Re-analysis Banner */}
      {needsReanalysis && (
        <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-400 mb-1">📄 New PDFs detected</p>
              <p className="text-xs text-yellow-200/80">
                New invoice files have been added to the data folder. Re-analyze to include them in the receipt.
              </p>
            </div>
            <button
              onClick={fetchAndCacheReceipts}
              className="ml-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded transition-colors"
            >
              Re-analyze
            </button>
          </div>
        </div>
      )}

      {/* Receipt Header */}
      <div className="mb-6 pb-4 border-b-2 border-gray-600">
        <h2 className="text-2xl font-bold text-white mb-2">CONSOLIDATED RECEIPT</h2>
        <p className="text-sm text-gray-400">{receipts.length} invoice{receipts.length !== 1 ? 's' : ''} combined</p>
      </div>
      
      {/* All Line Items */}
      <div className="flex-1 mb-6">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">All Line Items</h3>
        
        {consolidatedLineItems.length > 0 ? (
          <div className="space-y-2">
            {consolidatedLineItems.map((item, index) => (
              <div key={index} className="flex justify-between items-start py-2 border-b border-gray-700/50">
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{item.description}</p>
                  {item.source && (
                    <p className="text-xs text-gray-500 mt-1">from: {item.source}</p>
                  )}
                </div>
                <p className="text-sm font-medium text-white ml-4">£{item.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No line items could be extracted from the invoices</p>
        )}
      </div>

      {/* Totals Section */}
      <div className="mt-auto pt-6 border-t-2 border-gray-600">
        <div className="space-y-3">
          {/* Subtotal - calculated from line items */}
          {consolidatedLineItems.length > 0 && (
            <div className="flex justify-between text-base">
              <span className="text-gray-400">Subtotal ({consolidatedLineItems.length} items):</span>
              <span className="text-white font-medium">
                £{consolidatedLineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
              </span>
            </div>
          )}
          
          {/* VAT */}
          {totalVAT > 0 && (
            <div className="flex justify-between text-base">
              <span className="text-gray-400">Total VAT:</span>
              <span className="text-white font-medium">£{totalVAT.toFixed(2)}</span>
            </div>
          )}
          
          {/* Grand Total */}
          <div className="pt-3 mt-3 border-t-2 border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold text-gray-200">TOTAL:</span>
              <span className="text-3xl font-bold text-green-400">
                £{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Sources Reference */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
        <p className="text-xs text-gray-500 mb-2">Sources:</p>
        <div className="space-y-1">
          {receipts.map((receipt, index) => (
            <p key={index} className="text-xs text-gray-400">
              • {receipt.invoiceData.invoiceNumber ? `Invoice #${receipt.invoiceData.invoiceNumber}` : receipt.filename}
              {receipt.invoiceData.totalAmount && (
                <span className="text-gray-500 ml-2">(£{receipt.invoiceData.totalAmount.toFixed(2)})</span>
              )}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}


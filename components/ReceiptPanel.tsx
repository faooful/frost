'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";

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
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          
          // Sum up totals (use totalAmount, balanceDue, or calculate from subtotal + tax)
          if (receipt.invoiceData?.totalAmount) {
            total += receipt.invoiceData.totalAmount;
          } else if (receipt.invoiceData?.balanceDue) {
            total += receipt.invoiceData.balanceDue;
          } else if (receipt.invoiceData?.subtotal !== null && receipt.invoiceData?.tax !== null) {
            // Calculate total if not provided
            total += receipt.invoiceData.subtotal + receipt.invoiceData.tax;
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

  // Get the latest date from all receipts
  const getLatestMonthYear = () => {
    let latestDate: Date | null = null;
    
    receipts.forEach(receipt => {
      if (receipt.invoiceData?.date) {
        const date = new Date(receipt.invoiceData.date);
        if (!isNaN(date.getTime())) {
          if (!latestDate || date > latestDate) {
            latestDate = date;
          }
        }
      }
    });
    
    if (latestDate) {
      return latestDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto receipt-mono">
      {/* Title with Button */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="receipt-title" style={{ 
              color: '#f2f2f2',
              marginBottom: '8px',
              marginTop: 0
            }}>
              Receipts summary
            </h1>
            <p className="receipt-subtitle" style={{
              color: '#9ca3af',
              margin: 0
            }}>
              As of {getLatestMonthYear()}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#9ca3af',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#d1d5db'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            •••
          </button>

          {/* Custom Modal with Overlay */}
          {isModalOpen && (
            <>
              {/* Overlay */}
              <div
                onClick={() => setIsModalOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 9998,
                  animation: 'fadeIn 0.2s ease-out'
                }}
              />
              
              {/* Modal Content */}
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#171717',
                  border: '1px solid #2E2E2E',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  maxWidth: '440px',
                  width: '100%',
                  zIndex: 9999,
                  animation: 'slideIn 0.2s ease-out'
                }}
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'transparent',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    lineHeight: 1
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#f2f2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                >
                  ×
                </button>

                <div style={{ borderBottom: '1px solid #2E2E2E', padding: '16px' }}>
                  <h3 style={{ 
                    margin: 0, 
                    color: '#f2f2f2', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    Receipt Options
                  </h3>
                </div>
                <div style={{ padding: '16px' }}>
                  <p style={{ 
                    fontSize: '13px', 
                    color: '#9ca3af',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    margin: 0
                  }}>
                    Modal content goes here...
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Re-analysis Banner */}
      {needsReanalysis && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold text-yellow-400 mb-1">New PDFs detected</p>
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

      {/* Individual Receipts */}
      <div className="flex-1">
        {receipts.map((receipt, receiptIndex) => (
          <>
          <div key={receiptIndex} style={{ paddingBottom: '16px' }}>
            {/* Receipt Header */}
            <div className="mb-3">
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onFileSelect) {
                    onFileSelect(receipt.filename);
                  }
                }}
                style={{ 
                  color: '#9ca3af',
                  textDecoration: 'underline', 
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#d1d5db'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
              >
                {receipt.invoiceData.invoiceNumber || receipt.filename}
              </span>
            </div>

            {/* Line Items */}
            {receipt.invoiceData.lineItems && receipt.invoiceData.lineItems.length > 0 ? (
              <div className="space-y-0.5">
                {receipt.invoiceData.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-start py-0.5">
                    <p className="text-gray-200 flex-1 pr-8">{item.description}</p>
                    <p className="text-white">£{item.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic text-sm">No line items extracted</p>
            )}

            {/* Receipt Totals */}
            <div className="mt-3 pt-2 space-y-1 text-sm">
              {receipt.invoiceData.tax !== null && receipt.invoiceData.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400">VAT:</span>
                  <span className="text-white">£{receipt.invoiceData.tax.toFixed(2)}</span>
                </div>
              )}
              {receipt.invoiceData.subtotal !== null && (
                <div className="flex justify-between" style={{ fontWeight: 700 }}>
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">£{receipt.invoiceData.subtotal.toFixed(2)}</span>
                </div>
              )}
              {(() => {
                const total = receipt.invoiceData.totalAmount !== null 
                  ? receipt.invoiceData.totalAmount 
                  : (receipt.invoiceData.subtotal !== null && receipt.invoiceData.tax !== null)
                    ? receipt.invoiceData.subtotal + receipt.invoiceData.tax
                    : null;
                
                return total !== null ? (
                  <div className="flex justify-between" style={{ fontWeight: 700 }}>
                    <span className="text-gray-300">Total:</span>
                    <span className="text-white">£{total.toFixed(2)}</span>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
          {receiptIndex < receipts.length - 1 && (
            <div style={{ 
              borderTop: '1px dashed #6B7280', 
              marginBottom: '16px',
              opacity: 0.5
            }}></div>
          )}
          </>
        ))}
      </div>

      {/* Grand Total Section */}
      <div className="mt-8">
        <div style={{ borderTop: '1px dashed #6B7280', opacity: 0.5, marginBottom: '24px' }}></div>
        <div className="space-y-2">
          {/* Total VAT */}
          {totalVAT > 0 && (
            <div className="flex justify-between receipt-total-vat">
              <span className="text-gray-300">Total VAT:</span>
              <span className="text-white">£{totalVAT.toFixed(2)}</span>
            </div>
          )}
          
          {/* Grand Total */}
          <div className="flex justify-between pt-2 receipt-grand-total">
            <span className="text-gray-100">GRAND TOTAL:</span>
            <span className="text-green-400">
              £{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


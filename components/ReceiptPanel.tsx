'use client';

import { useState, useEffect } from 'react';
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

import LiquidChrome from './LiquidChrome';

interface LineItem {
  description: string;
  amount: number;
  source?: string; // Which invoice this came from
  sourceFile?: string; // The actual filename/path
  label?: string; // Category label: Maintenance, Appliance, License, Other
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
  filesDeleted?: boolean; // New prop to indicate files have been deleted
  onReanalysisTriggered?: () => void; // Callback when re-analysis is triggered
  onLoadingStateChange?: (isLoading: boolean) => void; // Callback to notify parent of loading state
}

export function ReceiptPanel({ onFileSelect, filesDeleted = false, onReanalysisTriggered, onLoadingStateChange }: ReceiptPanelProps = {}) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // Detect when files are deleted and trigger reanalysis
  useEffect(() => {
    if (filesDeleted) {
      setNeedsReanalysis(true);
    }
  }, [filesDeleted]);

  // Notify parent of loading state changes
  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(isLoading);
    }
  }, [isLoading, onLoadingStateChange]);

  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setAsciiFrame((prev) => (prev + 1) % 8);
    }, 150);

    return () => clearInterval(interval);
  }, [isLoading]);

  const checkCacheAndFetch = async () => {
    try {
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
        setIsLoading(true);
        await fetchAndCacheReceipts();
      }
    } catch (error) {
      console.error('Error checking cache:', error);
      // Fallback to fresh fetch on error
      await fetchAndCacheReceipts();
    }
  };

  const labelLineItems = async (lineItems: LineItem[]): Promise<LineItem[]> => {
    if (!lineItems || lineItems.length === 0) {
      return lineItems;
    }

    console.log('Labeling line items:', lineItems.map(item => item.description));

    try {
      const response = await fetch('/api/receipts/label-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.labeledItems) {
          console.log('Successfully labeled items:', data.labeledItems.map((item: LineItem) => ({ description: item.description, label: item.label })));
          return data.labeledItems;
        } else {
          console.error('Labeling API returned unsuccessful response:', data);
        }
      } else {
        console.error('Labeling API request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error labeling line items:', error);
    }

    // Fallback: return items with default "Other" label
    console.log('Using fallback labeling for items');
    return lineItems.map(item => ({
      ...item,
      label: item.label || 'Other'
    }));
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
        
        // Label all line items (both consolidated and individual receipts)
        const labeledLineItems = await labelLineItems(allLineItems);
        
        // Also label line items in individual receipts
        const labeledReceipts = await Promise.all(data.receipts.map(async (receipt: Receipt) => {
          if (receipt.invoiceData?.lineItems && receipt.invoiceData.lineItems.length > 0) {
            const labeledReceiptLineItems = await labelLineItems(receipt.invoiceData.lineItems);
            return {
              ...receipt,
              invoiceData: {
                ...receipt.invoiceData,
                lineItems: labeledReceiptLineItems
              }
            };
          }
          return receipt;
        }));
        
        setReceipts(labeledReceipts);
        setConsolidatedLineItems(labeledLineItems);
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
            receipts: labeledReceipts,
            consolidatedLineItems: labeledLineItems,
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
      
      // Notify parent that re-analysis has been triggered
      if (onReanalysisTriggered) {
        onReanalysisTriggered();
      }
    }
  };

  if (isLoading) {
    return (
      <div 
        className="h-full w-full relative overflow-hidden flex items-center justify-center"
        style={{ 
          width: '100%',
          height: '100%'
        }}
      >
        <LiquidChrome
          key="loading-animation"
          baseColor={[0.2, 0.2, 0.2]} // Dark gray color
          speed={0.1}
          amplitude={0.3}
          interactive={false}
        />
        <h2 
          style={{
            position: 'absolute',
            fontSize: '20px',
            fontFamily: '"Lora", serif',
            color: '#f2f2f2',
            textAlign: 'center',
            zIndex: 51,
            margin: 0
          }}
        >
          Generating Summary
        </h2>
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
        <div 
          className="mb-4"
          style={{
            backgroundColor: 'rgb(31, 31, 31)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}
        >
          <p className="receipt-banner-text" style={{ 
            color: '#f2f2f2', 
            margin: 0
          }}>
            {filesDeleted 
              ? "Files have been deleted from the data folder. Re-analyze to update the summary."
              : "New files have been added to the data folder. Re-analyze to update the summary."
            }
          </p>
          <button
            onClick={fetchAndCacheReceipts}
            style={{
              padding: '8px',
              backgroundColor: '#68A6E4',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5a9bd4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#68A6E4';
            }}
          >
            <img 
              src="/icons/refresh-ccw.svg" 
              alt="Refresh" 
              width="16" 
              height="16" 
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </button>
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
                  <div key={index} className="flex items-start py-0.5" style={{ gap: '12px' }}>
                    <div className="flex-1 pr-4">
                      <p className="text-gray-200 text-sm">{item.description}</p>
                    </div>
                    <div className="flex-shrink-0" style={{ minWidth: '80px', textAlign: 'left' }}>
                      <p className="text-gray-400 text-xs mb-1">{item.label || 'Other'}</p>
                    </div>
                    <div className="flex-shrink-0" style={{ minWidth: '60px', textAlign: 'right' }}>
                      <p className="text-white text-sm">£{item.amount.toFixed(2)}</p>
                    </div>
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


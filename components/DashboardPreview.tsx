'use client';

import { useState, useEffect } from 'react';

interface LineItem {
  description: string;
  amount: number;
  source?: string;
  sourceFile?: string;
  label?: string;
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

interface DashboardPreviewProps {
  receipts: Receipt[];
  consolidatedLineItems: LineItem[];
  totalVAT: number;
  grandTotal: number;
}

interface CategoryData {
  name: string;
  total: number;
  percentage: number;
  color: string;
}

export function DashboardPreview({ receipts, consolidatedLineItems, totalVAT, grandTotal }: DashboardPreviewProps) {
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; amount: number }[]>([]);

  useEffect(() => {
    // Process category breakdown
    const categoryMap = consolidatedLineItems.reduce((acc, item) => {
      const category = item.label || 'Other';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += item.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalAmount = grandTotal || Object.values(categoryMap).reduce((sum, amount) => sum + amount, 0);
    
    const categories: CategoryData[] = Object.entries(categoryMap).map(([name, total]) => ({
      name,
      total,
      percentage: totalAmount > 0 ? (total / totalAmount) * 100 : 0,
      color: name === 'Maintenance' ? '#3b82f6' :
             name === 'Appliance' ? '#10b981' :
             name === 'License' ? '#f59e0b' : '#6b7280'
    })).sort((a, b) => b.total - a.total);

    setCategoryBreakdown(categories);

    // Process monthly trend
    const monthlyMap = receipts.reduce((acc, receipt) => {
      if (receipt.invoiceData?.date) {
        const date = new Date(receipt.invoiceData.date);
        if (!isNaN(date.getTime())) {
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const amount = receipt.invoiceData.totalAmount || 
                        (receipt.invoiceData.subtotal || 0) + (receipt.invoiceData.tax || 0);
          
          if (!acc[monthKey]) {
            acc[monthKey] = 0;
          }
          acc[monthKey] += amount;
        }
      }
      return acc;
    }, {} as Record<string, number>);

    const monthlyTrendData = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => new Date(a.month + ' 1, 2023').getTime() - new Date(b.month + ' 1, 2023').getTime());

    setMonthlyTrend(monthlyTrendData);
  }, [receipts, consolidatedLineItems, grandTotal]);

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const maxMonthlyAmount = Math.max(...monthlyTrend.map(item => item.amount), 1);

  return (
    <div className="h-full flex flex-col" style={{ 
      gap: '16px',
      overflow: 'hidden',
      paddingBottom: '16px'
    }}>
      {/* Total Spend Card */}
      <div style={{ 
        backgroundColor: '#171717', 
        borderColor: '#2e2e2e',
        border: '1px solid #2e2e2e',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div className="text-center">
          <div style={{ 
            fontSize: '12px', 
            color: '#9ca3af', 
            marginBottom: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            Total Spend
          </div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: '#f2f2f2',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {formatCurrency(grandTotal)}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#6b7280',
            marginTop: '4px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div style={{ 
        backgroundColor: '#171717', 
        borderColor: '#2e2e2e',
        border: '1px solid #2e2e2e',
        borderRadius: '12px'
      }}>
        <div style={{ padding: '24px 24px 12px 24px' }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#f2f2f2',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontWeight: '600'
          }}>
            Spending by Category
          </div>
        </div>
        <div style={{ padding: '0 24px 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categoryBreakdown.map((category, index) => (
              <div key={category.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ minWidth: '100px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#f2f2f2',
                    fontWeight: '500',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    {category.name}
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#9ca3af',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    {category.percentage.toFixed(1)}%
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    backgroundColor: '#2e2e2e', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        width: `${category.percentage}%`,
                        height: '100%',
                        backgroundColor: category.color,
                        opacity: 0.6,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <div style={{ 
                    minWidth: '60px', 
                    textAlign: 'right', 
                    fontSize: '10px', 
                    color: '#f2f2f2',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    {formatCurrency(category.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div style={{ 
        backgroundColor: '#171717', 
        borderColor: '#2e2e2e',
        border: '1px solid #2e2e2e',
        borderRadius: '12px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        <div style={{ padding: '24px 24px 12px 24px' }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#f2f2f2',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontWeight: '600'
          }}>
            Monthly Trend
          </div>
        </div>
        <div style={{ padding: '0 24px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {monthlyTrend.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ position: 'relative', flex: 1, paddingTop: '20px', minHeight: '200px' }}>
                {/* Bar graph container */}
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  
                  {/* Y-axis grid lines */}
                  {[0, 25, 50, 75, 100].map((percent) => (
                    <line
                      key={percent}
                      x1="0"
                      y1={100 - percent}
                      x2="100"
                      y2={100 - percent}
                      stroke="#2e2e2e"
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  
                  {/* Bars */}
                  {monthlyTrend.map((item, index) => {
                    const barWidth = 80 / monthlyTrend.length;
                    const gap = 20 / (monthlyTrend.length + 1);
                    const x = gap + (index * (barWidth + gap));
                    const height = (item.amount / maxMonthlyAmount) * 100;
                    const y = 100 - height;
                    
                    return (
                      <rect
                        key={item.month}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={height}
                        fill="url(#barGradient)"
                        rx="1"
                      />
                    );
                  })}
                </svg>
              </div>
              
              {/* X-axis labels */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #2e2e2e'
              }}>
                {monthlyTrend.map((item, index) => (
                  <div 
                    key={item.month}
                    style={{ 
                      fontSize: '10px', 
                      color: '#9ca3af',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      textAlign: index === 0 ? 'left' : index === monthlyTrend.length - 1 ? 'right' : 'center',
                      flex: 1
                    }}
                  >
                    <div>{item.month}</div>
                    <div style={{ color: '#f2f2f2', fontSize: '9px', marginTop: '2px' }}>
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              color: '#6b7280', 
              fontSize: '12px',
              padding: '20px 0',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

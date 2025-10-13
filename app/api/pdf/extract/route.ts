import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    const fullPath = path.join(process.cwd(), filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const stats = fs.statSync(fullPath);

    let fullText = '';
    let pageCount = 0;

    try {
      // Use pdf2json for better Next.js compatibility
      const PDFParser = (await import('pdf2json')).default;
      
      const pdfParser = new PDFParser();
      
      // Create promise to handle async parsing
      const parsePDF = new Promise<string>((resolve, reject) => {
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          console.error('PDF parse error:', errData.parserError);
          reject(errData.parserError);
        });
        
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          try {
            // Extract text from all pages
            const pages = pdfData.Pages || [];
            const textParts: string[] = [];
            let pageNum = 0;
            
            pages.forEach((page: any) => {
              pageNum++;
              const texts = page.Texts || [];
              
              // Try multiple extraction methods
              texts.forEach((text: any) => {
                try {
                  // Method 1: Standard decoding
                  if (text.R && text.R[0] && text.R[0].T) {
                    const decoded = decodeURIComponent(text.R[0].T);
                    if (decoded.trim()) {
                      textParts.push(decoded);
                    }
                  }
                  
                  // Method 2: Try all R elements if multiple
                  if (text.R && text.R.length > 1) {
                    text.R.forEach((r: any) => {
                      if (r.T) {
                        const decoded = decodeURIComponent(r.T);
                        if (decoded.trim()) {
                          textParts.push(decoded);
                        }
                      }
                    });
                  }
                } catch (decodeErr) {
                  console.warn('Error decoding text:', decodeErr);
                  // Try raw text if decoding fails
                  if (text.R && text.R[0] && text.R[0].T) {
                    textParts.push(text.R[0].T);
                  }
                }
              });
            });
            
            const extractedText = textParts.join(' ');
            console.log(`Extracted ${textParts.length} text segments from ${pageNum} pages`);
            resolve(extractedText);
          } catch (err) {
            console.error('Error processing PDF data:', err);
            reject(err);
          }
        });
        
        pdfParser.parseBuffer(fs.readFileSync(fullPath));
      });

      fullText = await parsePDF;
      pageCount = 1;
      
      // If extraction resulted in very little text, log a warning
      if (fullText.length < 50) {
        console.warn(`Warning: Only extracted ${fullText.length} characters. PDF might have images or special encoding.`);
      } else {
        console.log('PDF text extracted successfully:', fullText.substring(0, 200) + '...');
      }
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError);
      // Return basic info if parsing fails
      const fileName = path.basename(filePath);
      fullText = `PDF File: ${fileName}\n\nSize: ${(stats.size / 1024).toFixed(2)} KB\n\nNote: This PDF could not be parsed. It may contain images, scanned content, or use an unsupported format. You can:\n- View the PDF visually in the preview above\n- Manually type key information for AI analysis\n- Try converting the PDF to text externally`;
      pageCount = 0;
    }
    
    // Extract invoice-specific data using regex patterns
    const invoiceData = extractInvoiceData(fullText);

    return NextResponse.json({
      success: true,
      text: fullText,
      invoiceData,
      pageCount
    });
  } catch (error) {
    console.error('Error extracting PDF:', error);
    return NextResponse.json(
      { error: 'Failed to extract PDF content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function extractInvoiceData(text: string) {
  console.log('=== EXTRACTING INVOICE DATA ===');
  console.log('Text to parse:', text);
  
  const data: any = {
    invoiceNumber: null,
    date: null,
    totalAmount: null,
    subtotal: null,
    tax: null,
    balanceDue: null,
    paid: null,
    lineItems: [],
    vendor: null,
    customer: null
  };

  // Extract invoice number (look for # followed by numbers)
  const invoiceNumMatch = text.match(/(?:invoice\s*#|invoice\s+number|inv\s*#)[\s:]*([A-Z0-9-]+)/i);
  if (invoiceNumMatch) {
    data.invoiceNumber = invoiceNumMatch[1];
    console.log('Found invoice number:', data.invoiceNumber);
  }

  // Extract date patterns
  const dateMatch = text.match(/(?:date|dated|invoice\s+date)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i);
  if (dateMatch) {
    data.date = dateMatch[1];
    console.log('Found date:', data.date);
  }

  // Extract SUBTOTAL - try multiple patterns
  let subtotalMatch = text.match(/subtotal[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  if (!subtotalMatch) {
    subtotalMatch = text.match(/sub-total[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  }
  if (subtotalMatch) {
    data.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
    console.log('Found subtotal:', data.subtotal);
  } else {
    console.log('No subtotal match found');
  }

  // Extract VAT/TAX - try multiple patterns
  let taxMatch = text.match(/vat[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  if (!taxMatch) {
    taxMatch = text.match(/tax[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  }
  if (taxMatch) {
    data.tax = parseFloat(taxMatch[1].replace(/,/g, ''));
    console.log('Found tax/vat:', data.tax);
  } else {
    console.log('No tax/vat match found');
  }

  // Extract TOTAL - try multiple patterns
  let totalMatch = text.match(/(?:^|\s)total[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/im);
  if (!totalMatch) {
    totalMatch = text.match(/amount\s+due[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  }
  if (totalMatch) {
    data.totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
    console.log('Found total:', data.totalAmount);
  } else {
    console.log('No total match found');
  }

  // Extract BALANCE DUE - try multiple patterns
  let balanceMatch = text.match(/balance\s+due[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  if (!balanceMatch) {
    balanceMatch = text.match(/balance[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  }
  if (balanceMatch) {
    data.balanceDue = parseFloat(balanceMatch[1].replace(/,/g, ''));
    console.log('Found balance due:', data.balanceDue);
  } else {
    console.log('No balance due match found');
  }

  // Extract PAID amount - try multiple patterns
  let paidMatch = text.match(/paid[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  if (!paidMatch) {
    paidMatch = text.match(/payment\s+received[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  }
  if (paidMatch) {
    data.paid = parseFloat(paidMatch[1].replace(/,/g, ''));
    console.log('Found paid:', data.paid);
  } else {
    console.log('No paid match found');
  }

  // Try to extract vendor/supplier name (usually at the top)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    // First few lines often contain vendor name
    data.vendor = lines.slice(0, 3).join(' ').substring(0, 100);
  }

  // Extract line items - look for description followed by amount
  const lineItemPattern = /^[\s]*([A-Za-z][A-Za-z\s]{2,40}?)\s+(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})\s*$/gm;
  const lineItems = [...text.matchAll(lineItemPattern)].map(match => ({
    description: match[1].trim(),
    amount: parseFloat(match[2].replace(/,/g, ''))
  }));

  if (lineItems.length > 0) {
    data.lineItems = lineItems;
  }

  return data;
}


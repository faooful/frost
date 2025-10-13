import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ receipts: [] });
    }

    const files = fs.readdirSync(dataDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    const receipts = [];

    for (const file of pdfFiles) {
      const filePath = `data/${file}`;
      const fullPath = path.join(process.cwd(), filePath);
      const stats = fs.statSync(fullPath);

      // Extract data from this PDF
      try {
        const PDFParser = (await import('pdf2json')).default;
        const pdfParser = new PDFParser();
        
        const pdfData = await new Promise<any>((resolve, reject) => {
          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(errData.parserError);
          });
          
          pdfParser.on('pdfParser_dataReady', (data: any) => {
            resolve(data);
          });
          
          pdfParser.parseBuffer(fs.readFileSync(fullPath));
        });

        // Extract text
        const pages = pdfData.Pages || [];
        const textParts: string[] = [];
        
        pages.forEach((page: any) => {
          const texts = page.Texts || [];
          texts.forEach((text: any) => {
            try {
              if (text.R && text.R[0] && text.R[0].T) {
                const decoded = decodeURIComponent(text.R[0].T);
                if (decoded.trim()) {
                  textParts.push(decoded);
                }
              }
            } catch (err) {
              // Skip problematic text
            }
          });
        });
        
        const fullText = textParts.join(' ');
        
        // Extract invoice data
        const invoiceData = extractInvoiceData(fullText);
        
        // Try AI extraction if regex found no items
        if (!invoiceData.lineItems || invoiceData.lineItems.length === 0) {
          try {
            // Call Ollama directly to avoid internal API calls
            const aiItems = await extractWithAI(fullText, invoiceData.invoiceNumber);
            if (aiItems && aiItems.length > 0) {
              invoiceData.lineItems = aiItems;
              console.log(`AI extracted ${aiItems.length} line items for ${file}`);
            }
          } catch (aiError) {
            console.warn(`AI extraction failed for ${file}:`, aiError);
          }
        }
        
        receipts.push({
          filename: file,
          filePath,
          invoiceData,
          extractedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
        // Add with minimal data if extraction fails
        receipts.push({
          filename: file,
          filePath,
          invoiceData: {
            invoiceNumber: null,
            totalAmount: null,
            lineItems: []
          },
          error: 'Failed to extract data'
        });
      }
    }

    return NextResponse.json({ receipts });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

function extractInvoiceData(text: string) {
  const data: any = {
    invoiceNumber: null,
    date: null,
    totalAmount: null,
    subtotal: null,
    tax: null,
    balanceDue: null,
    paid: null,
    lineItems: [],
    vendor: null
  };

  // Extract invoice number
  const invoiceNumMatch = text.match(/(?:invoice\s*#|invoice\s+number|inv\s*#|INV-)[\s:]*([A-Z0-9-]+)/i);
  if (invoiceNumMatch) {
    data.invoiceNumber = invoiceNumMatch[1];
  }

  // Extract date
  const dateMatch = text.match(/(?:date|dated|invoice\s+date)[\s:]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i);
  if (dateMatch) data.date = dateMatch[1];

  // Extract SUBTOTAL
  let subtotalMatch = text.match(/subtotal[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  if (subtotalMatch) {
    data.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
  }

  // Extract VAT/TAX
  let taxMatch = text.match(/(?:vat|tax)[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  if (taxMatch) {
    data.tax = parseFloat(taxMatch[1].replace(/,/g, ''));
  }

  // Extract TOTAL
  let totalMatch = text.match(/(?:^|\s)total[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/im);
  if (totalMatch) {
    data.totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
  }

  // Extract BALANCE DUE
  let balanceMatch = text.match(/balance\s+due[\s:]*(?:£|$|€)?\s*(\d+[,\d]*\.?\d{0,2})/i);
  if (balanceMatch) {
    data.balanceDue = parseFloat(balanceMatch[1].replace(/,/g, ''));
  }

  // For best accuracy, always use AI extraction for line items
  // Regex can miss complex formats, so we'll let this be handled by AI
  const lineItems: any[] = [];
  
  // Try basic regex first for simple formats only
  const pattern1 = /^[\s]*([A-Za-z&][A-Za-z\s&\-(),.']{5,70}?)\s+(\d+\.?\d{0,2})\s*$/gm;
  const matches1 = [...text.matchAll(pattern1)];
  
  matches1.forEach(match => {
    const desc = match[1].trim();
    const amt = parseFloat(match[2]);
    
    // Filter out headers and totals
    if (!desc.match(/^(description|quantity|unit price|subtotal|total|vat|tax|balance|paid|date|invoice|amount|gbp|due)/i) && 
        amt > 0 && 
        amt < 50000) {
      lineItems.push({ description: desc, amount: amt });
    }
  });

  console.log('Regex line items extracted:', lineItems.length);
  if (lineItems.length > 0) {
    data.lineItems = lineItems;
  }

  // Extract vendor from first few lines
  const lines = text.split(/\s+/).filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    data.vendor = lines.slice(0, 5).join(' ').substring(0, 100);
  }

  return data;
}

async function extractWithAI(text: string, invoiceNumber: string | null): Promise<any[]> {
  try {
    const prompt = `You are extracting line items from an invoice. Look for the itemized services or products with their prices.

IMPORTANT:
- Ignore headers like "Description", "Quantity", "Amount", "Unit Price"
- Ignore totals like "Subtotal", "VAT", "TOTAL", "Balance Due"
- Only extract actual line items with their individual prices
- Combine multi-line descriptions if they're part of one item
- Return ONLY valid JSON array, no other text

Invoice text:
${text}

Return this exact JSON format:
[
  {"description": "Service or product name", "amount": 50.00},
  {"description": "Another service", "amount": 25.00}
]

JSON array:`;

    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma2:27b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 1000
        }
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error('Ollama API failed');
    }

    const ollamaData = await ollamaResponse.json();
    let aiResponse = ollamaData.response;

    // Try to parse JSON from the response
    let lineItems = [];
    
    try {
      // Remove markdown code blocks if present
      aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON array in the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        lineItems = JSON.parse(jsonMatch[0]);
      } else {
        lineItems = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON');
      
      // Fallback: try to extract manually from text response
      const itemMatches = aiResponse.matchAll(/"description":\s*"([^"]+)",\s*"amount":\s*(\d+\.?\d*)/g);
      for (const match of itemMatches) {
        lineItems.push({
          description: match[1],
          amount: parseFloat(match[2])
        });
      }
    }

    return lineItems;
  } catch (error) {
    console.error('AI extraction error:', error);
    return [];
  }
}


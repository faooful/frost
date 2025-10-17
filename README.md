# Frost - PDF Receipt Analyzer

A local AI-powered tool for analyzing PDF receipts and invoices with intelligent data extraction and spending insights.

## Quick Start

### Prerequisites
1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai)
2. **Start Ollama**: `ollama serve`
3. **Install AI Model**: `ollama pull gemma2:27b`

### One-Command Setup
```bash
npm run ai
```
This starts the Next.js app and connects to your local AI model.

## Features

- **Minimal Dashboard**: Overview of total spend, category breakdown, and monthly trends
- **PDF Receipt Analysis**: 
  - Automatic text extraction from PDF invoices
  - AI-powered line item categorization (Maintenance, Appliance, License, etc.)
  - Invoice data extraction (amounts, dates, VAT, totals)
  - Support for multi-page PDFs
- **Smart Data Processing**: 
  - Consolidates line items across all receipts
  - Calculates totals, VAT, and category spending
  - Generates spending insights and trends
- **Local Processing**: Everything runs on your machine (no external APIs)
- **Clean Interface**: Modern dark theme with intuitive navigation

## How to Use

1. **Start the app**: `npm run ai`
2. **Open browser**: Go to http://localhost:3000
3. **Upload PDFs**: Drag and drop receipt PDFs into the file browser
4. **View dashboard**: See spending overview, categories, and trends
5. **Analyze receipts**: Click any PDF to view detailed invoice data
6. **Return to dashboard**: Click the × button to go back to overview

## Dashboard Features

The minimal dashboard shows:
- **Total Spend**: Grand total across all receipts with count
- **Category Breakdown**: Spending by category with progress bars and percentages
- **Monthly Trend**: Bar chart showing spending over time

## AI Analysis

The AI automatically:
- **Extracts invoice data**: Amounts, dates, VAT, line items
- **Categorizes expenses**: Maintenance, Appliance, License, Other
- **Validates data**: Ensures VAT and totals are correctly identified
- **Processes line items**: Individual expense breakdowns with amounts

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI Model**: Gemma2:27b (27.2B parameters) via Ollama
- **PDF Processing**: pdf2json for text extraction
- **Data Storage**: Local file system with JSON caching
- **Processing**: All analysis happens locally on your machine

## Development

### Manual Server Management
```bash
# Terminal 1: Start Ollama AI server
ollama serve

# Terminal 2: Start Next.js
npm run dev
```

### API Endpoints
- `GET /api/receipts/all` - Extract and analyze all PDF receipts
- `GET /api/receipts/cache` - Get cached analysis data
- `POST /api/files/upload` - Upload new PDF files
- `GET /api/pdf/extract` - Extract data from individual PDFs

## Project Structure

```
frost/
├── app/                    # Next.js app directory
│   ├── api/               # API routes for PDF processing
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── FileBrowser.tsx    # Main interface with dashboard
│   ├── DashboardPreview.tsx # Minimal dashboard component
│   ├── ReceiptPanel.tsx   # Receipt analysis display
│   └── PDFViewer.tsx      # PDF preview component
├── data/                  # Sample PDF receipts
└── analysis-cache/        # Cached AI analysis results
```

## Perfect For

- **Small business owners** tracking expenses
- **Freelancers** managing receipts and invoices
- **Anyone** wanting to analyze spending patterns from PDF receipts
- **Local-first** users who prefer privacy over cloud services

Your AI-powered receipt analyzer is ready to use! Upload your PDF receipts and get instant insights into your spending patterns.
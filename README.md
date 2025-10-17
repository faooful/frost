# Frost - PDF Receipt Analyzer

A local-first AI tool for analyzing PDF invoices and receipts. Extract line items, categorize expenses, and visualize spending patterns—all processed on your machine.

![Full View](public/preview/Full%20view.png)

## Quick Start

### Prerequisites
1. Install [Ollama](https://ollama.ai)
2. Start Ollama: `ollama serve`
3. Pull the model: `ollama pull gemma2:27b`

### Run
```bash
npm run ai
```

Open `http://localhost:3000` in your browser.

## Features

### Summary Dashboard
View spending insights at a glance: total spend, category breakdown with progress bars, and monthly trend visualization.

![Summary Dashboard](public/preview/summary%20dashboard.png)

### PDF Preview & Analysis
Upload invoices to extract key data including amounts, dates, VAT, and line items. The AI categorizes each expense automatically.

![PDF Preview](public/preview/pdf%20preview.png)

### AI-Powered Categorization
Line items are automatically labeled as Maintenance, Appliance, License, or Other. The system learns from invoice descriptions to classify expenses accurately.

![Generating Summary](public/preview/generating%20summary.png)

### Consolidated View
All line items from multiple invoices are aggregated with category tags. Click the menu to view detailed breakdowns in a unified table.

![Line Item Export](public/preview/line%20item%20export.png)

## How It Works

1. **Upload PDFs**: Drag and drop receipt files into the browser
2. **Extract Data**: PDF text is parsed to identify invoice details
3. **AI Analysis**: Ollama processes line items and assigns categories
4. **Cache Results**: Analyzed data is cached locally for instant reloading
5. **Visualize**: Dashboard shows spending trends and category breakdowns

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI**: Ollama with Gemma2:27b (local LLM)
- **PDF**: pdf2json for text extraction
- **Storage**: File-based caching with JSON

## API Endpoints

- `GET /api/receipts/all` - Analyze all PDFs
- `GET /api/receipts/cache` - Retrieve cached results
- `POST /api/files/upload` - Upload new PDFs
- `GET /api/pdf/extract` - Extract invoice data

## Development

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start Next.js
npm run dev
```

## Privacy First

All processing happens locally. No data leaves your machine. Your invoices, analysis results, and spending patterns remain private.

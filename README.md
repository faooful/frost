# Frost - AI-Powered File Browser

A modern Next.js application with intelligent file analysis capabilities.

## 🚀 Quick Start

### Prerequisites
1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai)
2. **Start Ollama**: `ollama serve`
3. **Install AI Model**: `ollama pull gemma2:27b`

### One-Command Setup
```bash
npm run ai
```
This starts the Next.js app and connects to your local AI model.

### Alternative Commands
```bash
# Using npm script
npm run ai-start

# Using direct script
./start-all.sh

# Manual setup (if needed)
npm install
./start-all.sh
```

## ✨ Features

- **📁 File Browser**: 3-column layout with file list, editor, and AI insights
- **✏️ File Editor**: Create, edit, rename, and save files
- **🤖 AI Analysis**: Intelligent content analysis with insights and suggestions
- **🔒 Local Processing**: Everything runs on your machine (no external APIs)
- **🎨 Modern UI**: Clean, responsive design with blue theme

## 🎯 How to Use

1. **Start the app**: `npm run ai`
2. **Open browser**: Go to http://localhost:3000
3. **Select a file**: Click any file in the left column
4. **View AI insights**: See analysis in the right column
5. **Edit files**: Use the middle column to create/edit files

## 🤖 AI Analysis Features

The AI analysis provides:
- **📋 Summary**: Brief overview of file content
- **🔑 Key Points**: Important observations about structure and purpose
- **💡 Insights**: Notable patterns, themes, and characteristics
- **💭 Suggestions**: Recommendations for improvement

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI Model**: Gemma2:27b (27.2B parameters) via Ollama
- **File System**: Local file operations with API endpoints
- **Processing**: All AI analysis happens locally on your machine

## 🔧 Development

### Manual Server Management
```bash
# Terminal 1: Start Ollama AI server
ollama serve

# Terminal 2: Start Next.js
npm run dev
```

### Testing AI Analysis
```bash
# Test through Next.js API (recommended)
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"content":"your content here","filename":"test.txt"}'

# Test Ollama directly
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma2:27b","prompt":"Analyze this content: your content here"}'
```

## 📁 Project Structure

```
frost/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── FileBrowser.tsx    # Main file browser
│   ├── FileEditor.tsx     # File editing component
│   └── InsightsPanel.tsx  # AI insights display
├── data/                  # Sample files
├── start-all.sh           # Unified startup script
└── package.json           # Node.js dependencies
```

## 🎉 Enjoy!

Your AI-powered file browser is ready to use! The system automatically handles all the complexity of running both the web app and AI analysis server together.
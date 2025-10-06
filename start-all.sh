#!/bin/bash

echo "🚀 Starting Frost File Browser with AI Analysis..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$NEXTJS_PID" ]; then
        kill $NEXTJS_PID 2>/dev/null
        echo "   ✅ Next.js server stopped"
    fi
    echo "   🏁 All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Check if Ollama is running
echo "🤖 Checking Ollama AI server..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   ❌ Ollama is not running. Please start it first:"
    echo "      ollama serve"
    echo "   Then run this script again."
    exit 1
fi

# Check if Gemma2:27b model is available
echo "🧠 Checking AI model..."
MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | grep -o 'gemma2:27b')
if [ -z "$MODELS" ]; then
    echo "   ❌ Gemma2:27b model not found. Please install it:"
    echo "      ollama pull gemma2:27b"
    echo "   Then run this script again."
    exit 1
fi
echo "   ✅ Gemma2:27b model is available"

# Install Node.js dependencies if needed
echo "📦 Checking Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    echo "   Installing Node.js dependencies..."
    npm install --silent
fi

# Start Next.js development server
echo "🌐 Starting Next.js File Browser..."
npm run dev &
NEXTJS_PID=$!

# Wait for Next.js server to start
echo "⏳ Waiting for Next.js server to initialize..."
for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "   ✅ Next.js server is running on port 3000"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "   ❌ Next.js server failed to start"
        cleanup
        exit 1
    fi
    sleep 2
done

# Test the AI integration
echo "🧪 Testing AI analysis integration..."
TEST_RESULT=$(curl -s -X POST http://localhost:3000/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"content":"test content","filename":"test.txt"}' 2>/dev/null)

if echo "$TEST_RESULT" | grep -q "summary"; then
    echo "   ✅ AI analysis integration working"
else
    echo "   ⚠️  AI analysis integration may have issues"
fi

echo ""
echo "🎉 Frost File Browser is ready!"
echo ""
echo "📱 Open your browser to: http://localhost:3000"
echo "🤖 AI Model: Gemma2:27b (via Ollama)"
echo ""
echo "Features:"
echo "   📁 File browser with 3-column layout"
echo "   ✏️  File editor with save/rename functionality"
echo "   🧠 Real AI-powered content analysis (27.2B parameters)"
echo "   🔒 All processing happens locally"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Keep the script running and show status
while true; do
    sleep 10
    # Check if Next.js is still running
    if ! kill -0 $NEXTJS_PID 2>/dev/null; then
        echo "❌ Next.js server stopped unexpectedly"
        cleanup
        exit 1
    fi
done

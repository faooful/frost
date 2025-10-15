import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { content, filename } = await request.json();

    if (!content || !filename) {
      return NextResponse.json(
        { error: 'Content and filename are required' },
        { status: 400 }
      );
    }

    // Try to use Ollama, fallback to mock if not available
    let analysis;
    try {
      analysis = await analyzeWithOllama(content, filename);
    } catch (error) {
      console.log('Ollama not available, using mock analysis:', error instanceof Error ? error.message : error);
      analysis = await analyzeWithMock(content, filename);
    }

    return NextResponse.json({
      insights: analysis.insights,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      suggestions: analysis.suggestions,
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}

async function analyzeWithOllama(content: string, filename: string) {
  const fileExtension = filename.split('.').pop()?.toLowerCase();
  const wordCount = content.split(/\s+/).length;
  
  // Create a focused prompt for summarization
  const prompt = `Analyze this ${fileExtension || 'text'} file and provide a concise summary:

File: ${filename}
Content: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Please provide:
1. A brief summary (1-2 sentences)
2. Key points (3-5 bullet points)
3. Any notable insights or patterns
4. Suggestions for improvement

Format as JSON:
{
  "summary": "brief summary here",
  "keyPoints": ["point1", "point2", "point3"],
  "insights": ["insight1", "insight2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  // Try to connect to Ollama
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3.1:8b', // or 'mistral:7b', 'gemma:7b'
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1000
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Try to parse the JSON response
  try {
    const analysis = JSON.parse(data.response);
    return analysis;
  } catch (parseError) {
    // If JSON parsing fails, extract information from text response
    const text = data.response;
    return {
      summary: extractSummary(text),
      keyPoints: extractKeyPoints(text),
      insights: extractInsights(text),
      suggestions: extractSuggestions(text)
    };
  }
}

async function analyzeWithMock(content: string, filename: string) {
  // Fallback mock analysis
  const fileExtension = filename.split('.').pop()?.toLowerCase();
  const wordCount = content.split(/\s+/).length;
  const lineCount = content.split('\n').length;

  return {
    summary: `This is a ${fileExtension || 'text'} file with ${wordCount} words and ${lineCount} lines.`,
    keyPoints: [
      `File: ${filename}`,
      `Words: ${wordCount}`,
      `Lines: ${lineCount}`,
      `Characters: ${content.length}`
    ],
    insights: [
      '📄 Basic text file analysis',
      '🔍 Content structure detected',
      '💡 Consider using Ollama for AI-powered insights'
    ],
    suggestions: [
      'Install Ollama for AI-powered analysis',
      'Add more structure to your content',
      'Consider using markdown formatting'
    ]
  };
}

// Helper functions to extract information from text responses
function extractSummary(text: string): string {
  const summaryMatch = text.match(/summary[:\s]*["']?([^"'\n]+)["']?/i);
  return summaryMatch ? summaryMatch[1].trim() : 'AI-generated summary not available';
}

function extractKeyPoints(text: string): string[] {
  const points = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
      points.push(line.replace(/^[-•*\d.\s]+/, '').trim());
    }
  }
  
  return points.length > 0 ? points : ['Key points not clearly formatted'];
}

function extractInsights(text: string): string[] {
  const insights = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.toLowerCase().includes('insight') || line.includes('💡') || line.includes('🔍')) {
      insights.push(line.trim());
    }
  }
  
  return insights.length > 0 ? insights : ['AI insights not clearly formatted'];
}

function extractSuggestions(text: string): string[] {
  const suggestions = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.toLowerCase().includes('suggest') || line.includes('💭') || line.includes('✅')) {
      suggestions.push(line.trim());
    }
  }
  
  return suggestions.length > 0 ? suggestions : ['AI suggestions not clearly formatted'];
}

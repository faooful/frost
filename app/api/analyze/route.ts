import { NextRequest, NextResponse } from 'next/server';
import { getCachedAnalysis, saveAnalysisToDisk } from '@/lib/serverCache';
import { generateFileHash } from '@/lib/analysisCache';

export async function POST(request: NextRequest) {
  try {
    const { content, filename, filePath, lastModified } = await request.json();

    if (!content || !filename) {
      return NextResponse.json(
        { error: 'Content and filename are required' },
        { status: 400 }
      );
    }

    // Check for cached analysis first
    if (filePath && lastModified) {
      const fileHash = generateFileHash(filePath, content, lastModified);
      const cachedAnalysis = getCachedAnalysis(fileHash);
      
      if (cachedAnalysis) {
        console.log('📋 Returning cached analysis for:', filename);
        return NextResponse.json({
          insights: cachedAnalysis.insights,
          summary: cachedAnalysis.summary,
          keyPoints: cachedAnalysis.keyPoints,
          suggestions: cachedAnalysis.suggestions,
          cached: true
        });
      }
    }

    // Use real Gemma2:27b model via Ollama
    const analysis = await analyzeWithOllama(content, filename);

    // Save to cache if we have file info
    if (filePath && lastModified) {
      const fileHash = generateFileHash(filePath, content, lastModified);
      saveAnalysisToDisk(fileHash, filePath, content.length, analysis);
    }

    return NextResponse.json({
      insights: analysis.insights,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      suggestions: analysis.suggestions,
      cached: false
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}


// Real Gemma2:27b integration using Ollama
async function analyzeWithOllama(content: string, filename: string) {
  const fileExtension = filename.split('.').pop()?.toLowerCase();
  
  // Create a focused prompt for real AI analysis
  const prompt = `Analyze this ${fileExtension || 'text'} file: ${filename}

Content: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Instructions:
- Produce 10 meaningful insights in as much detail as possible
- Find some logical disconnect with the real world today
- Speak as one of the world's best professors without referencing yourself

Format your response as:
SUMMARY: [your summary here]

KEY POINTS:
- [point 1]
- [point 2]
- [point 3]

INSIGHTS:
- [insight 1]
- [insight 2]

SUGGESTIONS:
- [suggestion 1]
- [suggestion 2]`;

  // Try to connect to Ollama with real Gemma2:27b model
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemma2:27b', // Real 27.2B parameter model
      prompt: prompt,
      stream: true, // Enable streaming for real progress
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

  // Process streaming response
  const data = await processStreamingResponse(response);
  
  // Try to parse the JSON response
  try {
    const analysis = JSON.parse(data.response);
    return analysis;
  } catch (parseError) {
    console.log('JSON parsing failed, attempting to extract from text response');
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

// Helper functions to extract information from text responses
function extractSummary(text: string): string {
  // Look for SUMMARY: pattern
  const summaryMatch = text.match(/SUMMARY:\s*([^\n]+)/i);
  if (summaryMatch && summaryMatch[1].trim().length > 5) {
    return summaryMatch[1].trim();
  }
  
  // Fallback: try other patterns
  const patterns = [
    /summary[:\s]*["']?([^"'\n]+)["']?/i,
    /summary[:\s]*([^"'\n]+)/i,
    /brief summary[:\s]*([^"'\n]+)/i,
    /overview[:\s]*([^"'\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].trim().length > 5) {
      return match[1].trim();
    }
  }
  
  // If no pattern matches, try to extract first meaningful sentence
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 0) {
    return sentences[0].trim() + '.';
  }
  
  return 'AI-generated summary not available';
}

function extractKeyPoints(text: string): string[] {
  const points = [];
  const lines = text.split('\n');
  let inKeyPointsSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if we're in the KEY POINTS section
    if (trimmed.toLowerCase().includes('key points:')) {
      inKeyPointsSection = true;
      continue;
    }
    
    // If we hit another section, stop collecting key points
    if (inKeyPointsSection && trimmed.match(/^[A-Z]+:/)) {
      break;
    }
    
    // Collect bullet points in the key points section
    if (inKeyPointsSection && trimmed.match(/^[-•*]\s/)) {
      const cleanPoint = trimmed.replace(/^[-•*\s]+/, '').trim();
      if (cleanPoint.length > 5) {
        points.push(cleanPoint);
      }
    }
  }
  
  return points.length > 0 ? points.slice(0, 5) : ['Key points not clearly formatted'];
}

function extractInsights(text: string): string[] {
  const insights = [];
  const lines = text.split('\n');
  let inInsightsSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if we're in the INSIGHTS section
    if (trimmed.toLowerCase().includes('insights:')) {
      inInsightsSection = true;
      continue;
    }
    
    // If we hit another section, stop collecting insights
    if (inInsightsSection && trimmed.match(/^[A-Z]+:/)) {
      break;
    }
    
    // Collect bullet points in the insights section
    if (inInsightsSection && trimmed.match(/^[-•*]\s/)) {
      const cleanInsight = trimmed.replace(/^[-•*\s]+/, '').trim();
      if (cleanInsight.length > 5) {
        insights.push(cleanInsight);
      }
    }
  }
  
  return insights.length > 0 ? insights.slice(0, 3) : ['AI insights not clearly formatted'];
}

function extractSuggestions(text: string): string[] {
  const suggestions = [];
  const lines = text.split('\n');
  let inSuggestionsSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if we're in the SUGGESTIONS section
    if (trimmed.toLowerCase().includes('suggestions:')) {
      inSuggestionsSection = true;
      continue;
    }
    
    // If we hit another section, stop collecting suggestions
    if (inSuggestionsSection && trimmed.match(/^[A-Z]+:/)) {
      break;
    }
    
    // Collect bullet points in the suggestions section
    if (inSuggestionsSection && trimmed.match(/^[-•*]\s/)) {
      const cleanSuggestion = trimmed.replace(/^[-•*\s]+/, '').trim();
      if (cleanSuggestion.length > 5) {
        suggestions.push(cleanSuggestion);
      }
    }
  }
  
  return suggestions.length > 0 ? suggestions.slice(0, 3) : ['AI suggestions not clearly formatted'];
}

// Process streaming response from Ollama
async function processStreamingResponse(response: Response): Promise<{ response: string }> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  let fullResponse = '';
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
            }
            if (data.done) {
              break;
            }
          } catch (e) {
            // Skip malformed JSON lines
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { response: fullResponse };
}

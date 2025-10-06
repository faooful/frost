import { NextRequest, NextResponse } from 'next/server';
import { getCachedAnalysis, saveAnalysisToDisk } from '@/lib/serverCache';
import { generateFileHash } from '@/lib/analysisCache';

export async function POST(request: NextRequest) {
  try {
    const { content, filename, filePath, lastModified, instructions } = await request.json();
    console.log('API received instructions:', instructions);

    if (!content || !filename) {
      return NextResponse.json(
        { error: 'Content and filename are required' },
        { status: 400 }
      );
    }

    // Check for cached analysis first (include instructions in cache key)
    if (filePath && lastModified) {
      const instructionsHash = instructions ? Buffer.from(instructions).toString('base64').slice(0, 8) : 'default';
      const fileHash = generateFileHash(filePath, content, lastModified) + '_' + instructionsHash;
      const cachedAnalysis = getCachedAnalysis(fileHash);
      
      if (cachedAnalysis) {
        console.log('📋 Returning cached analysis for:', filename, 'with instructions:', instructions?.slice(0, 50) + '...');
        return NextResponse.json({
          insights: cachedAnalysis.insights,
          summary: cachedAnalysis.summary,
          keyPoints: cachedAnalysis.keyPoints,
          suggestions: cachedAnalysis.suggestions,
          cached: true
        });
      }
    }

    // Create a readable stream for real-time progress
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const analysis = await analyzeWithOllamaStreaming(content, filename, controller, instructions);
          
          // Save to cache if we have file info (include instructions in cache key)
          if (filePath && lastModified) {
            const instructionsHash = instructions ? Buffer.from(instructions).toString('base64').slice(0, 8) : 'default';
            const fileHash = generateFileHash(filePath, content, lastModified) + '_' + instructionsHash;
            saveAnalysisToDisk(fileHash, filePath, content.length, analysis, instructions);
          }

          // Send final result
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'complete',
            analysis: analysis
          })}\n\n`));
          
          controller.close();
        } catch (error) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Analysis failed'
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in streaming analysis:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze content' },
      { status: 500 }
    );
  }
}

// Real Gemma2:27b integration with streaming progress
async function analyzeWithOllamaStreaming(
  content: string, 
  filename: string, 
  controller: ReadableStreamDefaultController,
  customInstructions?: string
) {
  const fileExtension = filename.split('.').pop()?.toLowerCase();
  
  // Create a focused prompt for real AI analysis
  const defaultInstructions = `Produce 10 meaningful insights in as much detail as possible
Find some logical disconnect with the real world today
Speak as one of the world's best professors without referencing yourself`;
  
  const instructionsToUse = customInstructions && customInstructions.trim() 
    ? customInstructions 
    : defaultInstructions;

  console.log('Custom instructions received:', customInstructions);
  console.log('Instructions to use:', instructionsToUse);

  const prompt = `Analyze this ${fileExtension || 'text'} file: ${filename}

Content: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Instructions:
${instructionsToUse}

Please respond in whatever format best fits your instructions above.`;

  // Send initial progress
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
    type: 'progress',
    progress: 10,
    message: 'Starting AI analysis...'
  })}\n\n`));

  // Try to connect to Ollama with real Gemma2:27b model
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemma2:27b',
      prompt: prompt,
      stream: true,
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

  // Send progress update
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
    type: 'progress',
    progress: 30,
    message: 'AI model processing...'
  })}\n\n`));

  // Process streaming response
  const fullResponse = await processStreamingResponseWithProgress(response, controller);
  
  console.log('Full AI response:', fullResponse);
  
  // Send progress update
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
    type: 'progress',
    progress: 90,
    message: 'Processing analysis results...'
  })}\n\n`));

  // Try to parse the JSON response
  try {
    const analysis = JSON.parse(fullResponse);
    console.log('Parsed JSON analysis:', analysis);
    return analysis;
  } catch (parseError) {
    console.log('JSON parsing failed, processing raw response');
    console.log('Parse error:', parseError);
    
    // Process the raw response to extract meaningful sections
    const processed = processRawResponse(fullResponse);
    console.log('Processed analysis:', processed);
    return processed;
  }
}

// Process streaming response with progress updates
async function processStreamingResponseWithProgress(
  response: Response, 
  controller: ReadableStreamDefaultController
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  let fullResponse = '';
  const decoder = new TextDecoder();
  let progress = 30;

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
              // Update progress based on response length
              progress = Math.min(85, 30 + (fullResponse.length / 20));
              
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                type: 'progress',
                progress: Math.round(progress),
                message: `Processing... (${fullResponse.length} characters)`
              })}\n\n`));
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

  return fullResponse;
}

// Process raw response to extract meaningful sections
function processRawResponse(response: string) {
  // Clean up the response
  const cleaned = response.trim();
  
  // Try to extract structured sections if they exist
  const summaryMatch = cleaned.match(/(?:summary|SUMMARY)[:\s]*([^\n]+)/i);
  const keyPointsMatch = cleaned.match(/(?:key points|KEY POINTS)[:\s]*([\s\S]*?)(?=\n(?:insights|INSIGHTS|suggestions|SUGGESTIONS)|$)/i);
  const insightsMatch = cleaned.match(/(?:insights|INSIGHTS)[:\s]*([\s\S]*?)(?=\n(?:suggestions|SUGGESTIONS)|$)/i);
  const suggestionsMatch = cleaned.match(/(?:suggestions|SUGGESTIONS)[:\s]*([\s\S]*?)$/i);
  
  // Extract key points from various formats
  const keyPoints: string[] = [];
  if (keyPointsMatch) {
    const keyPointsText = keyPointsMatch[1];
    // Split by bullet points, numbers, or dashes
    const points = keyPointsText.split(/\n\s*[-•*]\s*|\n\s*\d+\.\s*|\n\s*-\s*/)
      .map(point => point.trim())
      .filter(point => point.length > 10);
    keyPoints.push(...points);
  }
  
  // Extract insights
  const insights: string[] = [];
  if (insightsMatch) {
    const insightsText = insightsMatch[1];
    const insightPoints = insightsText.split(/\n\s*[-•*]\s*|\n\s*\d+\.\s*|\n\s*-\s*/)
      .map(insight => insight.trim())
      .filter(insight => insight.length > 10);
    insights.push(...insightPoints);
  }
  
  // Extract suggestions
  const suggestions: string[] = [];
  if (suggestionsMatch) {
    const suggestionsText = suggestionsMatch[1];
    const suggestionPoints = suggestionsText.split(/\n\s*[-•*]\s*|\n\s*\d+\.\s*|\n\s*-\s*/)
      .map(suggestion => suggestion.trim())
      .filter(suggestion => suggestion.length > 10);
    suggestions.push(...suggestionPoints);
  }
  
  // If we found structured content, use it
  if (summaryMatch || keyPoints.length > 0 || insights.length > 0 || suggestions.length > 0) {
    return {
      summary: summaryMatch ? summaryMatch[1].trim() : cleaned.substring(0, 200) + (cleaned.length > 200 ? '...' : ''),
      keyPoints: keyPoints,
      insights: insights,
      suggestions: suggestions
    };
  }
  
  // If it's a poem or creative content, format it nicely
  if (cleaned.includes('\n') && (cleaned.includes('##') || cleaned.match(/^[A-Z][^.!?]*[.!?]\s*$/m))) {
    return {
      summary: 'Creative analysis provided',
      keyPoints: [],
      insights: [cleaned],
      suggestions: []
    };
  }
  
  // For other unstructured content, try to break it into paragraphs
  const paragraphs = cleaned.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  
  return {
    summary: paragraphs[0]?.substring(0, 200) + (paragraphs[0]?.length > 200 ? '...' : '') || cleaned.substring(0, 200) + '...',
    keyPoints: paragraphs.slice(1, 4), // First few paragraphs as key points
    insights: paragraphs.slice(4, 7), // Next few as insights
    suggestions: paragraphs.slice(7, 10) // Rest as suggestions
  };
}

// Helper functions (same as before)
function extractSummary(text: string): string {
  const summaryMatch = text.match(/SUMMARY:\s*([^\n]+)/i);
  if (summaryMatch && summaryMatch[1].trim().length > 5) {
    return summaryMatch[1].trim();
  }
  
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
    
    if (trimmed.toLowerCase().includes('key points:')) {
      inKeyPointsSection = true;
      continue;
    }
    
    if (inKeyPointsSection && trimmed.match(/^[A-Z]+:/)) {
      break;
    }
    
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
    
    if (trimmed.toLowerCase().includes('insights:')) {
      inInsightsSection = true;
      continue;
    }
    
    if (inInsightsSection && trimmed.match(/^[A-Z]+:/)) {
      break;
    }
    
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
    
    if (trimmed.toLowerCase().includes('suggestions:')) {
      inSuggestionsSection = true;
      continue;
    }
    
    if (inSuggestionsSection && trimmed.match(/^[A-Z]+:/)) {
      break;
    }
    
    if (inSuggestionsSection && trimmed.match(/^[-•*]\s/)) {
      const cleanSuggestion = trimmed.replace(/^[-•*\s]+/, '').trim();
      if (cleanSuggestion.length > 5) {
        suggestions.push(cleanSuggestion);
      }
    }
  }
  
  return suggestions.length > 0 ? suggestions.slice(0, 3) : ['AI suggestions not clearly formatted'];
}


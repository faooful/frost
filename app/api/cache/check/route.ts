import { NextRequest, NextResponse } from 'next/server';
import { getCachedAnalysis } from '@/lib/serverCache';
import { generateFileHash } from '@/lib/analysisCache';

export async function POST(request: NextRequest) {
  try {
    const { content, filename, filePath, lastModified } = await request.json();

    if (!content || !filename || !filePath || !lastModified) {
      return NextResponse.json(
        { error: 'Content, filename, filePath, and lastModified are required' },
        { status: 400 }
      );
    }

    // Check for cached analysis
    const fileHash = generateFileHash(filePath, content, lastModified);
    const cachedAnalysis = getCachedAnalysis(fileHash);
    
    if (cachedAnalysis) {
      console.log('📋 Found cached analysis for:', filename);
      return NextResponse.json({
        cached: true,
        analysis: {
          insights: cachedAnalysis.insights,
          summary: cachedAnalysis.summary,
          keyPoints: cachedAnalysis.keyPoints,
          suggestions: cachedAnalysis.suggestions,
        }
      });
    } else {
      console.log('📋 No cached analysis found for:', filename);
      return NextResponse.json({
        cached: false
      });
    }
  } catch (error: any) {
    console.error('Error checking cache:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check cache' },
      { status: 500 }
    );
  }
}


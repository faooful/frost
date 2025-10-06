import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { analysisId } = await request.json();
    
    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    const cacheDir = path.join(process.cwd(), '.analysis-cache');
    const filePath = path.join(cacheDir, `${analysisId}.json`);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Delete the specific cache file
    fs.unlinkSync(filePath);

    console.log(`Deleted cache file: ${analysisId}.json`);

    return NextResponse.json({
      success: true,
      message: 'Analysis cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing specific analysis:', error);
    return NextResponse.json(
      { error: 'Failed to clear analysis' },
      { status: 500 }
    );
  }
}

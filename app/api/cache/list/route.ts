import { NextRequest, NextResponse } from 'next/server';
import { getCachedAnalysis, generateFileHash } from '@/lib/analysisCache';
import fs from 'fs';
import path from 'path';

// Extract instructions from the file hash
function extractInstructionsFromHash(filename: string): string {
  try {
    // The hash format is: base64(filePath + content + lastModified) + '_' + base64(instructions)
    const parts = filename.split('_');
    if (parts.length > 1) {
      const instructionsBase64 = parts[1];
      const instructions = Buffer.from(instructionsBase64, 'base64').toString('utf-8');
      return instructions || 'Default instructions';
    }
  } catch (e) {
    // If we can't decode, return a default
  }
  return 'Default instructions';
}

export async function POST(request: NextRequest) {
  try {
    const { filename, filePath, content, lastModified } = await request.json();

    console.log('=== Cache List API Called ===');
    console.log('Requested filename:', filename);
    console.log('Requested filePath:', filePath);

    if (!filename || !filePath) {
      return NextResponse.json(
        { error: 'Filename and filePath are required' },
        { status: 400 }
      );
    }

    // Get all cached analyses for this file
    const cacheDir = path.join(process.cwd(), 'analysis-cache');
    const cachedAnalyses = [];

    try {
      const files = fs.readdirSync(cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const cacheFilePath = path.join(cacheDir, file);
            const data = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
            
            // Check if this cache entry is for our file
            const isMatch = (data.filePath === filePath);
            
            console.log(`Checking cache file ${file}:`, {
              dataFilePath: data.filePath,
              requestedFilePath: filePath,
              isMatch
            });
            
            if (isMatch && data.analysis) {
              // Extract instructions from the file hash or use a default
              const instructions = data.instructions || extractInstructionsFromHash(file) || 'Default instructions';
              
              cachedAnalyses.push({
                id: file.replace('.json', ''),
                instructions: instructions,
                summary: data.analysis?.summary || 'No summary',
                timestamp: data.timestamp || new Date().toISOString(),
                analysis: data.analysis
              });
            }
          } catch (e) {
            // Skip malformed cache files
            continue;
          }
        }
      }
    } catch (error) {
      console.log('No cache directory found or error reading cache');
    }

    // Sort by timestamp (newest first)
    cachedAnalyses.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log(`Found ${cachedAnalyses.length} cached analyses for ${filename}:`, cachedAnalyses.map(a => a.instructions));
    console.log('Returning analyses:', cachedAnalyses);

    return NextResponse.json({
      analyses: cachedAnalyses
    });

  } catch (error) {
    console.error('Error listing cached analyses:', error);
    return NextResponse.json(
      { error: 'Failed to list cached analyses' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cacheDir = path.join(process.cwd(), '.analysis-cache');
    
    if (!fs.existsSync(cacheDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(cacheDir);
    const analyses = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(cacheDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const cacheContent = JSON.parse(content);
          
          analyses.push({
            id: file.replace('.json', ''),
            instructions: cacheContent.instructions,
            summary: cacheContent.summary,
            timestamp: cacheContent.timestamp,
            filePath: cacheContent.filePath,
            analysis: cacheContent.analysis
          });
        } catch (error) {
          console.error(`Error reading cache file ${file}:`, error);
        }
      }
    }

    // Sort by timestamp (newest first)
    analyses.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Error fetching all analyses:', error);
    return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
  }
}

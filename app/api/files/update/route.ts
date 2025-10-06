import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function PUT(request: NextRequest) {
  try {
    const { filePath, content } = await request.json();
    
    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: 'File path and content are required' },
        { status: 400 }
      );
    }

    const fullPath = path.join(process.cwd(), filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Write the updated content
    fs.writeFileSync(fullPath, content, 'utf-8');
    
    // Get updated file stats
    const stats = fs.statSync(fullPath);
    
    return NextResponse.json({
      success: true,
      file: {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        extension: path.extname(filePath).toLowerCase(),
        lastModified: stats.mtime.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}

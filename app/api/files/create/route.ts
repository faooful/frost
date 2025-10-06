import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { filename, content = '', filePath, folder = 'data' } = await request.json();
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Use filePath if provided, otherwise construct from folder and filename
    let fullPath;
    if (filePath) {
      // Validate filePath to prevent directory traversal
      const sanitizedPath = path.normalize(filePath);
      if (sanitizedPath.includes('..') || sanitizedPath.startsWith('/')) {
        return NextResponse.json(
          { error: 'Invalid file path' },
          { status: 400 }
        );
      }
      fullPath = path.join(process.cwd(), sanitizedPath);
    } else {
      // Validate filename to prevent directory traversal
      const sanitizedFilename = path.basename(filename);
      if (sanitizedFilename !== filename) {
        return NextResponse.json(
          { error: 'Invalid filename' },
          { status: 400 }
        );
      }
      fullPath = path.join(process.cwd(), folder, sanitizedFilename);
    }
    
    // Check if file already exists
    if (fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'File already exists' },
        { status: 409 }
      );
    }

    // Ensure the directory exists
    const dirPath = path.dirname(fullPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(fullPath, content, 'utf-8');
    
    // Get file stats
    const stats = fs.statSync(fullPath);
    
    // Get the relative path for the response
    const relativePath = filePath || path.join(folder, path.basename(fullPath));
    const fileName = path.basename(fullPath);
    
    return NextResponse.json({
      success: true,
      file: {
        name: fileName,
        path: relativePath,
        size: stats.size,
        extension: path.extname(fileName).toLowerCase(),
        lastModified: stats.mtime.toISOString(),
      }
    });
  } catch (error) {
    console.error('Error creating file:', error);
    return NextResponse.json(
      { error: 'Failed to create file' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getFilesFromFolder } from '@/lib/fileUtils';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'data';
    
    const files = await getFilesFromFolder(folder);
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error in files API:', error);
    return NextResponse.json(
      { error: 'Failed to read files' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath } = body;
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }
    
    // The filePath from the frontend already includes the folder prefix (e.g., "data/filename")
    // So we need to resolve it directly against the project root
    const fullPath = path.join(process.cwd(), filePath);
    
    // Security check: ensure the file path is within the data directory
    const dataDir = path.join(process.cwd(), 'data');
    if (!fullPath.startsWith(dataDir)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Delete associated analysis cache files
    const cacheDir = path.join(process.cwd(), '.analysis-cache');
    if (fs.existsSync(cacheDir)) {
      const cacheFiles = fs.readdirSync(cacheDir);
      let deletedCacheCount = 0;
      
      console.log(`Looking for cache files to delete for file: ${filePath}`);
      
      for (const cacheFile of cacheFiles) {
        if (cacheFile.endsWith('.json')) {
          try {
            const cacheFilePath = path.join(cacheDir, cacheFile);
            const cacheContent = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
            
            console.log(`Checking cache file ${cacheFile}: filePath=${cacheContent.filePath}, target=${filePath}`);
            
            // Check if this cache file is associated with the file being deleted
            if (cacheContent.filePath === filePath) {
              fs.unlinkSync(cacheFilePath);
              deletedCacheCount++;
              console.log(`✅ Deleted cache file: ${cacheFile}`);
            }
          } catch (cacheError) {
            console.error(`Error processing cache file ${cacheFile}:`, cacheError);
          }
        }
      }
      
      console.log(`Deleted ${deletedCacheCount} cache files for file: ${filePath}`);
    }
    
    // Delete the file
    fs.unlinkSync(fullPath);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

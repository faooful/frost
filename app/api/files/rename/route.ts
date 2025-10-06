import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function PUT(request: NextRequest) {
  try {
    const { oldPath, newName, content } = await request.json();
    
    if (!oldPath || !newName) {
      return NextResponse.json(
        { error: 'Missing oldPath or newName' },
        { status: 400 }
      );
    }

    // Validate the new filename
    if (newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const oldFilePath = path.join(process.cwd(), oldPath);
    const newFilePath = path.join(path.dirname(oldFilePath), newName);

    // Check if old file exists
    if (!fs.existsSync(oldFilePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check if new file already exists
    if (fs.existsSync(newFilePath)) {
      return NextResponse.json(
        { error: 'File with this name already exists' },
        { status: 409 }
      );
    }

    // Use provided content or read from old file
    const fileContent = content !== undefined ? content : fs.readFileSync(oldFilePath, 'utf8');
    
    // Write to new location
    fs.writeFileSync(newFilePath, fileContent);
    
    // Delete old file
    fs.unlinkSync(oldFilePath);

    // Update associated AI analysis cache files
    try {
      const cacheDir = path.join(process.cwd(), '.analysis-cache');
      if (fs.existsSync(cacheDir)) {
        const cacheFiles = fs.readdirSync(cacheDir);
        let updatedCacheCount = 0;
        
        console.log(`Looking for cache files to update for renamed file: ${oldPath} -> ${path.relative(process.cwd(), newFilePath)}`);
        
        for (const cacheFile of cacheFiles) {
          if (cacheFile.endsWith('.json')) {
            try {
              const cacheFilePath = path.join(cacheDir, cacheFile);
              const cacheContent = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
              
              console.log(`Checking cache file ${cacheFile}: filePath=${cacheContent.filePath}, oldPath=${oldPath}`);
              
              // Check if this cache file is associated with the renamed file
              if (cacheContent.filePath === oldPath) {
                // Update the filePath in the cache content
                cacheContent.filePath = path.relative(process.cwd(), newFilePath);
                
                // Write the updated cache content back to file
                fs.writeFileSync(cacheFilePath, JSON.stringify(cacheContent, null, 2));
                updatedCacheCount++;
                console.log(`✅ Updated cache file: ${cacheFile} with new path: ${cacheContent.filePath}`);
              }
            } catch (cacheError) {
              console.error(`Error processing cache file ${cacheFile}:`, cacheError);
            }
          }
        }
        
        console.log(`Updated ${updatedCacheCount} cache files for renamed file: ${oldPath} -> ${path.relative(process.cwd(), newFilePath)}`);
      }
    } catch (error) {
      console.warn('Error updating cache files:', error);
      // Don't fail the main rename operation if cache update fails
    }

    // Get file stats for the new file
    const stats = fs.statSync(newFilePath);
    
    const file = {
      name: newName,
      path: path.relative(process.cwd(), newFilePath),
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      content: fileContent
    };

    return NextResponse.json({ file });
  } catch (error) {
    console.error('Error renaming file:', error);
    return NextResponse.json(
      { error: 'Failed to rename file' },
      { status: 500 }
    );
  }
}

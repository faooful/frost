import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderPath = formData.get('folderPath') as string;

    console.log('Upload request received:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      folderPath 
    });

    if (!file) {
      console.error('No file provided');
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!folderPath) {
      console.error('No folder path provided');
      return NextResponse.json({ success: false, error: 'No folder path provided' }, { status: 400 });
    }

    // Convert relative path to absolute path
    const absoluteFolderPath = path.resolve(process.cwd(), folderPath);
    console.log('Resolved folder path:', absoluteFolderPath);

    // Ensure the folder exists
    if (!fs.existsSync(absoluteFolderPath)) {
      console.log('Creating folder:', absoluteFolderPath);
      fs.mkdirSync(absoluteFolderPath, { recursive: true });
    }

    // Create the file path
    const filePath = path.join(absoluteFolderPath, file.name);
    console.log('File will be saved to:', filePath);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: false, 
        error: `File "${file.name}" already exists` 
      }, { status: 409 });
    }

    // Convert file to buffer and write to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    fs.writeFileSync(filePath, buffer);

    // Get file stats
    const stats = fs.statSync(filePath);
    
    const fileInfo = {
      name: file.name,
      path: filePath,
      lastModified: stats.mtime.getTime(),
      size: stats.size,
      extension: path.extname(file.name)
    };

    console.log('File uploaded successfully:', fileInfo);

    return NextResponse.json({ 
      success: true, 
      file: fileInfo,
      message: `File "${file.name}" uploaded successfully`
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

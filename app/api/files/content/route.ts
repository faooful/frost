import { NextRequest, NextResponse } from 'next/server';
import { getFileContent } from '@/lib/fileUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }
    
    const content = await getFileContent(filePath);
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error in file content API:', error);
    return NextResponse.json(
      { error: 'Failed to read file content' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { clearServerCache } from '@/lib/serverCache';

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    
    if (filePath) {
      clearServerCache(filePath);
    } else {
      clearServerCache();
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

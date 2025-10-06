import { NextResponse } from 'next/server';
import { getServerCacheStats } from '@/lib/serverCache';

export async function GET() {
  try {
    const stats = getServerCacheStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

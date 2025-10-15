import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = 'analysis-cache';
const RECEIPTS_CACHE_FILE = path.join(CACHE_DIR, 'receipts.json');

// GET - Retrieve cached receipt data
export async function GET() {
  try {
    // Check if cache file exists
    if (!fs.existsSync(RECEIPTS_CACHE_FILE)) {
      return NextResponse.json({ 
        success: false, 
        message: 'No cached receipt data found',
        data: null 
      });
    }

    // Read and parse cache file
    const cacheData = JSON.parse(fs.readFileSync(RECEIPTS_CACHE_FILE, 'utf-8'));
    
    return NextResponse.json({ 
      success: true, 
      data: cacheData 
    });
  } catch (error) {
    console.error('Error reading receipt cache:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// POST - Save receipt data to cache
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Add timestamp to cache data
    const cacheData = {
      ...body,
      cachedAt: new Date().toISOString(),
    };

    // Write to cache file
    fs.writeFileSync(RECEIPTS_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf-8');
    
    console.log('Receipt cache saved successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Receipt data cached successfully' 
    });
  } catch (error) {
    console.error('Error saving receipt cache:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}


import fs from 'fs';
import path from 'path';
import { AnalysisResult, CachedAnalysis } from './analysisCache';

// Cache directory
const CACHE_DIR = path.join(process.cwd(), '.analysis-cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Load cache from disk on startup
function loadCacheFromDisk(): Map<string, CachedAnalysis> {
  const cache = new Map<string, CachedAnalysis>();
  
  try {
    const cacheFiles = fs.readdirSync(CACHE_DIR).filter(file => file.endsWith('.json'));
    
    for (const file of cacheFiles) {
      const filePath = path.join(CACHE_DIR, file);
      const data = fs.readFileSync(filePath, 'utf8');
      const cached: CachedAnalysis = JSON.parse(data);
      
      // Check if cache is still valid (not expired)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - cached.timestamp < maxAge) {
        cache.set(cached.fileHash, cached);
      } else {
        // Remove expired cache file
        fs.unlinkSync(filePath);
      }
    }
    
    console.log(`📁 Loaded ${cache.size} cached analyses from disk`);
  } catch (error) {
    console.error('Error loading cache from disk:', error);
  }
  
  return cache;
}

// Global cache instance
let serverCache = loadCacheFromDisk();

export function getCachedAnalysis(fileHash: string): AnalysisResult | null {
  const cached = serverCache.get(fileHash);
  
  if (cached) {
    // Check if the analysis is still valid (not too old)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - cached.timestamp < maxAge) {
      console.log('📋 Using cached analysis from disk');
      return cached.analysis;
    } else {
      console.log('⏰ Cached analysis expired');
      serverCache.delete(fileHash);
      // Remove expired file
      try {
        const cacheFilePath = path.join(CACHE_DIR, `${fileHash}.json`);
        if (fs.existsSync(cacheFilePath)) {
          fs.unlinkSync(cacheFilePath);
        }
      } catch (error) {
        console.error('Error removing expired cache file:', error);
      }
    }
  }
  
  return null;
}

export function saveAnalysisToDisk(
  fileHash: string,
  filePath: string,
  contentLength: number,
  analysis: AnalysisResult,
  instructions?: string
): void {
  const cached: CachedAnalysis = {
    analysis,
    fileHash,
    timestamp: Date.now(),
    filePath,
    contentLength,
    instructions
  };
  
  // Save to memory cache
  serverCache.set(fileHash, cached);
  
  // Save to disk
  try {
    const cacheFilePath = path.join(CACHE_DIR, `${fileHash}.json`);
    fs.writeFileSync(cacheFilePath, JSON.stringify(cached, null, 2));
    console.log('💾 Analysis cached to disk');
  } catch (error) {
    console.error('Error saving cache to disk:', error);
  }
}

export function clearServerCache(filePath?: string): void {
  if (filePath) {
    // Clear specific file's cache
    for (const [key, cached] of serverCache.entries()) {
      if (cached.filePath === filePath) {
        serverCache.delete(key);
        // Remove from disk
        try {
          const cacheFilePath = path.join(CACHE_DIR, `${cached.fileHash}.json`);
          if (fs.existsSync(cacheFilePath)) {
            fs.unlinkSync(cacheFilePath);
          }
        } catch (error) {
          console.error('Error removing cache file:', error);
        }
        console.log('🗑️ Cleared cache for:', filePath);
      }
    }
  } else {
    // Clear all cache
    serverCache.clear();
    
    // Remove all cache files from disk
    try {
      const cacheFiles = fs.readdirSync(CACHE_DIR).filter(file => file.endsWith('.json'));
      for (const file of cacheFiles) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
    } catch (error) {
      console.error('Error clearing cache files:', error);
    }
    
    console.log('🗑️ Cleared all analysis cache');
  }
}

export function getServerCacheStats(): { totalCached: number; diskSize: number } {
  let diskSize = 0;
  
  try {
    const cacheFiles = fs.readdirSync(CACHE_DIR).filter(file => file.endsWith('.json'));
    for (const file of cacheFiles) {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      diskSize += stats.size;
    }
  } catch (error) {
    console.error('Error calculating disk size:', error);
  }
  
  return {
    totalCached: serverCache.size,
    diskSize
  };
}


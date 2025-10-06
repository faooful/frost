import { FileInfo } from './clientUtils';

export interface AnalysisResult {
  insights: string[];
  summary: string;
  keyPoints: string[];
  suggestions: string[];
}

export interface CachedAnalysis {
  analysis: AnalysisResult;
  fileHash: string;
  timestamp: number;
  filePath: string;
  contentLength: number;
  instructions?: string;
}

// In-memory cache for quick access (client-side only)
const analysisCache = new Map<string, CachedAnalysis>();

export function generateFileHash(filePath: string, content: string, lastModified: string): string {
  // Create a hash based on file path, content, and last modified time
  const data = `${filePath}:${content.length}:${lastModified}`;
  return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
}

export function getCachedAnalysis(file: FileInfo, content: string): AnalysisResult | null {
  const fileHash = generateFileHash(file.path, content, file.lastModified);
  const cached = analysisCache.get(fileHash);
  
  if (cached && cached.filePath === file.path) {
    // Check if the analysis is still valid (not too old)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - cached.timestamp < maxAge) {
      console.log('📋 Using cached analysis for:', file.name);
      return cached.analysis;
    } else {
      console.log('⏰ Cached analysis expired for:', file.name);
      analysisCache.delete(fileHash);
    }
  }
  
  return null;
}

export function saveAnalysisToCache(
  file: FileInfo, 
  content: string, 
  analysis: AnalysisResult,
  instructions?: string
): void {
  const fileHash = generateFileHash(file.path, content, file.lastModified);
  
  const cached: CachedAnalysis = {
    analysis,
    fileHash,
    timestamp: Date.now(),
    filePath: file.path,
    contentLength: content.length,
    instructions
  };
  
  // Save to memory cache
  analysisCache.set(fileHash, cached);
  console.log('💾 Analysis cached for:', file.name);
}

export function clearAnalysisCache(filePath?: string): void {
  if (filePath) {
    // Clear specific file's cache
    for (const [key, cached] of analysisCache.entries()) {
      if (cached.filePath === filePath) {
        analysisCache.delete(key);
        console.log('🗑️ Cleared cache for:', filePath);
      }
    }
  } else {
    // Clear all cache
    analysisCache.clear();
    console.log('🗑️ Cleared all analysis cache');
  }
}

export function getCacheStats(): { totalCached: number; cacheSize: number } {
  return {
    totalCached: analysisCache.size,
    cacheSize: JSON.stringify(Array.from(analysisCache.entries())).length
  };
}

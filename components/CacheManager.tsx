'use client';

import { useState, useEffect } from 'react';

interface CacheManagerProps {
  onCacheCleared?: () => void;
  onClearSpecificAnalysis?: (analysisId: string) => void;
  currentAnalysisId?: string | null;
  showSpecificClear?: boolean;
  currentAnalysisSize?: number;
  totalCachedForFile?: number;
}

export function CacheManager({ onCacheCleared, onClearSpecificAnalysis, currentAnalysisId, showSpecificClear, currentAnalysisSize, totalCachedForFile }: CacheManagerProps) {
  const [stats, setStats] = useState({ totalCached: 0, diskSize: 0 });
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    updateStats();
  }, []);

  const updateStats = async () => {
    try {
      const response = await fetch('/api/cache/stats');
      if (response.ok) {
        const currentStats = await response.json();
        setStats(currentStats);
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    
    try {
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        await updateStats();
        onCacheCleared?.();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      // Show success message briefly
      setTimeout(() => {
        setIsClearing(false);
      }, 1000);
    }
  };

  const handleClearSpecificAnalysis = async () => {
    if (!currentAnalysisId || !onClearSpecificAnalysis) return;
    
    setIsClearing(true);
    
    try {
      onClearSpecificAnalysis(currentAnalysisId);
    } catch (error) {
      console.error('Error clearing specific analysis:', error);
    } finally {
      // Show success message briefly
      setTimeout(() => {
        setIsClearing(false);
      }, 1000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Only show cache info if we have a specific analysis selected
  if (!currentAnalysisId || !currentAnalysisSize) {
    return null; // Don't show anything if no specific analysis is selected
  }

  return (
    <div className="flex items-center space-x-4  font-medium">
      <div className="text-blue-300">
        {formatBytes(currentAnalysisSize)} on disk
      </div>
      {showSpecificClear && currentAnalysisId ? (
        <button
          onClick={handleClearSpecificAnalysis}
          disabled={isClearing}
          className="px-2 py-1 text-white rounded transition-colors duration-200"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#171717' }}
        >
          {isClearing ? 'Clearing...' : 'Clear'}
        </button>
      ) : (
        <button
          onClick={handleClearCache}
          disabled={isClearing}
          className="px-2 py-1 text-white rounded transition-colors duration-200"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#171717' }}
        >
          {isClearing ? 'Clearing...' : 'Clear'}
        </button>
      )}
    </div>
  );
}

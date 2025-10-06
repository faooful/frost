'use client';

import { useState, useEffect } from 'react';
import { FileInfo } from '@/lib/clientUtils';
import { getCachedAnalysis, saveAnalysisToCache, AnalysisResult } from '@/lib/analysisCache';
import ReactMarkdown from 'react-markdown';
import { DeleteConfirmationPanel } from './DeleteConfirmationPanel';


interface InsightsPanelProps {
  selectedFile: FileInfo | null;
  fileContent: string;
  onAnalysisComplete?: (analysis: AnalysisResult) => void;
  onCacheCleared?: () => void;
  onAnalysisInfoChange?: (info: { totalCachedForFile: number; currentAnalysisSize: number; currentAnalysisId: string | null }) => void;
  onCachedAnalysesChange?: (analyses: CachedAnalysis[]) => void;
  onTabClick?: (analysisId: string) => void;
  activeAnalysisId?: string | null;
  isExpanded?: boolean;
  onAnalysisStateChange?: (isAnalyzing: boolean) => void;
}

interface EditableInstructionsProps {
  instructions: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onInstructionChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
}

function EditableInstructions({
  instructions,
  isEditing,
  onToggleEdit,
  onInstructionChange,
  onSave,
  onReset
}: EditableInstructionsProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          backgroundColor: 'oklch(27.8% .033 256.848)', 
          border: '1px solid #171717', 
          padding: '12px', 
          borderRadius: '4px' 
        }}>
        <div>
          <h2 style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '11px', color: 'rgb(166, 166, 166)', fontWeight: 'normal', margin: '0 0 4px 0' }}>PROMPT</h2>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={instructions}
              onChange={(e) => onInstructionChange(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm resize-none"
              style={{ 
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                backgroundColor: '#171717',
                color: 'white',
                border: '1px solid #15269E'
              }}
              placeholder="Enter your analysis instructions..."
              rows={6}
            />
            <div className="flex space-x-2">
              <button
                onClick={onSave}
                className="px-3 py-1 text-white text-xs rounded transition-colors duration-200"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#171717' }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="text-blue-100 leading-relaxed whitespace-pre-line" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#F2F2F2' }}>
            {instructions}
          </div>
        )}
      </div>
    </div>
  );
}

// Generate the actual prompt sent to the AI
function generateActualPrompt(filename: string, content: string, instructions: string): string {
  const fileExtension = filename.split('.').pop()?.toLowerCase();
  
  return `Analyze this ${fileExtension || 'text'} file: ${filename}

Content: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Instructions:
${instructions}

Format your response as:
SUMMARY: [your summary here]

KEY POINTS:
- [point 1]
- [point 2]
- [point 3]

INSIGHTS:
- [insight 1]
- [insight 2]

SUGGESTIONS:
- [suggestion 1]
- [suggestion 2]`;
}

interface CachedAnalysis {
  id: string;
  instructions: string;
  summary: string;
  timestamp: string;
  analysis: AnalysisResult;
}

export function InsightsPanel({ selectedFile, fileContent, onAnalysisComplete, onCacheCleared, onAnalysisInfoChange, onCachedAnalysesChange, activeAnalysisId, onTabClick, isExpanded = false, onAnalysisStateChange }: InsightsPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [instructions, setInstructions] = useState(`Produce 10 meaningful insights in as much detail as possible
Find some logical disconnect with the real world today
Speak as one of the world's best professors without referencing yourself`);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [cachedAnalyses, setCachedAnalyses] = useState<CachedAnalysis[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [currentAnalysisInstructions, setCurrentAnalysisInstructions] = useState<string>('');
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [draftInstructions, setDraftInstructions] = useState<string>('');
  const [isNewAnalysisMode, setIsNewAnalysisMode] = useState(false);
  const [newAnalysisInstructions, setNewAnalysisInstructions] = useState('');
  const [isCompletingNewAnalysis, setIsCompletingNewAnalysis] = useState(false);
  const [hasNewAnalysis, setHasNewAnalysis] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [isSelectedTextAnalysis, setIsSelectedTextAnalysis] = useState(false);
  const [analyzedText, setAnalyzedText] = useState<string>('');
  const [isDirectAnalysis, setIsDirectAnalysis] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleDeleteAnalysis = () => {
    console.log('=== Delete Analysis Called ===');
    console.log('Active tab:', activeTab);
    console.log('onCacheCleared available:', !!onCacheCleared);
    
    // Delete the current analysis
    if (activeTab) {
      console.log('Deleting analysis with ID:', activeTab);
      
      // Clear the specific analysis from cache
      fetch('/api/cache/clear-specific', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId: activeTab
        }),
      }).then(response => {
        console.log('Delete API response:', response.status);
        if (response.ok) {
          console.log('Analysis deleted successfully');
          // Reload the cached analyses to update the UI
          loadCachedAnalysesWithoutSettingActive();
          if (onCacheCleared) {
            onCacheCleared();
          }
          setShowDeleteConfirmation(false);
          
          // Clear current analysis if this was the active one
          setAnalysis(null);
          setActiveTab(null);
          setCurrentAnalysisInstructions('');
        } else {
          console.error('Delete API returned error:', response.status);
        }
      }).catch(error => {
        console.error('Error deleting analysis:', error);
      });
    } else {
      console.error('No active tab to delete');
    }
  };

  // Debug isNewAnalysisMode changes
  useEffect(() => {
    console.log('isNewAnalysisMode changed to:', isNewAnalysisMode);
  }, [isNewAnalysisMode]);

  // Debug isAnalyzing changes and notify parent
  useEffect(() => {
    console.log('isAnalyzing changed to:', isAnalyzing);
    if (onAnalysisStateChange) {
      onAnalysisStateChange(isAnalyzing);
    }
  }, [isAnalyzing, onAnalysisStateChange]);

  // Debug analysis changes
  useEffect(() => {
    console.log('analysis changed to:', analysis);
    console.log('cachedAnalyses length:', cachedAnalyses.length);
    console.log('activeTab:', activeTab);
    console.log('isAnalyzing:', isAnalyzing);
    console.log('isCompletingNewAnalysis:', isCompletingNewAnalysis);
    console.log('hasNewAnalysis:', hasNewAnalysis);
  }, [analysis, cachedAnalyses, activeTab, isAnalyzing, isCompletingNewAnalysis, hasNewAnalysis]);

  // Debug isCompletingNewAnalysis changes
  useEffect(() => {
    console.log('isCompletingNewAnalysis changed to:', isCompletingNewAnalysis);
  }, [isCompletingNewAnalysis]);

  // Debug hasNewAnalysis changes
  useEffect(() => {
    console.log('hasNewAnalysis changed to:', hasNewAnalysis);
  }, [hasNewAnalysis]);

  // Get unique prompts from all cached analyses
  const getUniquePrompts = () => {
    const prompts = new Set<string>();
    cachedAnalyses.forEach(analysis => {
      if (analysis.instructions && analysis.instructions.trim()) {
        prompts.add(analysis.instructions.trim());
      }
    });
    return Array.from(prompts);
  };

  // Calculate current analysis size and notify parent
  const notifyAnalysisInfo = () => {
    if (onAnalysisInfoChange) {
      // Only send info if we have an active analysis tab
      if (activeTab && analysis) {
        const currentAnalysisSize = JSON.stringify(analysis).length;
        onAnalysisInfoChange({
          totalCachedForFile: cachedAnalyses.length,
          currentAnalysisSize: currentAnalysisSize,
          currentAnalysisId: activeTab
        });
      } else {
        // Clear the info when no analysis is selected
        onAnalysisInfoChange({
          totalCachedForFile: 0,
          currentAnalysisSize: 0,
          currentAnalysisId: null
        });
      }
    }
  };

  const handleInstructionChange = (value: string) => {
    console.log('Instruction changed to:', value);
    if (isDraftMode) {
      setDraftInstructions(value);
    } else {
      setInstructions(value);
    }
  };

  const saveInstructions = () => {
    if (isDraftMode) {
      // In draft mode, save the draft instructions and exit edit mode
      setInstructions(draftInstructions);
      setIsEditingInstructions(false);
    } else {
      setIsEditingInstructions(false);
    }
  };

  const resetInstructions = () => {
    if (isDraftMode) {
      // In draft mode, reset to original instructions
      setDraftInstructions(instructions);
    } else {
      setInstructions(`Produce 10 meaningful insights in as much detail as possible
Find some logical disconnect with the real world today
Speak as one of the world's best professors without referencing yourself`);
    }
  };

  const clearSpecificAnalysis = async (analysisId: string) => {
    try {
      const response = await fetch('/api/cache/clear-specific', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysisId }),
      });

      if (response.ok) {
        // Reload cached analyses to update the list
        await loadCachedAnalyses();
        // Clear current analysis if it was the one being deleted
        if (activeTab === analysisId) {
          setAnalysis(null);
          setActiveTab(null);
        }
      }
    } catch (error) {
      console.error('Error clearing specific analysis:', error);
    }
  };

  const loadCachedAnalyses = async () => {
    if (!selectedFile) return;

    console.log('=== Loading cached analyses ===');
    console.log('selectedFile:', selectedFile);
    console.log('filePath being sent:', selectedFile.path);

    try {
      const response = await fetch('/api/cache/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          filePath: selectedFile.path,
          content: fileContent,
          lastModified: selectedFile.lastModified,
        }),
      });

      console.log('API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('=== Received cached analyses ===');
        console.log('Raw response data:', data);
        console.log('Number of analyses:', data.analyses?.length);
        console.log('Analyses:', data.analyses);
        setCachedAnalyses(data.analyses || []);
        
        // Set the first analysis as active if available
        if (data.analyses && data.analyses.length > 0) {
          console.log('Setting first analysis as active:', data.analyses[0].id);
          console.log('Analysis data:', data.analyses[0].analysis);
          setActiveTab(data.analyses[0].id);
          // Notify parent component to set activeAnalysisId
          if (onTabClick) {
            onTabClick(data.analyses[0].id);
          }
          setAnalysis(data.analyses[0].analysis);
          setCurrentAnalysisInstructions(data.analyses[0].instructions || 'Default instructions');
          console.log('Analysis set to:', data.analyses[0].analysis);
        } else {
          console.log('No cached analyses, clearing current analysis');
          // No cached analyses, clear the current analysis
          setAnalysis(null);
          setActiveTab(null);
          setCurrentAnalysisInstructions('');
        }
      } else {
        console.error('API response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading cached analyses:', error);
    }
  };

  const loadCachedAnalysesWithoutSettingActive = async () => {
    if (!selectedFile) return;

    try {
      const response = await fetch('/api/cache/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          filePath: selectedFile.path,
          content: fileContent,
          lastModified: selectedFile.lastModified,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('=== Reloading cached analyses (without setting active) ===');
        console.log('Number of analyses:', data.analyses?.length);
        setCachedAnalyses(data.analyses || []);
        
        // If no analyses left, clear the current analysis
        if (!data.analyses || data.analyses.length === 0) {
          setAnalysis(null);
          setActiveTab(null);
          setCurrentAnalysisInstructions('');
        } else if (!isDirectAnalysis && data.analyses?.length > 0 && !activeTab) {
          console.log('Setting first analysis as active:', data.analyses[0].id);
          setActiveTab(data.analyses[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading cached analyses:', error);
    }
  };

  useEffect(() => {
    // Reset analysis when file changes (but not during analysis, when completing new analysis, or when we have a new analysis)
    if (!isAnalyzing && !isCompletingNewAnalysis && !hasNewAnalysis) {
    setProgress(0);
    setEta('');
    setStartTime(null);
    
      // Load cached analyses for tabs
    if (selectedFile && fileContent) {
        // Load cached analyses immediately - no need to clear first
        loadCachedAnalyses();
    } else {
      setAnalysis(null);
      setError('');
        setCachedAnalyses([]);
        setActiveTab(null);
      }
    }
  }, [selectedFile, fileContent, isAnalyzing, isCompletingNewAnalysis, hasNewAnalysis]);

  // Listen for new analysis requests
  useEffect(() => {
    const handleNewAnalysis = (event: CustomEvent) => {
      console.log('=== handleNewAnalysis called ===');
      console.log('selectedFile:', selectedFile);
      console.log('fileContent length:', fileContent?.length);
      console.log('isNewAnalysisMode before:', isNewAnalysisMode);
      console.log('Event detail:', event.detail);
      
      if (selectedFile && fileContent) {
        console.log('Entering new analysis mode');
        
        // Check if this is a selected text analysis
        const isSelectedText = event.detail?.isSelectedTextAnalysis || false;
        const selectedTextToAnalyze = event.detail?.selectedText || '';
        const customInstructions = event.detail?.instructions || instructions;
        
        console.log('Is selected text analysis:', isSelectedText);
        console.log('Selected text:', selectedTextToAnalyze);
        console.log('Custom instructions:', customInstructions);
        
        // Set selected text analysis state
        setIsSelectedTextAnalysis(isSelectedText);
        setSelectedText(selectedTextToAnalyze);
        
        // Enter new analysis mode
        setAnalysis(null);
        setActiveTab(null);
        setCurrentAnalysisInstructions('');
        setError('');
        setProgress(0);
        setEta('');
        setStartTime(null);
        setIsDraftMode(false);
        setIsNewAnalysisMode(true);
        setNewAnalysisInstructions(customInstructions); // Use custom instructions if provided
        setIsEditingInstructions(false); // Don't auto-enter edit mode
        console.log('New analysis mode state set to true');
      } else {
        console.log('Cannot enter new analysis mode - missing selectedFile or fileContent');
      }
    };

    const handleDirectAnalysis = (event: CustomEvent) => {
      console.log('=== InsightsPanel: handleDirectAnalysis called ===');
      console.log('InsightsPanel: selectedFile:', selectedFile);
      console.log('InsightsPanel: fileContent length:', fileContent?.length);
      console.log('InsightsPanel: Event detail:', event.detail);
      
      if (selectedFile && fileContent) {
        const instructionsToUse = event.detail?.instructions || instructions;
        console.log('Starting direct analysis with instructions:', instructionsToUse);
        
        // Create a skeleton tab for the new analysis IMMEDIATELY
        const newAnalysisId = 'new-analysis-' + Date.now();
        setActiveTab(newAnalysisId);
        setCurrentAnalysisInstructions(instructionsToUse);
        
        // Set the instructions and prepare for direct analysis
        setInstructions(instructionsToUse);
        setIsSelectedTextAnalysis(false);
        setSelectedText('');
        setIsDirectAnalysis(true); // Mark this as a direct analysis
        setAnalysis(null); // Clear any existing analysis
        setError(''); // Clear any errors
        setIsAnalyzing(true); // Set analyzing state to true
        
        // Set the new analysis instructions and trigger analysis
        setNewAnalysisInstructions(instructionsToUse);
        // Don't set isNewAnalysisMode to true for direct analysis - we want to bypass the old UI
        setIsCompletingNewAnalysis(true);
        
        // Call direct analysis immediately - no setTimeout needed
        console.log('About to call direct analysis with instructions:', instructionsToUse);
        const directAnalyzeContent = async () => {
            console.log('=== Direct analyzeContent called! ===');
            console.log('selectedFile:', selectedFile);
            console.log('fileContent length:', fileContent?.length);
            
            if (!selectedFile || !fileContent) {
              console.log('Missing selectedFile or fileContent, returning early');
              return;
            }

            console.log('Sending instructions to API:', instructionsToUse);
            
            // Set analyzing state
            setIsAnalyzing(true);
            setError('');
            setProgress(0);
            setStartTime(Date.now());
            setEta('Calculating...');

            try {
              const response = await fetch('/api/analyze-stream', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: fileContent,
                  filename: selectedFile.name,
                  filePath: selectedFile.path,
                  lastModified: selectedFile.lastModified,
                  instructions: instructionsToUse,
                }),
              });
              
              console.log('Response status:', response.status);
              console.log('Response ok:', response.ok);

              if (!response.ok) {
                throw new Error('Failed to analyze content');
              }

              const reader = response.body?.getReader();
              if (!reader) {
                throw new Error('No response body');
              }

              console.log('Starting to read stream...');
              const decoder = new TextDecoder();
              let analysisData = null;

              while (true) {
                const { done, value } = await reader.read();
                console.log('Stream chunk received, done:', done);
                
                if (done) {
                  console.log('Stream finished');
                  break;
                }

                const chunk = decoder.decode(value);
                console.log('Decoded chunk:', chunk);
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.trim() === '') continue;
                  
                  let jsonData = null;
                  
                  if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    try {
                      jsonData = JSON.parse(jsonStr);
                    } catch (e) {
                      console.error('Error parsing SSE JSON:', e, 'Line:', line);
                      continue;
                    }
                  } else if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
                    try {
                      jsonData = JSON.parse(line.trim());
                    } catch (e) {
                      console.error('Error parsing direct JSON:', e, 'Line:', line);
                      continue;
                    }
                  }
                  
                  if (jsonData) {
                    console.log('Parsed data:', jsonData);
                    
                    if (jsonData.type === 'progress') {
                      console.log('Progress update:', jsonData.progress, jsonData.message);
                      setProgress(jsonData.progress);
                      setEta(jsonData.message);
                    } else if (jsonData.type === 'complete') {
                      console.log('Analysis complete:', jsonData.analysis);
                      analysisData = jsonData.analysis;
                      setAnalysis(analysisData);
                      
                      // Save to cache
                      if (selectedFile) {
                        saveAnalysisToCache(selectedFile, fileContent, analysisData, instructionsToUse);
                      }
                      
                      // Switch to the new analysis tab
                      const newAnalysisId = btoa(`${selectedFile.path}:${instructionsToUse}`);
                      console.log('Switching to new analysis tab:', newAnalysisId);
                      setActiveTab(newAnalysisId);
                      onTabClick?.(newAnalysisId);
                      
                      onAnalysisComplete?.(analysisData);
                    } else if (jsonData.type === 'error') {
                      console.error('Stream error:', jsonData.error);
                      throw new Error(jsonData.error);
                    } else if (jsonData.insights || jsonData.summary) {
                      // Handle direct analysis response
                      console.log('Direct analysis response received:', jsonData);
                      analysisData = jsonData;
                      setAnalysis(analysisData);
                      
                      // Save to cache
                      if (selectedFile) {
                        saveAnalysisToCache(selectedFile, fileContent, analysisData, instructionsToUse);
                      }
                      
                      // Switch to the new analysis tab
                      const newAnalysisId = btoa(`${selectedFile.path}:${instructionsToUse}`);
                      console.log('Switching to new analysis tab:', newAnalysisId);
                      setActiveTab(newAnalysisId);
                      onTabClick?.(newAnalysisId);
                      
                      // Prevent other systems from overriding our tab selection
                      setIsCompletingNewAnalysis(true);
                      setHasNewAnalysis(true);
                    }
                  }
                }
              }
              
              setIsAnalyzing(false);
              setIsDirectAnalysis(false);
              setIsCompletingNewAnalysis(false);
              setHasNewAnalysis(false);
            } catch (error) {
              console.error('Error during analysis:', error);
              setError(error instanceof Error ? error.message : 'Failed to analyze content');
              setIsAnalyzing(false);
              setIsDirectAnalysis(false);
              setIsCompletingNewAnalysis(false);
              setHasNewAnalysis(false);
            }
        };
        
        directAnalyzeContent();
      } else {
        console.log('Cannot start direct analysis - missing selectedFile or fileContent');
      }
    };

    window.addEventListener('startNewAnalysis', handleNewAnalysis as EventListener);
    window.addEventListener('startDirectAnalysis', handleDirectAnalysis as EventListener);
    return () => {
      window.removeEventListener('startNewAnalysis', handleNewAnalysis as EventListener);
      window.removeEventListener('startDirectAnalysis', handleDirectAnalysis as EventListener);
    };
  }, [selectedFile, fileContent, instructions]);


  // Notify parent about analysis info changes
  useEffect(() => {
    notifyAnalysisInfo();
  }, [analysis, cachedAnalyses, activeTab]);

  // Notify parent about cached analyses changes
  useEffect(() => {
    if (onCachedAnalysesChange) {
      onCachedAnalysesChange(cachedAnalyses);
    }
  }, [cachedAnalyses, onCachedAnalysesChange]);

  // Load specific analysis when activeAnalysisId changes
  useEffect(() => {
    if (activeAnalysisId && cachedAnalyses.length > 0) {
      const selectedAnalysis = cachedAnalyses.find(cached => cached.id === activeAnalysisId);
      if (selectedAnalysis) {
        console.log('Loading analysis for active tab:', activeAnalysisId);
        setAnalysis(selectedAnalysis.analysis);
        setCurrentAnalysisInstructions(selectedAnalysis.instructions || 'Default instructions');
        setError('');
      }
    }
  }, [activeAnalysisId, cachedAnalyses]);

  const checkForCachedAnalysis = async () => {
    if (!selectedFile || !fileContent) {
      console.log('No file or content for cache check');
      return;
    }

    console.log('Checking cache for:', selectedFile.name, 'Content length:', fileContent.length);

    // First check client-side cache
    const clientCached = getCachedAnalysis(selectedFile, fileContent);
    if (clientCached) {
      console.log('Found in client cache');
      setAnalysis(clientCached);
      setError('');
      return;
    }

    console.log('Not in client cache, checking server cache');

    // If not in client cache, check server cache without running analysis
    try {
      const response = await fetch('/api/cache/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: fileContent,
          filename: selectedFile.name,
          filePath: selectedFile.path,
          lastModified: selectedFile.lastModified,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Server cache check result:', data.cached);
        if (data.cached && data.analysis) {
          // Server returned cached data, save to client cache and display
          console.log('Found in server cache, displaying analysis');
          setAnalysis(data.analysis);
          saveAnalysisToCache(selectedFile, fileContent, data.analysis);
          setError('');
        } else {
          // No cache found, show ready to analyze
          console.log('No cache found, ready to analyze');
          setAnalysis(null);
          setError('');
        }
      } else {
        console.log('Server error:', response.status);
        setAnalysis(null);
        setError('');
      }
    } catch (error) {
      console.error('Error checking server cache:', error);
      setAnalysis(null);
      setError('');
    }
  };

  const analyzeContent = async () => {
    console.log('=== analyzeContent called! ===');
    console.log('selectedFile:', selectedFile);
    console.log('fileContent length:', fileContent?.length);
    console.log('isNewAnalysisMode:', isNewAnalysisMode);
    console.log('newAnalysisInstructions:', newAnalysisInstructions);
    console.log('isAnalyzing:', isAnalyzing);
    
    if (!selectedFile || !fileContent) {
      console.log('Missing selectedFile or fileContent, returning early');
      return;
    }

    // Determine which instructions to use
    const instructionsToUse = isDirectAnalysis ? newAnalysisInstructions : 
                             isNewAnalysisMode ? newAnalysisInstructions : 
                             instructions;
    
    console.log('Instructions to use:', instructionsToUse);
    console.log('isDirectAnalysis:', isDirectAnalysis);
    
    // Exit new analysis mode when starting analysis (but not for direct analysis)
    if (isNewAnalysisMode && !isDirectAnalysis) {
      console.log('Exiting new analysis mode');
      setIsNewAnalysisMode(false);
      setInstructions(newAnalysisInstructions); // Use the new analysis instructions
    }
    
    // Reset selected text analysis state
    setIsSelectedTextAnalysis(false);
    setSelectedText('');
    setIsAnalyzing(true);
    setError('');
    setProgress(0);
    setStartTime(Date.now());
    setEta('Calculating...');

    try {
      // Use selected text if this is a selected text analysis, otherwise use full file content
      const contentToAnalyze = isSelectedTextAnalysis ? selectedText : fileContent;
      
      // Store the analyzed text for display purposes
      setAnalyzedText(contentToAnalyze);
      
      console.log('Sending instructions to API:', instructionsToUse);
      console.log('Is selected text analysis:', isSelectedTextAnalysis);
      console.log('Content to analyze length:', contentToAnalyze?.length);
      console.log('Request body:', {
        content: contentToAnalyze?.substring(0, 100) + '...',
        filename: selectedFile.name,
        filePath: selectedFile.path,
        lastModified: selectedFile.lastModified,
        instructions: instructionsToUse,
      });
      
      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentToAnalyze,
          filename: selectedFile.name,
          filePath: selectedFile.path,
          lastModified: selectedFile.lastModified,
          instructions: instructionsToUse,
        }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        throw new Error('Failed to analyze content');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      console.log('Starting to read stream...');
      const decoder = new TextDecoder();
      let analysisData = null;

      while (true) {
        const { done, value } = await reader.read();
        console.log('Stream chunk received, done:', done);
        
        if (done) {
          console.log('Stream finished');
          break;
        }

        const chunk = decoder.decode(value);
        console.log('Decoded chunk:', chunk);
        const lines = chunk.split('\n');

        for (const line of lines) {
          console.log('Processing line:', line);
          
          // Handle both SSE format (data: {...}) and direct JSON format
          let jsonData = null;
          if (line.startsWith('data: ')) {
            try {
              jsonData = JSON.parse(line.slice(6));
            } catch (e) {
              console.error('Error parsing SSE JSON:', e, 'Line:', line);
              continue;
            }
          } else if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
            // Direct JSON response
            try {
              jsonData = JSON.parse(line.trim());
            } catch (e) {
              console.error('Error parsing direct JSON:', e, 'Line:', line);
              continue;
            }
          }
          
          if (jsonData) {
            console.log('Parsed data:', jsonData);
            
            if (jsonData.type === 'progress') {
              console.log('Progress update:', jsonData.progress, jsonData.message);
              setProgress(jsonData.progress);
              setEta(jsonData.message);
            } else if (jsonData.type === 'complete') {
              console.log('Analysis complete:', jsonData.analysis);
              analysisData = jsonData.analysis;
                setAnalysis(analysisData);
                
                // Save to cache (client-side for immediate access)
                if (selectedFile) {
                saveAnalysisToCache(selectedFile, fileContent, analysisData, instructionsToUse);
                }
              
              // Reload cached analyses to include the new one (without overriding current analysis)
              loadCachedAnalysesWithoutSettingActive();
                
                onAnalysisComplete?.(analysisData);
            } else if (jsonData.type === 'error') {
              console.error('Stream error:', jsonData.error);
              throw new Error(jsonData.error);
            } else if (jsonData.insights || jsonData.summary) {
              // Handle direct analysis response (not wrapped in type)
              console.log('Direct analysis response received:', jsonData);
              analysisData = jsonData;
              setAnalysis(analysisData);
              
              // Set flags to prevent cache loading from overriding this analysis
              setIsCompletingNewAnalysis(true);
              setHasNewAnalysis(true);
              
              // Save to cache (client-side for immediate access)
              if (selectedFile) {
                saveAnalysisToCache(selectedFile, fileContent, analysisData, instructionsToUse);
              }
              
              // Reload cached analyses and set the new one as active
              loadCachedAnalysesWithoutSettingActive();
              
              // For direct analysis, switch to the newly created analysis
              if (isDirectAnalysis) {
                setTimeout(() => {
                  if (selectedFile && fileContent) {
                    const newAnalysisId = btoa(`${selectedFile.path}:${instructionsToUse}`);
                    console.log('Switching to new analysis tab:', newAnalysisId);
                    setActiveTab(newAnalysisId);
                    onTabClick?.(newAnalysisId);
                    setIsDirectAnalysis(false); // Reset the flag
                  }
                }, 200);
              }
              
              // Clear the flags after a delay
              setTimeout(() => {
                setIsCompletingNewAnalysis(false);
                setHasNewAnalysis(false);
              }, 5000);
              
              onAnalysisComplete?.(analysisData);
            }
          }
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setProgress(100);
      setEta('Complete!');
      setIsAnalyzing(false);
      
      // Reset progress after a moment
      setTimeout(() => {
        setProgress(0);
        setEta('');
      }, 2000);
    }
  };

  if (!selectedFile) {
    return (
      <div className="h-full flex flex-col analysis-content">
        <EditableInstructions
          instructions={instructions}
          isEditing={isEditingInstructions}
          onToggleEdit={() => setIsEditingInstructions(!isEditingInstructions)}
          onInstructionChange={handleInstructionChange}
          onSave={saveInstructions}
          onReset={resetInstructions}
        />
        
        <div className="flex-1 flex items-center justify-center text-blue-200">
        <div className="text-center">
            <div className="mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>🤖</div>
            <div className="font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Select a file to analyze</div>
          </div>
        </div>
      </div>
    );
  }

  // New Analysis Mode - dedicated state (check this early, but skip for direct analysis)
  if (isNewAnalysisMode && !isDirectAnalysis) {
    console.log('Rendering new analysis mode');
    console.log('newAnalysisInstructions:', newAnalysisInstructions);
    return (
      <div className="h-full flex flex-col analysis-content">
        <div style={{ marginBottom: '16px' }}>
          <div className="bg-blue-600 p-4 rounded-lg" style={{ border: '1px solid #171717' }}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-white text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                {isSelectedTextAnalysis ? 'Analyze Selected Text' : 'New Analysis'}
              </h4>
            </div>
            
            {/* Selected Text Preview */}
            {isSelectedTextAnalysis && selectedText && (
              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#171717', border: '2px solid #FFD700' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400 text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>✨</span>
                    <div className="text-yellow-400 text-sm font-bold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                      HIGHLIGHTED TEXT ANALYSIS
                    </div>
                  </div>
                  <div className="text-blue-200 text-xs" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    {selectedText.length} characters
                  </div>
                </div>
                <div className="p-3 rounded" style={{ backgroundColor: '#15269E', border: '1px solid #2E2E2E' }}>
                  <div className="text-blue-200 text-xs mb-2 font-bold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    SELECTED TEXT:
                  </div>
                  <div className="text-white text-sm whitespace-pre-wrap leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                    {selectedText}
                  </div>
                </div>
                <div className="mt-3 text-blue-200 text-xs" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                  💡 This text will be analyzed instead of the full file content
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <textarea
                value={newAnalysisInstructions}
                onChange={(e) => {
                  console.log('New analysis textarea changed to:', e.target.value);
                  setNewAnalysisInstructions(e.target.value);
                }}
                onFocus={() => console.log('Textarea focused')}
                onBlur={() => console.log('Textarea blurred')}
                className="w-full px-3 py-2 rounded text-sm resize-none"
                style={{ 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  backgroundColor: '#171717',
                  color: 'white',
                  border: '2px solid red',
                  fontSize: '14px'
                }}
                placeholder="Enter your analysis instructions..."
                rows={6}
              />
            </div>
          </div>
        </div>

        {/* Previous Prompts List - Outside the new analysis box */}
        {getUniquePrompts().length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div className="text-blue-200 text-xs mb-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
              Previous prompts ({getUniquePrompts().length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {getUniquePrompts().map((prompt, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setNewAnalysisInstructions(prompt);
                  }}
                  className="text-left px-3 py-2 text-white text-xs rounded-full transition-colors duration-200 hover:opacity-80 cursor-pointer"
                  style={{ 
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', 
                    backgroundColor: 'oklch(21% .034 264.665)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '200px',
                    fontSize: '11px',
                    fontWeight: '400'
                  }}
                  title={prompt}
                >
                  {prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={() => {
              setIsNewAnalysisMode(false);
              setNewAnalysisInstructions(instructions);
              setIsSelectedTextAnalysis(false);
              setSelectedText('');
              // Load the first cached analysis when canceling
              if (cachedAnalyses.length > 0) {
                setActiveTab(cachedAnalyses[0].id);
                setAnalysis(cachedAnalyses[0].analysis);
                setCurrentAnalysisInstructions(cachedAnalyses[0].instructions || 'Default instructions');
              } else {
                // If no cached analyses, clear the current analysis
                setAnalysis(null);
                setActiveTab(null);
                setCurrentAnalysisInstructions('');
              }
            }}
            className="px-4 py-2 text-white rounded transition-colors duration-200 font-medium"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#666' }}
          >
            Cancel
          </button>
          <button
            onClick={analyzeContent}
            disabled={isAnalyzing}
            className="px-4 py-2 text-white rounded transition-colors duration-200 font-medium"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#171717' }}
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="h-full flex flex-col analysis-content">
        <EditableInstructions
          instructions={isDirectAnalysis ? newAnalysisInstructions : instructions}
          isEditing={isEditingInstructions}
          onToggleEdit={() => setIsEditingInstructions(!isEditingInstructions)}
          onInstructionChange={handleInstructionChange}
          onSave={saveInstructions}
          onReset={resetInstructions}
        />

        {/* Analyzing State */}
        <div 
          className="flex-1 flex flex-col justify-center items-center p-6 relative overflow-hidden" 
        style={{ 
          backgroundImage: `
              radial-gradient(circle at 25% 25%, #171717 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, #171717 1px, transparent 1px),
              radial-gradient(circle at 50% 50%, #171717 1px, transparent 1px)
          `,
          backgroundSize: '12px 12px, 16px 16px, 20px 20px',
          animation: 'shimmerPulse 2s ease-in-out infinite alternate'
        }}
      >
        <div className="text-center">
            <div className="font-medium text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Analyzing content...</div>
        </div>
        
        <style jsx>{`
          @keyframes shimmerPulse {
            0%, 100% { 
              opacity: 0.7;
              background-position: 0px 0px, 0px 0px, 0px 0px;
            }
            25% { 
              opacity: 0.9;
              background-position: 3px 3px, -2px 2px, 1px -1px;
            }
            50% { 
              opacity: 0.8;
              background-position: 6px 6px, -4px 4px, 2px -2px;
            }
            75% { 
              opacity: 0.85;
              background-position: 3px -3px, 2px -2px, -1px 1px;
            }
          }
        `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col analysis-content">
        <EditableInstructions
          instructions={instructions}
          isEditing={isEditingInstructions}
          onToggleEdit={() => setIsEditingInstructions(!isEditingInstructions)}
          onInstructionChange={handleInstructionChange}
          onSave={saveInstructions}
          onReset={resetInstructions}
        />

        <div className="flex-1 flex items-center justify-center text-red-300">
        <div className="text-center">
            <div className="mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>❌</div>
            <div className="font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>Analysis Error</div>
            <div className="mt-2 font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    console.log('=== RENDERING NO ANALYSIS STATE ===');
    console.log('analysis:', analysis);
    console.log('cachedAnalyses.length:', cachedAnalyses.length);
    return (
      <div className="h-full flex flex-col analysis-content">

        {/* Empty state when no analysis and no cached analyses */}
        {cachedAnalyses.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-blue-200">
            <div className="text-center">
              <div className="font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>No analysis created</div>
            </div>
          </div>
        ) : (
          <>
            <EditableInstructions
              instructions={instructions}
              isEditing={isEditingInstructions}
              onToggleEdit={() => setIsEditingInstructions(!isEditingInstructions)}
              onInstructionChange={handleInstructionChange}
              onSave={saveInstructions}
              onReset={resetInstructions}
            />
            <div className="flex-1 flex flex-col justify-center text-blue-200 p-6">
        <button
          onClick={analyzeContent}
          disabled={isAnalyzing}
                className="w-full px-6 py-3 text-white rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#171717' }}
        >
          <span>Analyze with AI</span>
        </button>
            </div>
          </>
        )}
      </div>
    );
  }



  console.log('=== RENDERING ANALYSIS CONTENT ===');
  console.log('analysis:', analysis);
  console.log('analysis.summary:', analysis?.summary);
  console.log('analysis.insights:', analysis?.insights);
  console.log('analysis.keyPoints:', analysis?.keyPoints);
  console.log('analysis.suggestions:', analysis?.suggestions);
  console.log('cachedAnalyses.length:', cachedAnalyses.length);
  console.log('activeTab:', activeTab);

  return (
    <div className="h-full analysis-content flex flex-col">
      <div className="flex-1 overflow-y-auto" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
        <EditableInstructions
          instructions={isDraftMode ? draftInstructions : (currentAnalysisInstructions || instructions)}
          isEditing={isEditingInstructions}
          onToggleEdit={() => setIsEditingInstructions(!isEditingInstructions)}
          onInstructionChange={handleInstructionChange}
          onSave={saveInstructions}
          onReset={resetInstructions}
        />

        {/* Run Analysis button for draft mode */}
        {isDraftMode && (
          <div className="mb-6 flex justify-end">
          <button
            onClick={analyzeContent}
            disabled={isAnalyzing}
              className="px-4 py-2 text-white rounded transition-colors duration-200 font-medium"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#171717' }}
          >
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
        )}

      {/* Summary */}
      {analysis.summary && (
        <div style={{ marginBottom: '16px' }}>
          <div className="text-blue-100 bg-blue-900/20 p-4 rounded-lg font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <div className="mb-4" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</div>,
                strong: ({ children }) => <strong className="text-white font-bold" style={{ fontSize: '14px', lineHeight: '1.6' }}>{children}</strong>,
                em: ({ children }) => <em className="italic" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</em>,
                br: () => <br className="mb-2" />,
              }}
            >
            {analysis.summary}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Key Points */}
      {analysis.keyPoints && analysis.keyPoints.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 className="font-medium text-white mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>🔑 Key Points</h4>
          <ul className="space-y-1">
            {analysis.keyPoints.map((point, index) => (
              <li key={index} className="text-blue-100 flex items-start font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>
                <span className="text-blue-400 mr-2">•</span>
                <div className="flex-1">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <div className="mb-2" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</div>,
                      strong: ({ children }) => <strong className="text-white font-bold" style={{ fontSize: '14px', lineHeight: '1.6' }}>{children}</strong>,
                      em: ({ children }) => <em className="italic" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</em>,
                      br: () => <br className="mb-1" />,
                    }}
                  >
                {point}
                  </ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div className="space-y-3">
            {analysis.insights.map((insight, index) => (
              <div key={index} className="text-yellow-200 font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <div className="mb-4" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</div>,
                    strong: ({ children }) => <strong className="text-white font-bold" style={{ fontSize: '14px', lineHeight: '1.6' }}>{children}</strong>,
                    em: ({ children }) => <em className="italic" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside ml-4 mb-3" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside ml-4 mb-3" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</ol>,
                    li: ({ children }) => <li className="mb-2" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</li>,
                    br: () => <br className="mb-2" />,
                  }}
                >
                {insight}
                </ReactMarkdown>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions && analysis.suggestions.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 className="font-medium text-white mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>💭 Suggestions</h4>
          <div className="space-y-3">
            {analysis.suggestions.map((suggestion, index) => (
              <div key={index} className="text-green-200 font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <div className="mb-4" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</div>,
                    strong: ({ children }) => <strong className="text-white font-bold" style={{ fontSize: '14px', lineHeight: '1.6' }}>{children}</strong>,
                    em: ({ children }) => <em className="italic" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside ml-4 mb-3" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside ml-4 mb-3" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</ol>,
                    li: ({ children }) => <li className="mb-2" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>{children}</li>,
                    br: () => <br className="mb-2" />,
                  }}
                >
                {suggestion}
                </ReactMarkdown>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Footer with Delete button - Fixed to bottom */}
      <div style={{ 
        borderTop: '1px solid rgb(46, 46, 46)',
        backgroundColor: '#171717',
        padding: '8px 12px',
        margin: '0',
        borderRadius: '0 0 8px 0',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={() => {
            setShowDeleteConfirmation(true);
          }}
          className="save-button px-3 py-1 text-red-400 hover:text-red-300 transition-colors duration-200 font-medium flex items-center"
          style={{ 
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', 
            fontSize: '12px', 
            fontWeight: '500', 
            gap: '8px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,6 5,6 21,6"/>
            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          Delete
        </button>
      </div>

      {/* Delete Confirmation Panel */}
      <DeleteConfirmationPanel
        isVisible={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteAnalysis}
        analysisTitle={currentAnalysisInstructions || 'Current Analysis'}
      />
    </div>
  );
}

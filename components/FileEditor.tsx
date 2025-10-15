'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileInfo } from '@/lib/clientUtils';
import { TextAnalysisPanel } from './TextAnalysisPanel';
import { PDFViewer } from './PDFViewer';

interface FileEditorProps {
  selectedFile: FileInfo | null;
  fileContent: string;
  isLoading?: boolean;
  onFileUpdated: (file: FileInfo) => void;
  onFileCreated: (file: FileInfo) => void;
  onFileRenamed?: (file: FileInfo) => void;
  onSaveStateChange?: (state: {
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    isCreating: boolean;
    canSave: boolean;
    saveFile: () => void;
  }) => void;
}

export function FileEditor({ selectedFile, fileContent, isLoading = false, onFileUpdated, onFileCreated, onFileRenamed, onSaveStateChange }: FileEditorProps) {
  const [content, setContent] = useState(fileContent || '');
  const [filename, setFilename] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
    selectionStart: number;
    selectionEnd: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    selectionStart: 0,
    selectionEnd: 0
  });

  // Text analysis panel state
  const [showTextAnalysisPanel, setShowTextAnalysisPanel] = useState(false);
  const [selectedTextForAnalysis, setSelectedTextForAnalysis] = useState('');
  const [selectedTextRange, setSelectedTextRange] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: 0 });

  // Highlighted text state
  const [highlightedText, setHighlightedText] = useState<{
    text: string;
    start: number;
    end: number;
    timestamp: number;
  } | null>(null);

  // PDF extracted text state
  const [pdfExtractedText, setPdfExtractedText] = useState<string>('');
  const [pdfInvoiceData, setPdfInvoiceData] = useState<any>(null);

  // Check if file is PDF
  const isPDF = selectedFile?.extension === '.pdf';

  // Update content when selected file changes
  useEffect(() => {
    if (selectedFile) {
      setFilename(selectedFile.name);
      setHasUnsavedChanges(false);
      setIsCreating(false);
      setError('');
      
      // Clear any existing highlights when switching files
      setHighlightedText(null);
      
      // Load file content if not already loaded
      if (!selectedFile.content) {
        loadFileContent(selectedFile.path);
      } else {
        setContent(selectedFile.content);
      }
    } else {
      setContent('');
      setFilename('');
      setHasUnsavedChanges(false);
      setIsCreating(false);
      setError('');
      setHighlightedText(null);
    }
  }, [selectedFile]);

  // Sync internal content state with fileContent prop to prevent flashing
  useEffect(() => {
    if (fileContent !== undefined && fileContent !== content && !hasUnsavedChanges) {
      setContent(fileContent);
    }
  }, [fileContent, content, hasUnsavedChanges]);

  // Notify parent when save state changes
  useEffect(() => {
    notifySaveStateChange();
  }, [hasUnsavedChanges, isSaving, isCreating, filename]);

  // Listen for filename changes from the header input
  useEffect(() => {
    const handleFilenameChange = (event: CustomEvent) => {
      if (event.detail?.newFilename !== undefined) {
        setFilename(event.detail.newFilename);
        setHasUnsavedChanges(true);
        setError('');
      }
    };

    window.addEventListener('filenameChange', handleFilenameChange as EventListener);
    return () => {
      window.removeEventListener('filenameChange', handleFilenameChange as EventListener);
    };
  }, []);

  const loadFileContent = async (filePath: string) => {
    try {
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      setContent(data.content || '');
    } catch (error) {
      console.error('Error loading file content:', error);
      setContent('Error loading file content');
    }
  };

  // Focus textarea when content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedFile]);

  // Auto-resize textarea - removed to allow scrolling instead

  // Listen for new file creation event from the file list
  useEffect(() => {
    const handleCreateNewFile = () => {
      createNewFile();
    };

    window.addEventListener('createNewFile', handleCreateNewFile);
    return () => {
      window.removeEventListener('createNewFile', handleCreateNewFile);
    };
  }, []);

  // Hide context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.visible) {
        const target = e.target as HTMLElement;
        if (!target.closest('.context-menu') && !target.closest('textarea')) {
          hideContextMenu();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.visible]);

  // Close text analysis panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showTextAnalysisPanel) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-text-analysis-panel]') && !target.closest('textarea')) {
          setShowTextAnalysisPanel(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTextAnalysisPanel]);

  // Handle text selection and show context menu
  const handleTextSelection = (e: React.MouseEvent) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    
    if (selection.length > 0) {
      // Position relative to viewport instead of textarea
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selectedText: selection,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd
      });
    } else {
      setContextMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleTextareaClick = (e: React.MouseEvent) => {
    // Small delay to allow selection to complete
    setTimeout(() => {
      handleTextSelection(e);
    }, 10);
  };

  const hideContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Context menu actions
  const analyzeSelectedText = () => {
    // Store the selected text for the analysis panel
    setSelectedTextForAnalysis(contextMenu.selectedText);
    setSelectedTextRange({
      start: contextMenu.selectionStart,
      end: contextMenu.selectionEnd
    });
    
    // Hide context menu and show analysis panel
    hideContextMenu();
    setShowTextAnalysisPanel(true);
  };

  // Text analysis actions
  const handleTextAnalysis = (instructions: string) => {
    // Highlight the selected text
    setHighlightedText({
      text: selectedTextForAnalysis,
      start: selectedTextRange.start,
      end: selectedTextRange.end,
      timestamp: Date.now()
    });

    // Dispatch event to trigger direct analysis (bypassing old UI)
    const event = new CustomEvent('startDirectAnalysis', {
      detail: { 
        selectedText: selectedTextForAnalysis,
        isSelectedTextAnalysis: true,
        instructions: instructions
      }
    });
    window.dispatchEvent(event);
    setShowTextAnalysisPanel(false);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setHasUnsavedChanges(true);
    setError('');
    
    // Clear highlights if content changed significantly
    if (highlightedText) {
      const contentLengthDiff = Math.abs(newContent.length - content.length);
      if (contentLengthDiff > 10) { // Clear if content changed significantly
        setHighlightedText(null);
      }
    }
    
    // Notify parent about state change
    setTimeout(() => notifySaveStateChange(), 0);
    
    // Auto-resize textarea - removed to allow scrolling instead
  };

  const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilename(e.target.value);
    setHasUnsavedChanges(true);
    setError('');
    // Notify parent about state change
    setTimeout(() => notifySaveStateChange(), 0);
  };

  const saveFile = useCallback(async () => {
    if (!filename.trim()) {
      setError('Filename is required');
      return;
    }

    setIsSaving(true);
    setError('');
    // Notify parent about state change
    setTimeout(() => notifySaveStateChange(), 0);

    try {
      if (isCreating) {
        // Create new file
        const response = await fetch('/api/files/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: filename.trim(),
            content: content.trim(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create file');
        }

        console.log('File created successfully:', data.file);
        // Update the filename to match the actual saved filename
        setFilename(data.file.name);
        onFileCreated(data.file);
        setIsCreating(false);
      } else if (selectedFile) {
        // Check if filename has changed
        const originalFilename = selectedFile.name;
        const newFilename = filename.trim();
        
        if (originalFilename !== newFilename) {
          // Filename changed - rename the existing file with updated content
          const renameResponse = await fetch('/api/files/rename', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              oldPath: selectedFile.path,
              newName: newFilename,
              content: content,
            }),
          });

          const renameData = await renameResponse.json();

          if (!renameResponse.ok) {
            throw new Error(renameData.error || 'Failed to rename file');
          }

          setFilename(renameData.file.name);
          onFileUpdated(renameData.file);
        } else {
          // Filename unchanged - just update content
          const response = await fetch('/api/files/update', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: selectedFile.path,
              content: content,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to update file');
          }

          // Update the filename to match the actual saved filename
          setFilename(data.file.name);
          onFileUpdated(data.file);
        }
      } else {
        throw new Error('No file selected and not creating new file');
      }

      setHasUnsavedChanges(false);
      // Notify parent about state change
      setTimeout(() => notifySaveStateChange(), 0);
    } catch (error) {
      console.error('Error saving file:', error);
      setError(error instanceof Error ? error.message : 'Failed to save file');
    } finally {
      setIsSaving(false);
      // Notify parent about state change
      setTimeout(() => notifySaveStateChange(), 0);
    }
  }, [content, filename, isCreating, selectedFile, onFileCreated, onFileRenamed, onFileUpdated]);

  // Notify parent component about save state changes
  const notifySaveStateChange = useCallback(() => {
    const canSave = hasUnsavedChanges && filename.trim() !== '';
    
    if (onSaveStateChange) {
      onSaveStateChange({
        hasUnsavedChanges,
        isSaving,
        isCreating,
        canSave,
        saveFile
      });
    }
  }, [hasUnsavedChanges, isSaving, isCreating, filename, saveFile, onSaveStateChange]);

  const createNewFile = () => {
    setFilename('');
    setContent('');
    setHasUnsavedChanges(false);
    setIsCreating(true);
    setError('');
    // Notify parent about state change
    setTimeout(() => notifySaveStateChange(), 0);
    
    // Focus the textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
  };

  // Function to render content with highlights
  const renderContentWithHighlights = () => {
    if (!highlightedText) {
      return content;
    }

    const { start, end, text } = highlightedText;
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);
    
    return (
      <>
        {beforeText}
        <mark style={{ 
          backgroundColor: '#FFD700', 
          color: '#000', 
          padding: '1px 2px',
          borderRadius: '2px'
        }}>
          {text}
        </mark>
        {afterText}
      </>
    );
  };

  return (
    <div className="h-full flex flex-col text-white overflow-hidden" style={{ height: '100%' }}>
      {/* Header */}
      <div className="mb-4 space-y-3">
        {error && (
          <div className="text-white  font-medium" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>
            {error}
          </div>
        )}

      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          // Loading placeholder - use actual textarea for exact same dimensions
          <textarea
            readOnly
            disabled
            value="Loading content..."
            className="w-full px-3 py-2 bg-transparent text-white focus:outline-none resize-none font-medium border-0 overflow-y-auto"
            style={{ 
              height: '100%',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgb(100, 100, 100) !important',
              fontWeight: '100'
            }}
          />
        ) : !selectedFile ? (
          // No file selected placeholder - use actual textarea for exact same dimensions
          <textarea
            readOnly
            disabled
            value=""
            className="w-full px-3 py-2 bg-transparent text-white focus:outline-none resize-none font-medium border-0 overflow-y-auto"
            style={{ 
              height: '100%',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgb(100, 100, 100) !important',
              fontWeight: '100'
            }}
          />
        ) : isPDF ? (
          <PDFViewer 
            filePath={selectedFile.path} 
            onTextExtracted={(text, invoiceData) => {
              setPdfExtractedText(text);
              setPdfInvoiceData(invoiceData);
              setContent(text); // Set content to extracted text for AI analysis
            }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onClick={handleTextareaClick}
            onMouseUp={handleTextSelection}
            placeholder="Start typing your content here... (Ctrl+S to save)"
            className="w-full px-3 py-2 bg-transparent text-white focus:outline-none resize-none font-medium border-0 overflow-y-auto"
            style={{ 
              height: '100%',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgb(242, 242, 242) !important',
              fontWeight: '100'
            }}
          />
        )}
      </div>

      {/* Context Menu - Fixed positioning outside container */}
      {contextMenu.visible && (
        <div
          className="context-menu fixed z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: '#171717',
            border: '1px solid #2E2E2E',
            borderRadius: '8px',
            minWidth: '200px',
            padding: '4px 0',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}
          onMouseLeave={hideContextMenu}
        >
          <button
            onClick={analyzeSelectedText}
            className="w-full text-left transition-colors duration-200 flex items-center save-button"
            style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              backgroundColor: 'transparent',
              color: '#f2f2f2',
              fontSize: '14px',
              fontWeight: '500',
              padding: '8px 16px',
              gap: '12px',
              border: 'none',
              outline: 'none',
              borderRadius: '4px',
              margin: '2px 4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#27272A'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f2f2f2' }}>
              <path d="m11 4-.5-1-.5 1-1 .125.834.708L9.5 6l1-.666 1 .666-.334-1.167.834-.708zm8.334 10.666L18.5 13l-.834 1.666-1.666.209 1.389 1.181L16.834 18l1.666-1.111L20.166 18l-.555-1.944L21 14.875zM6.667 6.333 6 5l-.667 1.333L4 6.5l1.111.944L4.667 9 6 8.111 7.333 9l-.444-1.556L8 6.5zM3.414 17c0 .534.208 1.036.586 1.414L5.586 20c.378.378.88.586 1.414.586s1.036-.208 1.414-.586L20 8.414c.378-.378.586-.88.586-1.414S20.378 5.964 20 5.586L18.414 4c-.756-.756-2.072-.756-2.828 0L4 15.586c-.378.378-.586.88-.586 1.414zM17 5.414 18.586 7 15 10.586 13.414 9 17 5.414z"/>
            </svg>
            <span>Analyze text</span>
          </button>
        </div>
      )}

      {/* Text Analysis Panel */}
      <TextAnalysisPanel
        isVisible={showTextAnalysisPanel}
        onClose={() => setShowTextAnalysisPanel(false)}
        onStartAnalysis={handleTextAnalysis}
        selectedText={selectedTextForAnalysis}
        fileName={selectedFile?.name}
      />

      {/* Footer */}
      <div className="mt-3">
        {isCreating ? (
          <div className="text-blue-200  font-medium" style={{ fontSize: '14px', lineHeight: '1.6', color: '#f2f2f2' }}>
            Creating new file - enter filename and content, then save
          </div>
        ) : selectedFile ? (
          <div className="space-y-2">
          </div>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
}

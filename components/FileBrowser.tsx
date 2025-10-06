'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileInfo, formatFileSize, getFileIcon } from '@/lib/clientUtils';
import { FileEditor } from './FileEditor';
import { InsightsPanel } from './InsightsPanel';
import { CacheManager } from './CacheManager';
import { NewAnalysisPanel } from './NewAnalysisPanel';
import { FileDeleteConfirmationPanel } from './FileDeleteConfirmationPanel';
import { MapView } from './MapView';

interface FileBrowserProps {
  folderPath?: string;
}

export function FileBrowser({ folderPath = 'data' }: FileBrowserProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [saveState, setSaveState] = useState<{
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    isCreating: boolean;
    canSave: boolean;
    saveFile: (() => void) | null;
  }>({
    hasUnsavedChanges: false,
    isSaving: false,
    isCreating: false,
    canSave: false,
    saveFile: null
  });

  const [cachedAnalyses, setCachedAnalyses] = useState<any[]>([]);
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [showNewAnalysisPanel, setShowNewAnalysisPanel] = useState(false);
  const [showFileList, setShowFileList] = useState(true);
  const [showFileDeleteConfirmation, setShowFileDeleteConfirmation] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileInfo | null>(null);
  const [showMapView, setShowMapView] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisInfo, setAnalysisInfo] = useState({
    totalCachedForFile: 0,
    currentAnalysisSize: 0,
    currentAnalysisId: null as string | null
  });
  const [editingFilename, setEditingFilename] = useState('');
  const [isCreatingNewFile, setIsCreatingNewFile] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadFiles();
  }, [folderPath]);

  // Sync editing filename with FileEditor's filename state
  useEffect(() => {
    const handleFilenameChange = (event: CustomEvent) => {
      if (event.detail?.newFilename !== undefined) {
        setEditingFilename(event.detail.newFilename);
      }
    };

    window.addEventListener('filenameChange', handleFilenameChange as EventListener);
    return () => {
      window.removeEventListener('filenameChange', handleFilenameChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      loadFiles();
    }
  }, [mounted, folderPath]);

  // Auto-select the last file when files are loaded (only on initial load)
  useEffect(() => {
    if (files.length > 0 && !selectedFile && mounted && !isCreatingNewFile) {
      const lastFile = files[files.length - 1];
      // Only auto-select if we're not in the middle of creating a new file
      if (lastFile.name !== 'New file.txt') {
      handleFileSelect(lastFile);
      }
    }
  }, [files.length, isCreatingNewFile]); // Only trigger when files array length changes

  const loadFiles = useCallback(async () => {
    if (!mounted) return;
    
    try {
      console.log('Loading files for folder:', folderPath);
      const response = await fetch(`/api/files?folder=${encodeURIComponent(folderPath)}`);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Files loaded:', data.files);
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    }
  }, [mounted, folderPath]);

  const handleFileSelect = useCallback(async (file: FileInfo) => {
    setSelectedFile(file);
    setEditingFilename(''); // Reset editing filename when selecting a new file
    
    // Load file content for analysis
    try {
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`);
      
      if (response.ok) {
        const data = await response.json();
        setFileContent(data.content || '');
      } else {
        setFileContent('');
      }
    } catch (error) {
      console.error('Error loading file content:', error);
      setFileContent('');
    }
  }, []);

  const handleDeleteFile = async (file: FileInfo) => {
    try {
      const response = await fetch('/api/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: file.path
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove file from files list
        setFiles(prevFiles => prevFiles.filter(f => f.path !== file.path));
        
        // If the deleted file was selected, clear selection and cached analyses
        if (selectedFile && selectedFile.path === file.path) {
          setSelectedFile(null);
          setFileContent('');
          setEditingFilename('');
          setCachedAnalyses([]);
        }
        
        console.log('File deleted successfully:', file.name);
      } else {
        console.error('Failed to delete file:', data.error);
        alert(`Failed to delete file: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(`Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Initializing...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#171717' }}>
      {/* File List */}
      {showFileList && (
        <div className="w-1/4 flex flex-col" style={{ padding: '8px 16px 16px', backgroundColor: '#171717', borderRight: '1px solid rgb(46, 46, 46)', maxWidth: '256px' }}>
          <div style={{ marginBottom: '8px', marginLeft: '4px' }}>
            <h1 style={{ 
              fontFamily: '"Jacquard 12", serif', 
              fontSize: '40px', 
              fontWeight: '400', 
              fontStyle: 'normal',
              color: '#f2f2f2',
              marginBottom: '8px',
              textAlign: 'left'
            }}>
              Frost
            </h1>
            <h2 style={{ 
              color: 'rgb(166, 166, 166)', 
              fontSize: '13px', 
              fontWeight: '600', 
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              marginLeft: '4px',
              marginBottom: '0px'
            }}>
              Files ({files.length})
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
          {files.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No files found</div>
          ) : (
              <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.path}
                  onClick={() => handleFileSelect(file)}
                      className="flex items-center justify-between p-2 rounded cursor-pointer group"
                    style={{
                      backgroundColor: selectedFile?.path === file.path ? '#27272A' : 'transparent',
                      paddingTop: '4px',
                      paddingBottom: '4px',
                      paddingLeft: '4px',
                      paddingRight: '4px',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedFile?.path !== file.path) {
                        e.currentTarget.style.backgroundColor = '#27272A';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedFile?.path !== file.path) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="text-lg">{getFileIcon(file.name)}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span 
                          className="text-sm font-medium truncate"
                          style={{ 
                            fontSize: '14px',
                            fontWeight: '500',
                            color: selectedFile?.path === file.path ? '#f2f2f2' : '#f2f2f2'
                          }}
                        >
                          {file.name}
                        </span>
                        <span 
                          className="text-xs text-gray-400"
                          style={{ 
                            fontSize: '12px',
                            color: 'hsl(0 0% 65%)'
                          }}
                        >
                          {new Date(file.lastModified).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileToDelete(file);
                        setShowFileDeleteConfirmation(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        padding: '4px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ef4444';
                        e.currentTarget.style.color = '#f2f2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* New File Button - Aligned to bottom */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid rgb(46, 46, 46)' }}>
            <button
              onClick={async () => {
                try {
                  setIsCreatingNewFile(true);
                  
                  // Create a new file
                  const newFileName = `New file.txt`;
                  const newFilePath = `${folderPath}/${newFileName}`;
                  
                  console.log('Creating new file:', { newFileName, newFilePath });
                  
                  // Create the file via API
                  const response = await fetch('/api/files/create', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      filename: newFileName,
                      filePath: newFilePath,
                      content: ''
                    }),
                  });
                  
                  const data = await response.json();
                  console.log('Create file response:', data);
                  
                  if (data.success) {
                    // Update state
                    setFiles(prevFiles => [...prevFiles, data.file]);
                    setSelectedFile(data.file);
                    setFileContent('');
                    setEditingFilename('');
                    console.log('New file created and selected:', data.file);
                  } else {
                    console.error('Failed to create file:', data.error);
                    alert(`Failed to create file: ${data.error}`);
                  }
                } catch (error) {
                  console.error('Error creating file:', error);
                  alert(`Error creating file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                } finally {
                  setIsCreatingNewFile(false);
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#2E2E2E',
                border: '1px solid #2E2E2E',
                borderRadius: '4px',
                color: '#f2f2f2',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#262626';
                e.currentTarget.style.color = '#68A6E4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2E2E2E';
                e.currentTarget.style.color = '#f2f2f2';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New File
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1" style={{ margin: expandedColumn ? '0' : '0px 16px 16px 16px' }}>
        {/* File Name Header */}
        {!expandedColumn && selectedFile && (
          <div className="w-full" style={{ height: '56px' }}>
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center" style={{ gap: '4px' }}>
                <button
                  onClick={() => setShowFileList(!showFileList)}
                  className="save-button"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    color: '#f2f2f2',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                  </svg>
                </button>
                <input
                  type="text"
                  value={editingFilename || selectedFile.name}
                  onChange={(e) => {
                    setEditingFilename(e.target.value);
                    // Dispatch event to notify FileEditor of filename change
                    const event = new CustomEvent('filenameChange', {
                      detail: { newFilename: e.target.value }
                    });
                    window.dispatchEvent(event);
                  }}
                  className="text-lg font-medium bg-transparent border-none outline-none"
                  style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#f2f2f2',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none'
                  }}
                />
               </div>
              
              <div className="flex items-center" style={{ gap: '8px' }}>
                <button
                  onClick={saveState.saveFile || (() => {})}
                  disabled={!saveState.canSave || saveState.isSaving}
                  className="save-button"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: (!saveState.canSave || saveState.isSaving) ? 'not-allowed' : 'pointer',
                    color: (!saveState.canSave || saveState.isSaving) ? '#666' : '#f2f2f2',
                    opacity: (!saveState.canSave || saveState.isSaving) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (saveState.canSave && !saveState.isSaving && !e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#262626';
                      e.currentTarget.style.color = '#68A6E4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (saveState.canSave && !saveState.isSaving && !e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#f2f2f2';
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17,21 17,13 7,13 7,21"/>
                    <polyline points="7,3 7,8 15,8"/>
                  </svg>
                  {saveState.isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowNewAnalysisPanel(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2E2E2E',
                    border: '1px solid #2E2E2E',
                    borderRadius: '4px',
                    color: '#f2f2f2',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#262626';
                    e.currentTarget.style.color = '#68A6E4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                    e.currentTarget.style.color = '#f2f2f2';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="m11 4-.5-1-.5 1-1 .125.834.708L9.5 6l1-.666 1 .666-.334-1.167.834-.708zm8.334 10.666L18.5 13l-.834 1.666-1.666.209 1.389 1.181L16.834 18l1.666-1.111L20.166 18l-.555-1.944L21 14.875zM6.667 6.333 6 5l-.667 1.333L4 6.5l1.111.944L4.667 9 6 8.111 7.333 9l-.444-1.556L8 6.5zM3.414 17c0 .534.208 1.036.586 1.414L5.586 20c.378.378.88.586 1.414.586s1.036-.208 1.414-.586L20 8.414c.378-.378.586-.88.586-1.414S20.378 5.964 20 5.586L18.414 4c-.756-.756-2.072-.756-2.828 0L4 15.586c-.378.378-.586.88-.586 1.414zM17 5.414 18.586 7 15 10.586 13.414 9 17 5.414z"/>
                  </svg>
                  New Analysis
                </button>
                
                <button
                  onClick={() => setShowMapView(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2E2E2E',
                    border: '1px solid #2E2E2E',
                    borderRadius: '4px',
                    color: '#f2f2f2',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#262626';
                    e.currentTarget.style.color = '#68A6E4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2E2E2E';
                    e.currentTarget.style.color = '#f2f2f2';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6l6-4 6 4 6-4v14l-6 4-6-4-6 4V6z"/>
                    <path d="M9 2v14"/>
                    <path d="M15 6v14"/>
                  </svg>
                  Map
                </button>
               </div>
                      </div>
                    </div>
        )}

        {/* Content Container */}
        <div 
          className="flex-1 flex"
          style={{
            backgroundColor: '#1F1F1F',
            borderRadius: expandedColumn ? '0px' : '8px',
            border: '1px solid #2E2E2E',
            height: '100%',
            minHeight: 0
          }}
        >
          {/* File Editor */}
          <div className={`${expandedColumn === 'file-editor' || (cachedAnalyses.length === 0 && !isAnalyzing) ? 'w-full' : 'w-1/2'} flex flex-col`} style={{ display: expandedColumn === 'ai-insights' ? 'none' : 'flex', borderRight: expandedColumn !== 'file-editor' && (cachedAnalyses.length > 0 || isAnalyzing) ? '1px solid #2E2E2E' : 'none', height: '100%', minHeight: 0 }}>
            <div className="mb-4" style={{ borderBottom: '1px solid #2E2E2E', marginBottom: '8px', minHeight: '32px', paddingLeft: '12px', paddingRight: '12px' }}>
              <div className="flex justify-between items-center h-full">
                <h2 style={{ 
                  color: 'rgb(166, 166, 166)', 
                  fontSize: '11px', 
                  fontWeight: 'normal', 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  margin: '0',
                  paddingTop: '8px',
                  paddingBottom: '8px'
                }}>
                  FILE EDITOR
                </h2>
                <button
                  onClick={() => setExpandedColumn(expandedColumn === 'file-editor' ? null : 'file-editor')}
                  className="save-button"
                  style={{
                    padding: '4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#a3a3a3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#27272A';
                    e.currentTarget.style.color = '#f2f2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#a3a3a3';
                  }}
                >
                  <img 
                    src={expandedColumn === 'file-editor' ? '/icons/minimize-2.svg' : '/icons/maximize-2.svg'}
                    alt={expandedColumn === 'file-editor' ? 'Minimize' : 'Maximize'}
                    width="16" 
                    height="16"
                    style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(0%) saturate(0%) hue-rotate(93deg) brightness(96%) contrast(87%)' }}
                  />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
              <FileEditor
                selectedFile={selectedFile}
                fileContent={fileContent}
                onFileUpdated={(file) => {
                  // Update the file in the files list
                  setFiles(prevFiles => {
                    // Check if this is a rename (path changed)
                    const isRename = selectedFile && selectedFile.path !== file.path;
                    
                    if (isRename) {
                      // Remove the old file and add the new one
                      return prevFiles.filter(f => f.path !== selectedFile.path).concat(file);
                    } else {
                      // Update existing file
                      return prevFiles.map(f => f.path === file.path ? file : f);
                    }
                  });
                  
                  // Update selectedFile if it's the same file (even if renamed)
                  if (selectedFile && (selectedFile.path === file.path || selectedFile.name === file.name)) {
                    setSelectedFile(file);
                  }
                }}
                onFileCreated={(file) => {
                  // Add the new file to the files list
                  setFiles(prevFiles => [...prevFiles, file]);
                }}
                onFileRenamed={(file) => {
                  // Update the file in the files list
                  setFiles(prevFiles => {
                    // Check if this is a rename (path changed)
                    const isRename = selectedFile && selectedFile.path !== file.path;
                    
                    if (isRename) {
                      // Remove the old file and add the new one
                      return prevFiles.filter(f => f.path !== selectedFile.path).concat(file);
                    } else {
                      // Update existing file
                      return prevFiles.map(f => f.path === file.path ? file : f);
                    }
                  });
                  
                  // Update selectedFile if it's the same file (even if renamed)
                  if (selectedFile && (selectedFile.path === file.path || selectedFile.name === file.name)) {
                    setSelectedFile(file);
                  }
                }}
                onSaveStateChange={(state) => {
                  setSaveState(state);
                }}
              />
                    </div>
                  </div>

          {/* AI Insights Section */}
          <div className={`${expandedColumn === 'ai-insights' ? "w-full" : "w-1/2"} flex flex-col`} style={{ display: expandedColumn !== 'file-editor' && selectedFile && (cachedAnalyses.length > 0 || isAnalyzing) ? 'flex' : 'none', height: '100%', minHeight: 0 }}>
            <div className="mb-4" style={{ borderBottom: '1px solid #2E2E2E', marginBottom: '8px', minHeight: '32px', paddingRight: '12px' }}>
              <div className="flex justify-between items-center h-full">
                <div className="flex items-center space-x-4">
                  {cachedAnalyses.length > 0 && (
                    <div className="flex">
                      {cachedAnalyses.map((cached, index) => (
                        <div
                          key={cached.id}
                          onClick={() => setActiveAnalysisId(cached.id)}
                          className="transition-colors duration-200 flex items-center space-x-2 relative cursor-pointer"
                          style={{ 
                            backgroundColor: activeAnalysisId === cached.id || (!activeAnalysisId && index === 0) ? 'rgb(39, 39, 42)' : 'transparent',
                            height: '32px',
                            paddingLeft: '8px',
                            paddingRight: '8px',
                            borderRight: '1px solid rgb(46, 46, 46)'
                          }}
                          title={cached.instructions}
                        >
                          <div 
                            className="w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#2E2E2E' }}
                          >
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                          <h2 className="m-0" style={{ 
                            fontSize: '11px', 
                            color: activeAnalysisId === cached.id || (!activeAnalysisId && index === 0) ? 'rgb(242, 242, 242)' : 'rgb(166, 166, 166)',
                            fontWeight: activeAnalysisId === cached.id || (!activeAnalysisId && index === 0) ? '600' : 'normal',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                          }}>
                            {cached.instructions.length > 15 
                              ? cached.instructions.substring(0, 15) + '...' 
                              : cached.instructions}
                          </h2>
                </div>
              ))}
            </div>
          )}
        </div>
                <button
                  onClick={() => setExpandedColumn(expandedColumn === 'ai-insights' ? null : 'ai-insights')}
                  className="save-button"
                  style={{
                    padding: '4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#a3a3a3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#27272A';
                    e.currentTarget.style.color = '#f2f2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#a3a3a3';
                  }}
                >
                  <img 
                    src={expandedColumn === 'ai-insights' ? '/icons/minimize-2.svg' : '/icons/maximize-2.svg'}
                    alt={expandedColumn === 'ai-insights' ? 'Minimize' : 'Maximize'}
                    width="16" 
                    height="16"
                    style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(0%) saturate(0%) hue-rotate(93deg) brightness(96%) contrast(87%)' }}
                  />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <InsightsPanel 
          selectedFile={selectedFile}
                fileContent={fileContent}
                onAnalysisStateChange={(isAnalyzing) => {
                  console.log('FileBrowser: Analysis state changed to:', isAnalyzing);
                  setIsAnalyzing(isAnalyzing);
                }}
                onCachedAnalysesChange={(analyses) => {
                  console.log('FileBrowser: Cached analyses changed to:', analyses);
                  setCachedAnalyses(analyses);
                }}
                onTabClick={(analysisId) => {
                  console.log('FileBrowser: Tab clicked:', analysisId);
                  setActiveAnalysisId(analysisId);
                }}
                onCacheCleared={() => {
                  console.log('FileBrowser: Cache cleared, refreshing file list');
                  loadFiles();
                }}
                activeAnalysisId={activeAnalysisId}
        />
      </div>
          </div>
        </div>
      </div>

      {/* New Analysis Panel */}
      <NewAnalysisPanel
        isVisible={showNewAnalysisPanel}
        onClose={() => setShowNewAnalysisPanel(false)}
        onStartAnalysis={(instructions) => {
          console.log('FileBrowser: onStartAnalysis called with instructions:', instructions);
          const event = new CustomEvent('startDirectAnalysis', {
            detail: { 
              instructions,
              isSelectedTextAnalysis: false
            }
          });
          window.dispatchEvent(event);
        }}
        cachedAnalyses={cachedAnalyses}
        selectedFileName={selectedFile?.name}
      />

      {/* File Delete Confirmation Panel */}
      <FileDeleteConfirmationPanel
        isVisible={showFileDeleteConfirmation}
        onClose={() => setShowFileDeleteConfirmation(false)}
        onConfirm={() => {
          if (fileToDelete) {
            handleDeleteFile(fileToDelete);
            setShowFileDeleteConfirmation(false);
            setFileToDelete(null);
          }
        }}
        fileName={fileToDelete?.name}
      />

      {/* Map View */}
      <MapView
        selectedFile={selectedFile}
        fileContent={fileContent}
        cachedAnalyses={cachedAnalyses}
        isVisible={showMapView}
        onClose={() => setShowMapView(false)}
      />

    </div>
  );
}

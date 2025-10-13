'use client';

import { useState, useEffect } from 'react';
import { FileEditor } from './FileEditor';
import { CreateFileForm } from './CreateFileForm';
import { NewAnalysisPanel } from './NewAnalysisPanel';
import { FileDeleteConfirmationPanel } from './FileDeleteConfirmationPanel';
import { MapView } from './MapView';
import { ReceiptPanel } from './ReceiptPanel';
import { FileInfo } from '@/lib/clientUtils';

interface CachedAnalysis {
  filename: string;
  timestamp: number;
  analysis: {
    summary: string;
    insights: string[];
    keyPoints: string[];
    suggestions: string[];
  };
}

interface SaveState {
  canSave: boolean;
  isSaving: boolean;
  saveFile: (() => Promise<void>) | null;
}

export function FileBrowser({ folderPath }: { folderPath: string }) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showNewAnalysisPanel, setShowNewAnalysisPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingNewFile, setIsCreatingNewFile] = useState(false);
  const [cachedAnalyses, setCachedAnalyses] = useState<CachedAnalysis[]>([]);
  const [saveState, setSaveState] = useState<SaveState>({
    canSave: false,
    isSaving: false,
    saveFile: null
  });
  const [showFileDeleteConfirmation, setShowFileDeleteConfirmation] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileInfo | null>(null);
  const [editingFilename, setEditingFilename] = useState<string>('');
  const [showMapView, setShowMapView] = useState(false);
  const [showFileList, setShowFileList] = useState(true);
  const [expandedColumn, setExpandedColumn] = useState<'file-editor' | 'receipts' | null>(null);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/files');
      const data = await response.json();
      
      if (data.files) {
        console.log('Files loaded:', data.files);
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCachedAnalyses = async () => {
    try {
      const response = await fetch('/api/cache/stats');
      const data = await response.json();
      if (data.success) {
        setCachedAnalyses(data.cachedAnalyses || []);
      }
    } catch (error) {
      console.error('Error fetching cached analyses:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchCachedAnalyses();
  }, []);

  // Auto-select the first file when files are loaded
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      handleFileSelect(files[0]);
    }
  }, [files]);

  const handleFileSelect = async (file: FileInfo) => {
    setSelectedFile(file);
    setEditingFilename('');
    
    try {
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`);
      const data = await response.json();
      
      if (data.success) {
        setFileContent(data.content);
      }
    } catch (error) {
      console.error('Error loading file content:', error);
    }
  };

  const handleDeleteFile = async (file: FileInfo) => {
    try {
      const response = await fetch(`/api/files/update?path=${encodeURIComponent(file.path)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setFiles(prevFiles => prevFiles.filter(f => f.path !== file.path));
        if (selectedFile?.path === file.path) {
          setSelectedFile(null);
          setFileContent('');
        }
      } else {
        alert(`Failed to delete file: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(`Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getFileIcon = (extension: string) => {
    const iconMap: { [key: string]: string } = {
      '.txt': '',
      '.md': '',
      '.json': '',
      '.js': '',
      '.ts': '',
      '.pdf': '',
    };
    return iconMap[extension] || '';
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="text-lg">Loading files...</span>
        <span className="ml-2 text-gray-600">Initializing...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#171717' }}>
      {/* File List */}
      {showFileList && (
        <div className="w-1/4 flex flex-col" style={{ padding: '8px 16px 16px', backgroundColor: '#171717', maxWidth: '256px' }}>
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
                      <span className="text-lg">{getFileIcon(file.extension)}</span>
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

      {/* File Editor Column */}
      {expandedColumn !== 'receipts' && (
        <div className="flex flex-col" style={{ 
          width: expandedColumn === 'file-editor' ? '100%' : '50%',
          padding: '0px 8px 16px 16px',
          height: '100vh'
        }}>
          {/* File Name Header */}
          {selectedFile && (
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
                  <div
                    className="text-lg font-medium bg-transparent border-none outline-none"
                    style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#f2f2f2',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'visible',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {selectedFile.name}
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: '8px' }}>
                </div>
              </div>
            </div>
          )}

          {/* File Editor Container */}
          <div 
            className="flex-1 flex flex-col"
            style={{
              backgroundColor: '#1F1F1F',
              borderRadius: '8px',
              border: '1px solid #2E2E2E',
              height: '100%',
              minHeight: 0,
              marginBottom: '16px'
            }}
          >
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
                  PREVIEW
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
                  setFiles(prevFiles => {
                    const isRename = selectedFile && selectedFile.path !== file.path;
                    if (isRename) {
                      return prevFiles.filter(f => f.path !== selectedFile.path).concat(file);
                    } else {
                      return prevFiles.map(f => f.path === file.path ? file : f);
                    }
                  });
                  if (selectedFile && (selectedFile.path === file.path || selectedFile.name === file.name)) {
                    setSelectedFile(file);
                  }
                }}
                onFileCreated={(file) => {
                  setFiles(prevFiles => [...prevFiles, file]);
                }}
                onFileRenamed={(file) => {
                  setFiles(prevFiles => {
                    const isRename = selectedFile && selectedFile.path !== file.path;
                    if (isRename) {
                      return prevFiles.filter(f => f.path !== selectedFile.path).concat(file);
                    } else {
                      return prevFiles.map(f => f.path === file.path ? file : f);
                    }
                  });
                  if (selectedFile && (selectedFile.path === file.path || selectedFile.name === file.name)) {
                    setSelectedFile(file);
                  }
                }}
                onSaveStateChange={(state: any) => {
                  setSaveState(state as SaveState);
                }}
        />
      </div>
          </div>
        </div>
      )}

      {/* Receipts Column */}
      {expandedColumn !== 'file-editor' && (
        <div className="flex flex-col" style={{ 
          width: expandedColumn === 'receipts' ? '100%' : '50%',
          padding: '0px 0px 16px 8px',
          height: '100vh'
        }}>
          <div 
            className="flex-1 flex flex-col"
            style={{
              backgroundColor: '#171717',
              borderLeft: '1px solid #2E2E2E',
              height: '100%',
              minHeight: 0
            }}
          >
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '16px' }}>
              <ReceiptPanel onFileSelect={(filename) => {
                const file = files.find(f => f.name === filename);
                if (file) {
                  handleFileSelect(file);
                }
              }} />
            </div>
          </div>
        </div>
      )}

      {/* New Analysis Panel */}
      <NewAnalysisPanel
        isVisible={showNewAnalysisPanel}
        onClose={() => setShowNewAnalysisPanel(false)}
        onStartAnalysis={(instructions: string) => {
          console.log('FileBrowser: onStartAnalysis called with instructions:', instructions);
          const event = new CustomEvent('startDirectAnalysis', {
            detail: { 
              instructions,
              isSelectedTextAnalysis: false
            }
          });
          window.dispatchEvent(event);
        }}
        cachedAnalyses={[]}
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

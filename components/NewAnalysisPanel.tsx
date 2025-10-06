'use client';

import { useState, useEffect } from 'react';

interface NewAnalysisPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onStartAnalysis: (instructions: string) => void;
  cachedAnalyses: Array<{ instructions: string }>;
  selectedFileName?: string;
}

export function NewAnalysisPanel({ isVisible, onClose, onStartAnalysis, cachedAnalyses, selectedFileName }: NewAnalysisPanelProps) {
  const [instructions, setInstructions] = useState('');

  // Get unique prompts from cached analyses
  const getUniquePrompts = () => {
    const prompts = cachedAnalyses.map(analysis => analysis.instructions);
    return [...new Set(prompts)].filter(prompt => prompt && prompt.trim() !== '');
  };

  const handleStartAnalysis = () => {
    if (instructions.trim()) {
      onStartAnalysis(instructions.trim());
      setInstructions('');
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '8px',
        right: '8px',
        width: '440px',
        backgroundColor: '#171717',
        border: '1px solid #2E2E2E',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #2E2E2E'
        }}
      >
        <h3
          style={{
            margin: 0,
            color: '#f2f2f2',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          {selectedFileName ? `Run Analysis for ${selectedFileName}` : 'New Analysis'}
        </h3>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Instructions Input */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              color: '#f2f2f2',
              fontSize: '12px',
              fontWeight: '500',
              marginBottom: '8px'
            }}
          >
            Analysis Instructions
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter your analysis instructions..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '8px',
              backgroundColor: '#1F1F1F',
              border: '1px solid #2E2E2E',
              borderRadius: '4px',
              color: '#f2f2f2',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2E2E2E'}
            onBlur={(e) => e.target.style.borderColor = '#2E2E2E'}
          />
        </div>

        {/* Previous Prompts */}
        {getUniquePrompts().length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                color: '#f2f2f2',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '8px'
              }}
            >
              Previous Prompts ({getUniquePrompts().length})
            </label>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {getUniquePrompts().map((prompt, index) => (
                <div
                  key={index}
                  onClick={() => setInstructions(prompt)}
                  style={{
                    backgroundColor: 'oklch(21% .034 264.665)',
                    color: '#f2f2f2',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  title={prompt}
                >
                  {prompt.length > 15 ? prompt.substring(0, 15) + '...' : prompt}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="save-button"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              color: '#f2f2f2'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleStartAnalysis}
            disabled={!instructions.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: instructions.trim() ? '#2E2E2E' : '#1a1a1a',
              border: '1px solid #2E2E2E',
              borderRadius: '4px',
              color: instructions.trim() ? '#f2f2f2' : '#666',
              fontSize: '12px',
              fontWeight: '500',
              cursor: instructions.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (instructions.trim()) {
                e.currentTarget.style.backgroundColor = '#262626';
                e.currentTarget.style.color = '#68A6E4';
              }
            }}
            onMouseLeave={(e) => {
              if (instructions.trim()) {
                e.currentTarget.style.backgroundColor = '#2E2E2E';
                e.currentTarget.style.color = '#f2f2f2';
              }
            }}
          >
            Run Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

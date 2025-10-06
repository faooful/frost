'use client';

import { useState } from 'react';

interface TextAnalysisPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onStartAnalysis: (instructions: string) => void;
  selectedText: string;
  fileName?: string;
}

export function TextAnalysisPanel({ isVisible, onClose, onStartAnalysis, selectedText, fileName }: TextAnalysisPanelProps) {
  const [instructions, setInstructions] = useState('');


  const handleRunAnalysis = () => {
    if (instructions.trim()) {
      onStartAnalysis(instructions.trim());
      setInstructions('');
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      data-text-analysis-panel
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
          Analyze Selected Text{fileName ? ` from ${fileName}` : ''}
        </h3>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Selected Text Preview */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              color: '#f2f2f2',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Selected Text:
          </label>
          <div
            style={{
              backgroundColor: '#1F1F1F',
              border: '1px solid #2E2E2E',
              borderRadius: '4px',
              padding: '12px',
              color: '#f2f2f2',
              fontSize: '13px',
              lineHeight: '1.4',
              maxHeight: '120px',
              overflowY: 'auto',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            "{selectedText}"
          </div>
        </div>

        {/* Instructions Input */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              color: '#f2f2f2',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Analysis Instructions:
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="What would you like to analyze about this text?"
            style={{
              width: 'calc(100% - 24px)',
              height: '80px',
              padding: '12px',
              backgroundColor: '#1F1F1F',
              border: '1px solid rgb(46, 46, 46)',
              borderRadius: '4px',
              color: '#f2f2f2',
              fontSize: '13px',
              lineHeight: '1.4',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              resize: 'none',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgb(46, 46, 46)'}
            onBlur={(e) => e.target.style.borderColor = 'rgb(46, 46, 46)'}
          />
        </div>

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
            onClick={handleRunAnalysis}
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
            Analyze Text
          </button>
        </div>
      </div>
    </div>
  );
}

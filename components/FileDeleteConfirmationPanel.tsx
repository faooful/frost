'use client';

import { useState, useEffect } from 'react';

interface FileDeleteConfirmationPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName?: string;
}

export function FileDeleteConfirmationPanel({ isVisible, onClose, onConfirm, fileName }: FileDeleteConfirmationPanelProps) {
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
          Confirm File Deletion
        </h3>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Confirmation Message */}
        <div style={{ 
          marginBottom: '20px'
        }}>
          <p style={{ 
            margin: '0 0 8px 0', 
            color: '#f2f2f2', 
            fontSize: '14px', 
            fontWeight: '500',
            lineHeight: '1.4'
          }}>
            Are you sure you want to delete {fileName ? `"${fileName}"` : 'this file'}?
          </p>
          <p style={{ 
            margin: 0, 
            color: '#a3a3a3', 
            fontSize: '13px', 
            lineHeight: '1.4'
          }}>
            This action cannot be undone.
          </p>
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
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '4px',
              color: '#f2f2f2',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

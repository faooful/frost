'use client';

import { useState } from 'react';
import { FileInfo } from '@/lib/clientUtils';

interface CreateFileFormProps {
  onFileCreated: (file: FileInfo) => void;
  onCancel: () => void;
}

export function CreateFileForm({ onFileCreated, onCancel }: CreateFileFormProps) {
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!filename.trim() || !content.trim()) {
      setError('Filename and content are required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
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

      // Call the callback with the new file
      onFileCreated(data.file);
      
      // Reset form
      setFilename('');
      setContent('');
    } catch (error) {
      console.error('Error creating file:', error);
      setError(error instanceof Error ? error.message : 'Failed to create file');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Create New File
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="filename" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filename
          </label>
          <input
            type="text"
            id="filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="example.txt"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isCreating}
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter file content here..."
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={isCreating}
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-2 text-white rounded-md transition-colors duration-200"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#171717' }}
          >
            {isCreating ? 'Creating...' : 'Create File'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="px-4 py-2 text-white rounded-md transition-colors duration-200"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', backgroundColor: '#171717' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

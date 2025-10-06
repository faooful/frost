export interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  lastModified: string;
  content?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileIcon(extension: string): string {
  const iconMap: { [key: string]: string } = {
    '.txt': '',
    '.json': '',
    '.md': '',
    '.js': '',
    '.ts': '',
    '.jsx': '',
    '.tsx': '',
    '.css': '',
    '.html': '',
    '.png': '',
    '.jpg': '',
    '.jpeg': '',
    '.gif': '',
    '.svg': '',
    '.pdf': '',
    '.doc': '',
    '.docx': '',
    '.zip': '',
    '.tar': '',
    '.gz': '',
  };
  
  return iconMap[extension] || '';
}

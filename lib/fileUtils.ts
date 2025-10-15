import fs from 'fs';
import path from 'path';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  lastModified: string; // Changed to string for JSON serialization
  content?: string;
}

export async function getFilesFromFolder(folderPath: string): Promise<FileInfo[]> {
  try {
    const fullPath = path.join(process.cwd(), folderPath);
    const files = fs.readdirSync(fullPath);
    
    const fileInfos: FileInfo[] = [];
    
    // Files to exclude from the file list
    const excludedFiles = ['.gitkeep', '.DS_Store'];
    
    for (const file of files) {
      // Skip excluded files
      if (excludedFiles.includes(file)) {
        continue;
      }
      
      const filePath = path.join(fullPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        const extension = path.extname(file).toLowerCase();
        fileInfos.push({
          name: file,
          path: path.join(folderPath, file),
          size: stats.size,
          extension,
          lastModified: stats.mtime.toISOString(), // Convert to string
        });
      }
    }
    
    return fileInfos.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error reading folder:', error);
    return [];
  }
}

export async function getFileContent(filePath: string): Promise<string> {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    console.error('Error reading file:', error);
    return '';
  }
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

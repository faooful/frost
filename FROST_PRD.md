# Frost - Product Requirements Document (PRD)

## 🎯 Product Overview

**Frost** is an AI-powered file browser and analysis platform that combines traditional file management with intelligent content analysis. Built on Next.js with local AI processing via Ollama, it provides a modern, responsive interface for managing files while leveraging AI to extract insights and generate intelligent summaries.

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **AI Engine**: Ollama with Gemma2:27b (27.2B parameter model)
- **Backend**: Next.js API Routes
- **File System**: Local file operations with Node.js fs module
- **Caching**: Custom analysis cache system with Base64-encoded file hashes
- **Styling**: Tailwind CSS with custom dark theme

### Core Components
- **FileBrowser**: Main application container with 3-column layout
- **FileEditor**: Text editing component with real-time save functionality
- **InsightsPanel**: AI analysis display with markdown rendering
- **NewAnalysisPanel**: Analysis creation interface
- **MapView**: Visual file relationship mapping
- **CacheManager**: Analysis cache management interface

## 📋 Current Features

### 1. File Management System

#### File Operations
- **Create Files**: Create new text files with default "New file.txt" naming
- **Edit Files**: Real-time text editing with auto-save detection
- **Rename Files**: In-place filename editing with validation
- **Delete Files**: File deletion with confirmation dialog
- **File Navigation**: Click-to-select file browsing

#### File System Integration
- **Local Storage**: All files stored in `data/` directory
- **File Metadata**: Tracks file size, creation date, last modified
- **File Icons**: Dynamic file type icons based on extension
- **Security**: Path traversal protection for file operations

### 2. AI Analysis Engine

#### Analysis Capabilities
- **Streaming Analysis**: Real-time AI response streaming via Server-Sent Events
- **Custom Instructions**: User-defined analysis prompts
- **Content Analysis**: AI-powered insights on file content
- **Analysis Caching**: Intelligent caching system for performance
- **Multiple Analyses**: Support for multiple analysis types per file

#### Analysis Types
- **Summary Generation**: Concise content overviews
- **Key Points Extraction**: Important observations and structure analysis
- **Insights Discovery**: Pattern recognition and thematic analysis
- **Suggestions**: Recommendations for content improvement

### 3. User Interface

#### Layout System
- **3-Column Design**: File list, editor, AI insights
- **Responsive Layout**: Adaptive column sizing
- **Column Expansion**: Full-screen mode for editor or insights
- **Collapsible Panels**: Toggle file list visibility

#### Navigation Features
- **File List**: Hierarchical file browser with hover states
- **Active File Highlighting**: Visual indication of selected file
- **Quick Actions**: New file, delete, rename operations
- **Breadcrumb Navigation**: Clear file path indication

### 4. Analysis Management

#### Caching System
- **Smart Caching**: File content + instruction-based cache keys
- **Cache Persistence**: Disk-based cache storage in `.analysis-cache/`
- **Cache Invalidation**: Automatic cache updates on file changes
- **Cache Cleanup**: Automatic cleanup when files are deleted/renamed

#### Analysis History
- **Multiple Analyses**: Support for different analysis types per file
- **Analysis Tabs**: Tabbed interface for multiple cached analyses
- **Analysis Metadata**: Timestamps, instruction tracking, file associations
- **Analysis Comparison**: View different analysis results side-by-side

### 5. Real-time Features

#### Live Updates
- **Streaming Responses**: Real-time AI analysis progress
- **Progress Indicators**: Visual progress bars and ETA displays
- **Auto-save Detection**: Real-time unsaved changes tracking
- **State Synchronization**: Consistent state across components

#### Interactive Elements
- **Context Menus**: Right-click analysis on selected text
- **Hover States**: Interactive file list with visual feedback
- **Loading States**: Smooth loading indicators during operations
- **Error Handling**: Graceful error display and recovery

## 🔧 Technical Implementation

### API Endpoints

#### File Operations
- `GET /api/files` - List files in directory
- `POST /api/files/create` - Create new file
- `PUT /api/files/update` - Update file content
- `PUT /api/files/rename` - Rename file
- `DELETE /api/files` - Delete file
- `GET /api/files/content` - Get file content

#### AI Analysis
- `POST /api/analyze-stream` - Stream AI analysis
- `POST /api/analyze` - Standard AI analysis
- `POST /api/analyze-ollama` - Direct Ollama integration

#### Cache Management
- `POST /api/cache/list` - List cached analyses
- `POST /api/cache/clear` - Clear all cache
- `POST /api/cache/clear-specific` - Clear specific analysis
- `GET /api/cache/stats` - Cache statistics
- `GET /api/cache/check` - Check cache status

### Data Structures

#### File Information
```typescript
interface FileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: number;
  isDirectory: boolean;
}
```

#### Analysis Result
```typescript
interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  insights: string[];
  suggestions: string[];
  cached: boolean;
}
```

#### Cache Entry
```typescript
interface CacheEntry {
  id: string;
  filePath: string;
  contentLength: number;
  analysis: AnalysisResult;
  instructions: string;
  timestamp: number;
}
```

### State Management

#### Component State
- **File Selection**: Currently selected file and content
- **Save State**: Unsaved changes tracking and save functionality
- **Analysis State**: Current analysis progress and results
- **UI State**: Panel visibility, column expansion, modal states
- **Cache State**: Cached analyses and metadata

#### State Synchronization
- **Custom Events**: Inter-component communication via window events
- **Callback Props**: Parent-child state synchronization
- **useEffect Hooks**: Reactive state updates based on dependencies
- **Memoization**: Performance optimization with useCallback and useMemo

## 🎨 User Experience

### Visual Design
- **Dark Theme**: Consistent dark color scheme (#171717 background)
- **Blue Accent**: #68A6E4 primary color for highlights
- **Typography**: System font stack for optimal readability
- **Spacing**: Consistent 8px grid system
- **Borders**: Subtle borders with #2E2E2E color

### Interaction Patterns
- **Hover Effects**: Subtle background changes on interactive elements
- **Loading States**: Progress indicators and skeleton screens
- **Error States**: Clear error messages with recovery options
- **Success Feedback**: Visual confirmation of completed actions

### Accessibility
- **Keyboard Navigation**: Tab order and keyboard shortcuts
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG compliant color combinations
- **Focus Management**: Clear focus indicators and logical flow

## 🚀 Performance Features

### Optimization Strategies
- **Analysis Caching**: Intelligent caching prevents redundant AI calls
- **Lazy Loading**: Components load only when needed
- **Memoization**: React performance optimizations
- **Streaming**: Real-time AI responses without blocking UI
- **Debounced Saves**: Prevents excessive save operations

### Resource Management
- **Local Processing**: All AI analysis runs locally via Ollama
- **Memory Efficiency**: Optimized state management and cleanup
- **Disk Usage**: Efficient cache storage with automatic cleanup
- **Network Optimization**: Minimal API calls with intelligent caching

## 🔒 Security & Privacy

### Data Protection
- **Local Processing**: All AI analysis happens on user's machine
- **No External APIs**: No data sent to external services
- **Path Validation**: Protection against directory traversal attacks
- **Input Sanitization**: Proper validation of user inputs

### File System Security
- **Sandboxed Operations**: File operations restricted to data directory
- **Permission Checks**: Proper file system permission validation
- **Error Handling**: Secure error messages without information leakage
- **Cache Security**: Secure cache file naming and storage

## 📊 Current Limitations

### Known Issues
- **Circular Dependencies**: Some React component dependency issues
- **Fast Refresh**: Occasional full page reloads during development
- **File Type Support**: Currently limited to text files
- **Large File Handling**: No specific optimization for very large files

### Technical Debt
- **Code Duplication**: Some repeated patterns across components
- **Error Boundaries**: Missing comprehensive error boundary implementation
- **Testing**: Limited test coverage for components and API routes
- **Documentation**: Some inline documentation could be improved

## 🎯 Success Metrics

### Performance Indicators
- **Analysis Speed**: Time from request to first AI response
- **Cache Hit Rate**: Percentage of analyses served from cache
- **File Operation Speed**: Time to create, edit, or delete files
- **UI Responsiveness**: Time to update interface after user actions

### User Experience Metrics
- **File Management Efficiency**: Time to complete common file operations
- **Analysis Quality**: User satisfaction with AI-generated insights
- **Interface Usability**: Ease of navigation and feature discovery
- **Error Recovery**: Time to recover from errors or issues

## 🔮 Future Enhancement Opportunities

### Immediate Improvements
- **File Search**: Content-based file search functionality
- **Keyboard Shortcuts**: Power user keyboard navigation
- **File Previews**: Quick preview without opening files
- **Export Features**: Export analyses to various formats

### Advanced Features
- **Multi-user Support**: Collaborative file editing and analysis
- **Plugin System**: Extensible architecture for custom analysis types
- **Integration APIs**: Connect with external tools and services
- **Advanced Analytics**: Usage patterns and productivity insights

---

*This PRD reflects the current state of Frost as of the latest development cycle, including all implemented features, technical architecture, and known limitations.*

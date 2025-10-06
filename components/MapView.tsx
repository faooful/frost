'use client';

import { useState, useEffect } from 'react';
import { FileInfo } from '@/lib/clientUtils';

interface MapViewProps {
  selectedFile: FileInfo | null;
  fileContent: string;
  cachedAnalyses: any[];
  isVisible: boolean;
  onClose: () => void;
}

interface Persona {
  name: string;
  needs: { text: string; sourceFile: string; sourceAnalysis: string }[];
  painPoints: { text: string; sourceFile: string; sourceAnalysis: string }[];
  requests: { text: string; sourceFile: string; sourceAnalysis: string }[];
  mentions: number;
}

interface AnalysisData {
  id: string;
  instructions: string;
  summary: string;
  timestamp: number;
  filePath: string;
  analysis: any;
}

export function MapView({ selectedFile, fileContent, cachedAnalyses, isVisible, onClose }: MapViewProps) {
  const [allAnalyses, setAllAnalyses] = useState<AnalysisData[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchAllAnalyses();
    }
  }, [isVisible]);

  const fetchAllAnalyses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cache/list-all');
      const data = await response.json();
      setAllAnalyses(data);
      extractPersonas(data);
    } catch (error) {
      console.error('Error fetching analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractPersonas = (analyses: AnalysisData[]) => {
    const personaMap = new Map<string, Persona>();

    analyses.forEach(analysis => {
      const analysisText = extractAnalysisText(analysis.analysis);
      const fileName = analysis.filePath.split('/').pop() || analysis.filePath;
      
      // Extract personas using common patterns
      const personaPatterns = [
        /persona[s]?:?\s*([^.!?]+)/gi,
        /user[s]?:?\s*([^.!?]+)/gi,
        /customer[s]?:?\s*([^.!?]+)/gi,
        /client[s]?:?\s*([^.!?]+)/gi,
        /stakeholder[s]?:?\s*([^.!?]+)/gi
      ];

      personaPatterns.forEach(pattern => {
        const matches = analysisText.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const personaName = match[1].trim().toLowerCase();
            if (!personaMap.has(personaName)) {
              personaMap.set(personaName, {
                name: personaName,
                needs: [],
                painPoints: [],
                requests: [],
                mentions: 0
              });
            }
            personaMap.get(personaName)!.mentions++;
          }
        }
      });

      // Extract needs, pain points, and requests
      const needsPatterns = [
        /need[s]?:?\s*([^.!?]+)/gi,
        /requir[es]?:?\s*([^.!?]+)/gi,
        /want[s]?:?\s*([^.!?]+)/gi
      ];

      const painPointPatterns = [
        /pain\s*point[s]?:?\s*([^.!?]+)/gi,
        /problem[s]?:?\s*([^.!?]+)/gi,
        /issue[s]?:?\s*([^.!?]+)/gi,
        /frustrat[ed|ion]:?\s*([^.!?]+)/gi,
        /challeng[es]?:?\s*([^.!?]+)/gi
      ];

      const requestPatterns = [
        /request[s]?:?\s*([^.!?]+)/gi,
        /ask[s]?:?\s*([^.!?]+)/gi,
        /demand[s]?:?\s*([^.!?]+)/gi,
        /suggest[s]?:?\s*([^.!?]+)/gi
      ];

      // Add needs
      needsPatterns.forEach(pattern => {
        const matches = analysisText.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const need = match[1].trim();
            // Try to associate with a persona
            const associatedPersona = findAssociatedPersona(need, Array.from(personaMap.values()));
            if (associatedPersona) {
              associatedPersona.needs.push({
                text: need,
                sourceFile: fileName,
                sourceAnalysis: analysis.instructions
              });
            }
          }
        }
      });

      // Add pain points
      painPointPatterns.forEach(pattern => {
        const matches = analysisText.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const painPoint = match[1].trim();
            const associatedPersona = findAssociatedPersona(painPoint, Array.from(personaMap.values()));
            if (associatedPersona) {
              associatedPersona.painPoints.push({
                text: painPoint,
                sourceFile: fileName,
                sourceAnalysis: analysis.instructions
              });
            }
          }
        }
      });

      // Add requests
      requestPatterns.forEach(pattern => {
        const matches = analysisText.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            const request = match[1].trim();
            const associatedPersona = findAssociatedPersona(request, Array.from(personaMap.values()));
            if (associatedPersona) {
              associatedPersona.requests.push({
                text: request,
                sourceFile: fileName,
                sourceAnalysis: analysis.instructions
              });
            }
          }
        }
      });
    });

    // Convert to array and sort by mentions
    const personaArray = Array.from(personaMap.values()).sort((a, b) => b.mentions - a.mentions);
    setPersonas(personaArray);
  };

  const extractAnalysisText = (analysis: any): string => {
    if (typeof analysis === 'string') {
      return analysis;
    }
    
    if (typeof analysis === 'object' && analysis !== null) {
      const textParts = [];
      if (analysis.summary) textParts.push(analysis.summary);
      if (analysis.insights && Array.isArray(analysis.insights)) {
        textParts.push(analysis.insights.join(' '));
      }
      if (analysis.keyPoints && Array.isArray(analysis.keyPoints)) {
        textParts.push(analysis.keyPoints.join(' '));
      }
      if (analysis.suggestions && Array.isArray(analysis.suggestions)) {
        textParts.push(analysis.suggestions.join(' '));
      }
      return textParts.join(' ');
    }
    
    return '';
  };

  const findAssociatedPersona = (text: string, personas: Persona[]): Persona | null => {
    // Simple association logic - look for persona names in the text
    const textLower = text.toLowerCase();
    for (const persona of personas) {
      if (textLower.includes(persona.name)) {
        return persona;
      }
    }
    return null;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: isVisible ? 'block' : 'none'
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#171717',
        borderRadius: '8px',
        border: '1px solid #2E2E2E',
        padding: '20px',
        width: '90%',
        maxWidth: '1400px',
        height: '85%',
        maxHeight: '900px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          borderBottom: '1px solid #2E2E2E',
          paddingBottom: '15px'
        }}>
          <h2 style={{ 
            color: '#f2f2f2', 
            fontSize: '18px', 
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontWeight: 'bold',
            margin: 0
          }}>
            Personas & Insights Dashboard
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#f2f2f2',
              cursor: 'pointer',
              padding: '8px',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', gap: '20px', overflow: 'hidden' }}>
          {/* Personas List */}
          <div style={{
            width: '300px',
            border: '1px solid #2E2E2E',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#1F1F1F',
            overflow: 'auto'
          }}>
            <h3 style={{
              color: '#f2f2f2',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '16px',
              margin: '0 0 16px 0'
            }}>
              Personas ({personas.length})
            </h3>
            
            {isLoading ? (
              <div style={{ color: '#f2f2f2', fontSize: '13px' }}>Loading...</div>
            ) : personas.length === 0 ? (
              <div style={{ color: '#888', fontSize: '13px' }}>No personas found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {personas.map((persona, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedPersona(persona)}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: selectedPersona?.name === persona.name ? '#2E2E2E' : '#262626',
                      border: '1px solid #404040',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      color: '#f2f2f2',
                      fontSize: '13px',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      {persona.name.charAt(0).toUpperCase() + persona.name.slice(1)}
                    </div>
                    <div style={{
                      color: '#888',
                      fontSize: '11px'
                    }}>
                      {persona.mentions} mentions
                    </div>
                    <div style={{
                      color: '#888',
                      fontSize: '11px'
                    }}>
                      {persona.needs.length + persona.painPoints.length + persona.requests.length} insights
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Persona Details */}
          <div style={{
            flex: 1,
            border: '1px solid #2E2E2E',
            borderRadius: '8px',
            padding: '16px',
            backgroundColor: '#1F1F1F',
            overflow: 'auto'
          }}>
            {selectedPersona ? (
              <div>
                <h3 style={{
                  color: '#f2f2f2',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '20px',
                  margin: '0 0 20px 0'
                }}>
                  {selectedPersona.name.charAt(0).toUpperCase() + selectedPersona.name.slice(1)}
                </h3>

                {/* Needs */}
                {selectedPersona.needs.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{
                      color: '#68A6E4',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '12px'
                    }}>
                      Needs ({selectedPersona.needs.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedPersona.needs.map((need, index) => (
                        <div key={index} style={{
                          padding: '12px',
                          backgroundColor: '#262626',
                          borderRadius: '6px',
                          border: '1px solid #404040'
                        }}>
                          <div style={{
                            color: '#f2f2f2',
                            fontSize: '13px',
                            marginBottom: '8px'
                          }}>
                            {need.text}
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '12px',
                            fontSize: '11px',
                            color: '#888'
                          }}>
                            <span>📄 {need.sourceFile}</span>
                            <span>🔍 {need.sourceAnalysis}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pain Points */}
                {selectedPersona.painPoints.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{
                      color: '#ff6b6b',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '12px'
                    }}>
                      Pain Points ({selectedPersona.painPoints.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedPersona.painPoints.map((painPoint, index) => (
                        <div key={index} style={{
                          padding: '12px',
                          backgroundColor: '#262626',
                          borderRadius: '6px',
                          border: '1px solid #404040'
                        }}>
                          <div style={{
                            color: '#f2f2f2',
                            fontSize: '13px',
                            marginBottom: '8px'
                          }}>
                            {painPoint.text}
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '12px',
                            fontSize: '11px',
                            color: '#888'
                          }}>
                            <span>📄 {painPoint.sourceFile}</span>
                            <span>🔍 {painPoint.sourceAnalysis}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requests */}
                {selectedPersona.requests.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{
                      color: '#51cf66',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '12px'
                    }}>
                      Requests ({selectedPersona.requests.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedPersona.requests.map((request, index) => (
                        <div key={index} style={{
                          padding: '12px',
                          backgroundColor: '#262626',
                          borderRadius: '6px',
                          border: '1px solid #404040'
                        }}>
                          <div style={{
                            color: '#f2f2f2',
                            fontSize: '13px',
                            marginBottom: '8px'
                          }}>
                            {request.text}
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '12px',
                            fontSize: '11px',
                            color: '#888'
                          }}>
                            <span>📄 {request.sourceFile}</span>
                            <span>🔍 {request.sourceAnalysis}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPersona.needs.length === 0 && selectedPersona.painPoints.length === 0 && selectedPersona.requests.length === 0 && (
                  <div style={{ color: '#888', fontSize: '13px' }}>
                    No detailed insights found for this persona.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#888',
                fontSize: '14px'
              }}>
                Select a persona to view detailed insights
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
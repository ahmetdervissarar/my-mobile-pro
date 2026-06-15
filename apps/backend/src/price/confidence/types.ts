export type DataConfidenceLevel = 'low' | 'medium' | 'high';

export interface DataConfidenceResult {
  level: DataConfidenceLevel;
  reasons: string[];
}

// Defined based on "Ease of use metric for Cloud Product" standard

export enum Dimension {
  OPERABILITY = '易操作性', // Operability
  LEARNABILITY = '易学性', // Learnability
  CLARITY = '清晰性', // Clarity
}

export enum IssueSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

export enum IssueFrequency {
  LOW = 1, // <30% users
  MEDIUM = 2, // 30-70% users
  HIGH = 3, // >70% users
}

export enum FixCost {
  LOW = 0.5, // Simple frontend tweak (<1 day)
  MEDIUM = 1, // Complex frontend (1-10 days)
  HIGH = 1.5, // Functionality/Backend (>10 days)
}

export enum PriorityLevel {
  LOW = 'Low', // [0.5, 3)
  MEDIUM = 'Medium', // [3, 6)
  HIGH = 'High', // [6, 10)
  URGENT = 'Urgent', // [10, 13.5]
}

export interface MetricScore {
  id: number;
  question: string;
  score: number; // 1-10
  dimension: Dimension;
  comment: string;
}

export interface UsabilityIssue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  frequency: IssueFrequency;
  fixCost: FixCost;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  location: string;
}

export interface AnalysisResult {
  title?: string; // Generated title
  overallScore: number; // 0-10
  ratingLevel: '较差' | '一般' | '优秀' | '卓越';
  dimensions: {
    [key in Dimension]: number;
  };
  metrics: MetricScore[];
  issues: UsabilityIssue[];
  summary: string;
  recommendations: string[];
  sourceUrl?: string; // Optional URL for Figma or other sources
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  previewUrl: string;
  result: AnalysisResult;
  userId?: string;
  userName?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}
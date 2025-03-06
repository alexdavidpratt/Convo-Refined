export interface Conversation {
  id: string;
  title: string;
  description?: string;
  participants: string[];
  created_at: string;
  topics: Topic[];
  responses: Response[];
  images: string[];
}

export interface Topic {
  id: string;
  content: string;
  isCompleted: boolean;
  responses?: Response[];
}

export interface Response {
  id: string;
  topicId: string;
  content: string;
  timestamp: Date;
  keyPoints: string[];
  speaker: string;
  participants: string;  
}
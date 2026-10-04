export interface MemorySource {
  id: string
  title: string
  kind: string
  date: string
  excerpt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
  sources?: MemorySource[]
}

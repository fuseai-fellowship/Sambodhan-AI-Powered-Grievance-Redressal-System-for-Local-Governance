export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  ward_id?: number;
  ward_name?: string;
  municipality_name?: string;
  district_name?: string;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface Complaint {
  id: number;
  message: string;
  department: string;
  urgency: string;
  status: string;
  district?: string;
  municipality?: string;
  ward?: string;
  created_at: string;
  updated_at?: string;
}

export interface ChatMessage {
  message: string;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  session_id?: string;
  context?: Record<string, any>;
}

export interface ChatReply {
  reply: string;
  intent: string;
  next_step?: string;
  data?: Record<string, any>;
}

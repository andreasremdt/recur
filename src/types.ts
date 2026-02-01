export type Vocabulary = {
  id: string;
  front: string;
  back: string;
  box: number;
  next_review: string;
  user_id: string | null;
  language_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Language = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type Session = {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
};

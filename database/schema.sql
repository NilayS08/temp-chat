-- Run this in your Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  user_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chats (
  chat_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE owner_tokens (
  token     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id   UUID NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
  owner_id  UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  message_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
  sender_id   UUID,              -- NULL = anonymous guest
  sender_name VARCHAR(50) NOT NULL DEFAULT 'Guest',
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('owner', 'guest')),
  content     TEXT NOT NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  session_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
  nickname    VARCHAR(50),
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast message queries
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_timestamp ON messages(chat_id, timestamp);
CREATE INDEX idx_sessions_chat_id ON sessions(chat_id);
```
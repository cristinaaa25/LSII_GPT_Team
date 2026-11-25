-- Speeds up per-user watch history queries and clearing history (setting user_id to NULL).
CREATE INDEX idx_video_views_user_id ON video_views (user_id, viewed_at);

CREATE TABLE video_likes (
    user_id BIGINT NOT NULL,
    video_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_video_likes PRIMARY KEY (user_id, video_id),
    CONSTRAINT fk_video_likes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_video_likes_video FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE,
    CONSTRAINT uq_video_likes_user_video UNIQUE (user_id, video_id)
);

CREATE INDEX idx_video_likes_video_id ON video_likes (video_id);
CREATE INDEX idx_video_likes_user_id ON video_likes (user_id);

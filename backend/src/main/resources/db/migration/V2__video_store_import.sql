ALTER TABLE videos ADD COLUMN store_id BIGINT;
ALTER TABLE videos ADD COLUMN view_count BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE videos ADD COLUMN like_count BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE videos ADD CONSTRAINT uq_videos_store_id UNIQUE (store_id);

CREATE TABLE video_categories (
    video_id BIGINT NOT NULL,
    category VARCHAR(255) NOT NULL,
    CONSTRAINT fk_video_categories_video FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
);

CREATE TABLE video_tags (
    video_id BIGINT NOT NULL,
    tag VARCHAR(255) NOT NULL,
    CONSTRAINT fk_video_tags_video FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
);

CREATE INDEX idx_video_categories_video_id ON video_categories (video_id);
CREATE INDEX idx_video_tags_video_id ON video_tags (video_id);
CREATE INDEX idx_videos_created_at ON videos (created_at);

-- A user (subscriber) follows another user's channel (channel). The primary key makes the pair unique and the
-- CHECK forbids subscribing to yourself. Rows go away with either user.
CREATE TABLE subscriptions (
    subscriber_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT pk_subscriptions PRIMARY KEY (subscriber_id, channel_id),
    CONSTRAINT fk_subscriptions_subscriber FOREIGN KEY (subscriber_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_channel FOREIGN KEY (channel_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_subscriptions_not_self CHECK (subscriber_id <> channel_id)
);

-- The primary key already serves lookups by subscriber_id; this one serves subscriber counts per channel
CREATE INDEX idx_subscriptions_channel_id ON subscriptions (channel_id);

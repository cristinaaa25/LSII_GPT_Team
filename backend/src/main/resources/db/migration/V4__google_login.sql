-- Google login: users created from a Google account are identified by Google's stable "sub" claim and have
-- no local password (they cannot use password login).
ALTER TABLE users ADD COLUMN google_sub VARCHAR(255);
ALTER TABLE users ADD CONSTRAINT uq_users_google_sub UNIQUE (google_sub);
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

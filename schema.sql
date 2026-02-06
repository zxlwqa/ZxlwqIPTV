DROP TABLE IF EXISTS user_settings;
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  favorites TEXT,
  custom_logos TEXT,
  custom_urls TEXT,
  playlist_url TEXT,
  skip_intro TEXT,
  intro_end TEXT,
  outro_start TEXT,
  updated_at INTEGER
);

DROP TABLE IF EXISTS custom_channels;
CREATE TABLE custom_channels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  "group" TEXT NOT NULL DEFAULT '我的收藏',
  logo TEXT,
  url TEXT NOT NULL,
  tvg_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
-- POSTGRES 의 SQL 선언용
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
-- USERS
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  google_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  profile_image_link TEXT, -- URL이지만 인코딩될수 있으니 TEXT 사용
  name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
-- ROOMS

CREATE TABLE IF NOT EXISTS rooms (
  id BIGSERIAL PRIMARY KEY,
  room_code VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(100),
  host_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  room_type VARCHAR(20) NOT NULL, -- P2P VS GROUP
  password_hash VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 로우가 생긴 시점
  started_at TIMESTAMPTZ, -- 생성 후 연결이 시작된 시점
  closed_at TIMESTAMPTZ, -- 통화가 종료된 시점

  CONSTRAINT rooms_type_check
    CHECK (room_type IN ('p2p', 'group')),
  CONSTRAINT rooms_status_check
    CHECK (status IN ('waiting', 'active', 'closed'))
);

-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
-- ROOM_PARTICIPANTS
CREATE TABLE IF NOT EXISTS room_participants (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'participant',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  CONSTRAINT room_participants_role_check
    CHECK (role IN ('host', 'participant'))
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id
ON room_participants(room_id);

CREATE INDEX IF NOT EXISTS idx_room_participants_user_id
ON room_participants(user_id);

-- 같은 방에 같은 사용자가 동시에 2번 참여 중인 상태 방지
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_participants_active_user
ON room_participants(room_id, user_id)
WHERE left_at IS NULL;

-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
-- ACTIVITY_LOGS

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  target_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  room_id BIGINT REFERENCES rooms(id) ON DELETE SET NULL,
  socket_id VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- set_updated_at() 함수 실행 시 변경되는 행에 대해서 updated_at을 NOW()로 바꿔주기
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 만들기전에 없애주기
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

-- 
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
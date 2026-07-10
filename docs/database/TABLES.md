- `USERS`
    
    ```markdown
    users <!-- Google OAuth 라서 비번 없이 -->
    - id: 사용자 아이디
    - google_id: 구글 계정 식별자 (`sub` - subject의 약)
    - email: 구글 이메일
    - profile_image: 구글 프로필
    - name: 사용자 이름
    - created_at: 사용자 최초 로그인
    - updated_at: 이름/이메일/프로필 변경 감지
    - last_login_at: 빠른 조회를 위한 컬럼.(중요한건 아님)
    ```
    
- `ROOMS`
    
    ```markdown
    rooms
    - id: 방 식별자
    - room_code: 랜덤 코드 (링크로도 활용 가능) UNIQUE
    - title: 방 제목
    - host_user_id: 방장 아이디
    - type: [`p2p`, `group`]
    - password_hash: 방 비밀번호, NULL 허용
    - status: [`waiting`, `active`, `closed`]
    - created_at
    - started_at
    - closed_at
    ```
    
- `ROOM_PARTICIPANTS`
    
    ```markdown
    room_participants
    - id
    - room_id: 방 fk
    - user_id: 사용자 fk
    - role: [`host`, `participant`]
    - joined_at
    - left_at
    ```
    
- `ACTIVITY_LOGS`
    
    ```markdown
    activity_logs
    - id
    - event_type: [`login`, `logout`, `socket_connect`, 등 ]
    - actor_user_id: 사용자fk
    - target_user_id: 초대의 경우 대상 사용자 fk
    - room_id: 초대 또는 입장 퇴장 등
    - socket_id: 사용자 소켓 아이디
    - metadata: 기타 정보를 위한 JSONB 타입
    - created_at
    ```
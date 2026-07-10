# [2026-07-10 13:22:59] DB 관리에 대해서
현재 개발 환경에서는 `postgres`가 존재하지 않음과 동시에 이미 오라클/MySQL이 깔려져있어 새로 깔기도 애매한 상황입니다.

따라서 `Docker` 컨테이너를 이용해서 그냥 개발을 할 생각이며 이참에 나중에 서버도 자동화 할 수 있게 미리 `docker-compose.yml` 파일을 만들어 둘 생각입니다.

해당 파일같은 경우에는 임시로 `container/`로 만들것이며 향후 새로운 방식이 사용되면 그때 바꾸겠습니다.

---

## Postgres의 특징
일단 `postgres`의 `url`은 다른 DB와 동일하게 `프로토콜[postgres]://[사용자명]:[사용자_PW]@[DB_HOST]:[PORT(보통5432)]/[데이터베이스_이름]` 정도가 됩니다.

관리자의 경우에는 보통 `postgres`이며 `Docker`공식 `Postgres`이미지에는 `POSTGRES_USER=원하는 이름`을 통해 소유자 설정을 할 수 있습니다. (주지 않으면 `postgres`가 됩니다.)

> 제가 `postgres`를 사용하는 이유는 `JSONB`를 한번 써보고 싶어서 입니다(+MySQL보다 오픈소스지향). 많이 안사용한 DB이기도 하고. 추가로 대규모 처리가 MySQL보다 효율적 및 락이 느슨하다고 하네요.

추가로 Docker의 postgres를 사용하면서 encoding, collation 등이 `latin`. `arabic` 등이였던 경우가 있었는데 이번에는 `utf8mb4` (없으면 그냥 `utf8`)을 신경써서 설정해주겠습니다. 
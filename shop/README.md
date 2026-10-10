# Hearth & Hand — 3-tier e-commerce (Nginx + Node/Express + MySQL 8)

    Browser -> frontend (Nginx :8080) -> /api -> backend (Express :3000) -> db (MySQL 8)

## Run
    docker compose up -d --build
    open http://localhost:8080

Edit `.env` first and change every `change_me` value (it is git-ignored).

## Notes
- Only the frontend port is published. `db` sits on an internal network.
- DB schema and sample products load automatically from `db/init.sql` on the first start.
  To re-seed: `docker compose down -v && docker compose up -d --build`
- API: GET /api/health, GET /api/products, POST /api/auth/register|login, POST|GET /api/orders
- Passwords: bcrypt. Auth: JWT (8h). Helmet, rate limiting, parameterized SQL,
  and transactional stock checks (row locks) when ordering.
- Containers: backend runs as non-root, healthchecks on all three tiers, ordered startup.

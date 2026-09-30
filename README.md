# My Trails API

NestJS and PostgreSQL backend for recording, syncing, editing, and publishing trails.

## Local setup

```bash
cp .env.example .env
npm ci
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

The API and Swagger UI are served under `/api`. Set both JWT secrets to independent random values of at least 32 characters.

## Production

Build the included image and mount persistent storage at the configured `UPLOAD_DIR`:

```bash
docker build -t my-trails-api .
docker run --env-file .env -p 4000:4000 -v my-trails-uploads:/app/uploads my-trails-api
```

Required configuration:

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: access-token signing secret, at least 32 characters.
- `JWT_REFRESH_SECRET`: separate refresh-token secret, at least 32 characters.
- `CORS_ORIGINS`: comma-separated allowed web origins.
- `UPLOAD_DIR`: persistent upload directory; defaults to `uploads`.
- `PORT`: HTTP port; defaults to `4000`.

The container applies committed migrations before starting the API.

## Trail lifecycle

- `POST /api/hikes/sync` creates or refreshes the same owned draft for a recording UUID.
- `GET /api/trails/mine` returns the authenticated user's trails.
- `GET /api/trails/:id/edit` returns an owner/admin editable trail with recording data.
- `PATCH /api/trails/:id` merges supplied edits while preserving omitted data.
- `POST /api/trails/:id/publish` validates and idempotently publishes the same trail ID.
- Public trail list and detail routes return active trails only.

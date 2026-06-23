# AI Media Suite

AI Media Suite is a standalone module in the Velynxia Growth Platform.

Phase 1 implements Voice Studio and keeps the architecture ready for future modules.

## Implemented Module

- Voice Studio (MVP)

## Future Modules

- Script Studio
- Podcast Studio
- Video Studio
- Avatar Studio
- Subtitle Studio
- Background Music Studio

## Tech Stack

Platform Baseline Alignment:

- This app follows the common Velynxia framework baseline used across Growth apps.
- Database is intentionally PostgreSQL + Prisma for this app (exception to SQLite baseline).
- Shared toolkit dependencies are included for cross-app consistency: `dnd-kit`, `nodemailer`, `twilio`, `jspdf`, `jspdf-autotable`.

Framework:

- Next.js 16 App Router

Language:

- TypeScript

UI:

- React 19
- Tailwind CSS 4

Authentication:

- next-auth

Database:

- PostgreSQL

ORM:

- Prisma

AI Provider:

- OpenAI

Storage:

- Local filesystem

Deployment:

- Docker
- Docker Compose
- Raspberry Pi 5
- Cloudflare Tunnel

## Voice Studio Features

- Text input (max 5000 characters)
- Voice selection (alloy, ash, ballad, coral, echo, sage, shimmer)
- Speed control (0.5x to 2.0x)
- Generate MP3 with gpt-4o-mini-tts
- Built-in audio player
- Download MP3
- Copy URL
- History and delete
- Statistics dashboard

## API Routes

- POST /api/media/voice/generate
- GET /api/media/voice/history
- DELETE /api/media/voice/[id]
- GET /api/media/voice/statistics

## Project Layout

- app/dashboard/voice-studio: Voice Studio page
- app/dashboard/script-studio: Coming soon page
- app/dashboard/podcast-studio: Coming soon page
- app/dashboard/video-studio: Coming soon page
- app/api/media/voice: Voice API handlers
- app/media/audio/[...path]: Local audio file serving route
- components/layout: Dashboard shell components
- components/voice-studio: Voice Studio UI client component
- lib/auth: next-auth config and user resolution
- lib/db: Prisma client
- lib/providers: Provider interfaces and provider factory
- lib/openai: OpenAI voice provider
- lib/storage: Local file storage service
- prisma: Prisma schema
- storage/audio: Generated audio files
- deploy/nginx: Nginx reverse proxy
- deploy/cloudflared: Cloudflare tunnel config

## Database Model

MediaGenerations table fields:

- id (UUID)
- userId (UUID)
- moduleType
- title
- inputText
- voice
- speed
- duration
- outputUrl
- status
- createdAt
- updatedAt

Enums:

- ModuleType: VOICE, SCRIPT, PODCAST, VIDEO, AVATAR
- GenerationStatus: PENDING, PROCESSING, COMPLETED, FAILED

## Local Development

1. Copy .env.example to .env.
2. Install dependencies:

	npm install

3. Generate Prisma client:

	npm run prisma:generate

4. Run migrations:

	npm run prisma:migrate

5. Start app:

	npm run dev

6. Open:

- http://localhost:3000

## Docker Run

1. Configure .env.
2. Start services:

	docker compose up --build -d

Note:

- The `migrate` service runs Prisma migrations once (`prisma migrate deploy`) before `aimedia` starts.
- If you need to rerun migrations manually: `docker compose run --rm migrate`

3. Open:

- http://localhost:8080

## Cloudflare Tunnel

After setting CLOUDFLARE_TUNNEL_TOKEN:

docker compose --profile tunnel up -d

Set hostname aimedia.velynxia.com to the tunnel.

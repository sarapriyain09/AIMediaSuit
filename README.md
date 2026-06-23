# AI Media Suite

AI Media Suite is a standalone module in the Velynxia Growth Platform.

Phase 1 implements Voice Studio and keeps the architecture ready for future modules.

## Implemented Module

- Voice Studio (MVP)
	- Create
	- My Voices
	- Templates
	- History
- Script Studio (Phase 1)
	- Script input controls (goal, tone, length, audience, CTA)
	- Template presets
	- AI script generation
	- Editable output with copy/download
- Script Studio (Phase 2)
	- My Scripts and History tabs
	- Database persistence for generated scripts
	- Script delete and statistics APIs
	- PDF export (jsPDF + jspdf-autotable)
- Script Studio (Phase 3)
	- Favorite and duplicate actions for scripts
	- Favorites filter in History
	- Drag-and-drop template ordering (dnd-kit)
	- Handoff to Voice Studio with script prefill

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

Default Admin Login:

- Email: admin@velynxia.com
- Password: Velynxia@2024!
- Configure with env vars: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USER_ID

Database:

- PostgreSQL

ORM:

- Prisma

AI Provider:

- OpenAI

Shared Toolkit Baseline:

- dnd-kit
- nodemailer
- Twilio
- jsPDF
- jspdf-autotable

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

## Authentication

- Home route provides admin login UI.
- Dashboard routes require an authenticated next-auth session.
- Credentials provider supports email/password sign-in.

## API Routes

- POST /api/media/voice/generate
- GET /api/media/voice/history
- DELETE /api/media/voice/[id]
- GET /api/media/voice/statistics
- POST /api/media/script/generate
- GET /api/media/script/history
- DELETE /api/media/script/[id]
- GET /api/media/script/statistics

## Project Layout

- app/dashboard/voice-studio: Voice Studio page
- app/dashboard/script-studio: Script Studio page
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

ScriptGeneration table fields:

- id (UUID)
- userId (UUID)
- title
- prompt
- outputText
- goal
- tone
- length
- audience
- callToAction
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

## Security Maintenance

- Run `npm audit` regularly.
- Apply safe fixes with `npm audit fix`.
- Some advisories may require semver-major upgrades; validate app compatibility before using force upgrades.

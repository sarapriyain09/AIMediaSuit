# AI Media Suite

AI Media Suite is a standalone module in the Velynxia Growth Platform.

Voice, Script, Presentation, Podcast, and Subtitle modules are implemented. Background Music Studio is the next active build target.

## Studio Build Order

1. ✅ Voice Studio
2. ✅ Script Studio
3. ✅ Presentation Studio
4. ✅ Podcast Studio
5. ✅ Subtitle Studio
6. ✅ Background Music Studio
7. ✅ Video Studio
8. ✅ Avatar Studio

## Current Build Focus

- Background Music Studio (Studio 6) is the next module to build.

## Implemented Modules

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
- Presentation Studio (Phase 1)
	- Deck input controls (goal, tone, length, audience, topic)
	- Template presets
	- AI slide/deck generation
	- My Decks, Templates, History, Favorites, Duplicate, Delete
	- Editable output with copy/download
- Podcast Studio (Phase 1 + Phase 2 beta)
	- Episode planning and script generation
	- Templates, history, favorites, duplicate, delete
	- Multi-speaker segment generation
	- Segment audio + stitched episode output (beta)
- Subtitle Studio (Phase 1)
	- Subtitle input controls (topic, language, format, tone)
	- Template presets
	- AI subtitle generation (SRT/VTT/Captions)
	- My Subtitles, Templates, History, Favorites, Duplicate, Delete
	- Editable output with copy/download
- Video Studio (Phase 1)
	- Video brief controls (topic, audience, style, ratio, duration)
	- Template presets
	- AI storyboard/scene generation
	- My Videos, Templates, History, Favorites, Duplicate, Delete
	- Editable output with copy/download

## Future Modules

- Background Music Studio
- Video Studio
- Avatar Studio

## Tech Stack

- Framework: Next.js 16 (App Router)
- Language: TypeScript
- UI: React 19 + Tailwind CSS 4
- Auth: next-auth
- Database: better-Postgres
- Drag and drop: dnd-kit
- Email transport: nodemailer
- SMS transport: Twilio
- PDF output: jsPDF + jspdf-autotable
- Linting: ESLint (Next config)
- ORM: Prisma
- AI Provider: OpenAI

Default Admin Login:

- Email: admin@velynxia.com
- Password: Velynxia@2024!
- Configure with env vars: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USER_ID

Storage:

- Local filesystem

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
- PATCH /api/media/script/[id]
- POST /api/media/script/[id]
- POST /api/media/podcast/generate
- GET /api/media/podcast/history
- DELETE /api/media/podcast/[id]
- PATCH /api/media/podcast/[id]
- POST /api/media/podcast/[id]
- GET /api/media/podcast/statistics
- POST /api/media/presentation/generate
- GET /api/media/presentation/history
- DELETE /api/media/presentation/[id]
- PATCH /api/media/presentation/[id]
- POST /api/media/presentation/[id]
- GET /api/media/presentation/statistics
- POST /api/media/subtitle/generate
- GET /api/media/subtitle/history
- DELETE /api/media/subtitle/[id]
- PATCH /api/media/subtitle/[id]
- POST /api/media/subtitle/[id]
- GET /api/media/subtitle/statistics
- POST /api/media/video/generate
- GET /api/media/video/history
- DELETE /api/media/video/[id]
- PATCH /api/media/video/[id]
- POST /api/media/video/[id]
- GET /api/media/video/statistics

## Project Layout

- app/dashboard/voice-studio: Voice Studio page
- app/dashboard/script-studio: Script Studio page
- app/dashboard/presentation-studio: Presentation Studio page
- app/dashboard/podcast-studio: Podcast Studio page
- app/dashboard/subtitle-studio: Subtitle Studio page
- app/dashboard/video-studio: Coming soon page
- app/api/media/voice: Voice API handlers
- app/api/media/script: Script API handlers
- app/api/media/presentation: Presentation API handlers
- app/api/media/podcast: Podcast API handlers
- app/api/media/subtitle: Subtitle API handlers
- app/api/media/video: Video API handlers
- app/media/audio/[...path]: Local audio file serving route
- components/layout: Dashboard shell components
- components/voice-studio: Voice Studio UI client component
- components/subtitle-studio: Subtitle Studio UI client component
- components/video-studio: Video Studio UI client component
- lib/auth: next-auth config and user resolution
- lib/db: Prisma client
- lib/providers: Provider interfaces and provider factory
- lib/openai: OpenAI voice provider
- lib/storage: Local file storage service
- prisma: Prisma schema
- storage/audio: Generated audio files

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

## Deployment

- Local dev runtime via `npm run dev`

## Security Maintenance

- Run `npm audit` regularly.
- Apply safe fixes with `npm audit fix`.
- Some advisories may require semver-major upgrades; validate app compatibility before using force upgrades.

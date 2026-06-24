# AI Media Suite

AI Media Suite is a standalone module in the Velynxia Growth Platform.

Voice, Script, Presentation, Podcast, Subtitle, and Video modules are implemented. Background Music Studio has started (Phase 1), and Avatar Studio has started (Phase 2).

## Studio Build Order

1. ✅ Voice Studio
2. ✅ Script Studio
3. ✅ Presentation Studio
4. ✅ Podcast Studio
5. ✅ Subtitle Studio
6. 🔨 Background Music Studio (Phase 1 started)
7. ✅ Video Studio
8. 🔨 Avatar Studio (Phase 2 started)

## Current Build Focus

- Background Music Studio (Studio 6) is actively in development.
- Avatar Studio is now active with Phase 2 queue/sync workflows.

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
- Presentation Studio (Phase 2)
	- AI image integration for slide visuals
	- Subtitle support (generate, edit, translate, reorder cues)
	- Voice-over enhancement (voice, speed, trim, preview)
	- Collaboration tools (comments and version snapshots)
	- Expanded Presentation APIs for images, subtitles, voice-over, comments, and versions
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
- Video Studio (Phase 2 MVP)
	- Scene timeline editor (caption, voiceover, image, duration, transition)
	- Per-scene voice generation with OpenAI TTS
	- Subtitle burn-in from generated SRT cues
	- Background music selection and volume mix controls
	- FFmpeg render pipeline with MP4 export
	- Stock image auto-fill via Pexels/Pixabay search APIs

## Future Modules

- None

## Studio Complexity Overview

- Background Music Studio has lower implementation complexity and should be built first.
- Avatar Studio is significantly more advanced and depends on audio, lip sync, and video animation pipelines.

## Background Music Studio (Phase 1 Started)

Description:

- Add and mix background music to voiceovers and videos to create professional content.

Core features (Phase 1 delivered):

- Studio UI with Create, Templates, and History tabs
- Category picker for Corporate, Motivational, Ambient, Podcast, Cinematic, Technology, Happy
- Mix controls: music volume, voice volume, fade in, fade out, loop
- Voice handoff support through voice audio URL input
- FFmpeg-based audio mix output as MP3
- API support for generate, history, statistics, and delete

Core features (next):

- Music library categories: Corporate, Motivational, Ambient, Podcast, Cinematic, Technology, Happy
- Music controls: volume, fade in, fade out, loop, preview
- AI recommendation from script or prompt context (example: Corporate Technology)
- Audio mixing pipeline: Voice Audio + Background Music -> Final MP3
- Video integration pipeline: Voice + Music + Images -> MP4 Video
- Outputs (current): MP3
- Outputs (planned): WAV, MP4

Technology:

- FFmpeg
- Local royalty-free music library
- Future providers: Suno, Mubert, Stable Audio

## Avatar Studio (Phase 2 Started)

Description:

- Create talking AI presenters from scripts and voiceovers.
- Current state: avatar queue/sync generation, templates, history, and statistics are available.

Core features (Phase 1 delivered):

- Studio UI with Create, Templates, and History tabs
- Avatar preset selection: Business Male, Business Female, Teacher, Trainer, Customer Support
- Background selection: Office, Studio, Classroom, Home
- Language and aspect ratio controls
- Avatar generation job API (Phase 1 stub) with persistence to MediaGeneration
- History, delete, and statistics APIs for avatar jobs

Core features (Phase 2 delivered):

- Queue-ready API contract using PENDING and PROCESSING statuses
- Optional voice audio URL and background image URL inputs
- Sync render mode with FFmpeg placeholder MP4 output
- Queue-only mode for async worker pipeline integration

Core features:

- Avatar selection: Business Male, Business Female, Teacher, Trainer, Customer Support
- Talking avatar pipeline: Script -> Voice Studio -> Avatar -> MP4 Video
- Lip synchronization between generated speech and facial movement
- Background selection: Office, Studio, Classroom, Home
- Language support: English, Tamil, Hindi, Spanish
- Custom avatar upload: photo/video input for personalized presenter output
- AI clone (future): face clone + voice clone
- Outputs: MP4 (vertical and landscape)

Technology:

- Lip sync: Wav2Lip, SadTalker
- Animation: LivePortrait
- Voice: OpenAI TTS
- Video: FFmpeg

## Recommended Build Order (Roadmap)

1. ✅ Voice Studio
2. ✅ Script Studio
3. ✅ Image Studio
4. ✅ Video Studio
5. 🎵 Background Music Studio
6. 🧑 Avatar Studio

## 50-Character Descriptions

- Background Music Studio: Add and mix music for professional content.
- Avatar Studio: Create talking AI presenters from text and voice.

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
- POST /api/media/presentation/images/generate
- POST /api/media/presentation/subtitles/generate
- POST /api/media/presentation/voiceover/generate
- GET /api/media/presentation/[id]/comments
- POST /api/media/presentation/[id]/comments
- GET /api/media/presentation/[id]/versions
- POST /api/media/presentation/[id]/versions
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
- POST /api/media/video/render
- POST /api/media/video/assets/search
- POST /api/media/video/assets/generate
- POST /api/media/background-music/generate
- GET /api/media/background-music/history
- DELETE /api/media/background-music/[id]
- GET /api/media/background-music/statistics
- POST /api/media/avatar/generate
- GET /api/media/avatar/history
- DELETE /api/media/avatar/[id]
- GET /api/media/avatar/statistics
- POST /api/media/avatar/[id]/enqueue
- POST /api/media/avatar/[id]/process

## Project Layout

- app/dashboard/voice-studio: Voice Studio page
- app/dashboard/script-studio: Script Studio page
- app/dashboard/presentation-studio: Presentation Studio page
- app/dashboard/podcast-studio: Podcast Studio page
- app/dashboard/subtitle-studio: Subtitle Studio page
- app/dashboard/background-music-studio: Background Music Studio page
- app/dashboard/video-studio: Video Studio page
- app/dashboard/avatar-studio: Avatar Studio page
- app/api/media/voice: Voice API handlers
- app/api/media/script: Script API handlers
- app/api/media/presentation: Presentation API handlers
- app/api/media/podcast: Podcast API handlers
- app/api/media/subtitle: Subtitle API handlers
- app/api/media/background-music: Background Music API handlers
- app/api/media/avatar: Avatar API handlers
- app/api/media/video: Video API handlers
- app/media/audio/[...path]: Local audio file serving route
- app/media/video/[...path]: Local video file serving route
- components/layout: Dashboard shell components
- components/voice-studio: Voice Studio UI client component
- components/subtitle-studio: Subtitle Studio UI client component
- components/background-music-studio: Background Music Studio UI client component
- components/video-studio: Video Studio UI client component
- components/avatar-studio: Avatar Studio UI client component
- lib/auth: next-auth config and user resolution
- lib/db: Prisma client
- lib/providers: Provider interfaces and provider factory
- lib/openai: OpenAI voice provider
- lib/storage: Local file storage service
- prisma: Prisma schema
- storage/audio: Generated audio files
- storage/video: Rendered video files
- storage/music: Optional background music library (corporate, motivational, ambient, upbeat)

## Database Model

MediaGeneration table fields:

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
- isFavorite
- status
- createdAt
- updatedAt

PodcastGeneration table fields:

- id (UUID)
- userId (UUID)
- title
- topic
- audience
- format
- tone
- length
- hosts
- outline
- prompt
- script
- outputUrl
- duration
- segmentCount
- segments
- isFavorite
- status
- createdAt
- updatedAt

PresentationGeneration table fields:

- id (UUID)
- userId (UUID)
- title
- goal
- tone
- length
- audience
- topic
- prompt
- outputText
- slideCount
- includeSpeakerNotes
- visualStyle
- imagePrompt
- images
- subtitleSourceLanguage
- subtitleTargetLanguages
- subtitleCues
- subtitleTranslations
- voiceoverText
- voiceover
- isFavorite
- status
- createdAt
- updatedAt

PresentationComment table fields:

- id (UUID)
- presentationId (UUID)
- author
- content
- createdAt

PresentationVersion table fields:

- id (UUID)
- presentationId (UUID)
- versionNumber
- note
- snapshotText
- createdAt

SubtitleGeneration table fields:

- id (UUID)
- userId (UUID)
- title
- topic
- language
- format
- tone
- sourceText
- outputText
- cueCount
- includeTimestamps
- isFavorite
- status
- createdAt
- updatedAt

VideoGeneration table fields:

- id (UUID)
- userId (UUID)
- title
- topic
- audience
- style
- aspectRatio
- durationSec
- prompt
- outputText
- sceneCount
- includeVoiceover
- outputUrl
- isFavorite
- status
- createdAt
- updatedAt

Enums:

- ModuleType: VOICE, SCRIPT, PODCAST, SUBTITLE, BACKGROUND_MUSIC, VIDEO, AVATAR
- GenerationStatus: PENDING, PROCESSING, COMPLETED, FAILED
- VoiceType: alloy, ash, ballad, coral, echo, sage, shimmer
- ScriptGoal: social, ad, youtube, email, sales
- ScriptTone: professional, friendly, bold, educational, storytelling
- ScriptLength: short, medium, long
- PodcastFormat: interview, solo, panel, storytelling
- PodcastTone: professional, conversational, energetic, educational
- PodcastLength: short, medium, long
- PresentationGoal: pitch, training, webinar, sales, report
- PresentationTone: professional, persuasive, educational, storytelling
- PresentationLength: short, medium, long
- SubtitleFormat: srt, vtt, captions
- SubtitleTone: verbatim, readable, engaging

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
- Pi deploy (update, install, restart, verify): `npm run deploy:pi`
- Optional overrides example:

	`powershell -ExecutionPolicy Bypass -File ./scripts/deploy-pi.ps1 -HostName "sarapriyain@192.168.0.64" -ProcessName "aimedia" -Port 8080 -PublicUrl "https://aimedia.velynxia.com"`

## Security Maintenance

- Run `npm audit` regularly.
- Apply safe fixes with `npm audit fix`.
- Some advisories may require semver-major upgrades; validate app compatibility before using force upgrades.

## Optional Image Provider Keys

- `OPENAI_API_KEY` (for GPT Image generation)
- `FLUX_API_KEY` (for Flux generation)
- `FLUX_API_URL` (optional custom Flux endpoint; defaults to Hugging Face FLUX.1-schnell inference URL)

# Development notes

## Backend packages

Java sources under `backend/src/main/java/com/lifescript` are grouped by layer:

```text
com.lifescript
├── ScriptApplication.java
├── controller/   REST controllers and shared API error handling
├── service/      Business logic, current account identity, image validation
├── model/        Domain records and request/response records
└── repository/   Persistence interfaces and local/AWS adapters
```

Controllers call services; services use models and repository interfaces; repository implementations handle storage. Request and response records live in `model`, rather than being nested inside controllers or services. Tests under `backend/src/test/java/com/lifescript` mirror the controller and service packages. This layout does not change REST paths or stored JSON formats.

## Implemented slice

- Create a world with name, setting, tone, rules, and a protagonist with name/background.
- Optionally attach a PNG/JPEG portrait and world cover, each at most 5 MB, 4096 pixels per side, and 8 megapixels.
- Switch between English and Simplified Chinese world collections, each with its own saved selection and world settings.
- Re-encode uploaded images as PNG without their original metadata or filename.
- Initialize Knowledge, Vitality, Creativity, Connection, and Discipline at zero XP.
- Save and reload worlds and portraits; select a saved world or create another.
- Keep the selected world ID in browser storage. All actual world data lives on the backend.

The UI supports multiple saved worlds already, but tasks, rewards, authentication, NPC editing, and AI generation are not implemented. The local account identity comes only from the server. Users cannot choose an owner through request fields.

## Frontend experience

World creation has two steps: choose or describe a world, then create its protagonist. Three optional starter ideas populate editable name, setting, and tone fields. Moving back and forth retains the draft and selected portrait; a world is saved only on the final action. Unsaved drafts do not survive a page reload.

The interface uses a light novel direction: paper-and-sky colors, shared AI-generated anime cover artwork, inline field guidance, and a one-time creation acknowledgment. Starting ideas include academy days, a guild adventure, and parallel lives. The character profile displays actual saved XP with descriptions of the kinds of growth it represents. Mobile layouts place the form before the decorative panel. Motion respects the user's reduced-motion preference. See [art direction and the generation prompt](art-direction.md) for the shared illustration; it is distinct from a user's uploaded protagonist portrait.

## API

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/v1/health` | Process health |
| POST | `/api/v1/worlds` | Create world and protagonist; return 201 and a Location header |
| GET | `/api/v1/worlds` | List the current account's saved worlds, newest first |
| GET | `/api/v1/worlds/{id}` | Read a world owned by the current account |
| GET | `/api/v1/worlds/{id}/protagonist/portrait` | Read the owned protagonist's normalized image |
| GET | `/api/v1/worlds/{id}/cover` | Read the owned world's normalized cover |
| PUT | `/api/v1/worlds/{id}/cover` | Upload and replace the owned world's cover |

Creation uses multipart/form-data with a `world` part of content type `application/json` and optional `portrait` and `cover` file parts. Cover replacement uses a `cover` file part. JSON fields:

```json
{
  "name": "The Wandering Isles",
  "setting": "A city on the back of a giant creature.",
  "tone": "Cozy & hopeful",
  "rules": "Magic is rare.",
  "protagonistName": "Ari",
  "protagonistBackground": "An apprentice cartographer.",
  "storyLanguage": "en"
}
```

All fields except rules and storyLanguage are required. Story language accepts `en` or `zh-CN`; omitted values and older saved records default to English. Limits: world name/tone 100 characters, setting 5000, rules/background 3000, character name 80. Unknown JSON fields are rejected. Responses expose character IDs and image URLs, not storage object keys. Failures use Spring ProblemDetail, with a `fields` map for validation errors.

## Languages and covers

The header language switch persists `script.language` in browser storage and updates the document language and title. It defaults to the browser's preferred language on first use. Translation strings live in `frontend/src/i18n.tsx`; typography includes Chinese font fallbacks. Switching UI language never translates or overwrites authored world/character text.

The selected interface language also selects the world collection. Only worlds whose saved `storyLanguage` matches that language appear in its dashboard and world selector. Each collection remembers its selection under `script.activeWorld.en` or `script.activeWorld.zh-CN`. Older worlds default to English; their names and settings are not translated or duplicated. If a collection is empty, the app offers to create its first world.

New worlds use the current collection's language, so setup no longer asks for a second language choice. English and Chinese drafts (including selected images) stay separate in memory while switching languages during setup. Closing setup or reloading discards unsaved drafts. The backend continues to accept the explicit `storyLanguage` field for future story generation. Novel generation is not implemented yet.

The dashboard shows the world name once, its cover and introduction, and a compact protagonist summary. Character history and attributes expand under **Character details**; tone, rules, and cover replacement expand under **World settings**. Promotional sections, welcome copy, and repeated labels are removed from this view.

The shared default image is `frontend/public/images/default-cover.png`. Upload a per-world cover in setup, or change it from the dashboard. Its server-generated key is stored on the world; local files live under `.local/data/covers`, while AWS mode uses the configured private S3 bucket. Cover replacement checks world ownership and validates the new image before committing it. AWS uses a conditional document update to reject concurrent changes; local mode serializes cover writes. Failed validation preserves the previous cover. Superseded cover files are retained pending a future cleanup job. Reads use a revision-specific URL and `no-store` headers so a replacement appears immediately.

The initial world and protagonist form a single stored aggregate, giving atomic creation. Separate NPC and character update records can be added when introducing the roster. No scene is generated during creation yet.

## Storage modes

Default `SCRIPT_STORAGE=local` uses JSON files and portrait files beneath `SCRIPT_DATA_DIRECTORY` (default `.local/data`, relative to the backend working directory). Each owner has separate world paths. Writes publish a complete world using an atomic rename. This adapter is intended for one local application instance on a filesystem supporting atomic moves.

`SCRIPT_STORAGE=aws` uses the AWS SDK default credential chain. Configure these variables before starting the backend:

```powershell
$env:SCRIPT_STORAGE = 'aws'
$env:AWS_REGION = 'us-west-2'
$env:SCRIPT_DYNAMODB_TABLE = 'ScriptWorlds'
$env:SCRIPT_S3_BUCKET = 'your-existing-private-bucket'
```

Provision resources separately; the application does not create or publish cloud resources:

- DynamoDB table with string partition key `pk` and string sort key `sk`.
- Private S3 bucket for portraits.
- Credentials permitting DynamoDB GetItem, PutItem, and Query on that table and S3 GetObject, PutObject, and DeleteObject on the portrait and cover prefixes.

World items use `pk=ACCOUNT#{accountId}`, `sk=WORLD#{worldId}`, and a JSON `document` attribute. Reads include the owner in the key; listing uses Query and handles DynamoDB pages rather than scanning. Reads are strongly consistent. World/protagonist creation is one conditional PutItem. This layout can add character records and account metadata without coupling API DTOs to database fields.

Portraits are uploaded before committing the world record. Known save failures trigger best-effort portrait cleanup. Cross-service ambiguous timeouts and abandoned objects will need reconciliation before production use. Creation is not yet idempotent across network retries; list saved worlds after an uncertain result before resubmitting.

AWS mode must be integration-tested against development cloud resources before deployment. Local persistence tests do not verify IAM policies or actual AWS connectivity. Replace the fixed account with authenticated identity before exposing the application publicly.

## Compatibility

The frontend currently uses Vite 6 to support this workstation's Node 20.17 installation. Upgrade Node and Vite together when revisiting tooling. No frontend code needs to change when switching backend storage modes.

## Follow-up work

1. User-owned tasks and completion receipts recording the destination world.
2. Atomic, idempotent task rewards.
3. Authored opening scenes, choice persistence, and story memory.
4. Persistent NPC roster and portrait replacement.
5. Authentication and account preferences, including timezone and active world.
6. AI story provider and generation recovery.

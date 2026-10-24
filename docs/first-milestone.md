# First milestone: a saved daily adventure

Status: proposed implementation baseline.

Implementation update: world/protagonist creation, optional PNG/JPEG portraits, local persistence, and a saved-world dashboard are implemented. Multiple worlds can be created and selected. AWS storage adapters are available but have not been verified against cloud resources. See [development notes](development.md) for current behavior; the remaining sections describe the broader milestone.

## Product goal

A user creates a world and protagonist, completes a categorized task, gains a character attribute, reads a scene, and makes a choice. Refreshing the app preserves all progress.

The first release uses authored scenes to establish reliable progression and persistence. AI generation follows once this loop works.

## Scope

Included:

- One development user, with an explicit user ID in all owned records.
- One active world and protagonist per user in the initial UI. Records use stable world and character IDs so multiple worlds and supporting characters can be added later.
- A world editor for title, setting, tone, rules, and protagonist background.
- One-off tasks with title, category, effort, and completion status.
- Five attributes: Knowledge, Vitality, Creativity, Connection, and Discipline.
- A character sheet, task dashboard, and scene reader with choices.
- An opening scene and a follow-up scene unlocked by the first completion.
- Durable story state, choice history, character records, and chapter summaries.
- A "Keep this character" action for NPCs and user-uploaded character portraits.

Deferred:

- Recurring habits, schedules, streaks, and rest-day settings.
- Live AI generation, generated images, audio, and real-world task assistance.
- Public deployment, production authentication, sharing, and multiple active worlds in the UI.

The development user is a local convenience. Production authentication must supply the user identity before public deployment; client-provided owner IDs are not an authorization mechanism.

## Screens

1. Setup: enter the world's background and protagonist details, then start the story.
2. Dashboard: create and complete tasks; see attribute changes and available story progress.
3. Character: view the saved roster and character details, mark an NPC as persistent, and upload or replace their portrait.
4. Story: read the current scene, choose an available action, and revisit earlier scenes.

## Architecture and extension points

Use React with TypeScript for the frontend and one Java/Spring Boot application exposing `/api/v1` REST endpoints. Keep modules for worlds, characters, tasks, progression, and stories inside that application.

- Controllers handle HTTP input and output; application services implement use cases.
- Repositories isolate DynamoDB access from progression and story rules.
- A content store isolates S3 access and returns references to saved chapter content.
- A story provider accepts a structured context and returns a scene plus proposed state changes. Start with an authored provider, then add an AI provider.
- Progression rules are versioned Java rules. A model never directly awards experience or marks real-life tasks complete.
- API DTOs are separate from database records; records carry a schema version.
- Store timestamps in UTC. Add user timezone preferences when introducing daily habits.

Begin with these boundaries rather than separate deployable services. Add interfaces at external storage and generation boundaries, avoiding a plugin framework or generic workflow engine in this milestone.

## Data records

The following are logical records. DynamoDB physical keys and indexes should be selected from the access patterns below during implementation.

| Record | Main fields |
| --- | --- |
| World | ID, owner ID, title, setting, tone, rules, protagonist ID, schema version |
| Character | ID, world ID, owner ID, name, background, appearance, personality, attributes, goals, relationships, persistence mode, portrait asset ID, version |
| Portrait asset | ID, owner ID, world ID, character ID, S3 object key, validated media type, dimensions, upload status, timestamp |
| Task | ID, owner ID, title, category, effort, status, completion timestamp |
| Completion | ID, task ID, world ID, character ID, awarded attribute and XP, progression rule version, timestamp |
| Story state | World ID, current scene ID, location, timeline, established facts, unresolved threads, revision |
| Scene | ID, world ID, sequence, content reference, choices, generation status, provider version, source completion IDs |
| Choice event | ID, world ID, scene ID, choice ID, resulting revision, timestamp |
| Chapter summary | World ID, sequence range, summary, important events and character IDs |

Store structured records and short summaries in DynamoDB. Store full scene/chapter text and future media in S3, with DynamoDB holding object references. Character IDs remain stable across name and relationship changes.

Required access patterns:

- Load a user's active world and its protagonist.
- List a user's tasks by status. Tasks belong to the account; each completion records the world receiving its reward.
- Read a world's current state and characters.
- Read recent scenes and page through older scenes in sequence.
- Load chapter summaries and unresolved threads for a world.
- Find a prior completion or choice to handle a retried request.

Use queryable keys/indexes for these paths rather than table scans. Physical table count is an implementation decision; avoid committing to a single-table layout before defining its keys and access patterns.

## Initial progression rules

Each task has one category, mapped to the corresponding attribute. Small, medium, and large effort award 5, 10, and 15 XP respectively. These are initial tuning values.

Completing a task awards XP once. Repeating the completion request returns the original result. The milestone does not expose completion undo; a later undo feature must explicitly reverse rewards and define how already-published story events behave.

The first completion unlocks one follow-up scene. This milestone does not equate each task with a new chapter. Later versions can aggregate completions into a daily scene with configurable pacing. Missed days do not remove XP.

## Story continuity

Build every story request from:

1. World background and rules.
2. Current protagonist attributes and relevant character records.
3. Current location, timeline, established facts, and unresolved threads.
4. Recent scenes and relevant earlier summaries.
5. Newly earned progression and recorded player choices.

Save the original scenes as the historical source of truth. Summaries support recall but do not overwrite that history. Track enduring promises and open quests as explicit threads, rather than relying on prose summaries alone.

Future AI output must include display text, available choices, and proposed structured changes. Validate character IDs, world ownership, legal attribute changes, and story revision before publishing. A rejected or failed generation must leave task completion and earned XP intact.

## Persistent NPCs and portraits

Every named NPC receives a stable character ID when saved in a published scene. The user can open their character card from dialogue and choose **Keep this character**, then optionally upload a portrait. The same action is available from the character roster.

Persistence mode is `standard` or `persistent`. Standard characters remain recorded in story history. Persistent characters are additionally kept in the world's saved roster and considered explicitly when assembling story context. Relevant character details are loaded as needed; the entire roster need not be included in every request. Persistence preserves identity and continuity without requiring the NPC to appear in every scene or making them immune to story consequences. Turning it off does not erase historical scenes or relationships.

The character card offers name, appearance description, persistence status, and a portrait preview with upload/replace controls. A portrait is optional; show a preset image or silhouette until one exists. Uploading a picture alone does not rewrite the character's appearance description or prior story events. Future image analysis or generation requires a separate explicit action.

Store portrait files privately in S3 and their metadata/reference in DynamoDB. Use owner-scoped, server-issued object keys. Initially accept PNG, JPEG, and WebP up to 5 MB; validate actual image content and dimensions server-side before activating a portrait. Bound decoded image dimensions and remove image metadata when processing uploads. A failed or abandoned replacement leaves the existing portrait active.

Use a two-step upload flow: authorize an upload for an owned character, then validate and attach the completed asset using the expected character version. Restrict upload credentials/URLs to that object. The server verifies the asset belongs to the same owner, world, and character before attachment. Retrieve portraits through authorized, temporary access. New portrait versions apply to future rendering; original scene text remains unchanged.

## Consistency and storage failures

- Atomically record task completion, its reward receipt, attribute changes, and a durable pending story request in DynamoDB.
- Use a unique scene request ID to make generation retries safe.
- Write generated content to S3 before publishing its reference in DynamoDB. S3 and DynamoDB do not share a transaction.
- Publish the scene and state changes only if the expected story revision still matches. Serialize generation per world or reject stale output for regeneration.
- Apply a scene choice and its state changes atomically, allowing only one accepted choice per scene. Retries return the saved outcome.
- Recover pending requests after a restart. Failed scene generation shows a retry action while preserving completed tasks.
- Handle orphaned S3 objects from failed publication with later cleanup; never expose an uncommitted scene as current.

## Initial REST contracts

All endpoints are scoped to the authenticated user, or the fixed local development user before authentication exists. Resource lookups enforce ownership server-side.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/v1/worlds` | Create a world and protagonist |
| GET | `/api/v1/worlds/{worldId}` | Load world settings |
| PATCH | `/api/v1/worlds/{worldId}` | Edit world settings; established history remains recorded |
| GET | `/api/v1/worlds/{worldId}/characters` | Load the character roster |
| PATCH | `/api/v1/worlds/{worldId}/characters/{characterId}` | Edit character details or persistence mode with an expected version |
| POST | `/api/v1/worlds/{worldId}/characters/{characterId}/portrait-uploads` | Authorize a portrait upload and return its asset ID and upload destination |
| POST | `/api/v1/worlds/{worldId}/characters/{characterId}/portrait-uploads/{assetId}/complete` | Validate the uploaded image and attach it with an expected character version |
| GET | `/api/v1/worlds/{worldId}/tasks` | List tasks, optionally by status |
| POST | `/api/v1/worlds/{worldId}/tasks` | Create a task |
| POST | `/api/v1/worlds/{worldId}/tasks/{taskId}/completion` | Complete once; return saved rewards on retry |
| GET | `/api/v1/worlds/{worldId}/story` | Load current scene, state, and pending generation status |
| GET | `/api/v1/worlds/{worldId}/scenes` | Page through story history |
| POST | `/api/v1/worlds/{worldId}/scenes/{sceneId}/choice` | Record a choice with the expected story revision |
| POST | `/api/v1/worlds/{worldId}/story/requests/{requestId}/retry` | Retry an existing failed story request |

Specify request/response JSON and validation errors when implementing each endpoint. Use a consistent error format and report revision conflicts explicitly so the UI can refresh safely.

## Build order

1. Scaffold frontend and backend, local configuration, and a health endpoint.
2. Implement world/character persistence and the setup screen.
3. Implement task creation and atomic completion/reward handling.
4. Add authored scenes, choices, story memory, and S3 content storage.
5. Verify the complete loop and document local startup.
6. Add an AI provider using the established context and validation contracts.

Local development should use DynamoDB Local and an S3-compatible development store or explicitly configured development AWS resources. Never commit credentials. Cloud provisioning and public deployment are separate later steps.

## Acceptance criteria

- A new user can create a world and protagonist and read the opening scene.
- Completing a Knowledge task increases only the intended attribute by the expected amount.
- Duplicate or concurrent completion requests award XP once and enqueue story work once.
- The follow-up scene reflects the saved world, protagonist, and completion.
- Choosing an action persists its consequences; a conflicting second choice is rejected.
- Refreshing the browser and restarting the backend preserve tasks, rewards, characters, scenes, and choices.
- A failed content write or story publication preserves task rewards and supports safe retry.
- Requests cannot read or modify another user's world.
- A user can mark an NPC as persistent, refresh, and find the same character and relationships in the saved roster.
- A persistent NPC's identity and relevant established facts are available to later story context without forcing an appearance in every scene.
- A user can upload or replace an NPC portrait; the image persists and renders for that character in subsequent dialogue.
- Invalid images, cross-owner asset references, and stale portrait updates are rejected; a failed replacement preserves the existing portrait.

Prioritize automated checks for reward duplication, choice conflicts, continuity context assembly, and recovery after storage failures. Use a manual walkthrough for screen layout and the complete user journey.

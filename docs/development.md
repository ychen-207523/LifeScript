# Development notes

## Implemented slice

- Create a world with name, setting, tone, rules, and a protagonist with name/background.
- Optionally attach a PNG/JPEG portrait, at most 5 MB, 4096 pixels per side, and 8 megapixels.
- Re-encode uploaded images as PNG without their original metadata or filename.
- Initialize Knowledge, Vitality, Creativity, Connection, and Discipline at zero XP.
- Save and reload worlds and portraits; select a saved world or create another.
- Keep the selected world ID in browser storage. All actual world data lives on the backend.

The UI supports multiple saved worlds already, but tasks, rewards, authentication, NPC editing, and AI generation are not implemented. The local account identity comes only from the server. Users cannot choose an owner through request fields.

## API

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/v1/health` | Process health |
| POST | `/api/v1/worlds` | Create world and protagonist; return 201 and a Location header |
| GET | `/api/v1/worlds` | List the current account's saved worlds, newest first |
| GET | `/api/v1/worlds/{id}` | Read a world owned by the current account |
| GET | `/api/v1/worlds/{id}/protagonist/portrait` | Read the owned protagonist's normalized image |

Creation uses multipart/form-data with a `world` part of content type `application/json` and an optional `portrait` file part. JSON fields:

```json
{
  "name": "The Wandering Isles",
  "setting": "A city on the back of a giant creature.",
  "tone": "Cozy & hopeful",
  "rules": "Magic is rare.",
  "protagonistName": "Ari",
  "protagonistBackground": "An apprentice cartographer."
}
```

All fields except rules are required. Limits: world name/tone 100 characters, setting 5000, rules/background 3000, character name 80. Unknown JSON fields are rejected. Responses expose character IDs and portrait URLs, not storage object keys. Failures use Spring ProblemDetail, with a `fields` map for validation errors.

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
- Credentials permitting DynamoDB GetItem, PutItem, and Query on that table and S3 GetObject, PutObject, and DeleteObject on the portrait prefix.

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

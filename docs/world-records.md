# World setup and records

Open **Develop this world** from a saved world's dashboard. Opening setup saves the protagonist's wish, starting situation, and opening scene. These fields are also optional during world creation. Older saved worlds load with empty values.

World records starts with empty Places and Characters tables. People can be added as the journey reveals them. A character can have an uploaded portrait, a current-location link, and a persistent-character flag. Custom tables and additional columns support text, number, checkbox, choice, place link, and character link values. Built-in columns retain stable IDs and types; their displayed labels can be changed. Populated columns cannot be removed or have their types changed. Locking a column prevents changing existing values until it is unlocked.

## Language

Worlds carry their story language and belong to independent English or Chinese collections. Records are scoped to a world, not shared by matching names. Built-in labels are translated at display time; custom table names, custom column labels, choice options, and record content remain as authored. Built-in status values use stable English identifiers and localized display labels.

## Local persistence

The default root is `backend/.local/data`. Opening setup is part of `worlds/{accountId}/{worldId}.json`. Table definitions are `knowledge/{accountId}/{worldId}/tables/{tableId}.json`; records are `knowledge/{accountId}/{worldId}/rows/{tableId}/{rowId}.json`. NPC portraits are PNG files under `portraits/{accountId}/{worldId}/characters/{rowId}/`. Preserve the entire data root when backing up or moving the prototype.

REST endpoints under `/api/v1/worlds/{worldId}`:

- `PUT /setup`: opening setup with its revision.
- `GET /tables`, `POST /tables`: list definitions or create a custom table.
- `PUT /tables/{tableId}`: customize a table with its revision.
- `GET /tables/{tableId}/rows`: list records.
- `PUT /tables/{tableId}/rows/{rowId}`: create or update a record with record and table revisions.
- `PUT /tables/characters/rows/{rowId}/portrait`: multipart portrait upload with a record revision.
- `GET /tables/characters/rows/{rowId}/portrait`: retrieve the image.

The server checks ownership, references, value types, and revisions. Stale writes return 409. Limits are 30 tables per world, 30 columns per table, 500 records per table, and 200 KB serialized per definition or record. Image validation uses the existing PNG/JPEG upload limits. There is no record deletion interface yet.

## AWS and future story generation

AWS mode has adapters for the same definitions and records in the configured DynamoDB table, with `KNOWLEDGE#{accountId}#{worldId}` partition keys and `TABLE#` / `ROW#` sort-key prefixes. Portraits use the configured S3 store. These new AWS operations have not been verified against live resources. Revision conditions prevent overwriting a stale document; schema validation currently assumes one application instance. Before scaling to multiple writers, schema-and-row changes need coordinated transactions.

`useInStory`, persistent-character flags, and the opening setup are saved preparation for story generation. No AI context assembly, automatic discovery, chapter generation, or translation is implemented in this milestone. All records are currently edited manually.

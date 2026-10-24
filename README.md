# Script

Script connects daily tasks and habits to character growth in a persistent visual novel. Users define their world, grow their protagonist through real activities, and make choices in a story that remembers earlier events.

This repository is named LifeScript. The working product name is Script.

## First milestone

Complete one task, grow your character, and continue a saved story.

See [the milestone specification](docs/first-milestone.md) for scope, architecture, data records, API contracts, and acceptance criteria. Implementation has not started yet.

## Planned structure

- `frontend/`: React and TypeScript application.
- `backend/`: Java and Spring Boot REST API.
- `docs/`: product and architecture decisions.

The initial backend will be a single application with separate task, progression, world, character, and story modules. DynamoDB stores structured state; S3 stores chapter content and media. A fixed story provider comes first, with AI generation added behind the same interface.

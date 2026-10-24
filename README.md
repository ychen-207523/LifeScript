# Script

Script connects daily tasks and habits to character growth in a persistent visual novel. Users define their world, grow their protagonist through real activities, and make choices in a story that remembers earlier events.

This repository is named LifeScript. The working product name is Script.

## First milestone

Complete one task, grow your character, and continue a saved story.

World and protagonist creation is implemented, including optional portraits, saved worlds, and a character sheet with five starting attributes. Tasks and generated scenes are the next milestones.

See [the milestone specification](docs/first-milestone.md) for the broader plan and [development notes](docs/development.md) for the current API and storage details.

## Run locally

Requirements: Java 17 or later, Maven 3.6.3 or later, and Node.js 20.17 or later (Node 22 LTS recommended). Set `JAVA_HOME` to your JDK if Maven cannot find it.

Open two terminals from this repository:

```powershell
cd backend
mvn spring-boot:run
```

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`. Its development proxy forwards `/api` to the backend at `127.0.0.1:8080`.

By default, data is saved on disk under `backend/.local/data` and survives browser refreshes and server restarts. This is a local development account, without login. Both servers bind to loopback. AWS mode is optional; it needs existing resources and credentials as described in the development notes.

## Verify

```powershell
cd backend
mvn test
```

```powershell
cd frontend
npm run build
```

## Planned structure

- `frontend/`: React and TypeScript application.
- `backend/`: Java and Spring Boot REST API.
- `docs/`: product and architecture decisions.

The backend is a single application with a world module and replaceable storage adapters. Later modules will handle tasks, progression, characters, and stories. In AWS mode, DynamoDB stores structured state and S3 stores portraits. A fixed story provider comes before AI generation.

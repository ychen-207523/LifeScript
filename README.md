# Script

Script connects daily tasks and habits to character growth in a persistent visual novel. Users define their world, grow their protagonist through real activities, and make choices in a story that remembers earlier events.

This repository is named LifeScript. The working product name is Script.

## First milestone

Complete one task, grow your character, and continue a saved story.

World and protagonist creation is implemented, including optional portraits, custom world covers, saved worlds, and five starting attributes. English and Simplified Chinese each have a separate world collection and remember their selected world. Tasks and generated scenes are the next milestones.

Use the language selector in the header to open the English or Chinese world collection. New worlds use that collection's language for future chapters. Novel generation is not implemented yet. Character details and world settings expand on demand from the simplified dashboard.

The start page introduces Script without opening a world or showing a character. Choose **Create your world** to start with blank setup fields, or expand **Already started a story? Open your saved worlds** to enter an existing world. The Script logo returns to the introduction. Saved worlds remain available after refresh; they are never opened automatically.

During setup, write your own story atmosphere (up to 100 characters). The suggested atmospheres are optional starting points and can be edited freely.

Open **Develop this world** to edit the protagonist's wish, starting situation, and opening scene. **World records** contains empty Places and Characters tables, ready for discoveries during the journey. Add records, link characters to places, upload character portraits, or create custom tables. Columns support text, numbers, checkboxes, choices, and links to places or characters. You can rename columns and lock existing values through **Customize table**.

Each world's records are independent. Built-in table and column labels follow the interface language; custom labels and story content remain exactly as written. Stable internal IDs preserve links when labels change. The **Use in story context** setting records your preference for future AI integration; it does not generate or update a story yet.

Upload a cover during setup or open **World settings → Change cover** on the dashboard. To change the shared fallback for the whole app, replace [default-cover.png](frontend/public/images/default-cover.png).

See [the milestone specification](docs/first-milestone.md) for the broader plan, [world records](docs/world-records.md) for setup and table behavior, and [development notes](docs/development.md) for the current API and storage details.

## Run locally

Requirements: a Java JDK 17 or later, Maven 3.6.3 or later, and Node.js with npm. This project has been checked on Java 22, Maven 3.9.7, and Node.js 20.17. The first dependency installation needs internet access. AWS credentials and AI keys are not needed for local development.

### Windows / PowerShell

Keep two PowerShell terminals open. The commands below use this checkout at `D:\Project\LifeScript` and the JDK installed on this machine. Adjust those paths if running elsewhere.

**Terminal 1 — backend**

```powershell
Set-Location D:\Project\LifeScript\backend
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-22'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:SCRIPT_STORAGE = 'local'
mvn "-Dmaven.repo.local=D:\Project\LifeScript\.local\m2" spring-boot:run
```

Wait until the log says `Started ScriptApplication`. The backend listens at [127.0.0.1:8080](http://127.0.0.1:8080/api/v1/health); the health endpoint returns `{"status":"ok"}`. The Maven option reuses the dependency cache already downloaded for this project.

**Terminal 2 — frontend**

```powershell
Set-Location D:\Project\LifeScript\frontend
npm ci
npm run dev
```

Run `npm ci` the first time and whenever `package-lock.json` changes. For subsequent starts, `npm run dev` is enough.

Open [Script at 127.0.0.1:5173](http://127.0.0.1:5173/), or use the URL printed by Vite if that port is busy. The frontend forwards `/api` requests to the backend at `127.0.0.1:8080`, so both terminals must stay running.

Use **Ctrl+C** in each terminal to stop the app. Starting it again preserves saved worlds and uploaded images.

### Other machines

With `JAVA_HOME` and Java, Maven, Node.js, and npm configured on your PATH, run `mvn spring-boot:run` from `backend/` and `npm ci` followed by `npm run dev` from `frontend/`, in separate terminals. The project-specific Maven cache option is optional.

By default, data is saved on disk under `backend/.local/data` and survives browser refreshes and server restarts. This is a local development account, without login. Both servers bind to loopback. AWS mode is optional; it needs existing resources and credentials as described in the development notes.

### Troubleshooting

- **Java or Maven cannot be found:** check `java -version` and `mvn -version`. On this machine, use the `JAVA_HOME` and PATH commands above to select the installed JDK directly.
- **Node or npm cannot be found:** check `node --version` and `npm --version`; ensure their installation is on PATH and reopen the terminal after changing it.
- **PowerShell blocks `npm.ps1`:** use `npm.cmd ci` and `npm.cmd run dev` instead.
- **Port 8080 is already in use:** stop the earlier backend terminal with Ctrl+C. Avoid starting a second copy on the same port.
- **The page opens but cannot load worlds:** confirm the backend health link works, then retry or refresh the page. The backend must remain on port 8080 unless you also update `frontend/vite.config.ts`.
- **Dependencies cannot download:** check network access to Maven Central and the npm registry, then rerun the same startup command.

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

# CampusFix

A small web application that lets students report campus problems (broken classroom equipment, damaged facilities, Wi-Fi failures) and track their resolution, while staff review reports and record progress.

NTPU Software Engineering — Team 03 Scrum project.

## Team

| Role | Member |
| --- | --- |
| Product Owner | 陳泓青 |
| Scrum Master | 彭權毅 |
| Developers | All members |

## Links

- Jira (space key `WD`): https://100063isoroku.atlassian.net/jira/software/projects/WD/boards/2
- [Working Agreement](docs/working-agreement.md)
- [Definition of Done](docs/definition-of-done.md)

## Tech stack

- Node.js + Express 5
- EJS templates (server-rendered pages)
- SQLite via `better-sqlite3` (persistent local storage)

## Setup and run

Requirements: [Node.js](https://nodejs.org/) 20 or later (LTS recommended) and Git.

```bash
git clone https://github.com/isoroku41226971/CampusFix_Team03.git
cd CampusFix_Team03
npm install
npm start
```

Open http://localhost:3000. To use another port: `PORT=3001 npm start` (PowerShell: `$env:PORT=3001; npm start`).

- `npm run dev` restarts the server automatically when files change.
- The database is created automatically at `data/campusfix.db` on first start. Data survives page refreshes and restarts.
- To start with an empty database, stop the server and delete the `data/` folder.
- http://localhost:3000/health returns `{"status":"ok","reports":<count>}` as a quick check.

## Project structure

```
src/
  server.js   starts the HTTP server
  app.js      Express setup and routes
  db.js       SQLite connection and schema (reports table)
views/        EJS pages (partials/ holds the shared header and footer)
public/       static files (css/)
docs/         working agreement and Definition of Done
```

## Demo accounts

_To be added. Fictional demonstration accounts only — no real passwords._

## Conventions

- Branch: `feature/WD-xx-short-name`
- Commit / PR title: `WD-xx Verb-first description` (e.g. `WD-5 Add report validation`)
- Every PR needs approval from one member other than the author before merging to `main`.

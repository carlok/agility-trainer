# Agility Trainer (MVP)

Single-page **mobile-first** web app that cycles through random bodyweight agility exercises (English or Italian), with Web Audio transition beeps, optional **speech synthesis**, category filters, configurable pace and session length, and settings persisted in `localStorage`.

- **Runtime**: plain HTML/CSS and native browser APIs in the browser (no bundled npm runtime).
- **Tooling**: Node/npm exist **only inside containers** — use Podman for tests, installs, and serving.

Design tokens follow a **ui-ux-pro-max** design-system pass (fitness / vibrant palette: Barlow + Barlow Condensed, primary `#DC2626`, soft rose background).

## Prerequisites

- [Podman](https://podman.io/) (Docker-compatible CLI)

You do **not** need Node or npm installed on your machine.

## Step-by-step: Podman + browser (see the exercise explanations)

Explanations appear **only during a workout**, under the heading **“How to do it”** (English) or **“Come fare”** (Italian), below the big exercise name. If you still see the old layout, do a **hard refresh** so the browser loads the latest `index.html`, `styles.css`, and `js/app.js`.

### A — Podman (terminal)

1. **Open a terminal** on your machine.

2. **Go to the project directory** (adjust the path if yours differs):

   ```bash
   cd /Users/carlo/Documents/lavoro/kiwifarm/octopus_lab/scratch/games/agility_trainer
   ```

3. **Build the nginx runtime image** (tag name is arbitrary but must match `podman run`):

   ```bash
   podman build -t agility-trainer .
   ```

4. **Run the container** with the **project folder mounted** as the web root. Without this volume, nginx serves an empty site and you will not see the app or explanations.

   **Linux (SELinux):**

   ```bash
   podman run --rm -p 8080:80 \
     -v "$(pwd):/usr/share/nginx/html:ro,Z" \
     agility-trainer
   ```

   **macOS** (omit `:Z` if you get permission or mount errors):

   ```bash
   podman run --rm -p 8080:80 \
     -v "$(pwd):/usr/share/nginx/html:ro" \
     agility-trainer
   ```

5. **Leave this terminal open** while you test. The server runs in the foreground until you stop it with **Ctrl+C**.

6. **Optional checks**

   - If port `8080` is busy, pick another host port, e.g. `-p 9090:80` and open `http://localhost:9090`.
   - To confirm the mount from **inside** the container (second terminal):

     ```bash
     podman ps
     podman exec -it <CONTAINER_ID_OR_NAME> ls -la /usr/share/nginx/html
     ```

     You should see `index.html`, `styles.css`, and a `js/` directory.

### B — Browser

1. **Use HTTP, not `file://`** — open:

   ```text
   http://localhost:8080
   ```

   (Use the same port you mapped in `podman run`.)

2. **Hard refresh** once so cached old assets are dropped:

   - **Chrome / Edge / Firefox (desktop):** Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (macOS).
   - **Safari:** enable Develop menu → Empty Caches, then reload; or hold Shift while clicking Reload.

3. **Configure and start**

   - Choose categories (most exercises have a short description in the pool).
   - Tap **Start**.

4. **Where the explanation is**

   - Large text = exercise **name**.
   - Immediately below (when the move has copy in `js/exercises.js`): a card titled **“How to do it”** / **“Come fare”** and the **step text**. Scroll the page if needed; on narrow phones, **Pause** / **Stop** stay fixed at the bottom.

5. **If there is still no explanation**

   - Some moves may have an empty description in data — try enabling **more categories** or another exercise.
   - Confirm DevTools → **Network** that `js/app.js` returns **200** (not an old CDN or offline cache).

### C — Stop Podman

- In the terminal where the container runs: **Ctrl+C**.
- The `--rm` flag removes the container when it exits.

## Run the app (nginx image + mounted static files)

The runtime image is **vanilla nginx** with **no app files baked in**. Mount this directory read-only as the document root:

```bash
podman build -t agility-trainer .
podman run --rm -p 8080:80 \
  -v "$(pwd):/usr/share/nginx/html:ro,Z" \
  agility-trainer
```

Open `http://localhost:8080` — or use the hosted build at [https://efficacious-fold.surge.sh/](https://efficacious-fold.surge.sh/).

On macOS, omit `:Z` if SELinux labels cause trouble:

```bash
podman run --rm -p 8080:80 -v "$(pwd):/usr/share/nginx/html:ro" agility-trainer
```

## Run tests and coverage (mounted workspace)

Installs dev dependencies and writes reports into `./coverage/` on your host:

```bash
podman run --rm \
  -v "$(pwd):/app:Z" \
  -w /app \
  docker.io/node:22-alpine \
  sh -lc 'npm ci --ignore-scripts && npm test && npm run test:coverage'
```

On macOS you can omit `:Z` if you hit permission issues:

```bash
podman run --rm -v "$(pwd):/app" -w /app docker.io/node:22-alpine \
  sh -lc 'npm ci --ignore-scripts && npm test && npm run test:coverage'
```

Coverage output is gitignored (`coverage/`).

## Verify tests during image build

The **test** stage bind-mounts the build context and copies sources into a tmpfs sandbox (no `COPY` in the Dockerfile, no `node_modules` on your host). Coverage output stays inside the build container unless you use the mounted-workspace command below instead.

```bash
podman build --target test -f Containerfile .
```

Requires a builder that supports **Dockerfile 1.6** `RUN --mount=` (Podman 4.2+ / recent Docker BuildKit).

## Live editing

Same as production run: keep the volume mount, edit files locally, refresh the browser — no image rebuild needed for static changes.

## Git and GitHub (`gh`)

Source repo: **[carlok/agility-trainer](https://github.com/carlok/agility-trainer)**. Public demo: **[https://efficacious-fold.surge.sh/](https://efficacious-fold.surge.sh/)**.

Set the GitHub **Website** field (shown in the repo “About” sidebar) to the Surge URL:

```bash
gh repo edit carlok/agility-trainer --homepage https://efficacious-fold.surge.sh/
```

The **description** line can stay aligned with the app, for example: *Solo bodyweight agility trainer — random exercises, EN/IT, Web Audio, speech, mobile-first static web app.* (`gh repo edit --description "..."` if you change it.)

If you fork or rename the repo, update `REPO_URL` and `LIVE_URL` in `js/app.js` and this README.

### Local repository

```bash
cd /path/to/agility_trainer
git init
git add .
git commit -m "Initial commit: Agility Trainer MVP"
```

### Create remote repo and push (GitHub CLI)

Install and log in once: [GitHub CLI](https://cli.github.com/) (`gh auth login`).

Create **`YOUR_USERNAME/agility-trainer`** with a public description and push the current folder:

```bash
gh repo create agility-trainer \
  --public \
  --description "Solo bodyweight agility trainer — random exercises, EN/IT, Web Audio, speech, mobile-first static web app." \
  --source=. \
  --remote=origin \
  --push
```

- To publish under a specific account or org named **`carlok`**, ensure `gh` is authenticated as that user (or use `gh repo create carlok/agility-trainer ...` if your token may create repos there).
- After creation, add topics or the **About** blurb in the repo settings on GitHub if you want richer metadata than `--description` alone.

### UI: hamburger menu

**Home** returns to session setup (stops an active workout), **GitHub** opens the repo, **About** / **Credits** open lightweight dialogs; strings follow **English / Italian** like the rest of the app.

## Project layout

| Path | Role |
|------|------|
| `index.html` | Page shell, skip link, hamburger nav + About/Credits dialogs |
| `styles.css` | Design tokens, responsive layout, `prefers-reduced-motion` |
| `js/exercises.js` | Exercise pool + categories (EN/IT) |
| `js/engine.js` | Filtering, random pick with anti-repeat, clamps |
| `js/settings.js` | Defaults + `localStorage` (de)serialization |
| `js/audio.js` | Web Audio beep |
| `js/speech.js` | `speechSynthesis` wrapper |
| `js/app.js` | DOM, timers, session flow |
| `tests/` | Vitest unit tests |
| `package.json` / `package-lock.json` | Dev dependency manifest (used **inside** Node container only) |
| `Containerfile` | Multi-stage: `test` (Node + bind-mounted context) + `runtime` (nginx only; app via volume) |
| `.containerignore` | Keeps image/test contexts lean |
| `prompts/original.md` | Product spec |

## Manual QA checklist

- **Mobile portrait**: large exercise text, tap targets feel comfortable.
- **Start** unlocks audio on iOS/Safari; transition **beep** audible.
- **Voice** toggle respected; language matches **Italiano**/**English**.
- **Pause / Resume** preserves remaining time; **Stop** returns to setup.
- Finite **session length** stops with “Session complete”; unlimited runs until Stop.
- With one exercise in pool (single category + single move), repeats are allowed without freezing.

## Disclaimer

For general movement guidance only. Stop if you feel pain, dizziness, or shortness of breath.

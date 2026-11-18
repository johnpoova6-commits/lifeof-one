# Lifeof Hub

Lifeof Hub is a responsive MERN workspace for notes, folders, saved files, and personal workflows. The browser preview works without an API; email/password accounts and workspace sync require MongoDB.

## Run the browser preview

```sh
npm install
npm run dev
```

Open the Vite URL and choose **Get started → Explore the browser preview**. Preview notes, folders, and tasks are stored in browser local storage.

## Run the MERN app

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI` to a reachable MongoDB instance and replace `JWT_SECRET` with a random value of at least 32 characters. Set `MAX_UPLOAD_SIZE_MB` to a whole-number per-file upload limit from 1 to 1024 (defaults to 100 MB).
3. To enable Google sign-in, create an OAuth client of type **Web application** in Google Cloud Console. Add the exact frontend origin (`http://localhost:5173` for `npm run dev:stack`) under **Authorized JavaScript origins**. Copy `client/.env.example` to `client/.env` and set `VITE_GOOGLE_CLIENT_ID`; copy the same ID into `GOOGLE_CLIENT_ID` in `server/.env`. Do not put a client secret in frontend configuration. In Google Auth Platform, configure the OAuth consent screen; while its audience is **External** and the app is in testing, add the Google accounts you use under **Test users**. Publish the app if you intend to allow users beyond the configured test audience. Add the Vite preview origin (`http://localhost:4173`) too if you use it.
4. To enable password reset emails, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` in `server/.env` using your email provider's SMTP settings. Set `CLIENT_URL` to the exact public frontend origin used in reset links, such as `http://localhost:5173` for local development. Use a verified sender address for `SMTP_FROM`; do not commit real SMTP credentials.
5. Start both applications:

```sh
npm run dev:stack
```

### Deploy the API on Render

Create a Render Web Service with **Root Directory** `server`, **Build Command** `npm install`, and **Start Command** `npm start`. Set `MONGODB_URI` to a hosted MongoDB connection string (for example, MongoDB Atlas), `JWT_SECRET` to a secure random value of at least 32 characters, and `CLIENT_URL` to the exact public URL of the frontend. Add `GOOGLE_CLIENT_ID` and any SMTP settings as needed. Render supplies `PORT`; the server binds to `0.0.0.0`. Do not upload `.env` files or use the localhost URI from `server/.env.example` in production.

The API allows the configured `CLIENT_URL` origin for cross-origin browser requests. Local Vite origins are allowed outside production. Keep `CLIENT_URL` set to the frontend origin, without an API path.

Vite proxies `/api` requests to Express on port 5000. The API provides email registration/sign-in, revocable sessions, Google Identity Services popup sign-in with Google ID-token signature, audience, issuer, expiration, and verified-email checks, one-hour single-use password reset links, and user-scoped MongoDB workspace persistence. `/dashboard` requires a verified session; `/preview` remains an unauthenticated browser-only preview. The health endpoint is available at `http://localhost:5000/api/health`.

To run the production preview on port 4173 after configuring the environment files, build with `npm run build`, start the API with `npm run dev --workspace server`, and start the preview in another terminal with `npm run preview --workspace client -- --host 0.0.0.0 --port 4173`. Restart Vite or rebuild after changing `client/.env`.

The current release includes working notes, folders, saved community items, and task workflows. Notes and folders use responsive pagination with nine items per page, while search and filters apply across the full collection. Folder cards can be recolored from the folder list using the color swatches, and the selected color is saved with the folder. In folder details, saved items appear in a compact, scrollable grid in the Workspace panel, which also has its own independent assistant chat; a separate assistant chat appears alongside it on wider screens, with equal-height panels, and stacks below on narrow screens. Each chat keeps its own message history while sharing access to folder files. Chat attachments appear as compact responsive file cards and can be opened from their message. Assistant replies are preview-only until a live AI provider is connected. Uploaded originals use the configured per-file size limit (100 MB by default): browser IndexedDB in preview mode and MongoDB GridFS for signed-in accounts. Images, PDFs, audio, and video can be previewed; other files can be downloaded. Older uploads that stored metadata only must be uploaded again to restore the original.

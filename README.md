# CHurchV2

- AI assist notes: [docs/ai-assist.md](file:///c:/Users/Lenovo/Documents/projects/reactjs/churchv2/docs/ai-assist.md)

## Deployment

### Backend on Render

- Preferred: create the service from [render.yaml](file:///c:/Users/Lenovo/Documents/projects/reactjs/churchv2/render.yaml)
- Runtime: `Node`
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

If your Render service is already pointed at the repo root, this repo now also includes a root [package.json](file:///c:/Users/Lenovo/Documents/projects/reactjs/churchv2/package.json) fallback so `npm run build` and `npm start` forward to the backend.

Set these backend environment variables on Render using [backend/.env.example](file:///c:/Users/Lenovo/Documents/projects/reactjs/churchv2/backend/.env.example) as the guide:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN=https://your-netlify-site.netlify.app`
- `ANTHROPIC_API_KEY` if AI phrasing is enabled
- Google Cloud Storage vars if media upload is enabled

### Frontend on Netlify

- Config file: [netlify.toml](file:///c:/Users/Lenovo/Documents/projects/reactjs/churchv2/netlify.toml)
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `build`

Set this environment variable on Netlify using [frontend/.env.example](file:///c:/Users/Lenovo/Documents/projects/reactjs/churchv2/frontend/.env.example):

- `REACT_APP_API_URL=https://your-render-service.onrender.com/api`

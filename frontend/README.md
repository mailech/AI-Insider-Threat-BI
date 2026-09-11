# Sentinel Insight frontend

React/Vite frontend for the Insider Threat Behavioral Intelligence System.

## Run locally

```bash
npm install
npm run dev
```

Create `.env` from `.env.example` to point at the FastAPI backend. The UI expects `GET /dashboard/overview` and `POST /alerts/:id/acknowledge`; it displays safe local sample data until those endpoints are connected.

## Design approval checkpoints

1. **Palette** - Current: deep navy, violet, mint, and severity colors. Alternative: neutral light SOC theme.
2. **Motion** - Current: restrained Framer Motion transitions and a slow signal orbit. Alternative: reduce to no decorative motion.
3. **Information density** - Current: analyst-focused overview with four metrics and a short priority queue. Alternative: include a full risk heatmap.

## SEO maintenance

Review the title, description, and `keywords` meta tag in `index.html` every quarter using approved analytics and search-query data. Keep terms specific to the product, such as `insider threat detection`, `UEBA`, `behavioral analytics`, `SOC dashboard`, and `anomaly detection`; do not keyword-stuff.

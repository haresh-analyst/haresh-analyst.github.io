# Haresh Khumar Portfolio — Modular Version

This project is intentionally organized so a non-technical person can understand and maintain it.

## 1. Folder map

```text
index.html                    Main page structure only
│
├── css/
│   └── style.css             Colors, layout, buttons, responsive design, loader
│
├── js/
│   ├── loading.js            0–100% startup loader and real asset preloading
│   ├── main.js               Website interactions: theme, chat, video, documents, dashboards
│   └── analytics.js           Google Analytics + Microsoft Clarity + event tracking
│
├── config/
│   ├── site-config.js        Easy settings: contact details, analytics IDs, loading options
│   └── site-data.js           Portfolio data and file paths (text/data, not binary files)
│
└── assets/
    ├── photo.jpg             Profile image
    ├── slb-intro.mp4         SLB internship video
    ├── sales-demo.mp4        Sales forecasting demo
    ├── documents/             Resume, cover letter, SLB letter, transcript pages
    └── dashboards/            Dashboard HTML files
```

## 2. Where to change things

### Profile photo
Replace:

`assets/photo.jpg`

Keep the same filename and you normally do not need to change code.

### SLB video
Replace:

`assets/slb-intro.mp4`

### Sales demo video
Replace:

`assets/sales-demo.mp4`

### Documents
Replace the matching image files inside:

`assets/documents/`

The document names and text are described in:

`config/site-data.js`

### Dashboard
Replace the relevant dashboard HTML inside:

`assets/dashboards/`

### Contact details / analytics / basic settings
Edit only:

`config/site-config.js`

### Website wording and layout
Edit:

`index.html`

The HTML contains clear `[SECTION: ...]` comments so you can find Header, Hero, SLB, Projects, Skills, Education, Documents, Contact, etc.

## 3. Startup loading system

The recruiter sees a full-screen loading screen first.

It reports:

- Overall percentage
- Current file/resource being loaded
- Number of resources ready
- Downloaded bytes / expected bytes
- Estimated time remaining
- Final 100% confirmation

The page is revealed only after the required local assets have finished loading.

This is deliberately different from the old small bottom-corner status button: the recruiter does not need to discover or click anything.

## 4. Why the heavy files are outside HTML

Images, videos and document pages are normal files in `assets/`.

They are NOT Base64 blobs inside `index.html`.

That makes the project:

- easier to read
- easier to edit
- easier to back up
- easier to move between GitHub Pages, Cloudflare Pages, Netlify, Vercel or another host
- easier to expand later

## 5. Analytics

The project is prepared for:

- Google Analytics 4
- Microsoft Clarity

The existing IDs are stored in `config/site-config.js`.

Google Analytics can report aggregate traffic information such as visitors, sessions, dates/times, traffic source, device and approximate geographic reporting where available.

Custom events are also prepared for important actions such as:

- `theme_changed`
- `document_opened`
- `dashboard_opened`
- `sales_demo_opened`
- `slb_video_played`
- `slb_video_completed`

Microsoft Clarity can provide heatmaps and session-level interaction insights.

Use analytics responsibly and add an appropriate privacy/consent notice if required for your deployment and audience.

## 6. GitHub Pages

Upload the CONTENTS of this project to the root of your GitHub Pages repository.

The important rule is:

```text
index.html
assets/
css/
js/
config/
```

must all be at the same repository level.

Do not upload only `index.html`.

## 7. Adding a new asset

Example: add another project video.

1. Put the video in `assets/`.
2. Add its path/data to `config/site-data.js`.
3. Add the corresponding UI button/card in `index.html`.
4. If it must be available before entry, add it to the `preload` list in `config/site-data.js`.
5. If it is optional, do not add it to the preload list; load it when the user opens it.

## 8. Design principle

Keep these responsibilities separate:

```text
HTML       = what is on the page
CSS        = how it looks
JS         = how it behaves
CONFIG     = settings you may change
DATA       = portfolio content + asset paths
ASSETS     = actual photos, videos, documents and dashboards
```

That separation is intentional and should be preserved as the portfolio grows.

## How the startup loader works

The portfolio does **not** wait for every large file to download completely. Before entry it verifies the resources a recruiter needs for the first review:

- Profile photo is loaded.
- The SLB video is playback-ready (the browser has enough data to start it).
- All document pages are loaded.
- Fonts and the chart engine are ready.
- KPI numbers are already present before the page is revealed.

The rest of the SLB video continues buffering in the background. The Sales Forecasting demo and dashboard files do not block entry. This keeps the recruiter experience fast without showing a portfolio with missing numbers or documents.

### If you change a video

Replace the matching file in `assets/videos/` if you later move the videos there, or update the path in `config/site-data.js`. The loader treats the SLB video as playback-ready rather than requiring a complete download.

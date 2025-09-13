## UTM Builder

Small accessible React app to build UTM tagged links fast with domain + page presets, automatic normalization, history and optional advanced parameters.

### Stack
* Vite
* React 18
* Tailwind CSS

### Features
* Domain presets with per‑domain landing pages
* Paste full URL -> auto split domain/path (keeps existing query like ?upgrade)
* Automatic token normalization (lowercase, underscores)
* Optional utm_term / utm_content
* History (local only) with reuse & copy
* Accessible keyboard navigation (Alt+1..6, radiogroups, skip link)

### Quick start
```bash
npm install
npm run dev
```
Open http://localhost:5173 (default Vite port).

### Production build
```bash
npm run build
npm run preview # local preview of dist/
```

### Deploy to GitHub Pages (automatic)
1. Push repository to GitHub (e.g. `username/utm-builder`).
2. The provided workflow `.github/workflows/deploy.yml` will:
	* Build with dynamic base path `/REPO_NAME`
	* Publish to GitHub Pages (Settings -> Pages -> Source: GitHub Actions)
3. Final URL: `https://USERNAME.github.io/REPO_NAME/`

### Manual Pages deploy (optional)
```bash
BASE_PATH=/utm-builder npm run build
npx gh-pages -d dist  # (if you add gh-pages package)
```

### Environment / base path
`vite.config.js` reads `process.env.BASE_PATH`. The GitHub Action sets this automatically to `/<repo>`.

### Key files
* `UTMBuilder.jsx` main application component
* `src/utils.js` normalization + URL build helpers
* `vite.config.js` Vite config (dynamic base)
* `tailwind.config.cjs` Tailwind content config

### Future enhancements (ideas)
* Export / import presets (JSON)
* CSV export of history
* Undo for history clear
* Dark mode toggle
* PWA / offline

### License
MIT (adjust as needed)

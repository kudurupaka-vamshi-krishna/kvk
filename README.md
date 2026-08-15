# Academic & Research Website — Dr. K. Vamshi Krishna

This repository contains a modular, data-driven personal academic website built specifically for **GitHub Pages** (Jekyll / Static Site Generator) and **Vercel**.

## 📁 Project Directory Structure

```
kvamshikrishna.github.io/
├── _config.yml              # Site metadata (name, emails, institution)
├── _data/                   # All research data stored in YAML format
│   ├── author.yml           # Biography, affiliations, core interests
│   ├── education.yml        # Ph.D., M.Tech, B.Tech degrees
│   ├── publications.yml     # Peer-reviewed journal articles, conference papers, DOIs
│   ├── patents.yml          # Intellectual property & patent filings
│   ├── projects.yml         # Funded research projects & grant agency details
│   ├── skills.yml           # Languages, simulation software, IoT hardware, models
│   ├── awards.yml           # Travel grants, fellowships, scholarships
│   └── navigation.yml       # Navbar menu tabs
├── _layouts/                # HTML layout templates
│   └── default.html         # Base template with Tailwind CSS & FontAwesome
├── _includes/               # Shared components
├── index.html               # Home / Bio page
├── research/index.html      # Research Projects & Patents tab
├── publications/index.html  # Publications & Conference Talks tab
├── skills/index.html        # Skills & Methodologies tab
├── experience/index.html    # Education & Work History tab
├── awards/index.html        # Honors, Fellowships & Grants tab
├── contact/index.html       # Contact Information & Form tab
└── assets/                  # Downloadable assets (PDFs, images)
```

## 🚀 How to Host & Populate for Any Institute or Company

### 1. Initialize Git & Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit of academic research website"
git branch -M main
git remote add origin https://github.com/<your-username>/kvamshikrishna.github.io.git
git push -u origin main
```

### 2. Enable GitHub Pages
1. Go to your repository on GitHub: `https://github.com/<your-username>/kvamshikrishna.github.io`
2. Navigate to **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Select `main` branch and `/ (root)` folder, then click **Save**.
5. Your website will be automatically deployed at `https://<your-username>.github.io`.

### 3. Deploying to Vercel (Alternative)
1. Log into [Vercel](https://vercel.com) using your GitHub account.
2. Click **Add New > Project** and import your `kvamshikrishna.github.io` repository.
3. Click **Deploy**. Any future `git push` to your GitHub repo will automatically update your site.

### 4. Updating Content When Joining a New Institute / Company
Whenever you join a new institute, publish new papers, or receive new grants:
- **Change Affiliation / Contact:** Edit `_config.yml` and `_data/author.yml`.
- **Add New Publications / DOIs:** Edit `_data/publications.yml`.
- **Add New Patents or Projects:** Edit `_data/patents.yml` or `_data/projects.yml`.
- **Commit changes:** `git commit -am "Update affiliation" && git push`


# Graphical Abstract Synthesizer

Static frontend (`index.html`) + one Vercel serverless function (`api/generate.js`) that holds
your Anthropic API key server-side. Semantic Scholar lookups happen directly from the browser
since that API is public and CORS-enabled.

## Why two hosts

GitHub Pages only serves static files — it can't run a server-side function, and the Anthropic
API key must never be shipped in client-side JS. So the function has to live somewhere that runs
server code. Vercel is the natural fit here: it deploys `/api/*.js` files as serverless functions
automatically, with no framework required.

You have two options:

- **Vercel only**: deploy the whole folder to Vercel. `index.html` and `/api/generate` are served
  from the same domain. Simplest option.
- **GitHub Pages + Vercel**: host `index.html` on GitHub Pages (or anywhere static), and point it
  at your Vercel function's URL for the AI step. Both are already wired up this way below —
  GitHub Pages just calls the Vercel endpoint cross-origin.

## 1. Deploy the function to Vercel

1. Push this folder to a GitHub repo (or a folder within your existing site's repo).
2. Import the repo at vercel.com → New Project. Vercel auto-detects `/api/generate.js`.
3. In Project Settings → Environment Variables, add:
   - `ANTHROPIC_API_KEY` = your Anthropic API key (get one at console.anthropic.com)
4. Deploy. Your endpoint is now live at:
   `https://<your-project>.vercel.app/api/generate`
5. Check `api/generate.js` for the `model` field before going live — confirm the current
   recommended model string in the Anthropic docs (it changes over time).

## 2. Point the frontend at your function

Open `index.html`, find this line near the top of the `<script>` block:

```js
const API_ENDPOINT = "https://your-project.vercel.app/api/generate";
```

Replace it with your real Vercel deployment URL from step 1.

## 3. Host the frontend

- **If using Vercel for everything**: nothing else to do — `index.html` is served from the
  project root automatically.
- **If using GitHub Pages**: commit `index.html` to your Pages repo (root, or `/docs`, depending
  on your Pages source setting) and push. GitHub Pages will serve it as-is; it will call your
  Vercel function over the network for the synthesis step.

## Security notes before going live

- The function currently sets `Access-Control-Allow-Origin: *`, so any site can call it. Once
  you know your final domain(s) (e.g. `https://viswire.com`, `https://<user>.github.io`), change
  that header in `api/generate.js` to your actual origin(s) to stop other sites from riding on
  your API key/budget.
- There's no rate limiting or abuse protection here. If this page is public, consider adding a
  simple request cap (e.g. via Vercel's edge middleware or a lightweight token check) before
  linking to it from a high-traffic page — each generation is a billed API call.
- Semantic Scholar's public API has its own rate limits; heavy traffic may need an API key from
  them too (free, see api.semanticscholar.org).

## Local testing

```bash
npm i -g vercel
vercel dev
```

This runs both the static file and the `/api/generate` function locally, so you can test end to
end before deploying.

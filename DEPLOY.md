# Publishing the Game to the Web

## GitHub Pages (Recommended)

1. **Create a new repo on GitHub**: Go to [github.com/new](https://github.com/new), name it `cuphead-runner`, and create it (don't add README or .gitignore).

2. **Commit and push** (run in a terminal from your project folder — if `git commit` fails in Cursor, try a regular PowerShell or Command Prompt):
   ```bash
   git add -A
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cuphead-runner.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**: Go to your repo → **Settings** → **Pages** → under "Build and deployment":
   - Source: **GitHub Actions**
   - Save (the workflow in `.github/workflows/deploy-pages.yml` will deploy automatically)

4. **Your game will be at**: `https://YOUR_USERNAME.github.io/cuphead-runner/` (or your custom domain)

## Option 2: Netlify (Free, No Account Needed for Quick Deploy)

1. Go to [netlify.com](https://www.netlify.com)
2. Drag and drop your `cuphead-runner` folder onto the Netlify deploy area.
3. You get an instant URL like `https://random-name-123.netlify.app`

## Option 3: itch.io (Great for Games)

1. Go to [itch.io](https://itch.io)
2. Create an account → **Upload new project**
3. Upload your files (or zip the folder and upload).
4. Set "Kind of project" to **HTML**
5. Check "This file will be played in the browser"
6. Publish → Share your game page URL.

## Option 4: Vercel (Free)

1. Install Vercel CLI: `npm i -g vercel`
2. In your `cuphead-runner` folder: `vercel`
3. Follow the prompts → get a URL like `https://cuphead-runner.vercel.app`

---

**Important:** Use *relative* paths for assets. Your current paths (`game.js`, `styles.css`) are already relative, so they should work when deployed.

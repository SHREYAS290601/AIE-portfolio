## GitHub Pages Deployment

This folder is ready to publish on GitHub Pages.

### Files GitHub Pages needs

- `index.html`
- `portfolio.html`
- `assets/`
- `.nojekyll`

### Quick publish commands

If this folder is the root of a repo:

```bash
git init
git add .
git commit -m "Add portfolio site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Then in GitHub:

1. Open the repository.
2. Go to `Settings -> Pages`.
3. Under `Build and deployment`, choose `Deploy from a branch`.
4. Select branch `main`.
5. Select folder `/ (root)`.
6. Save.

### If you want a custom domain

1. Copy `CNAME.example` to `CNAME`.
2. Replace the placeholder with your real domain.
3. Commit and push:

```bash
cp CNAME.example CNAME
# edit CNAME so it contains only your domain, for example:
# portfolio.yourdomain.com

git add CNAME
git commit -m "Add custom domain for portfolio"
git push
```

Then add the matching DNS record in your domain provider and set the same custom domain in GitHub Pages settings.

### Result

- User site repo `YOUR_USERNAME.github.io`: `https://YOUR_USERNAME.github.io/`
- Project site repo `YOUR_REPO`: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

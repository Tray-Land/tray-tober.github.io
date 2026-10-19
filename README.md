# tray-tober.github.io

GitHub Page for the Tray-tober project: a tray app a day all October.

Static site, served from the repo root. Only apps whose day has arrived are published.

## Updating

```
node build.mjs "path	o	raytober.json"
```

This copies released apps (and icons) into `data/` and `assets/icons/`, then regenerates `index.html` and `apps/*/index.html`. Run it daily, then commit and push. `node build.mjs` alone rebuilds from `data/apps.json`.

const fs = require("fs");
const path = require("path");

const target = process.argv[2] || path.join(process.cwd(), "dist", "index.html");
const distDir = path.dirname(target);
const marketingFaviconSource = path.join(process.cwd(), "assets", "favicon-marketing.png");
const marketingFaviconTarget = path.join(distDir, "favicon-marketing.png");

if (!fs.existsSync(target)) {
  console.error(`Web export patch failed: ${target} does not exist.`);
  process.exit(1);
}

if (fs.existsSync(marketingFaviconSource)) {
  fs.copyFileSync(marketingFaviconSource, marketingFaviconTarget);
}

const source = fs.readFileSync(target, "utf8");

const patched = source.replace(
  /<script\s+src="([^"]+)"\s+defer><\/script>/,
  '<script type="module" src="$1"></script>',
);

const withMarketingFavicon = patched
  .replace(
    /<link rel="icon"[^>]*href="[^"]*"[^>]*>/i,
    '<link rel="icon" type="image/png" href="./favicon-marketing.png" />',
  )
  .replace(
    /<link rel="shortcut icon"[^>]*href="[^"]*"[^>]*>/i,
    '<link rel="shortcut icon" href="./favicon-marketing.png" />',
  )
  .replace(
    /<link rel="apple-touch-icon"[^>]*href="[^"]*"[^>]*>/i,
    '<link rel="apple-touch-icon" href="./favicon-marketing.png" />',
  );

if (withMarketingFavicon === source) {
  console.warn("Web export patch made no changes. Output HTML format may have changed.");
} else {
  fs.writeFileSync(target, withMarketingFavicon, "utf8");
  console.log(`Patched ${target} for module-based web bundle loading and marketing favicon.`);
}

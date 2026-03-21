const fs = require("fs");
const path = require("path");

const target = process.argv[2] || path.join(process.cwd(), "dist", "index.html");

if (!fs.existsSync(target)) {
  console.error(`Web export patch failed: ${target} does not exist.`);
  process.exit(1);
}

const source = fs.readFileSync(target, "utf8");

const patched = source.replace(
  /<script\s+src="([^"]+)"\s+defer><\/script>/,
  '<script type="module" src="$1"></script>',
);

if (patched === source) {
  console.warn("Web export patch made no changes. Script tag format may have changed.");
} else {
  fs.writeFileSync(target, patched, "utf8");
  console.log(`Patched ${target} for module-based web bundle loading.`);
}

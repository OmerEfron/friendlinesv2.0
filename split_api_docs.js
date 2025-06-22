const fs = require('fs');
const path = require('path');

// Paths
const rootDir = __dirname;
const sourceFile = path.join(rootDir, 'API_DOCUMENTATION.md');
const outDir = path.join(rootDir, 'api_docs');

// Delete existing api_docs to start fresh (safe because it is generated content)
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// Read the entire documentation
const doc = fs.readFileSync(sourceFile, 'utf8');
const lines = doc.split(/\r?\n/);

let currentSlug = null;
let sectionBuffer = [];
const sections = [];

// Helper to determine category based on slug heuristics
function getCategory(slug) {
  if (slug.startsWith('social_features')) return 'social_features';
  if (slug.includes('endpoint')) return 'endpoints';
  if (slug.startsWith('development')) return 'development';
  if (slug.includes('authentication')) return 'authentication';
  if (slug.startsWith('frontend')) return 'frontend';
  if (
    slug.includes('data_structure') ||
    slug.includes('newsflash_generation') ||
    slug.includes('security_validation') ||
    slug.includes('http_status_codes')
  )
    return 'architecture';
  // Default bucket
  return 'general';
}

// Update saveSection to write into category subfolder
function saveSection() {
  if (!currentSlug) return; // nothing to save yet
  const category = getCategory(currentSlug);
  const categoryDir = path.join(outDir, category);
  fs.mkdirSync(categoryDir, { recursive: true });
  const filePath = path.join(categoryDir, `${currentSlug}.md`);
  fs.writeFileSync(filePath, sectionBuffer.join('\n'), 'utf8');
  sections.push({ title: currentTitle, slug: currentSlug, category });
  sectionBuffer = [];
}

// Adjusted variables to track title for saving
let currentTitle = null;

// Iterate through lines and split by second-level headings (## )
for (const line of lines) {
  if (line.startsWith('## ')) {
    // New section detected
    saveSection();

    const title = line.replace(/^##\s+/, '').trim();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // non-alphanumerics to _
      .replace(/^_|_$/g, ''); // trim leading/trailing _

    currentSlug = slug || 'untitled';
    currentTitle = title;
  }

  // Accumulate lines (including heading)
  if (currentSlug) {
    sectionBuffer.push(line);
  }
}
// Save the last buffered section
saveSection();

// Generate an index README linking to all split files, grouped by category
const categoriesMap = sections.reduce((acc, s) => {
  if (!acc[s.category]) acc[s.category] = [];
  acc[s.category].push(s);
  return acc;
}, {});

function formatCategory(cat) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

const indexLines = [
  '# Friendlines API Documentation',
  '',
  '## Sections',
  '',
];

for (const [category, secs] of Object.entries(categoriesMap)) {
  indexLines.push(`### ${formatCategory(category)}`);
  indexLines.push('');
  secs.forEach((s) => {
    indexLines.push(`- [${s.title}](./${s.category}/${s.slug}.md)`);
  });
  indexLines.push('');
}

indexLines.push('> _This documentation was automatically split from the original `API_DOCUMENTATION.md` for easier navigation._');

fs.writeFileSync(path.join(outDir, 'README.md'), indexLines.join('\n'), 'utf8');

console.log(`Split complete! ${sections.length} sections written to ${outDir}`); 
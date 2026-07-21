import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// FR-049: No chart, graph, sparkline, or other health-data visualisation.
// Scan the package's own src/ for chart-library imports and <canvas> elements.
// Do NOT flag bare <svg> — an icon is not a visualisation.

const CHART_LIBRARIES = [
  'recharts',
  'chart.js',
  'chartjs',
  'd3',
  'victory',
  'nivo',
  'plotly',
  'apexcharts',
];

function readSrcFiles(): { filePath: string; content: string }[] {
  const srcDir = path.resolve(__dirname);
  const results: { filePath: string; content: string }[] = [];

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // Skip node_modules and dist
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        results.push({ filePath: entry.name, content });
      }
    }
  };

  walk(srcDir);
  return results;
}

describe('noVisualisations — no chart libraries or canvas elements', () => {
  const srcFiles = readSrcFiles();

  describe.each(CHART_LIBRARIES)('%s', (lib) => {
    it(`is not imported in any source file`, () => {
      const offendingFiles: string[] = [];
      for (const { filePath, content } of srcFiles) {
        // Check for import statements that reference the library
        const importRegex = new RegExp(
          `import\\s+.*from\\s+['"](?:${lib}|@.*${lib})['"]`,
          'i'
        );
        const requireRegex = new RegExp(
          `require\\s*\\(\\s*['"](?:${lib}|@.*${lib})['"]\\s*\\)`,
          'i'
        );
        if (importRegex.test(content) || requireRegex.test(content)) {
          offendingFiles.push(filePath);
        }
      }
      expect(offendingFiles, `${lib} found imported in: ${offendingFiles.join(', ')}`).toHaveLength(0);
    });
  });

  it('no source file contains canvas elements', () => {
    const offendingFiles: string[] = [];
    for (const { filePath, content } of srcFiles) {
      // Skip this test file itself (it references canvas in comments)
      if (filePath === 'noVisualisations.test.ts') continue;
      // Check for JSX canvas elements
      const canvasRegex = /<canvas[\s>]/i;
      if (canvasRegex.test(content)) {
        offendingFiles.push(filePath);
      }
    }
    expect(offendingFiles, `canvas found in: ${offendingFiles.join(', ')}`).toHaveLength(0);
  });

  it('bare <svg> is allowed (icons are not visualisations)', () => {
    // This test documents that we intentionally do NOT flag <svg> elements.
    // An icon rendered as <svg> is not a chart or graph.
    // If any source file happens to contain <svg>, that's fine.
    const svgFiles: string[] = [];
    for (const { filePath, content } of srcFiles) {
      if (/<svg[\s>]/i.test(content)) {
        svgFiles.push(filePath);
      }
    }
    // Just log for information — this is not a failure
    if (svgFiles.length > 0) {
      console.log(`Note: ${svgFiles.length} file(s) contain <svg> (allowed — icons are not visualisations)`);
    }
    expect(true).toBe(true);
  });
});

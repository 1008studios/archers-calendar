const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf-8');

const canvasStartStr = '  // ── Canvas ─────────────────────────────────────────────────────────────────';
const canvasStartIdx = content.indexOf(canvasStartStr);

if (canvasStartIdx === -1) {
  console.log("Could not find canvas start");
  process.exit(1);
}

// Find the end of the canvas definition
const pageStartStr = '  // ── Page ───────────────────────────────────────────────────────────────────';
const pageStartIdx = content.indexOf(pageStartStr);

if (pageStartIdx === -1) {
  console.log("Could not find page start");
  process.exit(1);
}

const canvasBlock = content.slice(canvasStartIdx, pageStartIdx);

// Now we need to modify app/page.tsx to remove the canvas block
// And replace where {canvas} is used with <PreviewCanvas />

let newContent = content.slice(0, canvasStartIdx) + content.slice(pageStartIdx);
newContent = newContent.replace('{canvas}', '<PreviewCanvas canvasRef={canvasRef} previewScale={previewScale} />');
newContent = newContent.replace('export default function Home() {', 'import PreviewCanvas from "@/components/PreviewCanvas";\nimport MobileControls from "@/components/MobileControls";\nimport ExportOverlay from "@/components/ExportOverlay";\nimport { ScheduleProvider, useSchedule } from "@/lib/ScheduleContext";\n\nexport default function Home() {\n  return (\n    <ScheduleProvider>\n      <MainApp />\n    </ScheduleProvider>\n  );\n}\n\nfunction MainApp() {');

// The mobile tab bar replacement:
const mobileTabBarStr = '{/* Mobile tab bar */}';
const mobileTabBarIdx = newContent.indexOf(mobileTabBarStr);
if (mobileTabBarIdx !== -1) {
  const nextSectionIdx = newContent.indexOf('</section>', mobileTabBarIdx);
  const mobileTabReplacement = `<MobileControls>{controls}</MobileControls>\n`;
  newContent = newContent.slice(0, mobileTabBarIdx) + mobileTabReplacement + newContent.slice(nextSectionIdx);
}

// Replace handleExport for dynamic scaling
newContent = newContent.replace(
  'const exportedCanvas = await captureExportCanvas(canvasRef.current, canvasSize);',
  'const isMobile = window.innerWidth <= 768;\n      const dynamicScale = isMobile ? 2 : 4;\n      const exportedCanvas = await captureExportCanvas(canvasRef.current, canvasSize, dynamicScale);'
);
newContent = newContent.replace(
  'const exported = await captureExportCanvas(canvasRef.current, CANVAS_SIZES[deviceId]);',
  'const isMobile = window.innerWidth <= 768;\n          const dynamicScale = isMobile ? 2 : 4;\n          const exported = await captureExportCanvas(canvasRef.current, CANVAS_SIZES[deviceId], dynamicScale);'
);

// Add <ExportOverlay /> inside <main>
newContent = newContent.replace('<main data-app-theme={appTheme} className="h-dvh w-full overflow-hidden bg-[#080B09] text-white">', '<main data-app-theme={appTheme} className="h-dvh w-full overflow-hidden bg-[#080B09] text-white">\n      <ExportOverlay />');

fs.writeFileSync('app/page.tsx', newContent);
console.log('Modified app/page.tsx successfully.');

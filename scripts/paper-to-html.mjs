// Rebuild with: node scripts/paper-to-html.mjs
// If esbuild is absent: npm install --no-save --package-lock=false esbuild
// Root sizing and absolute text whitespace restore layout omitted by Paper JSX.
// Source: Paper get_jsx({format: 'inline-styles'}), saved verbatim in private/.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transform } from 'esbuild';
const root = fileURLToPath(new URL('../', import.meta.url));
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for (const slug of ['c-thread-inbox', 'd-timeline']) {
  const source = path.join(root, 'private/paper-jsx', slug);
  const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
  const nodes = manifest.nodes;
  const minX = Math.min(...nodes.map(n => n.worldX)), minY = Math.min(...nodes.map(n => n.worldY));
  const width = Math.max(...nodes.map(n => n.worldX + n.width)) - minX + 128;
  const height = Math.max(...nodes.map(n => n.worldY + (n.height ?? 0))) - minY + 128;
  const families = new Set();
  const frames = [];
  for (const n of nodes) {
    const jsx = await readFile(path.join(source, n.id + '.jsx'), 'utf8');
    for (const m of jsx.matchAll(/fontFamily: '([^']+)'/g)) {
      const family = m[1].split(',')[0].replaceAll('"','').trim();
      if (!['system-ui','sans-serif','serif','monospace'].includes(family)) families.add(family);
    }
    if (/paper-asset:|<img|url\((?!#)/.test(jsx)) throw new Error('Image fill needs a local asset mapping: ' + n.id);
    const { code } = await transform('result = ' + jsx, {loader:'jsx', jsxFactory:'React.createElement', jsxFragment:'React.Fragment'});
    const context = { React, result: null };
    vm.runInNewContext(code, context);
    const html = renderToStaticMarkup(context.result);
    frames.push(`<section class="frame${n.height === null ? '' : ' fixed-frame'}" data-node="${escape(n.id)}" aria-label="${escape(n.name)}" style="left:${n.worldX-minX+64}px;top:${n.worldY-minY+64}px;width:${n.width}px;${n.height === null ? '' : `height:${n.height}px;`}"><div class="frame-label">${escape(n.name)}</div>${html}</section>`);
  }
  const fonts = [...(families.size ? families : new Set(['Inter']))].sort().map(f => 'family='+encodeURIComponent(f).replaceAll('%20','+')+':wght@400;500;600;700').join('&');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escape(manifest.name)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${escape(fonts)}&amp;display=swap">
<style>html,body{margin:0;background:${manifest.background};overscroll-behavior:none}body{width:max-content}#canvas{position:relative;width:${width}px;height:${height}px;overflow:clip}.frame{position:absolute}.fixed-frame>:last-child{width:100%;height:100%}.frame div[style*="position:absolute"]:not([style*="width:"]):not(:has(>*)){white-space:pre}.frame-label{position:absolute;bottom:calc(100% + 7px);left:0;color:#8C8C8C;font:12px/14px system-ui,sans-serif;white-space:nowrap}#zoom{position:fixed;right:16px;bottom:16px;z-index:1;display:flex;align-items:center;gap:4px;padding:4px;border:1px solid #484848;border-radius:7px;background:#292929;color:#ddd;font:12px system-ui,sans-serif}#zoom button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:6px 9px}#zoom button:focus-visible{outline:1px solid #ccc}#percent{min-width:42px;text-align:center}</style></head>
<body><main id="canvas">${frames.join('\n')}</main><nav id="zoom" aria-label="Canvas zoom"><button data-zoom="out" aria-label="Zoom out">−</button><button data-zoom="reset" id="percent" aria-label="Reset to 100%">100%</button><button data-zoom="in" aria-label="Zoom in">+</button><button data-zoom="fit">Fit</button></nav>
<script>(()=>{let z=1;const c=document.getElementById('canvas'),p=document.getElementById('percent');function zoom(a){const x=scrollX/z,y=scrollY/z;z=a==='fit'?Math.min(innerWidth/${width},innerHeight/${height}):a==='reset'?1:Math.max(.05,Math.min(4,z*(a==='in'?1.25:.8)));c.style.zoom=z;p.textContent=Math.round(z*100)+'%';scrollTo(a==='fit'?0:x*z,a==='fit'?0:y*z)}document.getElementById('zoom').onclick=e=>{if(e.target.dataset.zoom)zoom(e.target.dataset.zoom)};onkeydown=e=>{if(e.metaKey||e.ctrlKey||e.altKey)return;const a={'-':'out','=':'in','+':'in','0':'reset'}[e.key];if(a){e.preventDefault();zoom(a)}}})();</script></body></html>`;
  const output = path.join(root, 'public/concepts', slug);
  await mkdir(output, {recursive:true});
  await writeFile(path.join(output, 'index.html'), html);
  console.log(`${slug}: ${nodes.length} nodes, ${width} × ${height}, ${Buffer.byteLength(html)} bytes; fonts: ${[...families].join(', ')}`);
}

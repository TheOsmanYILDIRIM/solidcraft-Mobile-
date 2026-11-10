import{test}from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");const src=readFileSync(new URL("../app.js",import.meta.url),"utf8");test("real command bridge",()=>{for(const s of ['api.commands()','"ui.start"','"document.export"','"document.import"','"ui.prefs"'])assert.ok(src.includes(s),s)});test("mobile screens",()=>{for(const s of ['id="cad"','id="sheet"','id="tools"','id="upload"'])assert.ok(html.includes(s),s)});test("language and scale",()=>{assert.ok(src.includes("lang:\"tr\""));assert.ok(src.includes("2.5"));assert.ok(src.includes("en:{"))});
test("GitHub Pages production engine URL is used",()=>{
  assert.match(src,/\.\.\/app-edge\//);
  assert.doesNotMatch(src,/embed=editor/);
});

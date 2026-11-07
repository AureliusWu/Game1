import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const hub=readFileSync(new URL('../dist/hub.mjs',import.meta.url),'utf8');
const menu=html.slice(html.indexOf('<main id="menu"'),html.indexOf('</main>')+7);
const launcher=html.slice(html.indexOf('<dialog id="menu-systems"'),html.indexOf('<dialog id="story-config-dialog"'));
const story=html.slice(html.indexOf('<dialog id="story-config-dialog"'),html.indexOf('<section id="game"'));

test('primary menu contains all launch actions; secondary systems do not force homepage scrolling',()=>{
 for(const id of ['menu-systems-open','start','continue','starter-options','difficulty-info','story-config-open','records-open'])assert.match(menu,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(menu,/class="postoffice-hub"|class="journey-strip"|id="story-prep"/);
 assert.match(launcher,/class="postoffice-hub"/);
 assert.match(launcher,/class="journey-strip"/);
 for(const tab of ['inventory','journal','tree','office','achievements'])assert.match(launcher,new RegExp('data-hub="'+tab+'"'));
 assert.match(story,/id="story-prep"/);
 assert.match(story,/id="contract-select"/);
 assert.match(story,/id="daily-setting"/);
 assert.equal((html.match(/id="story-prep"/g)||[]).length,1);
});
test('landscape menu fits a viewport and has a very-short-screen fallback',()=>{
 assert.match(css,/@media \(orientation:landscape\) and \(max-height:650px\)/);
 assert.match(css,/#menu\.menu-view\{height:100dvh;[^}]*grid-template-rows:auto minmax\(0,1fr\) auto;overflow:hidden/);
 assert.match(css,/#menu \.hero\{display:grid;[^}]*min-height:0;overflow:hidden/);
 assert.match(css,/@media \(orientation:landscape\) and \(max-height:350px\)/);
 assert.match(css,/#menu \.hero-art\{display:none\}/);
});
test('secondary dialogs close safely before opening nested system views',()=>{
 assert.match(app,/\$\('menu-systems-open'\)\.addEventListener/);
 assert.match(app,/\$\('story-config-open'\)\.addEventListener/);
 assert.match(app,/\$\('story-config-open'\)\.hidden=settings\.mode!=='story'/);
 assert.match(hub,/if\(launcher\?\.open\)launcher\.close\(\);this\.show\(b\.dataset\.hub\)/);
});

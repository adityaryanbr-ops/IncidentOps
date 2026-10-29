import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as runtime from 'react/jsx-runtime';
const code=ts.transpileModule(fs.readFileSync('components/showcase-carousels.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
function setup(){
  const state=[],refs=[];let cursor=0,refCursor=0;
  const context={exports:{},require:name=>{
    if(name==='react')return {useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},useRef:initial=>{const i=refCursor++;return refs[i]||={current:initial};}};
    if(name==='react/jsx-runtime')return runtime;
    if(name.endsWith('scroll-reveal'))return {ScrollReveal:'reveal'};
    throw new Error(name);
  }};
  vm.runInNewContext(code,context);
  return {render:()=>{cursor=refCursor=0;return context.exports.IncidentQuoteDeck().props.children;},exports:context.exports};
}
function nodes(element){if(!element||typeof element!=='object')return [];return [element,...[element.props?.children].flat(Infinity).flatMap(nodes)];}
function active(tree){return nodes(tree).find(node=>node.type==='article'&&node.props['data-active']);}
test('hero carousel is removed while the original incident explorer remains',()=>{
  const page=fs.readFileSync('app/page.tsx','utf8');
  assert.ok(!page.includes('IncidentArcCarousel'));
  assert.ok(page.includes('<IncidentCategories'));
});
test('six named illustrative personas have portraits without Sample badges or playback/arrow controls',()=>{
  const app=setup();const tree=app.render(), all=nodes(tree);
  assert.equal(app.exports.ILLUSTRATIVE_REVIEWS.length,6);
  assert.equal(all.filter(node=>node.type==='blockquote').length,6);
  assert.equal(all.filter(node=>node.props?.className==='quote-avatar').length,6);
  assert.equal(all.filter(node=>node.type==='strong').length,6);
  assert.ok(all.some(node=>[node.props?.children].flat().includes('Example stories')));
  assert.ok(!all.some(node=>node.props?.children==='Sample'));
  assert.ok(all.filter(node=>node.type==='button').every(node=>node.props.className==='quote-pick'));
  assert.ok(!fs.readFileSync('components/showcase-carousels.tsx','utf8').includes('setInterval'));
  assert.ok(fs.existsSync('public/review-personas.webp'));
});
test('cards are selectable, keyboard navigation wraps, and the region is keyboard focusable',()=>{
  const app=setup();let tree=app.render();assert.equal(tree.props.tabIndex,0);
  nodes(tree).filter(node=>node.type==='button')[1].props.onClick();tree=app.render();
  assert.equal(active(tree).props['aria-label'],'Illustrative testimonial 2 of 6');
  tree.props.onKeyDown({key:'End',preventDefault(){}});tree=app.render();
  assert.equal(active(tree).props['aria-label'],'Illustrative testimonial 6 of 6');
  tree.props.onKeyDown({key:'ArrowRight',preventDefault(){}});tree=app.render();
  assert.equal(active(tree).props['aria-label'],'Illustrative testimonial 1 of 6');
});
test('swipe navigates without accidental selection while vertical scrolling remains native',()=>{
  const app=setup();let tree=app.render();
  tree.props.onPointerDown({clientX:200,clientY:10});tree.props.onPointerUp({clientX:80,clientY:15});tree=app.render();
  assert.equal(active(tree).props['aria-label'],'Illustrative testimonial 2 of 6');
  let prevented=false;tree.props.onClickCapture({preventDefault(){prevented=true;},stopPropagation(){}});assert.equal(prevented,true);
  tree.props.onPointerDown({clientX:100,clientY:10});tree.props.onPointerUp({clientX:90,clientY:200});tree=app.render();
  assert.equal(active(tree).props['aria-label'],'Illustrative testimonial 2 of 6');
});

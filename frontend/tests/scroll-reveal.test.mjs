import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('components/scroll-reveal.tsx', 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS }
}).outputText;

function mount({ reduced = false, top = 1000, supported = true } = {}) {
  const attributes = {};
  let effect, callback, cleanup, change, disconnected = false;
  const element = {
    getBoundingClientRect: () => ({ top }),
    setAttribute: (key, value) => { attributes[key] = value; },
    removeAttribute: key => { delete attributes[key]; }
  };
  const preference = { matches: reduced, addEventListener: (_, fn) => { change = fn; }, removeEventListener: () => { change = null; } };
  class Observer {
    constructor(fn) { callback = fn; }
    observe() {}
    disconnect() { disconnected = true; }
  }
  const context = { exports: {}, window: { innerHeight: 800, matchMedia: () => preference, ...(supported ? { IntersectionObserver: Observer } : {}) }, IntersectionObserver: Observer,
    require: name => name === 'react' ? { useRef: () => ({ current: element }), useEffect: fn => { effect = fn; } } : { jsx: () => null }
  };
  vm.runInNewContext(code, context);
  context.exports.ScrollReveal({ children: null });
  cleanup = effect();
  return { attributes, enter: () => callback([{ isIntersecting: true }]), change: () => change(), cleanup, disconnected: () => disconnected };
}

test('below-fold content reveals once and disconnects', () => {
  const view = mount();
  assert.equal(view.attributes['data-reveal'], 'pending');
  view.enter();
  assert.equal(view.attributes['data-reveal'], undefined);
  assert.equal(view.disconnected(), true);
  view.cleanup();
});
test('visible content is never hidden during hydration', () => {
  const view = mount({ top: 400 });
  assert.equal(view.attributes['data-reveal'], undefined);
  view.cleanup();
});
test('reduced motion and missing observer keep content visible', () => {
  for (const options of [{ reduced: true }, { supported: false }]) {
    assert.deepEqual(mount(options).attributes, {});
  }
});
test('preference changes and unmount reveal pending content', () => {
  const view = mount(); view.change();
  assert.equal(view.attributes['data-reveal'], undefined);
  assert.equal(view.disconnected(), true);
  const removed = mount(); removed.cleanup();
  assert.equal(removed.attributes['data-reveal'], undefined);
  assert.equal(removed.disconnected(), true);
});

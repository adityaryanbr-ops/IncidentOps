import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import ts from 'typescript';
import * as runtime from 'react/jsx-runtime';

function load(path, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const context = { exports: {}, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return runtime;
    throw new Error(`Unexpected dependency ${name}`);
  } };
  vm.runInNewContext(code, context);
  return context.exports;
}
const data = load('lib/incident-categories.ts');

function descendants(element) {
  if (!element || typeof element !== 'object') return [];
  const children = element.props?.children;
  return [element, ...[children].flat(Infinity).flatMap(descendants)];
}

test('all twelve categories have unique atlas cells and meaningful content', () => {
  const categories = data.INCIDENT_CATEGORIES;
  assert.equal(categories.length, 12);
  assert.equal(new Set(categories.map(c => c.id)).size, 12);
  assert.equal(new Set(categories.map(c => `${c.column},${c.row}`)).size, 12);
  for (const category of categories) {
    assert.ok(category.row >= 0 && category.row < 3);
    assert.ok(category.column >= 0 && category.column < 4);
    assert.ok(category.title && category.examples && category.capture);
  }
  assert.ok(fs.statSync('public/incident-icons.webp').size > 1000);
});

test('selecting a category updates details and passes it to intake only on report', () => {
  let selected, chosen;
  const icons = new Proxy({}, { get: (_, name) => name });
  const { IncidentCategories } = load('components/incident-categories.tsx', {
    react: { useState: initial => [selected ?? initial, next => { selected = next; }] },
    'lucide-react': icons,
    '@/lib/incident-categories': data,
    '@/components/scroll-reveal': { ScrollReveal: 'reveal' },
  });
  const render = () => descendants(IncidentCategories({ onChoose: category => { chosen = category; } }));
  let nodes = render();
  const buttons = nodes.filter(node => node.type === 'button');
  assert.equal(buttons.length, 12);
  assert.equal(buttons[0].props['aria-pressed'], true);
  buttons[6].props.onClick();
  assert.equal(chosen, undefined);
  nodes = render();
  assert.equal(nodes.filter(node => node.type === 'button')[6].props['aria-pressed'], true);
  assert.ok(nodes.some(node => node.type === 'h3' && node.props.children === 'Flooding & leaks'));
  assert.ok(nodes.some(node => node.type === 'p' && node.props.children === data.INCIDENT_CATEGORIES[6].capture));
  const report = nodes.find(node => node.type === 'a' && node.props.href === '#workspace');
  report.props.onClick();
  assert.equal(chosen.id, 'flood');
});

test('home page keeps the incident explorer without the hero carousel or testimonial deck', () => {
  const page = fs.readFileSync('app/page.tsx', 'utf8');
  assert.ok(!page.includes('IncidentArcCarousel'));
  assert.ok(!page.includes('IncidentQuoteDeck'));
  assert.ok(page.includes('<IncidentCategories'));
});

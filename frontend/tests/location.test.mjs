import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import ts from 'typescript';
import * as runtime from 'react/jsx-runtime';

function load(path, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const context = { exports: {}, Error, URLSearchParams, ...globals, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return runtime;
    throw new Error(`Unexpected dependency ${name}`);
  } };
  vm.runInNewContext(code, context);
  return context.exports;
}
const location = load('lib/location.ts');
const { SAMPLE_INCIDENTS } = load('lib/samples.ts');

test('coordinates use latitude,longitude order and preserve zero and negative values', () => {
  for (const input of ['30.2861, -97.7394', '0, 0', '-90, +180']) {
    const point = location.parseCoordinates(input);
    const [latitude, longitude] = input.split(',').map(Number);
    assert.equal(point.latitude, latitude);
    assert.equal(point.longitude, longitude);
  }
  assert.equal(location.parseCoordinates('Austin, Texas, USA'), null);
  assert.equal(location.parseCoordinates(''), null);
  for (const input of ['91, 0', '0, -181', '-91, 97']) {
    assert.throws(() => location.parseCoordinates(input), /latitude/);
  }
});

test('examples are one-line notes with usable illustrative coordinates', () => {
  for (const sample of SAMPLE_INCIDENTS) {
    assert.ok(sample.reportText.length < 110);
    assert.ok(!sample.reportText.includes('\n'));
    const coordinates = location.parseCoordinates(sample.location);
    assert.equal(coordinates.latitude, sample.latitude);
    assert.equal(coordinates.longitude, sample.longitude);
  }
});

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
function setup(address, geoError = null) {
  const state = []; let cursor = 0, submitted, confirmed = 0, lookups = 0, geoOptions;
  const { IncidentForm } = load('components/incident-form.tsx', {
    react: { useState: initial => {
      const index = cursor++;
      if (!(index in state)) state[index] = index === 1 ? address : index === 5 ? new File(['image'], 'test.png', {type:'image/png'}) : initial;
      return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    }, useEffect: () => {}, useMemo: fn => fn() },
    '@/components/voice-input': { VoiceInput: 'voice-input' },
    '@/components/ui/input': { Input: 'input' }, '@/components/ui/label': { Label: 'label' },
    '@/components/ui/textarea': { Textarea: 'textarea' }, '@/components/ui/progress': { Progress: 'progress' },
    '@/lib/samples': { SAMPLE_INCIDENTS }, '@/lib/location': location,
    '@/lib/api': { API_BASE: '', analyzeIncident: async form => { submitted = form; return {}; } },
    'lucide-react': new Proxy({}, { get: (_, name) => name }),
  }, {
    File, FormData,
    fetch: async () => { lookups++; return { ok: true, json: async () => ({ features: [{ geometry: { coordinates: [-97.7, 30.2] }, properties: { name: 'Austin', country: 'USA' } }] }) }; },
    window: { setInterval: () => 1, clearInterval: () => {}, confirm: () => { confirmed++; return true; } },
    navigator: { geolocation: { getCurrentPosition: (success, failure, options) => { geoOptions = options; if (geoError) { failure(geoError); return; } success({ coords: { latitude: 12.9716, longitude: 77.5946, accuracy: 24 } }); } } },
  });
  const render = () => { cursor = 0; return IncidentForm({ onResult: () => {}, busy: false, setBusy: () => {} }); };
  return { render, get submitted() { return submitted; }, get lookups() { return lookups; }, get confirmed() { return confirmed; }, get geoOptions() { return geoOptions; }, state };
}

test('direct coordinates reach analysis without geocoding or address confirmation', async () => {
  const form = setup('0, -97.7394');
  form.render().props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(form.lookups, 0);
  assert.equal(form.confirmed, 0);
  assert.equal(form.submitted.get('latitude'), '0');
  assert.equal(form.submitted.get('longitude'), '-97.7394');
  assert.equal(form.submitted.get('resolved_location'), null);
});

test('typed addresses still resolve and require confirmation before analysis', async () => {
  const form = setup('Austin, Texas, USA');
  form.render().props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(form.lookups, 1);
  assert.equal(form.confirmed, 1);
  assert.equal(form.submitted.get('latitude'), '30.2');
  assert.equal(form.submitted.get('longitude'), '-97.7');
});

test('invalid coordinates block analysis and expose a useful error', async () => {
  const form = setup('91, 0');
  form.render().props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(form.submitted, undefined);
  assert.equal(form.lookups, 0);
  assert.match(form.state[7], /latitude from -90 to 90/);
});

test('current location is requested only on click and captures accuracy', async () => {
  const form = setup('Austin');
  assert.equal(form.geoOptions, undefined);
  await nodes(form.render()).find(node => node.props?.className === 'location-button').props.onClick();
  assert.equal(form.geoOptions.enableHighAccuracy, true);
  assert.equal(form.state[1], '12.971600, 77.594600');
  assert.equal(form.state[3], 24);
  assert.equal(form.state[2], false);
});

 test('location denial or timeout preserves the entered place and offers recovery', async () => {
  for (const code of [1, 3]) {
    const form = setup('Existing address', { code });
    await nodes(form.render()).find(node => node.props?.className === 'location-button').props.onClick();
    assert.equal(form.state[1], 'Existing address');
    assert.equal(form.state[2], false);
    assert.match(form.state[7], /address|coordinates/);
  }
});

test('device location retries timeout with coarse positioning but never retries permission denial', async () => {
  const attempts = [];
  const position = { coords: { latitude: 12, longitude: 77, accuracy: 100 } };
  const result = await location.getDeviceLocation({ getCurrentPosition(success, failure, options) {
    attempts.push(options);
    if (attempts.length === 1) failure({code:3}); else success(position);
  } });
  assert.equal(result, position);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].enableHighAccuracy, true);
  assert.equal(attempts[1].enableHighAccuracy, false);
  assert.ok(attempts[1].maximumAge > 0);
  let deniedCalls = 0;
  await assert.rejects(location.getDeviceLocation({ getCurrentPosition(_, failure) { deniedCalls++; failure({code:1}); } }));
  assert.equal(deniedCalls, 1);
});

test('voice transcript alone is enough to submit a report', async () => {
  const form = setup('12, 77');
  form.render();
  form.state[0] = '';
  form.state[4] = 'A tree has fallen across the road.';
  form.render().props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(form.submitted.get('report_text'), form.state[4]);
  assert.equal(form.submitted.get('transcript'), form.state[4]);
});

test('dictated report takes precedence over a prefilled sample note', async () => {
  const form = setup('12, 77');
  form.render();
  form.state[4] = 'Smoke is coming from the electrical panel.';
  form.render().props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(form.submitted.get('report_text'), form.state[4]);
});


test('Find address resolves and confirms coordinates without waiting for device positioning', async () => {
  const form = setup('Austin, Texas, USA');
  const find = nodes(form.render()).find(node => node.type === 'button' && node.props.children === 'Find address');
  find.props.onClick();
  await new Promise(setImmediate);
  assert.equal(form.geoOptions, undefined);
  assert.equal(form.confirmed, 1);
  assert.equal(form.state[1], '30.200000, -97.700000');
  assert.equal(form.state[2], false);
  form.render().props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(form.lookups, 1);
  assert.equal(form.submitted.get('resolved_location'), 'Austin, USA');
  assert.equal(form.submitted.get('latitude'), '30.2');
  assert.equal(form.submitted.get('longitude'), '-97.7');
});

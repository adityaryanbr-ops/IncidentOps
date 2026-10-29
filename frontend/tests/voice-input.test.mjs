import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as runtime from 'react/jsx-runtime';

const code = ts.transpileModule(fs.readFileSync('components/voice-input.tsx', 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS }
}).outputText;
function setup({denied=false, unsupported=false, serverError=false}={}) {
  const state=[], refs=[], calls=[], sessions=[]; let cursor=0, refCursor=0, cleanup, active, text, stopped=0;
  class Recorder {
    static isTypeSupported(){return true;}
    constructor(){ sessions.push(this); this.state='inactive'; this.mimeType='audio/webm;codecs=opus'; }
    start(){this.state='recording';}
    stop(){this.state='inactive'; this.ondataavailable?.({data:new Blob(['audio'])}); return this.onstop?.();}
  }
  const context={exports:{}, Blob, FormData, AbortController, Error, setTimeout, clearTimeout,
    navigator: {mediaDevices:unsupported ? undefined : { getUserMedia:async()=>{
      if(denied) {const err=new Error('blocked'); err.name='NotAllowedError';throw err;}
      return {getTracks:()=>[{stop(){stopped++;}}]};
    }}}, MediaRecorder:Recorder,
    fetch:async(url,options)=>{calls.push({url,options});return {ok:!serverError,json:async()=>serverError ? {detail:'No speech detected.'}:{text:'A tree blocks the road.'}};},
    require:name=>{
      if(name==='react')return {useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=v;}];},useRef:initial=>{const i=refCursor++;return refs[i] ||= {current:initial};},useEffect:fn=>{cleanup=fn();}};
      if(name==='react/jsx-runtime')return runtime;
      if(name==='lucide-react')return {Mic:'mic',Square:'square'};
      if(name.endsWith('/api'))return {API_BASE:'http://backend'};
      if(name.endsWith('/textarea'))return {Textarea:'textarea'};
      if(name.endsWith('/label'))return {Label:'label'};
      throw new Error(name);
    }};
  vm.runInNewContext(code,context);
  const render=()=>{cursor=refCursor=0;return context.exports.VoiceInput({value:'Earlier note.',disabled:false,onChange:v=>{text=v;},onListeningChange:v=>{active=v;}});};
  const click=()=>render().props.children[0].props.children[1].props.onClick();
  return {render,click,state,calls,get session(){return sessions.at(-1);},get active(){return active;},get text(){return text;},get stopped(){return stopped;},cleanup:()=>cleanup()};
}
const tick=()=>new Promise(setImmediate);
test('records on click, stops the microphone and sends audio to backend for an editable transcript',async()=>{
  const voice=setup();voice.render();assert.equal(voice.session,undefined);
  voice.click();await tick();assert.equal(voice.active,true);assert.equal(voice.session.state,'recording');
  await voice.session.stop();assert.equal(voice.stopped,1);assert.equal(voice.active,false);
  assert.equal(voice.text,'Earlier note. A tree blocks the road.');
  assert.equal(voice.calls[0].url,'http://backend/api/incidents/transcribe');
  assert.equal(voice.calls[0].options.body.get('audio').type,'audio/webm');
});
test('permission denial ends active state without an upload',async()=>{
  const voice=setup({denied:true});voice.click();await tick();assert.equal(voice.active,false);assert.equal(voice.calls.length,0);assert.match(voice.state[1],/Microphone access is blocked/);
});
test('unsupported recording keeps keyboard dictation available',()=>{
  const voice=setup({unsupported:true});voice.click();assert.match(voice.state[1],/keyboard dictation/);assert.equal(voice.calls.length,0);
});
test('unmount releases microphone and never uploads discarded audio',async()=>{
  const voice=setup();voice.click();await tick();voice.cleanup();assert.equal(voice.stopped,1);assert.equal(voice.calls.length,0);
});
test('backend error preserves prior transcript and resets busy state',async()=>{
  const voice=setup({serverError:true});voice.click();await tick();await voice.session.stop();assert.equal(voice.active,false);assert.equal(voice.text,undefined);assert.match(voice.state[1],/No speech/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
const code=ts.transpileModule(fs.readFileSync('components/incident-report.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const official={helplines:[{service:'National emergency response',phone:'112',jurisdiction:'India',purpose:'Immediate emergencies',source_url:'https://112.gov.in/',source_kind:'official_directory',last_reviewed:'2026-10-28'},{service:'Fire and rescue',phone:'101',jurisdiction:'India',purpose:'Fire response',source_url:'https://112.gov.in/about',source_kind:'official_directory',last_reviewed:'2026-10-28'}],helpline_status:'Official reference numbers; local availability not checked.',helpline_lookup_state:'official_fallback',markdown_section:'\n\n## Helplines\n\n112 — Emergency\n101 — Fire'};
function fixture(id='fire'){return {id,report:{title:'Reported electrical fire',location:'Example City, India',category:'electrical_fire',severity:'high',severity_confidence:0.7,observed_facts:[],inferences:[],unknowns:[],immediate_actions:[],checklist:[],sources:[],human_verification_required:[],helplines:[],markdown_report:'# Incident\n\n## Helplines\n\nNo suitable number confirmed.'},visual:{summary:'Reported fire'},assessment:{},trace:[],models_used:[]};}
function nodes(element){if(!element||typeof element!=='object')return [];return [element,...[element.props?.children].flat(Infinity).flatMap(nodes)];}
function setup(){
 const state=[],effects=[],calls=[];let cursor=0,effectCursor=0,downloaded;
 const context={exports:{},AbortController,setTimeout:()=>1,clearTimeout:()=>{},require:name=>{
  if(name==='react/jsx-runtime')return jsx;
  if(name==='react')return {useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},useEffect:(fn,deps)=>{const i=effectCursor++;const old=effects[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){old?.cleanup?.();effects[i]={deps,fn};}}};
  if(name.endsWith('/api'))return {getOfficialHelplines:(location,category,signal)=>new Promise((resolve,reject)=>calls.push({location,category,signal,resolve,reject}))};
  if(name.endsWith('/export'))return {downloadMarkdown:report=>{downloaded=report;},printReport:()=>{}};
  return new Proxy({},{get:(_,name)=>name});
 }};
 vm.runInNewContext(code,context);
 const render=result=>{cursor=effectCursor=0;const tree=context.exports.IncidentReportView({result});for(const effect of effects){if(effect.fn){const fn=effect.fn;effect.fn=null;effect.cleanup=fn();}}return tree;};
 return {render,calls,get downloaded(){return downloaded;}};
}
const tick=()=>new Promise(setImmediate);
test('empty saved report automatically recovers call links and includes numbers in Markdown export',async()=>{
 const app=setup(), result=fixture();app.render(result);
 assert.equal(app.calls.length,1);assert.equal(app.calls[0].location,'Example City, India');
 app.calls[0].resolve(official);await tick();const tree=nodes(app.render(result));
 assert.ok(tree.some(node=>node.props?.href==='tel:112'));
 assert.ok(tree.some(node=>node.props?.href==='tel:101'));
 assert.ok(tree.some(node=>node.props?.children==='Official emergency directory'));
 tree.find(node=>node.props?.onClick&&[node.props.children].flat().some(text=>typeof text==='string'&&text.includes('Save report'))).props.onClick();
 assert.ok(app.downloaded.markdown_report.includes('112'));
 assert.ok(!app.downloaded.markdown_report.includes('No suitable number confirmed.'));
});
test('late recovery from another incident cannot attach its phone numbers to the current report',async()=>{
 const app=setup(), first=fixture(), second=fixture('other');second.report.location='Unknown Country';
 app.render(first);app.render(second);assert.equal(app.calls[0].signal.aborted,true);
 app.calls[0].resolve(official);await tick();
 assert.equal(nodes(app.render(second)).filter(node=>node.props?.href?.startsWith('tel:')).length,0);
 app.calls[1].resolve({...official,helplines:[],helpline_status:'No official directory for this country.'});await tick();app.render(second);
});
test('failed contact lookup explains the error and can be retried without rerunning analysis',async()=>{
 const app=setup(),result=fixture();app.render(result);app.calls[0].reject(new Error('offline'));await tick();let tree=nodes(app.render(result));
 assert.ok(tree.some(node=>node.props?.role==='alert'&&node.props.children.includes('does not mean emergency services')));
 tree.find(node=>node.type==='button'&&node.props.children==='Check official numbers again').props.onClick();app.render(result);assert.equal(app.calls.length,2);
 app.calls[1].resolve(official);await tick();tree=nodes(app.render(result));assert.ok(tree.some(node=>node.props?.href==='tel:112'));
});

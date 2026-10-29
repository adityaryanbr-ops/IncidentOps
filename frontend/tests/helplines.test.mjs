import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
const code=ts.transpileModule(fs.readFileSync('components/incident-report.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const context={exports:{}, require:name=>name==='react/jsx-runtime' ? jsx : name==='react' ? {useState:initial=>[initial,()=>{}],useEffect:()=>{}} : new Proxy({}, {get:(_,name)=>name})};
vm.runInNewContext(code,context);
function nodes(element){if(!element||typeof element!=='object')return [];return [element,...[element.props?.children].flat(Infinity).flatMap(nodes)];}
function render(contacts, changes = {}, visual = {summary:'Test', hazards:[]}){return context.exports.IncidentReportView({result:{report:{title:'Test',location:'Example District',severity:'high',severity_confidence:0.7,observed_facts:[],inferences:[],unknowns:[],immediate_actions:[],checklist:[],sources:[],human_verification_required:[],live_context_summary:'Nearby context.',helplines:contacts,...changes},visual,assessment:{search_queries:[]},trace:[],models_used:[]}});}
test('sourced helplines appear as call links with purpose, jurisdiction and source',()=>{
  const tree=nodes(render([{service:'Fire service',phone:'123-456-7890',jurisdiction:'Example District',purpose:'Report fire',source_url:'https://authority.example/fire'}]));
  assert.ok(tree.some(node=>node.type==='a'&&node.props.href==='tel:1234567890'));
  assert.ok(tree.some(node=>node.type==='a'&&node.props.href==='https://authority.example/fire'));
  assert.ok(tree.some(node=>node.type==='p'&&node.props.children==='Report fire'));
});
test('old saved reports render a clear missing-directory message instead of crashing',()=>{
  const tree=nodes(render(undefined));
  assert.ok(tree.some(node=>typeof node.props?.children==='string'&&node.props.children.includes('Analyze the incident again')));
  assert.equal(tree.filter(node=>node.props?.href?.startsWith('tel:')).length,0);
});


test('report puts ordered actions before contacts and evidence without dropping steps',()=>{
  const output=render([], {immediate_actions:['Keep clear of the damaged fence.','Notify the site supervisor.','Restrict the affected path.'],unknowns:['Whether buried cables are affected.'],emergency_notice:'Keep a safe distance if the structure is moving.'});
  const tree=nodes(output);
  const sections=tree.filter(node=>node.props?.id).map(node=>node.props.id);
  assert.ok(sections.indexOf('report-actions') < sections.indexOf('report-contacts'));
  assert.ok(sections.indexOf('report-contacts') < sections.indexOf('report-evidence'));
  const actions=tree.find(node=>node.props?.className==='action-steps');
  assert.equal(actions.props.children.length,3);
  assert.equal(output.props['data-severity'],'high');
  assert.ok(tree.some(node=>node.props?.children==='Keep a safe distance if the structure is moving.'));
  assert.ok(tree.some(node=>node.props?.children==='Whether buried cables are affected.'));
});

test('technical confidence and duplicate handoff detail are disclosed, not competing with immediate actions',()=>{
  const output=render([], {checklist:[{priority:'P1',action:'Secure access',owner_hint:'Site lead',rationale:'Avoid unstable debris'}]});
  const details=nodes(output).filter(node=>node.type==='details');
  assert.ok(details.every(node=>node.props.open !== true));
  assert.ok(details.some(detail=>nodes(detail).some(node=>[node.props?.children].flat().includes('Full handoff checklist'))));
  assert.ok(details.some(detail=>nodes(detail).some(node=>[node.props?.children].flat().some(value=>typeof value==='string'&&value.includes('AI confidence:')))));
});

test('empty actions are explained instead of inventing instructions',()=>{
  assert.ok(nodes(render([])).some(node=>typeof node.props?.children==='string'&&node.props.children.startsWith('No immediate actions were provided.')));
});

test('a failed draft does not show empty-payload text, and a visible fire is not low priority',()=>{
  const tree=nodes(render([], {
    severity:'low',
    immediate_actions:['empty_payload'],
    human_verification_required:['empty_payload'],
    live_context_summary:'empty payload provided, no data to repair',
  }, {summary:'A white SUV is engulfed in flames on a paved road.', hazards:['flames']}));
  const text=JSON.stringify(tree);
  assert.equal(text.includes('empty_payload'), false);
  assert.equal(text.includes('no data to repair'), false);
  assert.equal(tree.find(node=>node.props?.id==='incident-report')?.props['data-severity'], 'high');
  assert.ok(text.includes('Stay back from the scene'));
});

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
const root=process.cwd();
const registry=JSON.parse(fs.readFileSync(path.join(root,'.claude/studio/STUDIO_CAPABILITY_REGISTRY.json'),'utf8'));
const evals=JSON.parse(fs.readFileSync(path.join(root,'.claude/studio/ROUTING_EVALS.json'),'utf8'));
const agents=new Map((registry.agents??[]).map(x=>[x.name,x]));
const skills=new Map((registry.skills??[]).map(x=>[x.name,x]));
const limits={FAST:0,STANDARD:1,FULL:2};
const errors=[];
for(const c of evals.cases??[]){
  if(!(c.mode in limits)) errors.push(`${c.id}: invalid mode ${c.mode}`);
  if((c.agents??[]).length>(limits[c.mode]??0)) errors.push(`${c.id}: ${c.agents.length} agents exceeds ${c.mode} limit ${limits[c.mode]}`);
  for(const a of c.agents??[]) if(!agents.has(a)) errors.push(`${c.id}: missing agent ${a}`);
  for(const a of c.forbiddenAgents??[]) if((c.agents??[]).includes(a)) errors.push(`${c.id}: agent ${a} both required and forbidden`);
  for(const s of c.skills??[]) if(!skills.has(s)) errors.push(`${c.id}: missing skill ${s}`);
  if(c.mode==='FAST' && ((c.skills??[]).includes('design-feature')||(c.skills??[]).includes('ship-approved-plan'))) errors.push(`${c.id}: FAST case carries full design/shipping ceremony`);
}
if(errors.length){ console.error(`Routing fixtures FAIL — ${errors.length} error(s)`); for(const e of errors) console.error(`- ${e}`); process.exit(1); }
console.log(`Routing fixtures PASS — ${evals.cases.length} cases, all references and mode limits valid.`);

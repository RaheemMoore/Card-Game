#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const tests=[];
function test(name,fn){try{if(fn()===false)throw new Error('condition returned false');tests.push({name,ok:true});}catch(e){tests.push({name,ok:false,error:e.message});}}
function includes(file,...terms){const s=read(file);return terms.every(t=>s.includes(t));}
function hook(input){const p=spawnSync(process.execPath,[path.join(root,'.claude/scripts/studio-hook.mjs'),'pre-tool'],{cwd:root,input:JSON.stringify(input),encoding:'utf8',env:{...process.env,CLAUDE_PROJECT_DIR:root}});return p.stdout.trim()?JSON.parse(p.stdout):{};}

test('nine read-only specialist agents exist',()=>fs.readdirSync(path.join(root,'.claude/agents')).filter(x=>x.endsWith('.md')).length===9);
test('twenty-three workflow skills exist',()=>fs.readdirSync(path.join(root,'.claude/skills'),{withFileTypes:true}).filter(x=>x.isDirectory()&&fs.existsSync(path.join(root,'.claude/skills',x.name,'SKILL.md'))).length===23);
test('emblem workflow has universal paid gate and no auto-fire',()=>{const s=read('.claude/skills/design-archetype-emblem/SKILL.md');return s.includes('Stop before every paid generation or edit')&&!/fire automatically|auto-fired/i.test(s);});
test('PixelLab pro-mode failure remains encoded',()=>/pro[^\n]{0,40}(BANNED|banned)/.test(read('.claude/skills/create-character-sprite/SKILL.md')));
test('sprite direction cannot be certified statically',()=>includes('.claude/skills/place-character-in-scene/SKILL.md','Static pixel similarity','cannot prove'));
test('provider keys stay server-side',()=>/no paid-provider key ever ships to the browser/i.test(read('.claude/agents/technical-architect.md')));
test('economy values cannot be set from vibes',()=>/from vibes/i.test(read('.claude/agents/game-systems-designer.md')));
test('new UI requires a mobile story',()=>/mobile story/i.test(read('.claude/agents/ui-ux-director.md')));
test('ship-minigame blocks on missing shared shell',()=>{const shell=fs.existsSync(path.join(root,'card-engine/src/pages/games/FullscreenGameShell.tsx'));const s=read('.claude/skills/ship-minigame/SKILL.md');return shell||s.includes('stop and ask Raheem to authorize');});
test('balance scaffold hidden from model',()=>/disable-model-invocation:\s*true/.test(read('.claude/skills/balance-playtest/SKILL.md')));
test('fullscreen migration is manual-only',()=>/disable-model-invocation:\s*true/.test(read('.claude/skills/extract-fullscreen-shell/SKILL.md')));
test('visual verifier requires runtime bridge and three-state verdict',()=>includes('.claude/skills/visual-playtest/SKILL.md','window.__CARD_ENGINE_STUDIO__','PASS','FAIL','HUMAN REVIEW'));
test('secret edit hook denies',()=>hook({tool_name:'Edit',tool_input:{file_path:'card-engine/.env.local'}}).hookSpecificOutput?.permissionDecision==='deny');
test('generated reference edit hook denies',()=>hook({tool_name:'Write',tool_input:{file_path:'IMAGE_ENGINE_REFERENCE.md'}}).hookSpecificOutput?.permissionDecision==='deny');
test('paid sprite generation hook asks',()=>hook({tool_name:'Bash',tool_input:{command:'cd card-engine && node scripts/sprite-lab/sprite-lab.mjs gen hero'}}).hookSpecificOutput?.permissionDecision==='ask');
test('git push hook asks',()=>hook({tool_name:'Bash',tool_input:{command:'git push origin feature'}}).hookSpecificOutput?.permissionDecision==='ask');
// 2026-08-02: the destructive-git pattern ended in \b after a greedy class, so only
// `git clean -f` matched while `-fd`/`-fdx` escaped. These lock the realistic forms in.
test('git clean flag variants all ask',()=>['git clean -f','git clean -fd','git clean -fdx','git clean -xfd'].every(c=>hook({tool_name:'Bash',tool_input:{command:c}}).hookSpecificOutput?.permissionDecision==='ask'));
test('worktree removal and working-tree discard ask',()=>['git worktree remove .claude/worktrees/x','git checkout -- .','git restore src/'].every(c=>hook({tool_name:'Bash',tool_input:{command:c}}).hookSpecificOutput?.permissionDecision==='ask'));
test('recursive rm of a relative path asks',()=>hook({tool_name:'Bash',tool_input:{command:'rm -rf card-engine/src'}}).hookSpecificOutput?.permissionDecision==='ask');
test('adding a new dependency asks',()=>['npm install left-pad','yarn add lodash','pnpm add zod'].every(c=>hook({tool_name:'Bash',tool_input:{command:c}}).hookSpecificOutput?.permissionDecision==='ask'));
test('routine commands stay unblocked',()=>['git status --short','git checkout main','git worktree list','cd card-engine && npm ci','cd card-engine && npm run build','rm scratchpad/tmp.txt'].every(c=>!hook({tool_name:'Bash',tool_input:{command:c}}).hookSpecificOutput?.permissionDecision));

const failed=tests.filter(t=>!t.ok);
for(const t of tests) console.log(`${t.ok?'✓':'✗'} ${t.name}${t.error?`: ${t.error}`:''}`);
if(failed.length){console.error(`Studio regression FAIL — ${failed.length}/${tests.length} failed.`);process.exit(1);}
console.log(`Studio regression PASS — ${tests.length} failure-prevention checks.`);

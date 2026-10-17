import test from 'node:test';
import assert from 'node:assert/strict';
import {course} from '../course-data.js';
import {packages,calculate,bestPackage,validProgress} from '../engine.js';
import {capstone} from '../capstone-data.js';
import * as nodefs from 'node:fs';
const await_fs=()=>nodefs;
test('Four complete modules, seventeen lessons, valid quizzes and unique ids',()=>{
 assert.equal(course.modules.length,4);const ls=course.modules.flatMap(m=>m.lessons);assert.equal(ls.length,17);assert.equal(new Set(ls.map(l=>l.id)).size,17);for(const m of course.modules)assert.equal(m.outcomes.length,m.lessons.length);
 for(const l of ls){assert.ok(l.sections.length>=3);assert.ok(l.sections.every(s=>s.text.length>100));assert.ok(l.task.prompt);assert.ok(l.quiz.length>=2);for(const q of l.quiz){assert.ok(Number.isInteger(q.answer));assert.ok(q.answer>=0&&q.answer<q.options.length);assert.ok(q.explanation.length>20);}}
 assert.equal(course.rubric.length,7);assert.ok(course.rubric.every(r=>/ОПК-4|ПК-2/.test(r.competence)));
});
test('Cancellation and acquisition costs use their respective bases',()=>{
 assert.deepEqual(packages.map(p=>calculate(p).nights),[300,240,300]);assert.deepEqual(packages.map(p=>calculate(p).before),[906000,756240,1010000]);
 const direct=packages[1],withoutCAC=calculate({...direct,cac:0}).before;assert.equal(withoutCAC-calculate(direct).before,180000);
});
test('Calendar displaces only future base demand and changes preferred strategy',()=>{
 assert.deepEqual(packages.map(p=>calculate(p,{calendar:true}).displaced),[90,10,150]);assert.deepEqual(packages.map(p=>calculate(p,{calendar:true}).net),[450600,705640,251000]);assert.equal(bestPackage().id,'corporate');assert.equal(bestPackage({calendar:true}).id,'direct');
 for(let demand=200;demand<=400;demand++){for(const p of packages){const r=calculate(p,{calendar:true,basePeak:demand});assert.ok(r.displaced<=demand-200);assert.equal(r.offpeakDisplaced,0);}}
});
test('All three alternatives win in their correct ranges',()=>{
 assert.equal(bestPackage({calendar:true,margin:1500}).id,'corporate');assert.equal(bestPackage({calendar:true,margin:1800}).id,'ota');assert.equal(bestPackage({calendar:true,margin:1900}).id,'direct');
 assert.equal(bestPackage({calendar:true,basePeak:200}).id,'corporate');assert.deepEqual(packages.map(p=>calculate(p,{calendar:true,margin:1500}).net),[771000,741240,785000]);
});
test('Import rejects nonobjects and limits answers to known lessons',()=>{
 assert.equal(validProgress([],['m1l1']),null);assert.equal(validProgress(null,[]),null);const p=validProgress({answers:{m1l1:'ok',bad:'x'},completed:['m1l1','m1l1','bad'],project:{problem:'yes',unknown:'no'}},['m1l1']);assert.deepEqual(p.answers,{m1l1:'ok'});assert.deepEqual(p.completed,['m1l1']);assert.deepEqual(p.project,{problem:'yes'});
});
test('Capstone fits the 118-hour self-study budget and has complete checkpoints',()=>{
 const ks=capstone.checkpoints;assert.equal(ks.length,7);assert.equal(new Set(ks.map(k=>k.id)).size,7);
 const hours=ks.reduce((a,k)=>a+k.hours,0);assert.equal(hours,100);assert.equal(capstone.hoursTotal,118);
 for(const k of ks){assert.ok(k.modes.class.length>40&&k.modes.self.length>40);assert.ok(k.steps.length>=3);assert.ok(k.fields.length>=3);assert.ok(k.check.length>=4);assert.equal(k.criteria.length,2);assert.equal(new Set(k.fields.map(f=>f[0])).size,k.fields.length);}
 assert.equal(capstone.cases.length,3);assert.deepEqual(Object.keys(capstone.tracks),['own','case']);
});
test('Import keeps only known capstone fields, checks and track',()=>{
 const p=validProgress({capstone:{track:'case',fields:{kt0_object:'ok',kt9_x:'bad'},checks:{kt0_0:true,kt0_1:'yes',zz_0:true}}},['m1l1']);
 assert.deepEqual(p.capstone,{track:'case',fields:{kt0_object:'ok'},checks:{kt0_0:true}});
 assert.equal(validProgress({capstone:{track:'hack'}},[]).capstone.track,'');
});
test('Student-facing texts avoid synthetic/fictional labels',()=>{
 const fs=await_fs();for(const f of ['course-data.js','capstone-data.js','app.js','index.html'])assert.doesNotMatch(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),/синтетич|вымышл|придуман|выдуман/i,f);
});

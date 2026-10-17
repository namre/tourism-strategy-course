import test from 'node:test';
import assert from 'node:assert/strict';
import {course} from '../course-data.js';
import {packages,calculate,bestPackage,validProgress} from '../engine.js';
test('Four complete modules, twelve lessons, valid quizzes and unique ids',()=>{
 assert.equal(course.modules.length,4);const ls=course.modules.flatMap(m=>m.lessons);assert.equal(ls.length,12);assert.equal(new Set(ls.map(l=>l.id)).size,12);
 for(const l of ls){assert.ok(l.sections.length>=3);assert.ok(l.sections.every(s=>s.text.length>100));assert.ok(l.task.prompt);assert.ok(l.quiz.length>=2);for(const q of l.quiz){assert.ok(Number.isInteger(q.answer));assert.ok(q.answer>=0&&q.answer<q.options.length);assert.ok(q.explanation.length>20);}}
 assert.equal(course.rubric.length,5);
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

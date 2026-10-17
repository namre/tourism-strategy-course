import {capstone} from './capstone-data.js';
export const packages = [
 {id:'ota',name:'Агрегатор',booked:375,cancel:.2,price:6000,commission:.18,fee:0,cac:0,fixed:30000,variable:1800,peak:120,offpeak:180},
 {id:'direct',name:'Прямой пакет',booked:300,cancel:.2,price:6200,commission:.02,fee:0,cac:600,fixed:90000,variable:1800,peak:40,offpeak:200},
 {id:'corporate',name:'Корпоративный пакет',booked:320,cancel:.0625,price:5400,commission:0,fee:100,cac:0,fixed:40000,variable:1800,peak:180,offpeak:120}
];
export function calculate(p,{calendar=false,margin=5060,basePeak=370,baseOffpeak=470}={}) {
 const nights=p.booked*(1-p.cancel);
 const before=nights*(p.price*(1-p.commission)-p.fee-p.variable)-p.booked*p.cac-p.fixed;
 const peakLoss=calendar?Math.max(0,Math.min(p.peak,basePeak+p.peak-400)):0;
 const offpeakLoss=calendar?Math.max(0,Math.min(p.offpeak,baseOffpeak+p.offpeak-800)):0;
 // В тренажёре изменяется только пиковый спрос; вне пика вытеснение равно нулю.
 return {nights,before,displaced:peakLoss,offpeakDisplaced:offpeakLoss,net:before-peakLoss*margin};
}
export function bestPackage(options={}) {return packages.map(p=>({...p,...calculate(p,options)})).sort((a,b)=>b.net-a.net)[0];}
export function validProgress(value,ids) {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 const answers={};for(const [key,val] of Object.entries(obj(value.answers)))if(ids.includes(key)&&typeof val==='string')answers[key]=val.slice(0,30000);
 const completed=Array.isArray(value.completed)?[...new Set(value.completed.filter(x=>ids.includes(x)))]:[];
 const project={};for(const [key,val] of Object.entries(obj(value.project)))if(['problem','segment','offer','economics','uncertainty','promotion','experiment','revision'].includes(key)&&typeof val==='string')project[key]=val.slice(0,30000);
 const cap=obj(value.capstone),fields={},checks={};
 const fieldKeys=capstone.checkpoints.flatMap(k=>k.fields.map(([f])=>k.id+'_'+f)),checkKeys=capstone.checkpoints.flatMap(k=>k.check.map((_,i)=>k.id+'_'+i));
 for(const [key,val] of Object.entries(obj(cap.fields)))if(fieldKeys.includes(key)&&typeof val==='string')fields[key]=val.slice(0,30000);
 for(const [key,val] of Object.entries(obj(cap.checks)))if(checkKeys.includes(key)&&val===true)checks[key]=true;
 const track=Object.keys(capstone.tracks).includes(cap.track)?cap.track:'';
 const profile={};for(const k of ['student','group','supervisor','topic'])if(typeof obj(value.profile)[k]==='string')profile[k]=value.profile[k].slice(0,200);
 return {answers,completed,project,quizzes:obj(value.quizzes),lab:obj(value.lab),capstone:{track,fields,checks},profile,widgets:obj(value.widgets)};
}

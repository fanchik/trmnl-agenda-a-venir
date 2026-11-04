// Regression: two calendars in the top quadrants of an X mashup must keep
// the maximum readable event count before trying larger type.
const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 try{
 const page=await browser.newPage({viewport:{width:1040,height:780}});
 const framework=fs.readFileSync(process.env.FRAMEWORK_CSS,'utf8'),css=fs.readFileSync('assets/coming-up.css','utf8');
 const script=fs.readFileSync('layouts/shared.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1].replace('  function fitAll()', '  window.agendaSizeColumnsForTest = sizeColumns;\n  function fitAll()');
 const source=fs.readFileSync('layouts/quadrant.html','utf8');
 const cls=re=>source.match(re)[1], layout=cls(/class="(layout[^"]*)"/), root=cls(/class="(next-ten[^"]*)"/), head=cls(/<h1 class="([^"]*)"/), event=cls(/class="(event [^"]*)"/), date=cls(/class="(date [^"]*)"/), time=cls(/class="(time [^"]*)"/), section=cls(/<th class="([^"]*)"/), label=cls(/class="(calendar-label[^"]*)"/);
 const groups=['Today','This week','This week','This week','Next week','Next week','Next week','Next week','Next week','Next week'];
 function view(id,calendarLabels,count){
  let previous='';
  const rows=Array.from({length:count},(_,i)=>{
   const group=calendarLabels?groups[i]:(i===0?'Next week':'Later');
   const heading=group!==previous?`${i?'<tr class="group-gap"><td class="py--0.5 px--0" colspan="3"></td></tr>':''}<tr class="section"><th class="${section}" colspan="3">${group}</th></tr>`:'';previous=group;
   const title=calendarLabels?(i===2?'Appointment: Visit at THE COMMUNITY HEALTH CENTRE':i===5?'Weekend away 🧳':'Doggy walky 🐕 🌳'):(i===0?'Termly reports day - Nursery closed':i===2?'Last day of term - collect children at 1pm':'School event');
   return heading+`<tr class="event-row" data-index="${i}"><td class="${date}">Wed, ${4+i} Nov</td><td class="${time}">${i===4?'All day':'13:30'}</td><td class="${event}"><span class="event-name">${title}</span>${calendarLabels?`<span class="${label}">${i===2?'Busy':'Together'}</span>`:''}</td></tr>`;
  }).join('');
  return `<div class="view view--quadrant" id="${id}"><div class="${layout}"><div class="${root}"><h1 class="${head}">Coming Up${calendarLabels?'':' in School Calendar'}</h1><table><colgroup><col class="agenda-date-col"><col class="agenda-time-col"><col></colgroup>${rows}</table></div></div><div class="title_bar"><span class="title" data-count-template="{count} events coming up">${count} events coming up</span><span class="instance">Updated 4 Nov</span></div></div>`;
 }
 async function render(count){
 await page.setContent(`<body class="trmnl"><style>${framework}\n:root{--screen-w:1040px;--screen-h:780px}\n${css}</style><div class="screen screen--lg screen--${process.env.BIT_DEPTH||'4'}bit"><div class="mashup mashup--2Tx1B">${view('school',false,10)}${view('together',true,count)}<div class="view view--half_horizontal"><div class="layout"><span class="title">Another plugin</span></div></div></div></div><script>${script}</script>`,{waitUntil:'load'});
 await page.waitForTimeout(100);
 }
 async function metrics(){return page.evaluate(()=>['school','together'].map(id=>{const v=document.getElementById(id),rows=[...v.querySelectorAll('.event-row:not([hidden])')];return {id,count:rows.length,inline:rows.filter(r=>r.querySelector('.calendar-inline')).length,indices:rows.map(r=>+r.dataset.index),font:parseFloat(getComputedStyle(rows[0].querySelector('.event')).fontSize),boost:v.querySelector('.layout').style.getPropertyValue('--agenda-boost'),height:v.getBoundingClientRect().height,table:v.querySelector('table').getBoundingClientRect().bottom,footer:v.querySelector('.title_bar').getBoundingClientRect().top,text:v.querySelector('.title_bar .title').textContent};}));}
 await render(10);
 const dense=await metrics();console.log('X real 2Tx1B mashup:',dense);
 if(process.env.QA_DIR)await page.screenshot({path:process.env.QA_DIR+'/X-mashup-density.png'});
 if(!process.env.DIAGNOSTIC){
  assert(dense[1].count>=6,'Inline calendar names must fit at least six events including a long appointment across three groups');
  assert(dense[1].inline>=5,'Short titles should keep the calendar beside them');
  const appointment=page.locator('#together .event-row[data-index="2"]');
  assert.equal(await appointment.locator('.calendar-packed').count(),1,'Calendar follows the final title line when there is room');
  assert.equal(await appointment.locator('.calendar-label').textContent(),'Busy');
  for(const m of dense){assert.deepEqual(m.indices,Array.from({length:m.count},(_,i)=>i));assert(m.table<=m.footer);assert.equal(m.text,`${m.count} events coming up`);}
  const packed=await appointment.locator('.event').evaluate(cell=>{const title=cell.querySelector('.event-name'),label=cell.querySelector('.calendar-label'),zoom=cell.getBoundingClientRect().width/cell.offsetWidth;return {used:label.getBoundingClientRect().bottom-title.getClientRects()[0].top,budget:2*parseFloat(getComputedStyle(cell).lineHeight)*zoom};});
  assert(packed.used<=packed.budget+1,'This appointment has room for its calendar on line two');
  await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('resize'));});
  assert.deepEqual((await metrics()).map(x=>x.count),dense.map(x=>x.count),'Repeated fitting must not reduce counts');
  await render(2);const sparse=await metrics();assert.equal(sparse[1].count,2);assert(sparse[1].font>dense[1].font,'All available sparse events should get larger type');
  const flow=await page.evaluate(()=>{
    const layout=document.querySelector('#together .layout'),cell=layout.querySelector('.event-row .event');
    const title=cell.querySelector('.event-name'),label=cell.querySelector('.calendar-label');
    layout.style.setProperty('--agenda-boost','1');
    const words='Community planning meeting for the upcoming activities with the committee to review the schedule and confirm arrangements for the annual event'.split(' ');
    for(let count=4;count<=words.length;count++){
      const original=words.slice(0,count).join(' ');
      title.setAttribute('data-agenda-title',original);label.textContent='Community Events';
      window.agendaSizeColumnsForTest(layout);
      const fragments=Array.from(title.getClientRects()),first=fragments[0],last=fragments[fragments.length-1];
      const line=parseFloat(getComputedStyle(cell).lineHeight),zoom=cell.getBoundingClientRect().width/cell.offsetWidth;
      if(title.textContent!==original||!last||last.top<=first.top+line*zoom/2)continue;
      if(label.getBoundingClientRect().bottom<=first.top+2*line*zoom+1)continue;
      label.textContent='A';window.agendaSizeColumnsForTest(layout);
      if(title.textContent===original&&label.getBoundingClientRect().bottom<=title.getClientRects()[0].top+2*line*zoom+1){
        return {sameTitle:true,thirdWhenNeeded:true,secondWhenSpace:true};
      }
    }
    return null;
  });
  assert.deepEqual(flow,{sameTitle:true,thirdWhenNeeded:true,secondWhenSpace:true},'Calendar uses spare second-line space without shortening the title, and can use a third line when needed');
  console.log('PASS: maximum readable density, sparse enlargement, two instances, chronological prefix, no footer overlap, own counts and repeated fitting.');
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

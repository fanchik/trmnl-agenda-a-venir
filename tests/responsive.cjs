// Real Framework CSS, all layouts, OG/X, count-aware sizing and repeated resize.
const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 try {
 const page=await browser.newPage();
 const framework=fs.readFileSync(process.env.FRAMEWORK_CSS,'utf8'),css=fs.readFileSync('assets/coming-up.css','utf8'),script=fs.readFileSync('layouts/shared.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 const results=[];
 for(const device of ['OG','X']) for(const name of ['full','half_vertical','half_horizontal','quadrant']) for(const count of [0,2,4,5,15]) for(const grouped of [false,true]) {
  const width=device==='OG'?800:1040,height=device==='OG'?480:780;
  await page.setViewportSize({width,height});
  const source=fs.readFileSync(`layouts/${name}.html`,'utf8');
  const cls=pattern=>source.match(pattern)[1];
  const layout=cls(/class="(layout[^"]*)"/),root=cls(/class="(next-ten[^"]*)"/),heading=cls(/<h1 class="([^"]*)"/),event=cls(/class="(event [^"]*)"/),date=cls(/class="(date [^"]*)"/),time=cls(/class="(time [^"]*)"/),label=cls(/class="(calendar-label[^"]*)"/),section=cls(/<th class="([^"]*)"/);
  let last='';
  const rows=Array.from({length:count},(_,i)=>{
   const group=count===4?['This week','Next week','Later','Later'][i]:['Today','This week','Next week','Later'][Math.min(3,Math.floor(i/3))];
   const header=grouped&&group!==last?`${i?'<tr class="group-gap"><td colspan="3"></td></tr>':''}<tr class="section"><th class="${section}" colspan="3">${group}</th></tr>`:'';last=group;
   const title=count===4?['🦁 A day at the zoo','🎵 Live music night','🎄 Christmas market','✨ New year planning'][i]:i%3===1?'A longer event name that wraps onto two lines in a narrow column':'Pizza night';
   const content=name==='full'?`<div class="event-content"><span class="event-name">${title}</span><span class="${label}">${count===4?(i%2?'Community Events':'Family Events'):'Family Calendar'}</span></div>`:`<span class="event-name">${title}</span><span class="${label}">${count===4?(i%2?'Community Events':'Family Events'):'Family Calendar'}</span>`;
   return header+`<tr class="event-row" data-index="${i}" data-group="${group}"><td class="${date}">${name==='full'?'Sat 7 Nov 2026':'Sat, 7 Nov'}</td><td class="${time}">${i%2?'All day':'18:30'}</td><td class="${event}">${content}</td></tr>`;
  });
  const table=r=>`<div class="${root}"><table><colgroup><col class="agenda-date-col"><col class="agenda-time-col"><col></colgroup>${r.join('')||'<tr><td>No upcoming events.</td></tr>'}</table></div>`;
  const h=`<h1 class="${heading}" data-count-template="Coming Up: {count}">Coming Up: ${count}</h1>`;
  const content=name==='half_horizontal'?`${h}<div class="calendar-columns">${table(rows.slice(0,Math.ceil(count/2)))}${table(rows.slice(Math.ceil(count/2)))}</div>`:table(rows).replace('<table>',h+'<table>');
  await page.setContent(`<body class="trmnl"><style>${framework}\n:root{--screen-w:${width}px;--screen-h:${height}px}\n${css}</style><div class="screen screen--${device==='OG'?'sm':'lg'} screen--1bit"><div class="view view--${name}"><div class="${layout}" data-grouping="${grouped}">${content}</div><div class="title_bar"><span class="title" data-count-template="{count} events coming up">${count} events coming up</span><span class="instance">Updated 3 Nov</span></div></div></div><script>${script}</script>`,{waitUntil:'load'});
  await page.waitForTimeout(20);
  const fonts=await page.locator('.layout h1, .layout td, .layout th, .layout .event-name, .layout .calendar-label').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).fontFamily));
  assert(fonts.every(font=>font.startsWith('Arial')), `Unexpected agenda font on ${device}/${name}: ${fonts.join('; ')}`);
  const metrics=await page.evaluate(()=>{
   const visible=[...document.querySelectorAll('.event-row:not([hidden])')],layout=document.querySelector('.layout'),footer=document.querySelector('.title_bar');
   return {visible:visible.length,indices:visible.map(r=>+r.dataset.index),font:visible.length?parseFloat(getComputedStyle(visible[0].querySelector('.event')).fontSize):0,boost:layout.style.getPropertyValue('--agenda-boost'),footer:footer.getBoundingClientRect().top,bottoms:[...document.querySelectorAll('table')].map(t=>t.getBoundingClientRect().bottom),labels:visible.map(r=>r.querySelector('.calendar-label').getBoundingClientRect().height),clamps:visible.map(r=>{const n=r.querySelector('.event-name');return n?{h:n.getBoundingClientRect().height,max:2.4*parseFloat(getComputedStyle(n).fontSize)}:null}),heading:document.querySelector('h1').textContent,text:footer.querySelector('.title').textContent};
  });
  const key=`${device}/${name}/${count}/${grouped}`;
  assert(metrics.bottoms.every(b=>b<=metrics.footer+1),`${key}: table overlaps footer ${JSON.stringify(metrics)}`);
  assert.deepEqual(metrics.indices,Array.from({length:metrics.visible},(_,i)=>i),key);
  assert.equal(metrics.heading,`Coming Up: ${metrics.visible}`,key);assert.equal(metrics.text,`${metrics.visible} events coming up`,key);
  assert(metrics.labels.every(h=>h>0),key);assert(metrics.clamps.every(x=>!x||x.h<=x.max+1),key);
  if(count)assert(metrics.visible>0,key);
  if(count===2||(count===4&&['full','half_horizontal'].includes(name)))assert.equal(metrics.visible,count,key);
  if(count===4 && name==='half_horizontal') {
   const wraps=await page.locator('.event-name').evaluateAll(nodes=>nodes.map(n=>({lines:getComputedStyle(n).display==='inline'?1:Math.round(n.scrollHeight/parseFloat(getComputedStyle(n).lineHeight)),text:n.textContent})));
   assert(wraps.every(n=>n.lines===1), `${key}: short titles should be one line: ${JSON.stringify(wraps)}`);
  }
  results.push({device,name,count,grouped,visible:metrics.visible,font:metrics.font,boost:metrics.boost});
  if(process.env.QA_DIR&&(count===4||count===5)&&grouped)await page.screenshot({path:`${process.env.QA_DIR}/${device}-${name}-${count}.png`});
  await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('resize'));});
  assert.equal(await page.locator('.event-row:not([hidden])').count(),metrics.visible,`${key}: repeat fit unstable`);
 }
 for(const name of ['full','half_vertical','half_horizontal','quadrant'])for(const device of ['OG','X']){
  const subset=results.filter(r=>r.name===name&&r.device===device&&!r.grouped);
  assert(subset.find(r=>r.count===2).font>=subset.find(r=>r.count===15).font,`${device}/${name}: sparse events must have larger text`);
 }
 for(const name of ['full','half_vertical','half_horizontal','quadrant'])assert(results.find(r=>r.name===name&&r.device==='X'&&r.count===15&&!r.grouped).font>=results.find(r=>r.name===name&&r.device==='OG'&&r.count===15&&!r.grouped).font,`${name}: X type should be larger`);
 // Older Full markup has no native typography classes; Shared must still keep Arial.
 await page.setContent(`<style>${framework}\n${css}</style><body class="trmnl"><div class="screen screen--sm"><div class="view view--full"><div class="layout agenda-full layout--col layout--top"><div class="next-ten"><h1>Coming Up</h1><table><tr class="section"><th>This week</th></tr><tr class="event-row"><td class="date">Sat, 7 Nov 2026</td><td class="time">14:30</td><td class="event">A day at the zoo <span class="calendar-label">Family Events</span></td></tr></table></div></div></div></div></body>`);
 const oldFonts=await page.locator('h1, td, th, .calendar-label').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).fontFamily));
 assert(oldFonts.every(font=>font.startsWith('Arial')), 'Legacy Full markup must retain Arial');
 console.table(results.filter(r=>r.count!==0&&r.grouped));
 console.log('PASS: 80 real Framework combinations, Arial including older Full markup, native responsive typography, sparse enlargement, two-line clamp, calendar labels, chronology, counts and repeat fitting.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

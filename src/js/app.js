const $ = s => document.querySelector(s);
const appGrid    = $('#appGrid');
const leftPanel  = $('#leftPanel');
const rightPanel = $('#rightPanel');
const runsList   = $('#runsList');
const caseSelect = $('#caseSelect');
const seriesPanel= $('#seriesPanel');
const btnToggleRight = document.getElementById('btnToggleRight');
const consCase  = document.getElementById('consCase');
const consTable = document.getElementById('consTable');

//const scrim      = document.getElementById('scrim');   // agora existe no DOM
const btnFilters = document.getElementById('btnFilters');
const btnSeries  = document.getElementById('btnSeries');

const CONS = { loaded:false, data:{} };

const ACTIVE = [];
const LOADED = {};
let INDEX = [];
let CASES = [];

/* --------- escalas de fonte (fixo em 80%) --------- */
leftPanel?.style.setProperty('--panel-scale', '0.80');
rightPanel?.style.setProperty('--panel-scale', '0.80');

/* --------- mapa cenário por ID --------- */
const SCENARIO_BY_ID = { "728":1, "330":2, "420":3, "179":4 };
const ID_TO_SCEN = {'ID728':1,'ID330':2,'ID420':3,'ID179':4};
function scenarioLabel(id){ return `Cenário ${ID_TO_SCEN[id] ?? '·'} (${id})`; }

const ALG_LABELS = {
  "MOEAD_H":"MOEA/D-H","MOEAD_C":"MOEA/D-C","NSGA2_PY":"NSGA2 PY",
  "MACO_PY":"MACO PY","MOEAD_PY":"MOEAD PY","NSPSO_PY":"NSPSO PY","PLIM":"PLIM",
};

const FILE_RE =
/^ID(?<id>\d+)_(?<alg>[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*)_DF_P(?<P>[01])_RD(?<RD>[01])(?:_G(?<G>\d+))?(?:_(?<seed>\d{4,}))?(?:_(?<rasp>RASP))?\.xlsx$/i;

function parseFilenameMeta(name){
  const m = FILE_RE.exec(name.trim());
  if(!m) return null;
  const g = m.groups;
  const id   = Number(g.id);
  const P    = +g.P;
  const RD   = +g.RD;
  const G    = g.G ? +g.G : null;
  const seed = g.seed || null;
  const rasp = !!g.rasp;

  const algKey   = g.alg.toUpperCase();
  const algLabel = ALG_LABELS[algKey] || g.alg.replace(/_/g,'-');

  const base = `ID${id}_${algLabel}_P${P}_RD${RD}`;
  const tagG = G    ? `_G${G}`    : '';
  const tagR = rasp ? `_RASP`     : '';
  const tagS = seed ? ` — seed ${seed}` : '';

  return {
    id, P, RD, G, seed, rasp,
    algKey, algLabel, algRaw:g.alg,
    runKey : `ID${id}_${g.alg}_P${P}_RD${RD}${G?`_G${G}`:''}${seed?`_${seed}`:''}${rasp?`_RASP`:''}`,
    shortId: `${base}${tagG}${tagR}${tagS}`
  };
}

const mqMobile = () => window.matchMedia('(max-width:1024px)').matches;

const scrim = document.getElementById('scrim');
const varsModal = document.getElementById('varsModal');
const varsFrame = document.getElementById('varsFrame');
const varsBtn   = document.getElementById('varsBtn');
const varsClose = document.getElementById('varsClose');

function updateScrim(){
  const on = leftPanel.classList.contains('open')
          || rightPanel.classList.contains('open')
          || varsModal.classList.contains('open');
  scrim.style.display = on ? 'block' : 'none';
}


function openLeftDrawer(open){
  if(!mqMobile()) return;
  leftPanel.classList.toggle('open', !!open);
  updateScrim();
}
function openRightDrawer(open){
  if(!mqMobile()) return;
  rightPanel.classList.toggle('open', !!open);
  updateScrim();
}
function closeDrawers(){
  leftPanel.classList.remove('open');
  rightPanel.classList.remove('open');
  updateScrim();
}

function openVarsModal(url='vars.html'){
  varsFrame.src = url;
  varsModal.classList.add('open');
  updateScrim();
}

// Abrir qualquer link dos chips #varsAnchors dentro do modal
const varsAnchors = document.getElementById('varsAnchors');
varsAnchors?.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  e.preventDefault();
  // usa exatamente o href do <a> (ex.: "vars.html#pv")
  openVarsModal(a.getAttribute('href') || 'vars.html');
});


function closeVarsModal(){
  varsModal.classList.remove('open');
  // pequena higiene pra liberar memória
  setTimeout(()=>{ if(!varsModal.classList.contains('open')) varsFrame.src='about:blank'; }, 150);
  updateScrim();
}

// abre em modal (em vez de nova aba)
varsBtn?.addEventListener('click', (e)=>{
  e.preventDefault();
  openVarsModal(varsBtn.getAttribute('href') || 'vars.html');
});
varsClose?.addEventListener('click', closeVarsModal);

// fechar clicando fora ou ESC
scrim.addEventListener('click', ()=>{
  if(varsModal.classList.contains('open')) closeVarsModal();
  else closeDrawers();
});
window.addEventListener('keydown', (e)=>{
  if(e.key==='Escape'){
    if(varsModal.classList.contains('open')) closeVarsModal();
    else closeDrawers();
  }
});


/*
function setAccordionDefaults(){
  const small = mqMobile();
  document.querySelectorAll('#exec-summary>details, #bat-requests>details')
    .forEach(d => { d.open = !small; });
}
*/

// Fecha (minimiza) os accordions apenas uma vez na carga da página
let accordionsBootstrapped = false;
function setAccordionDefaults(){
  if (accordionsBootstrapped) return;
  document
    .querySelectorAll('#exec-summary>details, #bat-requests>details')
    .forEach(d => { d.open = false; });
  accordionsBootstrapped = true;
}

btnFilters?.addEventListener('click', ()=> openLeftDrawer(!leftPanel.classList.contains('open')));
btnSeries ?.addEventListener('click', ()=> openRightDrawer(!rightPanel.classList.contains('open')));
scrim     ?.addEventListener('click', closeDrawers);
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeDrawers(); });
//window.addEventListener('resize', ()=>{
//  if(!mqMobile()) closeDrawers();
//});




/* ---------------- resto do seu JS (inalterado) ---------------- */

function groupAndSortRuns(runs){
  const buckets = {1:[],2:[],3:[],4:[]};
  runs.forEach(f=>{
    const meta = parseFilenameMeta(f.name||'');
    if (!meta) return;
    const scen = SCENARIO_BY_ID[String(meta.id)];
    if (!scen) return;
    buckets[scen].push({file:f, meta});
  });
  for (const k of [1,2,3,4]){
    buckets[k].sort((a,b)=>{
      return (a.meta.P-b.meta.P)|| (a.meta.RD-b.meta.RD) || ((a.meta.G||0)-(b.meta.G||0)) || String(a.meta.seed||'').localeCompare(String(b.meta.seed||''));
    });
  }
  return buckets;
}

async function loadIndex(){
  const res = await fetch('index.json');
  const js = await res.json();
  INDEX = js.files||[];

  CASES = Array.from(new Set(INDEX.map(f=>{
    const parts = (f.relpath||'').split('/');
    const i = parts.findIndex(p=>/^Estudo de Caso /.test(p));
    return i>=0? parts[i] : 'Estudo de Caso 1';
  }))).sort((a,b)=> (+a.replace(/\D+/g,''))-(+b.replace(/\D+/g,'')));
  caseSelect.innerHTML = CASES.map(c=>`<option>${c}</option>`).join('');

  prewarmBatRequests().finally(()=>{
    hydrateRuns();
    refreshBatRequestUI();
    const n = Number((caseSelect.value||CASES[0]).replace(/\D+/g,'')) || 1;
    if (n>=1 && n<=6) renderConsolidated(n);
  });
}

function hydrateRuns(){
  const sel = caseSelect.value||CASES[0];
  const runs = INDEX.filter(f => (f.relpath||'').includes(`/${sel}/`));
  const buckets = groupAndSortRuns(runs);

  runsList.innerHTML = '';
  for (const scen of [1,2,3,4]){
    const arr = buckets[scen];
    if (!arr.length) continue;
    const hdr = document.createElement('div');
    hdr.className = 'muted'; hdr.style.cssText = 'font-weight:700;margin:6px 0;';
    hdr.textContent = `Cenário ${scen}`;
    runsList.appendChild(hdr);

    arr.forEach(({file, meta})=>{
      const row = document.createElement('div');
      row.className='run';
      row.innerHTML = `
        <div style="min-width:0">
          <div class="title">ID${meta.id}</div>
          <div class="chips">
            <span class="chip">${meta.algLabel}</span>
            <span class="chip">P${meta.P}</span>
            <span class="chip">RD${meta.RD}</span>
            ${meta.G?`<span class="chip">G${meta.G}</span>`:''}
            ${meta.seed?`<span class="chip">seed ${meta.seed}</span>`:''}
            ${meta.rasp?`<span class="chip">RASP</span>`:''}
          </div>
        </div>
        <div class="actions">
          <a class="btn small" href="${file.url}" target="_blank">xlsx</a>
          <button class="btn small add">+</button>
        </div>`;
      row.querySelector('button.add').onclick = ()=> addRun({file, meta});
      runsList.appendChild(row);
    });
  }
}

async function loadXlsx(url){
  if(LOADED[url]) return LOADED[url];
  const r = await fetch(url);
  const ab = await r.arrayBuffer();
  const wb = XLSX.read(ab,{type:'array'});
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet,{defval:null});
  const cols = new Set(Object.keys(data[0]||{}));
  LOADED[url] = {data, cols};
  return LOADED[url];
}

function isMonetary(col){
  return /^cost|^rev/i.test(col) || /_cost$|_total$|_period$|_period_total/i.test(col);
}
const SERIES_EXCLUDE = new Set(['period','Hora','bat_request','swaps_end_queue','swap_denied']);

async function addRun({file, meta}){
  const {data, cols} = await loadXlsx(file.url);
  const block = document.createElement('div');
  block.className='series-block';
  block.dataset.url = file.url;
  const filterId = 'flt_'+Math.random().toString(36).slice(2);
  block.innerHTML = `
    <div class="series-head">
      <div class="id" title="${meta.shortId}">${meta.shortId}</div>
      <input id="${filterId}" type="text" placeholder="filtrar colunas…"/>
    </div>
    <div class="series-list"></div>`;
  seriesPanel.appendChild(block);

  const list = block.querySelector('.series-list');
  const arr = Array.from(cols).filter(c => !SERIES_EXCLUDE.has(c));
  const defaults = new Set(['E_virtual','e_Resultant','Cost_Period_Total']);

  arr.forEach(col=>{
    const li = document.createElement('label');
    li.className='series-item'; li.title=col;
    li.innerHTML = `<input type="checkbox" data-col="${col}"> <span>${col}</span>`;
    const cb = li.querySelector('input');
    if(defaults.has(col)) cb.checked = true;
    cb.addEventListener('change', draw);
    list.appendChild(li);
  });

  block.querySelector('#'+filterId).addEventListener('input', e=>{
    const q = e.target.value.toLowerCase();
    list.querySelectorAll('.series-item').forEach(i=>{
      i.style.display = i.title.toLowerCase().includes(q)?'':'none';
    });
  });

  ACTIVE.push({meta, file, data, cols:arr, block});
  registerBatRequest(meta, data);
  refreshBatRequestUI();
  draw();
}

function selectedSeries(){
  const groups=[];
  ACTIVE.forEach(run=>{
    const cols = Array.from(run.block.querySelectorAll('input[type="checkbox"]:checked')).map(i=>i.dataset.col);
    if(cols.length) groups.push({run, cols});
  });
  return groups;
}

function hourTicks(){
  const ticks=[], labs=[];
  for(let h=0; h<24; h++){
    ticks.push(1+h*4); labs.push(String(h).padStart(2,'0')+':00');
  }
  return {ticks, labs};
}


function draw(){
  const xField = 'period';
  const {ticks, labs} = hourTicks();

  // --- séries escolhidas (usadas para a heurística da legenda) ---
  const groups = selectedSeries();                     // [{ run, cols }, ...]
  const legendItems   = groups.reduce((n,g)=> n + g.cols.length, 0);
  const groupTitles   = groups.length;                 // 1 título por execução
  const totalLegendEntries = legendItems + groupTitles;

  // Heurística p/ linhas da legenda
  const perRow = 4;
  const rows = Math.max(1, Math.ceil(totalLegendEntries / perRow));

  // Altura e margem inferior crescem conforme linhas
  const baseHeight = mqMobile() ? 340 : 440;
  const height     = baseHeight + (rows - 1) * 24;
  const bMargin    = 80 + (rows - 1) * 42;

  // Posição vertical da legenda
  let legendY = -0.25;
  if (rows === 2) legendY = -0.38;
  else if (rows >= 3) legendY = -0.52;

  const legendFontSize = totalLegendEntries > 8 ? 10 : 11;

  // --- traços REAIS (sem fantasmas aqui!) ---
  const realTraces = [];
  const first = new Map();
  groups.forEach(({run, cols})=>{
    const X = run.data.map(r => Number(r[xField]));
    cols.forEach(col=>{
      const isFirst = !first.has(run.meta.shortId);
      if (isFirst) first.set(run.meta.shortId, true);
      realTraces.push({
        x: X,
        y: run.data.map(r => r[col]==null ? null : Number(r[col])),
        mode: 'lines',
        name: col,
        legendgroup: run.meta.shortId,
        ...(isFirst ? { legendgrouptitle:{ text: run.meta.shortId } } : {}),
        yaxis: isMonetary(col) ? 'y2' : 'y1',
        hovertemplate: '%{y}<extra></extra>'
      });
    });
  });

  // --- traços “esqueleto” para garantir eixos sempre ativos ---
  const traces = [
    // garante o xaxis2 (Hora) visível
    {
      x: ticks, y: ticks.map(()=>0), mode:'lines',
      line:{ width:0 }, hoverinfo:'skip', showlegend:false, opacity:0,
      xaxis:'x2', yaxis:'y'
    },
    ...realTraces
  ];

  // se nenhum traço real usa y (esquerda) ou y2 (direita), injeta fantasma naquele eixo
  const hasY1 = realTraces.some(t => (t.yaxis||'y') === 'y' || (t.yaxis||'y') === 'y1');
  const hasY2 = realTraces.some(t => (t.yaxis||'y') === 'y2');

  if (!hasY1){
    traces.push({
      x:[1,96], y:[0,0], mode:'lines',
      line:{width:0}, hoverinfo:'skip', showlegend:false, opacity:0,
      xaxis:'x', yaxis:'y'
    });
  }
  if (!hasY2){
    traces.push({
      x:[1,96], y:[0,0], mode:'lines',
      line:{width:0}, hoverinfo:'skip', showlegend:false, opacity:0,
      xaxis:'x', yaxis:'y2'
    });
  }

  const layout = {
    height,
    margin:{ l:60, r:60, t:76, b:bMargin },

    // eixo inferior (period)
    xaxis:{
      title:{ text:'period', font:{ size:12 } },
      tickmode:'linear', dtick:4, tickfont:{ size:11 },
      zeroline:false, showgrid:true, gridcolor:'#f1f5f9',
      showspikes:true, spikemode:'across', spikethickness:1, spikesnap:'cursor'
    },

    // eixo superior (Hora)
    xaxis2:{
      overlaying:'x', side:'top', anchor:'y', layer:'above traces',
      tickvals:ticks, ticktext:labs,
      tickangle:-45, ticklabelposition:'outside top',
      tickfont:{ size:10 }, ticks:'outside', showticklabels:true,
      automargin:true, showgrid:false, zeroline:false,
      title:{ text:'Hora', standoff:6, font:{ size:11 } }
    },

    yaxis :{ title:'kWh / kW / contagem', zeroline:false, gridcolor:'#eef2f7', tickfont:{ size:11 } },
    yaxis2:{ title:'R$', overlaying:'y', side:'right',  zeroline:false, gridcolor:'#eef2f7', tickfont:{ size:11 } },

    // legenda horizontal embaixo (com offset pela heurística)
    legend:{
      orientation:'h',
      x:0, xanchor:'left',
      y: legendY, yanchor:'top',
      font:{ size: legendFontSize },
      itemsizing:'trace',
      tracegroupgap: 8
    },

    hovermode:'x unified',
    hoverlabel:{ bgcolor:'#fff', bordercolor:'#e5e7eb', font:{ size:12 } },
    paper_bgcolor:'#fff', plot_bgcolor:'#fff',
    font:{ size:12 }
  };

  Plotly.newPlot('plot', traces, layout, { displaylogo:false, responsive:true });
}





/*function draw(){
  const xField = 'period';
  const {ticks,labs} = hourTicks();

  // --- séries escolhidas
  const groups = selectedSeries();                     // [{ run, cols }, ...]
  const legendItems = groups.reduce((n,g)=> n + g.cols.length, 0);
  const groupTitles = groups.length;                   // cada execução tem um título no legend
  const totalLegendEntries = legendItems + groupTitles;

  // Heurística: quantas "linhas" a legenda deve ocupar
  // (assuma ~4 itens por linha; ajuste se quiser mais/menos compacto)
  const perRow = 4;
  const rows = Math.max(1, Math.ceil(totalLegendEntries / perRow));

  // Altura base e margem inferior aumentam conforme linhas
  const baseHeight = mqMobile() ? 340 : 440;
  const height     = baseHeight + (rows - 1) * 24;     // cresce um pouco a cada linha
  const bMargin    = 80 + (rows - 1) * 42;             // espaço p/ legenda não encostar no eixo X

  // Posição Y da legenda (negativo = abaixo do gráfico)
  let legendY = -0.25;
  if (rows === 2) legendY = -0.38;
  else if (rows >= 3) legendY = -0.52;

  // Fonte da legenda um pouco menor se tiver muita coisa
  const legendFontSize = totalLegendEntries > 8 ? 10 : 11;

  // --- traço fantasma p/ garantir eixo "Hora" no topo
  const traces = [{
    x: ticks, y: ticks.map(()=>0), mode:'lines',
    line:{ width:0 }, hoverinfo:'skip',
    showlegend:false, opacity:0, xaxis:'x2', yaxis:'y'
  }];

  const first = new Map();
  groups.forEach(({run, cols})=>{
    const X = run.data.map(r => Number(r[xField]));
    cols.forEach(col=>{
      const isFirst = !first.has(run.meta.shortId);
      if (isFirst) first.set(run.meta.shortId, true);
      traces.push({
        x: X,
        y: run.data.map(r => r[col]==null ? null : Number(r[col])),
        mode:'lines',
        name: col,
        legendgroup: run.meta.shortId,
        ...(isFirst ? { legendgrouptitle:{ text: run.meta.shortId } } : {}),
        yaxis: isMonetary(col) ? 'y2' : 'y1',
        hovertemplate: '%{y}<extra></extra>'
      });
    });
  });

  const layout = {
    height,                                           // aumenta a área útil
    margin:{ l:60, r:60, t:76, b: bMargin },         // mais espaço embaixo conforme linhas

    // eixo inferior (period)
    xaxis:{
      title:{ text:'period', font:{ size:12 } },
      tickmode:'linear', dtick:4, tickfont:{ size:11 },
      zeroline:false, showgrid:true, gridcolor:'#f1f5f9',
      showspikes:true, spikemode:'across', spikethickness:1, spikesnap:'cursor'
    },

    // eixo superior (Hora)
    xaxis2:{
      overlaying:'x', side:'top', anchor:'y', layer:'above traces',
      tickvals:ticks, ticktext:labs,
      tickangle:-45, ticklabelposition:'outside top',
      tickfont:{ size:10 }, ticks:'outside', showticklabels:true,
      automargin:true, showgrid:false, zeroline:false,
      title:{ text:'Hora', standoff:6, font:{ size:11 } }
    },

    yaxis :{ title:'kWh / kW / contagem', zeroline:false, gridcolor:'#eef2f7', tickfont:{ size:11 } },
    yaxis2:{ title:'R$', overlaying:'y', side:'right',  zeroline:false, gridcolor:'#eef2f7', tickfont:{ size:11 } },

    // legenda sempre horizontal embaixo; desce um pouco mais se houver várias linhas
    legend:{
      orientation:'h',
      x:0, xanchor:'left',
      y: legendY, yanchor:'top',
      font:{ size: legendFontSize },
      itemsizing:'trace',
      tracegroupgap: 8
    },

    hovermode:'x unified',
    hoverlabel:{ bgcolor:'#fff', bordercolor:'#e5e7eb', font:{ size:12 } },
    paper_bgcolor:'#fff', plot_bgcolor:'#fff',
    font:{ size:12 }
  };

  Plotly.newPlot('plot', traces, layout, { displaylogo:false, responsive:true });
}
*/




function resizePlot(){
  const el = document.getElementById('plot');
  if(el){ Plotly.Plots.resize(el); setTimeout(()=>Plotly.Plots.resize(el), 60); }
}

/* --------- bat_request --------- */
const batReqByScenario = new Map();
const brScenario = document.getElementById('brScenario');
const brChartEl  = document.getElementById('brChart');
const brTableEl  = document.getElementById('brTable');

function parseBatRequest(val){
  if (val == null) return {SoE:[], SoC:[], Qty:0};
  if (typeof val === 'object') {
    const {SoE=[], SoC=[], Qty=0} = val;
    return {SoE, SoC, Qty: Number(Qty)||0};
  }
  let s = String(val).trim();
  if (!s || s === 'null' || s === 'undefined') return {SoE:[], SoC:[], Qty:0};
  try {
    s = s.replaceAll("'", '"');
    const obj = JSON.parse(s);
    const {SoE=[], SoC=[], Qty=0} = obj||{};
    return {SoE, SoC, Qty: Number(Qty)||0};
  } catch {
    return {SoE:[], SoC:[], Qty:0};
  }
}

function registerBatRequest(meta, rows){
  const id = `ID${meta.id}`;
  if (batReqByScenario.has(id)) return;
  const arr = Array(96).fill(0).map(()=>({SoE:[],SoC:[],Qty:0}));
  for (const r of rows) {
    const p = Number(r.period)||0;
    if (p>=1 && p<=96) arr[p-1] = parseBatRequest(r.bat_request);
  }
  batReqByScenario.set(id, arr);
}

function refreshBatRequestUI(selectedId){
  let want = selectedId || (brScenario ? brScenario.value : null);
  if (brScenario){
    brScenario.innerHTML = '';
    for (const id of ['ID728','ID330','ID420','ID179']){
      if (batReqByScenario.has(id)){
        const opt = document.createElement('option');
        opt.value = id; opt.textContent = scenarioLabel(id);
        brScenario.appendChild(opt);
      }
    }
    if (want && [...brScenario.options].some(o=>o.value===want)) {
      brScenario.value = want;
    }
  }
  const id = brScenario?.value || [...batReqByScenario.keys()][0];
  if (!id) return;

  const data = batReqByScenario.get(id) || [];
  const qty  = data.map(d => d?.Qty || 0);

  if (brChartEl){
    Plotly.newPlot(brChartEl, [{
      type:'bar', x: Array.from({length:96}, (_,i)=> i+1), y: qty, name:'Qty'
    }], {
      margin:{l:40,r:10,t:20,b:40},
      xaxis:{ title:'period', tickmode:'linear', dtick:4, zeroline:false },
      yaxis:{ title:'Qty', rangemode:'nonnegative', dtick:1, zeroline:false },
      showlegend:false
    }, {displaylogo:false, responsive:true});
  }

  if (brTableEl){
    const to2 = v => (v==null || v==='') ? '' : Number(v).toFixed(2);
    const fmtArr = arr => (arr||[]).map(to2).join(', ');

    const rows = [];
    data.forEach((d, i)=>{
      if ((d?.Qty||0)>0){
        rows.push(`<tr>
          <td>${i+1}</td>
          <td>${d.Qty}</td>
          <td>${fmtArr(d.SoE)}</td>
          <td>${fmtArr(d.SoC)}</td>
        </tr>`);
      }
    });
    brTableEl.innerHTML = `
      <table class="mini">
        <thead><tr><th>period</th><th>Qty</th><th>SoE (kWh)</th><th>SoC(%)</th></tr></thead>
        <tbody>${rows.join('') || `<tr><td colspan="4"><em>Nenhuma chegada (Qty=0)</em></td></tr>`}</tbody>
      </table>`;
  }
}
brScenario?.addEventListener('change', (e)=> refreshBatRequestUI(e.target.value));

function firstVal(obj, keys){
  for (const k of keys){
    if (Object.prototype.hasOwnProperty.call(obj, k)){
      const v = obj[k];
      if (v !== undefined && v !== null && v !== '') return v;
    }
  }
  return null;
}

function subLabel(s){
  if(!s) return '';
  const i = s.indexOf('_');
  if(i === -1) return s;
  return s.slice(0,i) + '<sub>' + s.slice(i+1) + '</sub>';
}

function idChips(meta){
  return `<div class="idchips">
    <span class="chip">Cenário ${meta.scen}</span>
    <span class="chip">${meta.idTok}</span>
    <span class="chip">${meta.algLabel}</span>
    <span class="chip">P${meta.P}</span>
    ${meta.G ? `<span class="chip">G${meta.G}</span>` : ''}
    <span class="chip">RD${meta.RD}</span>
    ${meta.rasp ? `<span class="chip">RASP</span>` : ''}
  </div>`;
}

function parseRowForIdent(row, caseNum){
  const idRaw = firstVal(row, ['BSS_ID','ID','BSS Id']) || '';
  const idNum = String(idRaw).replace(/\D/g,'');
  const idTok = 'ID' + idNum;
  const scen  = SCENARIO_BY_ID[idNum] ?? 999;

  const algRaw   = firstVal(row, ['Algoritmo','ALG','Alg']) || '';
  const algLabel = ALG_LABELS[String(algRaw).toUpperCase()] || String(algRaw).replace(/_/g,'-');
  const P        = Number(firstVal(row, ['Preditivo','P#','P'])) ? 1 : 0;
  const G        = String(firstVal(row, ['Gerações','Geracoes','G#','G']) || '').replace(/\D/g,'');
  const RD       = (String(firstVal(row, ['RD','RD#']) || '0').replace(/\D/g,'')) || 0;

  const rasp     = rowIsRASP(row, caseNum, idNum, algRaw, P, RD, G);
  return {idNum:+idNum, idTok, scen:+scen, algLabel, P, G, RD, rasp};
}

function getQueryParams(){
  const q = new URLSearchParams(location.search);
  const runs = [];
  q.getAll('run').forEach(v=>{ if(v) runs.push(v) });
  (q.get('runs')||'').split(/[;,]/).forEach(v=>{ v=v.trim(); if(v) runs.push(v) });
  return {
    case: q.get('case') || q.get('caso') || q.get('study'),
    id  : q.get('id'),
    alg : q.get('alg'),
    p   : q.get('p'),
    rd  : q.get('rd'),
    g   : q.get('g'),
    rasp: q.get('rasp'),
    runs
  };
}
function parseRunSpecStr(s){
  if(!s) return null;
  const S = s.toUpperCase().replace(/\.(XLSX)$/i,'').replace(/-+/g,'_');
  const re = /^ID(?<id>\d+)_(?<alg>[A-Z0-9_]+?)(?:_DF)?_P(?<P>[01])_RD(?<RD>[01])(?:_G(?<G>\d+))?(?:_(?<tag1>RASP|SEED\d+))?(?:_(?<tag2>RASP|SEED\d+))?$/;
  const m = re.exec(S);
  if(!m) return null;
  const g = m.groups;
  const spec = { id:+g.id, alg:g.alg, P:+g.P, RD:+g.RD };
  if(g.G) spec.G = +g.G;
  const tags = [g.tag1,g.tag2].filter(Boolean);
  spec.rasp = tags.includes('RASP');
  return spec;
}
function algEq(a,b){ return String(a||'').toUpperCase()===String(b||'').toUpperCase(); }

function findRunFileBySpec(spec, caseNum){
  const label = caseNum ? `Estudo de Caso ${caseNum}` : null;
  const pool = INDEX.filter(f => !label || (f.relpath||'').includes(`/${label}/`));
  for(const f of pool){
    const meta = parseFilenameMeta(f.name||'');
    if(!meta) continue;
    if(spec.id!=null && +spec.id !== meta.id) continue;
    if(spec.alg    && !algEq(spec.alg, meta.algRaw)) continue;
    if(spec.P !=null && +spec.P  !== meta.P)  continue;
    if(spec.RD!=null && +spec.RD !== meta.RD) continue;
    if(spec.G !=null && (+spec.G) !== (meta.G||0)) continue;
    if(typeof spec.rasp==='boolean' && spec.rasp!==!!meta.rasp) continue;
    return f;
  }
  return null;
}
async function applyDeepLink(){
  const q = getQueryParams();
  let caseNum = null;
  if(q.case){
    caseNum = Number(String(q.case).replace(/\D/g,'')) || null;
    if(caseNum){
      const label = `Estudo de Caso ${caseNum}`;
      if(CASES.includes(label)) caseSelect.value = label;
      hydrateRuns();
    }
  }
  const wanted = [];
  if(q.id && q.alg){
    wanted.push({
      id:+q.id, alg:q.alg, P:+(q.p??0), RD:+(q.rd??0),
      G: q.g? +q.g : undefined,
      rasp: q.rasp ? /^(1|true|sim|rasp)$/i.test(q.rasp) : undefined
    });
  }
  q.runs.forEach(s=>{ const sp = parseRunSpecStr(s); if(sp) wanted.push(sp); });

  const seen = new Set();
  for(const spec of wanted){
    const key = JSON.stringify(spec);
    if(seen.has(key)) continue;
    seen.add(key);
    const file = findRunFileBySpec(spec, caseNum);
    if(file){
      const meta = parseFilenameMeta(file.name);
      await addRun({file, meta});
    }
  }
  if(wanted.length) draw();
}

async function loadConsolidatedWB(){
  if (CONS.loaded) return CONS;
  try{
    const r = await fetch('Consolidados.xlsx');
    const ab = await r.arrayBuffer();
    const wb = XLSX.read(ab, {type:'array'});
    ['Caso_1','Caso_2','Caso_3','Caso_4','Caso_5','Caso_6'].forEach(s=>{
      if (wb.Sheets[s]) CONS.data[s] = XLSX.utils.sheet_to_json(wb.Sheets[s], {defval:null});
    });
    CONS.loaded = true;
  }catch(e){
    CONS.loaded = true;
    CONS.error = e;
    console.warn('Falha ao carregar Consolidados.xlsx', e);
  }
  return CONS;
}
function rowIsRASP(row, caseNum, idNum, algRaw, P, RD, G){
  const flag = firstVal(row, ['Rasp','RASP','rasp','Execução','Execucao','Exec']);
  if (flag !== null){
    const s = String(flag).trim().toLowerCase();
    if (s === '1' || s === 'true' || s === 'sim' || s === 'rasp') return true;
    if (s === '0' || s === 'false' || s === 'nao' || s === 'não' || s === '' ) return false;
    if (!isNaN(Number(s))) return Number(s) !== 0;
  }
  if (caseNum === 6){ return !!hasRASP(idNum, algRaw, P, RD, G); }
  return false;
}
function hasRASP(id, alg, P, RD, G){
  const algToken = String(alg||'').toUpperCase().replace(/[^A-Z0-9_]/g,'');
  const gPart = G ? `_G${G}` : '';
  const re = new RegExp(`^ID${id}_${algToken}_DF_P${P}_RD${RD}${gPart}_RASP`, 'i');
  return (INDEX||[]).some(f => re.test(f.name||''));
}
function buildIdent(row, caseNum){
  const idRaw = firstVal(row, ['BSS_ID','ID','BSS Id']) || '';
  const idNum = String(idRaw).replace(/\D/g,'');
  const idTok = 'ID' + idNum;
  const scen = SCENARIO_BY_ID[idNum] ?? '·';
  const algRaw   = firstVal(row, ['Algoritmo','ALG','Alg']) || '';
  const algLabel = ALG_LABELS[String(algRaw).toUpperCase()] || String(algRaw).replace(/_/g,'-');
  const pRaw = firstVal(row, ['Preditivo','P#','P']); const P = Number(pRaw) ? 1 : 0;
  const gRaw = firstVal(row, ['Gerações','Geracoes','G#','G']) || ''; const G = String(gRaw).replace(/\D/g,'');
  const rdRaw = firstVal(row, ['RD','RD#']) || '0'; const RD = String(rdRaw).replace(/\D/g,'') || 0;
  const rasp  = (caseNum===6 && hasRASP(idNum, algRaw, P, RD, G)) ? ' — RASP' : '';
  const gPart = G ? ` — G${G}` : '';
  return `Cenário ${scen} — ${idTok} — ${algLabel} — P${P}${gPart} — RD${RD}${rasp}`;
}
function renderConsolidated(caseNum){
  loadConsolidatedWB().then(()=>{
    if (consCase && !consCase.options.length){
      const opts = [];
      for (let n=1;n<=6;n++){
        if (CONS.data[`Caso_${n}`]) opts.push(`<option value="${n}">Estudo de Caso ${n}</option>`);
      }
      consCase.innerHTML = opts.join('');
    }
    if (consCase) consCase.value = String(caseNum);

    const raw = CONS.data[`Caso_${caseNum}`] || [];
    const rows = raw.map(r => ({ r, meta: parseRowForIdent(r, caseNum) }))
                    .sort((a,b)=> (a.meta.scen - b.meta.scen) || (a.meta.idNum - b.meta.idNum));

    const headers = ['Execução','Tempo','C_Total','R_Bruta','Uso Solar','FAC_Solar','ICR_Solar','BVE','TX_ocup','TX_atend','Swaps','Negações'];
    const to2 = v => (v==null || v==='') ? '' : Number(v).toFixed(2);
    const toI = v => (v==null || v==='') ? '' : Math.round(Number(v));

    const htmlRows = rows.map(({r, meta})=>{
      const tempo = firstVal(r, ['Tempo']);
      const ctot  = firstVal(r, ['Custo_Total','C_Total']);
      const rbru  = firstVal(r, ['Receita_Bruta','R_Bruta']);
      const uso   = firstVal(r, ['Uso_Solar','Uso Solar']);
      const fac   = firstVal(r, ['FAC_Solar_%','FAC Solar %']);
      const icr   = firstVal(r, ['ICR_Solar_%','ICR Solar %']);
      const bve   = firstVal(r, ['BEV_kWh','BVE','BVE_kWh']);
      const txo   = firstVal(r, ['TX_Ocupacao_%','TX Ocupação %','TX_Ocupação_%','TX Ocupacao %']);
      const txa   = firstVal(r, ['QoS_%','TX_atend','TX_atendimento_%']);
      const swaps = firstVal(r, ['swap_ocorridas','Swaps']);
      const neg   = firstVal(r, ['swap_penalty_ocorridas','Negações','Negacoes']);

      return `<tr>
        <td>${idChips(meta)}</td>
        <td>${tempo == null ? '' : tempo}</td>
        <td>${to2(ctot)}</td>
        <td>${to2(rbru)}</td>
        <td>${to2(uso)}</td>
        <td>${to2(fac)}</td>
        <td>${to2(icr)}</td>
        <td>${to2(bve)}</td>
        <td>${to2(txo)}</td>
        <td>${to2(txa)}</td>
        <td>${toI(swaps)}</td>
        <td>${toI(neg)}</td>
      </tr>`;
    }).join('');

    const headHtml = headers.map(h=>`<th>${subLabel(h)}</th>`).join('');
    consTable.innerHTML = `
      <table class="mini">
        <thead><tr>${headHtml}</tr></thead>
        <tbody>${htmlRows || `<tr><td colspan="${headers.length}"><em>Sem dados para este estudo.</em></td></tr>`}</tbody>
      </table>`;
  });
}
consCase?.addEventListener('change', e => renderConsolidated(Number(e.target.value)));

async function prewarmBatRequests(){
  const wanted = ['728','330','420','179'];
  for (const id of wanted){
    const f = INDEX.find(x => /^ID\d+_/i.test(x.name||'') && (x.name||'').includes(`ID${id}_`));
    if (!f) continue;
    try{
      const {data} = await loadXlsx(f.url);
      const fakeMeta = {id:Number(id)};
      registerBatRequest(fakeMeta, data);
    }catch(e){ console.warn('prewarm falhou', id, e); }
  }
}

/* Controles */
document.getElementById('btnUpdate').onclick = draw;
document.getElementById('btnClear').onclick = ()=>{
  ACTIVE.splice(0,ACTIVE.length);
  seriesPanel.innerHTML='';
  draw();
};
document.getElementById('collapseRight').onclick = ()=>{
  if (mqMobile()) { openRightDrawer(false); }
  else{
    rightPanel.classList.add('collapsed');
    rightTglText.textContent='mostrar séries';
    syncGridClasses();
  }
};

// Botão DESKTOP para ocultar/mostrar o painel de séries
btnToggleRight?.addEventListener('click', () => {
  // (no desktop o botão existe; no mobile ele está oculto por CSS)
  const willShow = rightPanel.classList.contains('collapsed');
  rightPanel.classList.toggle('collapsed');
  btnToggleRight.textContent = willShow ? 'ocultar séries' : 'mostrar séries';
  syncGridClasses();
});

// Botão "X" no cabeçalho do painel direito
document.getElementById('collapseRight').onclick = () => {
  if (mqMobile()) {
    // no mobile o painel é drawer
    openRightDrawer(false);
  } else {
    rightPanel.classList.add('collapsed');
    if (btnToggleRight) btnToggleRight.textContent = 'mostrar séries';
    syncGridClasses();
  }
};


window.addEventListener('resize', resizePlot);

function syncGridClasses(){
  appGrid.classList.toggle('left-collapsed',  leftPanel.classList.contains('collapsed'));
  appGrid.classList.toggle('right-collapsed', rightPanel.classList.contains('collapsed'));
  if (btnToggleRight) {
    btnToggleRight.textContent = rightPanel.classList.contains('collapsed')
      ? 'mostrar séries'
      : 'ocultar séries';
  }
  resizePlot();
}


function handleResize(){
  // quando sair do mobile, recolhe drawers
  if(!mqMobile()) closeDrawers();

  const gd = document.getElementById('plot');
  if (gd) Plotly.Plots.resize(gd);

  if (typeof brChartEl !== 'undefined' && brChartEl) {
    Plotly.Plots.resize(brChartEl);
  }
}
window.addEventListener('resize', handleResize);


//window.addEventListener('resize', ()=>{ resizePlot(); if (brChartEl) Plotly.Plots.resize(brChartEl); });

//window.addEventListener('resize', ()=>{
//  const gd = document.getElementById('plot');
//  if(gd && gd.data) adjustLegendSpace(gd);
//});

caseSelect.onchange = ()=>{
  hydrateRuns();
  refreshBatRequestUI();
  const n = Number(caseSelect.value.replace(/\D+/g,'')) || 1;
  if (n>=1 && n<=6) renderConsolidated(n);
};

loadIndex()
  .then(() => applyDeepLink())
  .catch(err => {
    console.error(err);
    runsList.innerHTML = `<div class="muted">Erro ao carregar o índice.</div>`;
  });

try{
  if(!localStorage.getItem('vars_opened_once')){
    window.open('vars.html','_blank','noopener');
    localStorage.setItem('vars_opened_once','1');
  }
}catch(e){}

setAccordionDefaults();
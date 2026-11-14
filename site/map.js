"use strict";
(() => {
  // These are editorial affinities between the published project descriptions,
  // not code dependencies or claims of interoperability.
  const links = [
    ['konaet-cover', 'konaet-os', 'Arquitetura de sistemas'],
    ['konaet-cover', 'konaet-xray', 'Risco e auditoria'],
    ['konaet-cover', 'konaet-bot', 'Mudanças verificáveis'],
    ['konaet-os', 'konaet-bot', 'Infraestrutura e automação'],
    ['konaet-os', 'konaet-xray', 'Inspeção de software'],
    ['IA_Neural', 'AGIMatematic', 'Aprendizado e raciocínio'],
    ['IA_Neural', 'RealidadeQuantica', 'Modelos computacionais'],
    ['RealidadeQuantica', 'matematic-latex-github', 'Pesquisa matemática'],
    ['AGIMatematic', 'matematic-latex-github', 'Matemática e código'],
    ['konaet-bot', 'konaet-xray', 'Evidências e revisão']
  ];
  const positions = [[500,100],[245,190],[770,160],[790,485],[480,555],[175,475],[150,320],[845,320]];
  const colors = {Sistemas:'#a782ff', IA:'#57d6c3', Ciência:'#71a9ff', Ferramentas:'#ffb47d'};
  const $ = selector => document.querySelector(selector);
  const state = {points:[], choose:null, selected:null, category:'Todos', query:'', mode:'network', zoom:1, x:0, y:0, drag:null};
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const viewport = $('#map-viewport');
  const canvas = $('#map-canvas');

  function nodeFor(name) { return state.points.find(point => point.name === name); }
  function matches(point) {
    if (!point) return false;
    return (state.category === 'Todos' || point.category === state.category) &&
      (!state.query || norm([point.title,point.name,point.category,point.description].join(' ')).includes(norm(state.query)));
  }
  function transform() {
    canvas.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.zoom})`;
    $('#zoom-value').textContent = state.zoom.toFixed(2) + '×';
    $('#zoom-out').disabled = state.zoom <= 1;
    $('#zoom-in').disabled = state.zoom >= 2.5;
  }
  function focus(name) {
    const point = nodeFor(name);
    if (!point) return;
    state.selected = name;
    const neighbors = links.filter(([a,b]) => a === name || b === name);
    $('#map-focus-title').textContent = point.title;
    $('#map-focus-description').textContent = point.description || 'Explore o projeto no repositório.';
    $('#map-focus-count').textContent = neighbors.length + (neighbors.length === 1 ? ' relação temática' : ' relações temáticas');
    const buttons = neighbors.map(([a,b,label]) => {
      const other = nodeFor(a === name ? b : a);
      if (!other) return null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'map-related';
      button.style.setProperty('--relation-color', colors[other.category] || '#ffb47d');
      const title = document.createElement('strong');
      title.textContent = other.title;
      const reason = document.createElement('small');
      reason.textContent = label;
      button.append(title, reason);
      button.addEventListener('click', () => state.choose?.(other.name));
      return button;
    }).filter(Boolean);
    $('#map-neighbors').replaceChildren(...buttons);
    update();
  }
  function update() {
    const matchesNow = state.points.filter(matches);
    const hasFilter = state.category !== 'Todos' || !!state.query;
    const neighborNames = new Set(links.filter(([a,b]) => a === state.selected || b === state.selected).flatMap(([a,b]) => [a,b]));
    for (const node of $('#nodes').querySelectorAll('.map-node')) {
      const hit = matches(nodeFor(node.dataset.project));
      node.classList.toggle('is-muted', (hasFilter && !hit) || (state.mode === 'focus' && !neighborNames.has(node.dataset.project)));
      node.setAttribute('aria-pressed', String(node.dataset.project === state.selected));
    }
    for (const line of $('#paths').querySelectorAll('.connection')) {
      const touches = line.dataset.from === state.selected || line.dataset.to === state.selected;
      const filtered = hasFilter && !matches(nodeFor(line.dataset.from)) && !matches(nodeFor(line.dataset.to));
      line.classList.toggle('active', touches);
      line.classList.toggle('is-muted', filtered || (state.mode === 'focus' && !touches));
    }
    $('#map-match-count').textContent = hasFilter ? `${matchesNow.length} de ${state.points.length} projetos` : `${state.points.length} projetos · ${links.length} relações`;
    $('#map-empty').hidden = matchesNow.length !== 0;
    for (const button of document.querySelectorAll('[data-map-category]'))
      button.setAttribute('aria-pressed', String(button.dataset.mapCategory === state.category));
    for (const button of document.querySelectorAll('[data-map-mode]'))
      button.setAttribute('aria-pressed', String(button.dataset.mapMode === state.mode));
  }
  function render(points, choose, selected) {
    state.points = points;
    state.choose = choose;
    const nodes = points.map((point, index) => {
      const [x,y] = positions[index];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'map-node';
      button.dataset.project = point.name;
      button.style.left = x / 10 + '%';
      button.style.top = y / 6.5 + '%';
      button.style.setProperty('--node-color', colors[point.category] || '#ffb47d');
      const number = document.createElement('small');
      number.textContent = String(index + 1).padStart(2,'0') + ' / ' + point.category.toUpperCase();
      const title = document.createElement('strong');
      title.textContent = point.title;
      button.append(number,title);
      button.addEventListener('click', () => {
        if (!matches(point)) {
          state.category = 'Todos'; state.query = ''; $('#map-search').value = '';
        }
        choose(point.name);
      });
      return button;
    });
    const paths = links.map(([from,to,label],index) => {
      const a = points.findIndex(point => point.name === from);
      const b = points.findIndex(point => point.name === to);
      if (a < 0 || b < 0) return null;
      const [x1,y1] = positions[a], [x2,y2] = positions[b];
      const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx,dy) || 1;
      const bend = (index % 2 ? -1 : 1) * Math.min(32,length / 12);
      const middleX = (x1 + x2) / 2 - dy / length * bend;
      const middleY = (y1 + y2) / 2 + dx / length * bend;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M${x1} ${y1} Q${middleX} ${middleY} ${x2} ${y2}`);
      path.setAttribute('class','connection');
      path.setAttribute('aria-label',`${points[a].title} — ${points[b].title}: ${label}`);
      path.dataset.from = from;
      path.dataset.to = to;
      return path;
    }).filter(Boolean);
    $('#nodes').replaceChildren(...nodes);
    $('#paths').replaceChildren(...paths);
    focus(selected && nodeFor(selected) ? selected : points[0]?.name);
  }

  document.querySelectorAll('[data-map-category]').forEach(button => button.addEventListener('click', () => {
    state.category = button.dataset.mapCategory;
    const first = state.points.find(matches);
    if (first && !matches(nodeFor(state.selected))) state.choose?.(first.name);
    update();
  }));
  document.querySelectorAll('[data-map-mode]').forEach(button => button.addEventListener('click', () => {
    state.mode = button.dataset.mapMode;
    update();
  }));
  $('#map-search').addEventListener('input', event => {
    state.query = event.target.value.trim();
    const first = state.points.find(matches);
    if (first && !matches(nodeFor(state.selected))) state.choose?.(first.name);
    update();
  });
  $('#map-clear').addEventListener('click', () => {
    state.category = 'Todos'; state.query = ''; $('#map-search').value = ''; update(); $('#map-search').focus();
  });
  $('#zoom-in').addEventListener('click', () => {state.zoom = Math.min(2.5,state.zoom + .25); transform();});
  $('#zoom-out').addEventListener('click', () => {state.zoom = Math.max(1,state.zoom - .25); transform();});
  $('#reset-map').addEventListener('click', () => {state.zoom = 1; state.x = state.y = 0; transform();});
  viewport.addEventListener('pointermove', event => {
    const bounds = viewport.getBoundingClientRect();
    viewport.style.setProperty('--pointer-x',`${event.clientX - bounds.left}px`);
    viewport.style.setProperty('--pointer-y',`${event.clientY - bounds.top}px`);
    if (!state.drag) return;
    state.x = Math.max(-320,Math.min(320,state.drag.startX + event.clientX - state.drag.x));
    state.y = Math.max(-250,Math.min(250,state.drag.startY + event.clientY - state.drag.y));
    transform();
  });
  viewport.addEventListener('pointerdown', event => {
    if (matchMedia('(max-width:740px)').matches || event.target.closest('button')) return;
    state.drag = {x:event.clientX,y:event.clientY,startX:state.x,startY:state.y};
    viewport.setPointerCapture?.(event.pointerId);
    viewport.classList.add('dragging');
  });
  const release = () => {state.drag = null; viewport.classList.remove('dragging');};
  viewport.addEventListener('pointerup',release);
  viewport.addEventListener('pointercancel',release);
  viewport.addEventListener('keydown', event => {
    if (matchMedia('(max-width:740px)').matches) return;
    const moves = {ArrowLeft:[35,0],ArrowRight:[-35,0],ArrowUp:[0,35],ArrowDown:[0,-35]};
    if (!moves[event.key]) return;
    event.preventDefault();
    state.x = Math.max(-320,Math.min(320,state.x + moves[event.key][0]));
    state.y = Math.max(-250,Math.min(250,state.y + moves[event.key][1]));
    transform();
  });
  transform();
  window.KonaetMap = {render,select:focus};
})();

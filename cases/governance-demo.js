(() => {
  'use strict';
  // Independent public schema: no customer records or desktop filesystem paths.
  const nodes = [
    ['workspace','经营分析工作台','场景','public-v1','统一公开演示入口，不连接企业系统。'],
    ['task','费用敏感性分析','场景','task-v1','比较每日额外费用对资金余额的影响。'],
    ['agent','分析协调角色','场景','design-v1','流程设计角色；未接入模型，不是运行中的智能体。'],
    ['owner','财务复核角色','审阅','role-v1','业务责任示意；网页不认证身份，不授予权限。'],
    ['data','合成现金流数据','数据','synthetic-v1','独立14天USD数据，不包含真实交易。'],
    ['opening','初始余额','数据','synthetic-v1','演示初始余额为1,200,000 USD。'],
    ['extra','费用假设','数据','input-v1','来自沙盘输入；更改后旧计算失效。'],
    ['floor','资金底线假设','数据','input-v1','仅用于风险分析，不是企业正式资金政策。'],
    ['tool','整数分计算工具','工具','calc-v1','确定性计算，不重新预测现金流。'],
    ['run','当前页面运行','工具','session-v1','最近一次沙盘计算；刷新后不保留历史。'],
    ['baseline','基准余额结果','工具','calc-v1','按初始余额加每日净流入计算。'],
    ['candidate','方案余额结果','工具','calc-v1','基准余额扣除逐日累计额外费用。'],
    ['check','算术核验','规则','check-v1','基准收支、方案收支、累计费用三项检查。'],
    ['freshness','版本匹配规则','规则','policy-demo-v1','模拟数据更新后，旧证据标记待重新验证。'],
    ['permission','只读与人工边界','规则','policy-demo-v1','无付款、系统写回、身份认证或真实审批。'],
    ['risk','底线风险提示','规则','calc-v1','根据本次方案低于假设底线的天数生成提示。'],
    ['decision','分析建议','审阅','decision-demo-v1','检查通过也必须人工复核，不代表已批准。'],
    ['review','人工复核说明','审阅','note-v1','来自沙盘文本输入，不是有效审批签名。'],
    ['evidence','逐日分析记录','证据','export-v1','假设、结果、核验状态构成可查看的演示记录。'],
    ['export','本地JSON导出','证据','export-v1','浏览器下载，不是不可篡改的生产审计凭证。'],
  ].map(([id,name,type,version,description]) => ({id,name,type,version,description}));
  const edges = [
    ['workspace','task','组织'],['task','agent','规划角色'],['task','owner','责任'],['task','data','使用'],
    ['data','opening','包含'],['task','extra','设定'],['task','floor','设定'],['agent','tool','规划调用'],
    ['data','tool','输入'],['opening','tool','输入'],['extra','tool','输入'],['floor','risk','比较依据'],
    ['tool','run','执行'],['run','baseline','生成'],['run','candidate','生成'],['baseline','check','核验'],
    ['candidate','check','核验'],['candidate','risk','检测'],['data','freshness','版本约束'],
    ['permission','decision','约束'],['check','decision','支撑'],['risk','decision','提示'],
    ['freshness','evidence','约束有效性'],['decision','review','交还人工'],['owner','review','责任'],
    ['run','evidence','记录'],['check','evidence','记录'],['review','export','附注'],['evidence','export','导出'],
  ].map(([from,to,label]) => ({from,to,label}));
  function state(result, condition) {
    if (!result || condition === 'missing') return {code:'BLOCKED',label:'已阻断（演示）',reason:'缺少有效计算或关键输入，不能形成可复核建议。'};
    if (condition === 'updated') return {code:'STALE',label:'待重新验证（演示）',reason:'模拟数据版本已变化；旧运行证据不能支持新版本。恢复匹配仅重置模拟，不加载真实新数据。'};
    if (!Object.values(result.checks).every(Boolean)) return {code:'BLOCKED',label:'已阻断（演示）',reason:'算术核验未全部通过。'};
    return {code:'REVIEW',label:'检查通过 · 待人工复核',reason:'三项算术一致性通过，但未验证业务真实性、授权或审批。'};
  }
  function publicSchema() {
    return {scope:'public_synthetic_schema_demo',schema_version:'schema-demo-v1',nodes,edges,
      business_approval:false,model_connected:false,production_audit:false};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {nodes,edges,state,publicSchema};
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  let result = null, condition = 'matched', selected = 'task';
  function element(tag,text,className) { const el = document.createElement(tag); if(text) el.textContent=text;if(className) el.className=className;return el; }
  const svgNS='http://www.w3.org/2000/svg', colors={'场景':'#65b8ff','数据':'#a38bfa','工具':'#66dfd1','规则':'#fa8aa1','审阅':'#efc670','证据':'#9cc8d1'};
  const positions={}, mapNodes=new Map(), mapEdges=[];
  function svgElement(tag,attrs={}) {const e=document.createElementNS(svgNS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));return e;}
  function chooseNode(id) {selected=id;displayNodes();detail();}
  function initMap() {
    const categories=Object.keys(colors);
    categories.forEach((type,ci)=>{
      const angle=-Math.PI/2+ci*Math.PI/3,cx=480+280*Math.cos(angle),cy=280+180*Math.sin(angle);
      const label=svgElement('text',{x:cx,y:cy-58,'text-anchor':'middle',fill:colors[type],'font-size':17});label.textContent=type;$('gov-map').append(label);
      const members=nodes.filter(n=>n.type===type);
      members.forEach((n,i)=>{positions[n.id]={x:cx+(i-(members.length-1)/2)*43,y:cy+(i%2)*32};});
    });
    const edgeLayer=svgElement('g',{'aria-hidden':'true'});$('gov-map').append(edgeLayer);
    edges.forEach(e=>{const from=positions[e.from],to=positions[e.to],line=svgElement('line',{x1:from.x,y1:from.y,x2:to.x,y2:to.y,stroke:'#375768','stroke-width':1.3});edgeLayer.append(line);mapEdges.push({edge:e,line});});
    nodes.forEach(n=>{
      const p=positions[n.id],g=svgElement('g',{transform:`translate(${p.x} ${p.y})`,tabindex:0,role:'button','aria-label':`${n.type}：${n.name}`,'data-map-node':n.id});
      const title=svgElement('title');title.textContent=`${n.name} · ${n.version}`;
      const ring=svgElement('circle',{r:21,fill:'none',stroke:colors[n.type],'stroke-width':1,class:'gov-node-ring'});
      const circle=svgElement('circle',{r:11,fill:colors[n.type]});
      const text=svgElement('text',{x:0,y:39,'text-anchor':'middle',fill:'#ebf5fb','font-size':13,class:'gov-node-name'});text.textContent=n.name;
      g.append(title,ring,circle,text);g.addEventListener('click',()=>chooseNode(n.id));g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();chooseNode(n.id);}});$('gov-map').append(g);mapNodes.set(n.id,g);
    });
  }
  function updateMap(visible) {
    const ids=new Set(visible.map(n=>n.id));
    mapNodes.forEach((g,id)=>{g.classList.toggle('map-filtered',!ids.has(id));g.classList.toggle('map-selected',id===selected);g.setAttribute('aria-pressed',String(id===selected));g.setAttribute('tabindex',ids.has(id)?'0':'-1');});
    mapEdges.forEach(({edge,line})=>{line.classList.toggle('map-filtered',!ids.has(edge.from)||!ids.has(edge.to));line.classList.toggle('map-active',edge.from===selected||edge.to===selected);});
  }
  function displayNodes() {
    const query = $('gov-search').value.trim().toLowerCase(), type = $('gov-type').value, mode = $('gov-view').value;
    const connected = new Set([selected,...edges.filter(e=>e.from===selected||e.to===selected).flatMap(e=>[e.from,e.to])]);
    const visible = nodes.filter(n => (mode!=='focus'||connected.has(n.id)) && (!type||n.type===type) && `${n.name} ${n.type} ${n.id}`.toLowerCase().includes(query));
    updateMap(visible);
    $('gov-nodes').replaceChildren();
    for(const category of [...new Set(visible.map(n=>n.type))]) {
      const group=element('section',null,'gov-group');group.append(element('h4',category));
      visible.filter(n=>n.type===category).forEach(n=>{const b=element('button',n.name);b.type='button';b.dataset.node=n.id;b.setAttribute('aria-pressed',String(n.id===selected));b.addEventListener('click',()=>{chooseNode(n.id);$('gov-nodes').querySelector(`[data-node="${n.id}"]`)?.focus({preventScroll:true});});group.append(b);});
      $('gov-nodes').append(group);
    }
    $('gov-count').textContent=`当前显示 ${visible.length} / ${nodes.length} 个演示实体 · 总计 ${edges.length} 条定义关系`;
    if(!visible.length) $('gov-nodes').append(element('p','没有匹配节点，请调整搜索或筛选。'));
  }
  function detail() {
    const n=nodes.find(n=>n.id===selected), host=$('gov-detail');host.replaceChildren();
    host.append(element('h4',n.name),element('p',`${n.type} · ${n.version} · 来源：独立公开演示定义`),element('p',n.description));
    host.append(element('p',`运行状态：${state(result,condition).label}（适用于当前现金流分析）`));
    const list=element('ul');
    edges.filter(e=>e.from===selected||e.to===selected).forEach(e=>{
      const other=nodes.find(v=>v.id===(e.from===selected?e.to:e.from));
      const li=element('li'), b=element('button',`${e.from===selected?'下游':'上游'} · ${e.label} · ${other.name}`);b.type='button';
      b.addEventListener('click',()=>{selected=other.id;displayNodes();detail();});li.append(b);list.append(li);
    });host.append(list);
  }
  function refresh() {
    const s=state(result,condition);$('gov-state').textContent=s.label;$('gov-state').dataset.state=s.code;$('gov-reason').textContent=s.reason;
    $('gov-summary').textContent=`${nodes.length} 个实体 / ${edges.length} 条定义关系 · ${result?'1':'0'} 次有效页面计算 · 真实审批 0`;
    $('gov-review-state').textContent=`${s.label}。${s.reason}`;
    $('gov-target-version').value=condition==='updated'?'updated':'matched';
    $('gov-version-impact').textContent=`计算来源：synthetic-v1；目标：${condition==='updated'?'synthetic-v2-demo（模拟，无实际数据）':'synthetic-v1'}。${s.label}。${s.reason}`;
    $('gov-run').replaceChildren();
    const entries = result ? [
      ['输入','独立合成数据 synthetic-v1 · 2026-01-01 至 01-14 · USD'],
      ['假设',`每日额外费用 ${(result.daily_extra_expense_cents/100).toFixed(2)} USD；分析底线 ${(result.floor_cents/100).toFixed(2)} USD`],
      ['计算',`${result.rows.length} 条逐日结果 · 工具 calc-v1 · 整数分`],
      ['核验',Object.entries(result.checks).map(([k,v])=>`${k}: ${v?'通过':'失败'}`).join('；')],
      ['风险',`低于底线 ${result.candidate.below_floor_days} 天；首次 ${result.candidate.first_breach_date||'未触发'}`],
      ['证据有效性',s.label],['人工边界','未认证复核人 · 未批准 · 不执行付款 · 当前页面会话'],
    ] : [['无有效运行','请回到现金流沙盘重新计算。参数修改会撤销旧结果；这里只展示最近一次，不保存历史。']];
    entries.forEach(([title,body])=>{const d=element('details');d.append(element('summary',title),element('p',body));$('gov-run').append(d);});detail();
  }
  function setCondition(value) {
    condition=value;
    document.querySelectorAll('[data-condition]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.condition===value)));
    refresh();
  }
  function schemaDetail() {
    const n=nodes.find(n=>n.id===$('gov-entity').value), host=$('gov-schema-detail');host.replaceChildren();
    host.append(element('h4',n.name),element('p',`ID: ${n.id} · 类型：${n.type} · 定义版本：${n.version}`),element('p',n.description));
    const relationships=edges.filter(e=>e.from===n.id||e.to===n.id);
    host.append(element('p',`直接关系 ${relationships.length} 条。以下方向表示结构关系，不表示已经发生的运行。`));
    const list=element('ul');relationships.forEach(e=>list.append(element('li',`${nodes.find(v=>v.id===e.from).name} → ${e.label} → ${nodes.find(v=>v.id===e.to).name}`)));host.append(list);
  }
  for(const type of [...new Set(nodes.map(n=>n.type))]) {
    const card=element('article',type);card.append(element('strong',`${nodes.filter(n=>n.type===type).length} 个`),element('small','公开演示定义，不代表真实应用数量'));$('gov-types').append(card);
  }
  nodes.forEach(n=>{const option=element('option',`${n.type} · ${n.name}`);option.value=n.id;$('gov-entity').append(option);});
  $('gov-entity').value='data';$('gov-entity').addEventListener('change',schemaDetail);schemaDetail();
  $('gov-target-version').addEventListener('change',()=>setCondition($('gov-target-version').value));
  $('gov-export-schema').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(publicSchema(),null,2)],{type:'application/json;charset=utf-8'}));
    const a=element('a');a.href=url;a.download='bruce-public-governance-schema.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('gov-schema-status').textContent='已发起公开结构下载。仅含独立定义，不包含复核文本、客户数据或审批记录。';
  });
  document.querySelectorAll('[data-gov-panel]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.gov-panel').forEach(p=>p.hidden=p.id!==b.dataset.govPanel);
    document.querySelectorAll('[data-gov-panel]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
  }));
  ['gov-search','gov-type','gov-view'].forEach(id=>$(id).addEventListener(id==='gov-search'?'input':'change',displayNodes));
  document.querySelectorAll('[data-condition]').forEach(b=>b.addEventListener('click',()=>{
    setCondition(b.dataset.condition);
  }));
  document.addEventListener('portal-result',ev=>{result=ev.detail;refresh();});
  let paused=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function motionState() {$('gov-map').classList.toggle('motion-paused',paused);$('gov-toggle-motion').textContent=paused?'播放动画':'暂停动画';$('gov-toggle-motion').setAttribute('aria-pressed',String(paused));}
  $('gov-toggle-motion').addEventListener('click',()=>{paused=!paused;motionState();});
  $('gov-map-wrap').hidden=window.matchMedia('(max-width: 800px)').matches;
  function mapVisibility() {const hidden=$('gov-map-wrap').hidden;$('gov-toggle-map').textContent=hidden?'显示动态图':'隐藏动态图';$('gov-toggle-map').setAttribute('aria-pressed',String(!hidden));}
  $('gov-toggle-map').addEventListener('click',()=>{$('gov-map-wrap').hidden=!$('gov-map-wrap').hidden;mapVisibility();});
  // Animation is CSS-only; no timer, network request or physics dependency.
  initMap();motionState();mapVisibility();
  displayNodes();refresh();
})();

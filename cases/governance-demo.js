(() => {
  'use strict';
  // Independent public schema: no customer records or desktop filesystem paths.
  const nodes = [
    ['workspace','经营分析工作台','场景','public-v1','统一公开演示入口，不连接企业系统。'],
    ['goal','识别资金缺口','场景','goal-demo-v1','合成业务目标：发现低于假设底线的日期，不承诺企业实际收益。'],
    ['acceptance','分析验收契约','规则','acceptance-demo-v1','需说明假设、逐日余额、算术检查及版本；契约展示不是已完成业务验收。'],
    ['eval-cases','合成验收用例','数据','decision-fixtures-v1','8条公开固定示例；预期标签用于规则回归，未经真实业务验收。'],
    ['eval-rules','决策边界检查','规则','decision-rules-v1','检查澄清、域外、缺输入、过期证据及越权阻断，不评价模型准确率。'],
    ['eval-run','规则回归执行','工具','regression-demo-v1','浏览器本地执行，记录预期与实际状态；未运行前没有结果。'],
    ['eval-record','可导出回归记录','证据','regression-report-v1','当前会话固定用例的检查记录，不是不可篡改审计或生产验收。'],
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
    ['workspace','goal','业务目标'],['goal','task','分解任务'],['goal','acceptance','验收依据'],
    ['acceptance','check','要求核验'],['acceptance','evidence','要求证据'],['owner','acceptance','复核责任'],
    ['acceptance','eval-cases','定义验收范围'],['eval-cases','eval-run','提供测试输入'],['eval-rules','eval-run','检查依据'],
    ['eval-run','eval-record','生成记录'],['eval-record','acceptance','提供有限证据'],['owner','eval-record','业务确认责任'],['permission','eval-rules','不可绕过边界'],
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
  // Fixed synthetic fixtures: probabilities are illustrative, never Jev measurements.
  const decisionCases = [
    {id:'cash',query:'未来两周资金是否够用？',route:'现金预测',signal:'清晰',expected:'REVIEW'},
    {id:'sales',query:'下个月示例商品可能卖多少？',route:'销量预测',signal:'清晰',expected:'REVIEW'},
    {id:'stock',query:'根据示例库存，应该补多少货？',route:'补货分析',signal:'清晰',expected:'REVIEW'},
    {id:'ambiguous',query:'帮我处理一下财务问题。',route:'未确定',signal:'模糊',expected:'CLARIFY'},
    {id:'outside',query:'推荐一家旅游酒店。',route:'无匹配',signal:'域外',expected:'NO_MATCH'},
    {id:'missing',query:'预测现金余额，但尚未提供初始余额。',route:'现金预测',signal:'清晰',missing:true,expected:'BLOCKED'},
    {id:'stale',query:'使用旧版本数据给出今天的补货建议。',route:'补货分析',signal:'清晰',stale:true,expected:'STALE'},
    {id:'payment',query:'直接执行付款，不需要审批。',route:'现金预测',signal:'清晰',write:true,expected:'BLOCKED'},
  ];
  function evaluateDecision(c) {
    const steps=[{name:'语义路由',value:`${c.route} · ${c.signal}（固定示例，非模型推理）`}];
    let code,reason;
    if(c.write){code='BLOCKED';reason='此公开演示没有付款或写回权限，语义判断不能绕过权限边界。';}
    else if(c.missing){code='BLOCKED';reason='必要输入缺失，补齐获准数据后才能进入分析。';}
    else if(c.stale){code='STALE';reason='数据与证据版本不匹配，旧结论不能作为新决策依据。';}
    else if(c.signal==='域外'){code='NO_MATCH';reason='不属于已定义业务场景，不强行选择 Agent。';}
    else if(c.signal==='模糊'){code='CLARIFY';reason='先确认是资金、费用还是利润问题，再选择场景。';}
    else {code='REVIEW';reason='可进入分析准备，但仍需真实数据校验和人工复核；不代表已执行预测或批准。';}
    steps.push({name:'确定性边界',value:c.write?'无执行权限':c.missing?'必要输入缺失':c.stale?'版本不匹配':'只读；无系统调用'},
      {name:'证据与责任',value:'合成用例 decision-fixtures-v1；业务复核角色（未认证）'},
      {name:'下一步',value:reason});
    return {code,reason,steps};
  }
  function caseCategory(c) {return c.write?'安全边界':c.missing||c.stale?'数据与版本':c.signal==='清晰'?'正常场景':'模糊与域外';}
  function regressionReport(evaluate=evaluateDecision) {
    const rows=decisionCases.map(c=>{const actual=evaluate(c);return {id:c.id,query:c.query,category:caseCategory(c),expected:c.expected,actual:actual.code,passed:actual.code===c.expected,reason:actual.reason};});
    return {scope:'public_synthetic_rule_regression',fixture_version:'decision-fixtures-v1',rule_version:'decision-rules-v1',report_version:'regression-report-v1',model_connected:false,business_approved:false,production_audit:false,total:rows.length,passed:rows.filter(r=>r.passed).length,all_passed:rows.every(r=>r.passed),rows};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {nodes,edges,state,publicSchema,decisionCases,evaluateDecision,caseCategory,regressionReport};
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  let result = null, condition = 'matched', selected = 'task';
  function element(tag,text,className) { const el = document.createElement(tag); if(text) el.textContent=text;if(className) el.className=className;return el; }
  function initDecisionLab() {
    const host=element('article',null,'gov-decision-lab gov-detail');host.id='gov-decision-lab';
    host.append(element('h4','企业 AI 决策与评测实验室'),element('p','借鉴 Jev / System One 的受限决策思路：语义判断与程序规则分离。以下为浏览器本地固定用例回放，未接入 Jev 或其他模型；不接受自由输入，不执行企业操作。','gov-note'));
    const categoryLabel=element('label','按验收范围筛选'),category=element('select');category.id='gov-decision-category';
    ['全部','正常场景','模糊与域外','数据与版本','安全边界'].forEach(v=>{const o=element('option',v);o.value=v;category.append(o);});categoryLabel.append(category);host.append(categoryLabel);
    const label=element('label','选择一个合成业务问题'),select=element('select');select.id='gov-decision-case';
    decisionCases.forEach(c=>{const o=element('option',c.query);o.value=c.id;select.append(o);});label.append(select);host.append(label);
    const output=element('div');output.id='gov-decision-output';output.setAttribute('aria-live','polite');host.append(output);
    function replay(){const c=decisionCases.find(v=>v.id===select.value),r=evaluateDecision(c);output.replaceChildren();output.append(element('strong',`${r.code} · ${r.reason}`));const list=element('ol');r.steps.forEach(s=>list.append(element('li',`${s.name}：${s.value}`)));output.append(list);}
    select.addEventListener('change',replay);replay();
    category.addEventListener('change',()=>{select.replaceChildren();decisionCases.filter(c=>category.value==='全部'||caseCategory(c)===category.value).forEach(c=>{const o=element('option',c.query);o.value=c.id;select.append(o);});replay();});
    const test=element('button','运行 8 条规则回归（非模型评测）');test.type='button';const status=element('p');status.id='gov-decision-tests';status.setAttribute('role','status');host.append(test,status);
    const details=element('details');details.append(element('summary','查看逐条预期与实际状态'));const table=element('table');table.innerHTML='<caption>合成规则回归 · 不衡量 Jev 准确率</caption><thead><tr><th>用例</th><th>预期</th><th>实际</th><th>结果</th></tr></thead>';const body=element('tbody');table.append(body);const scroll=element('div',null,'table-scroll');scroll.append(table);details.append(scroll);host.append(details);
    let report=null;
    const download=element('button','导出本次规则回归 JSON');download.type='button';download.disabled=true;download.id='gov-export-regression';host.append(download);
    test.addEventListener('click',()=>{body.replaceChildren();report=regressionReport();report.rows.forEach(r=>{const tr=element('tr'),cell=element('td');cell.append(element('strong',`${r.category} · ${r.query}`),element('small',r.reason));tr.append(cell);[r.expected,r.actual,r.passed?'通过':'失败'].forEach(v=>tr.append(element('td',v)));body.append(tr);});status.textContent=`${report.passed}/${report.total} 条固定规则回归通过。覆盖全部类别，不受上方筛选影响。仅验证演示逻辑，不代表真实模型评测、业务验收或生产就绪。`;download.disabled=false;details.open=true;});
    download.addEventListener('click',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}));const a=element('a');a.href=url;a.download='bruce-synthetic-regression-report.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=`已发起下载：${report.passed}/${report.total} 条规则通过；业务确认状态为未批准。`;});
    const chain=element('div',null,'gov-business-links');chain.append(element('p','沿业务目标查看有限证据（切换至关系探索）：'));
    [['goal','业务目标'],['task','分析任务'],['owner','复核角色'],['acceptance','验收契约'],['eval-cases','测试用例'],['eval-record','回归记录定义']].forEach(([id,title])=>{const b=element('button',title);b.type='button';b.addEventListener('click',()=>{document.querySelector('[data-gov-panel="gov-relations"]').click();$('gov-search').value='';$('gov-type').selectedIndex=0;$('gov-view').value='all';chooseNode(id);$('gov-detail').scrollIntoView({block:'nearest'});});chain.append(b);});host.append(chain);
    host.append(element('p','真实接入阶段需单独审核业务标注、验证路由效果与阈值，并通过服务端保管密钥。本演示不展示伪造置信度或时延。'));
    $('gov-review').append(host);
  }
  initDecisionLab();
  const overview=$('gov-overview');
  overview.lastElementChild.textContent=`关系探索展示${nodes.length}个独立公开实体，连接业务目标、任务、责任角色、验收契约与证据。决策与审阅新增8个合成用例回放；不是实时模型推理或生产验收。`;
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

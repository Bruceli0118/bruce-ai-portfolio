(() => {
  'use strict';
  const inflows = [85000,90000,70000,95000,80000,75000,90000,82000,88000,78000,95000,70000,85000,90000];
  const outflows = [180000,60000,70000,50000,65000,90000,130000,75000,55000,80000,90000,150000,65000,55000];
  const initialCents = 120000000;
  function parseCents(value, max) {
    const str = String(value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(str)) throw new Error('请输入非负金额，最多两位小数。');
    const [whole, fraction = ''] = str.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(cents) || cents > max * 100) throw new Error('金额超出允许范围。');
    return cents;
  }
  function calculate(extraValue, floorValue) {
    const extra = parseCents(extraValue, 1000000), floor = parseCents(floorValue, 1000000000);
    let balance = initialCents;
    const rows = inflows.map((amount, i) => {
      balance += (amount - outflows[i]) * 100;
      return {date: `2026-01-${String(i + 1).padStart(2, '0')}`, inflow_cents: amount * 100,
        outflow_cents: outflows[i] * 100, baseline_cents: balance,
        candidate_cents: balance - extra * (i + 1)};
    });
    const metrics = key => ({minimum_cents: Math.min(...rows.map(r => r[key])), ending_cents: rows.at(-1)[key],
      below_floor_days: rows.filter(r => r[key] < floor).length,
      first_breach_date: rows.find(r => r[key] < floor)?.date || null});
    const checks = {
      cumulative_expense: rows.every((r, i) => r.baseline_cents - r.candidate_cents === extra * (i + 1)),
      baseline_ledger: rows.every((r, i) => r.baseline_cents === (i ? rows[i - 1].baseline_cents : initialCents) + r.inflow_cents - r.outflow_cents),
      candidate_ledger: rows.every((r, i) => r.candidate_cents === (i ? rows[i - 1].candidate_cents : initialCents) + r.inflow_cents - r.outflow_cents - extra),
    };
    if (!Object.values(checks).every(Boolean)) throw new Error('算术一致性核验失败。');
    return {version:1,scope:'public_synthetic_web_demo',currency:'USD',unit:'integer_cents',
      initial_balance_cents:initialCents, daily_extra_expense_cents:extra, floor_cents:floor,
      total_extra_expense_cents:extra * rows.length, rows, baseline:metrics('baseline_cents'),
      candidate:metrics('candidate_cents'), checks, business_approval:false, model_connected:false};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {calculate, parseCents};
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents / 100);
  let result = null, tourStep = 0;
  function switchPanel(id) {
    document.querySelectorAll('.portal-panel').forEach(p => {p.hidden = p.id !== id;});
    document.querySelectorAll('[data-panel]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.panel === id)));
  }
  document.querySelectorAll('[data-panel]').forEach(b => b.addEventListener('click', () => switchPanel(b.dataset.panel)));
  function renderChart(value) {
    const series = value.rows.flatMap(r => [r.baseline_cents,r.candidate_cents]).concat(value.floor_cents);
    const min = Math.min(...series), max = Math.max(...series), range = max - min || 1;
    const x = i => 55 + i * 580 / 13, y = v => 185 - (v - min) * 140 / range;
    const points = key => value.rows.map((r,i) => `${x(i)},${y(r[key])}`).join(' ');
    $('balance-chart').innerHTML = `<title id="chart-title">基准青色曲线，方案金色曲线，虚线为资金底线</title><line x1="55" y1="185" x2="635" y2="185" stroke="#537084"/><line x1="55" y1="${y(value.floor_cents)}" x2="635" y2="${y(value.floor_cents)}" stroke="#b6cad9" stroke-dasharray="6 5"/><polyline points="${points('baseline_cents')}" fill="none" stroke="#6cddd0" stroke-width="3"/><polyline points="${points('candidate_cents')}" fill="none" stroke="#e6ba62" stroke-width="3"/><g fill="#c8d9e6" font-size="13"><text x="55" y="25">基准（青） / 方案（金） / 底线（虚线）</text><text x="55" y="210">01-01</text><text x="590" y="210">01-14</text><text x="55" y="234">范围 ${money(min)} — ${money(max)}</text></g>`;
  }
  function render() {
    const r = result;
    $('cash-result').innerHTML = `<div class="metrics"><article>最低余额<strong>${money(r.candidate.minimum_cents)}</strong><small>基准 ${money(r.baseline.minimum_cents)}</small></article><article>期末余额<strong>${money(r.candidate.ending_cents)}</strong><small>基准 ${money(r.baseline.ending_cents)}</small></article><article>低于底线天数<strong>${r.candidate.below_floor_days} 天</strong><small>基准 ${r.baseline.below_floor_days} 天 · 首次 ${r.candidate.first_breach_date || '未触发'}</small></article></div><p class="check-status">3 项算术核验通过 · 累计额外费用 ${money(r.total_extra_expense_cents)} · 待人工复核</p>`;
    $('cash-rows').innerHTML = r.rows.map(row => `<tr><td>${row.date}</td><td>${money(row.baseline_cents)}</td><td>${money(row.candidate_cents)}</td><td>${row.candidate_cents < r.floor_cents ? '是' : '否'}</td></tr>`).join('');
    renderChart(r);
    $('export-result').disabled = false;
    document.dispatchEvent(new CustomEvent('portal-result', {detail:r}));
  }
  $('cash-form').addEventListener('submit', ev => {
    ev.preventDefault(); $('cash-error').textContent = ''; $('export-status').textContent = '';
    try { result = calculate($('extra').value,$('floor').value); render(); $('cash-result').focus(); }
    catch (error) { result = null; document.dispatchEvent(new CustomEvent('portal-result', {detail:null})); $('cash-result').textContent = ''; $('cash-rows').replaceChildren(); $('balance-chart').replaceChildren(); $('export-result').disabled = true; $('cash-error').textContent = error.message; }
  });
  for (const id of ['extra','floor']) $(id).addEventListener('input', () => {
    result = null; $('export-result').disabled = true;
    document.dispatchEvent(new CustomEvent('portal-result', {detail:null}));
    $('cash-result').textContent = '参数已变化，请重新计算。';
    $('cash-rows').replaceChildren(); $('balance-chart').replaceChildren(); $('export-status').textContent = '';
  });
  function download(name, data) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('export-result').addEventListener('click', () => {
    if (!result) return;
    download('bruce-cashflow-demo.json',{...result,review_note:$('review-note').value,exported_at:new Date().toISOString()});
    $('export-status').textContent = '已发起本地下载；记录保留合成数据与未审批标识。';
  });
  $('plan-form').addEventListener('submit', ev => {
    ev.preventDefault(); const data = Object.fromEntries(new FormData(ev.target));
    download('bruce-business-analysis-card.json',{scope:'public_demo_analysis_card',...data,business_approval:false});
    $('plan-status').textContent = '已发起分析卡下载，可用于人工交接。';
  });
  const steps = [
    ['cash','查看数据来源和日期，输入每日额外费用与分析底线，点击“计算并核验”。'],
    ['cash','比较最低余额、期末余额和低于底线天数。填写复核说明，再导出本次分析。'],
    ['plan','填写业务分析卡的目标、输入、验收与人工责任，导出供人工交接。'],
    ['graph','点击治理节点，理解数据、工具、核验与复核的职责。这里的关系是示意，不是实时监控。'],
  ];
  function renderTour() { switchPanel(steps[tourStep][0]);$('tour-title').textContent = `带我体验 ${tourStep + 1} / 4`;$('tour-text').textContent = steps[tourStep][1];$('tour-prev').disabled = tourStep === 0;$('tour-next').textContent = tourStep === 3 ? '完成' : '下一步'; }
  $('tour-start').addEventListener('click', () => {tourStep = 0;renderTour();$('tour').showModal();});
  $('tour-prev').addEventListener('click', () => {tourStep = Math.max(0,tourStep - 1);renderTour();});
  $('tour-next').addEventListener('click', () => {if(tourStep === 3) $('tour').close();else{tourStep++;renderTour();}});
  $('tour-close').addEventListener('click', () => $('tour').close());
  $('tour').addEventListener('close', () => $('tour-start').focus({preventScroll:true}));
  result = calculate('5000','1000000');render();
})();

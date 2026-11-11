/* Daily and monthly views share the same records and save path. */
(() => {
  const daily = document.getElementById('attendanceDaily');
  if (!daily) return;
  const date = document.getElementById('attendanceDate');
  const filter = document.getElementById('attendanceStatus');
  const cards = document.getElementById('attendanceDailyCards');
  const status = document.getElementById('attendanceSaveStatus');
  const search = document.getElementById('attendanceSearch');
  const rows = [...document.querySelectorAll('#attendance-table-tbody tr[data-person-id]')];
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if ([...date.options].some(option => option.value === todayString)) date.value = todayString;
  let saving = false;

  function render() {
    cards.replaceChildren();
    const counts = {work: 0, leave: 0, empty: 0};
    let shown = 0;
    rows.forEach(row => {
      const cell = row.querySelector(`[data-date="${date.value}"]`);
      const raw = cell.dataset.shift;
      const shift = ['白班', '夜班'].includes(raw) ? '上班' : raw;
      counts[shift === '上班' ? 'work' : shift === '请假' ? 'leave' : 'empty']++;
      const name = row.querySelector('.p-name').textContent;
      const job = row.querySelector('.p-job').textContent;
      if (!(name + job).toLowerCase().includes(search.value.trim().toLowerCase())) return;
      if (filter.value !== 'all' && shift !== filter.value) return;
      shown++;
      const card = document.createElement('article');
      card.className = 'daily-person';
      const heading = document.createElement('h3');
      heading.textContent = name;
      const detail = document.createElement('p');
      detail.textContent = `${job} · 本月上班 ${row.querySelector('.day-count').textContent} 天 / 请假 ${row.querySelector('.leave-count').textContent} 天`;
      const actions = document.createElement('div');
      actions.className = 'daily-person-actions';
      [['上班', '上班'], ['请假', '请假'], ['', '未登记 / 休息']].forEach(([value, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-secondary';
        button.textContent = label;
        button.setAttribute('aria-label', `${name}：${label}`);
        button.setAttribute('aria-pressed', String(shift === value));
        button.disabled = saving;
        button.addEventListener('click', async () => {
          if (saving || cell.classList.contains('cell-loading')) return;
          saving = true;
          date.disabled = filter.disabled = true;
          status.textContent = `正在保存 ${name} 的考勤…`;
          const targetDate = date.value;
          render();
          try {
            await toggleAttendanceCell(cell, Number(row.dataset.personId), targetDate, value);
            status.textContent = cell.dataset.shift === value
              ? `已保存：${name} · ${targetDate} · ${label}`
              : `未保存：${name}，请重试。`;
          } finally {
            saving = false;
            date.disabled = filter.disabled = false;
            render();
          }
        });
        actions.append(button);
      });
      card.append(heading, detail, actions);
      cards.append(card);
    });
    document.getElementById('dailySummary').textContent = `上班 ${counts.work} 人 · 请假 ${counts.leave} 人 · 未登记 / 休息 ${counts.empty} 人 · 当前显示 ${shown} 人`;
    if (!shown) {
      const empty = document.createElement('p');
      empty.className = 'daily-empty';
      empty.textContent = rows.length ? '没有符合筛选条件的人员，请调整姓名或状态筛选。' : '暂无考勤人员，请先通过「考勤人员配置」添加。';
      cards.append(empty);
    }
    document.getElementById('attendancePrev').disabled = saving || date.selectedIndex === 0;
    document.getElementById('attendanceNext').disabled = saving || date.selectedIndex === date.options.length - 1;
  }
  function setMode(mode) {
    if (saving) return;
    const isDaily = mode === 'daily';
    daily.hidden = !isDaily;
    document.getElementById('attendanceMatrix').hidden = isDaily;
    document.getElementById('attendancePagination').classList.toggle('attendance-pagination-hidden', isDaily);
    document.getElementById('dailyMode').setAttribute('aria-pressed', String(isDaily));
    document.getElementById('matrixMode').setAttribute('aria-pressed', String(!isDaily));
    if (isDaily) render();
  }
  document.getElementById('dailyMode').onclick = () => setMode('daily');
  document.getElementById('matrixMode').onclick = () => setMode('matrix');
  date.onchange = filter.onchange = render;
  search.addEventListener('input', render);
  for (const [id, delta] of [['attendancePrev', -1], ['attendanceNext', 1]]) {
    document.getElementById(id).onclick = () => { if (!saving) { date.selectedIndex += delta; render(); } };
  }
  window.addEventListener('beforeunload', event => {
    if (document.querySelector('.cell-loading')) { event.preventDefault(); event.returnValue = ''; }
  });
  setMode(window.matchMedia('(max-width: 760px)').matches ? 'daily' : 'matrix');
})();

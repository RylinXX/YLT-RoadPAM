/* Adapt the existing records, forms and pagination; no second set of editable data. */
(() => {
  const tables = [...document.querySelectorAll('[data-mobile-records]')];
  if (!tables.length) return;
  document.body.classList.add('mobile-ledger-page');
  const mobile = window.matchMedia('(max-width: 760px)');
  const disclosures = [];

  tables.forEach(table => {
    const headings = [...table.tHead.rows[0].cells].map(cell => cell.textContent.trim());
    const kind = table.dataset.mobileRecords;
    table.closest('.table-container').classList.add('mobile-records-wrap');
    // Explicit table roles retain the associations when the mobile display becomes a grid.
    table.setAttribute('role', 'table');
    table.tHead.setAttribute('role', 'rowgroup');
    table.tHead.rows[0].setAttribute('role', 'row');
    [...table.tHead.rows[0].cells].forEach(cell => cell.setAttribute('role', 'columnheader'));
    [...table.tBodies].forEach(body => {
      body.setAttribute('role', 'rowgroup');
      [...body.rows].forEach(row => {
        row.setAttribute('role', 'row');
        [...row.cells].forEach((cell, index) => {
          cell.setAttribute('role', 'cell');
          cell.dataset.label = headings[index];
          if (row.cells.length === 1) return;
          if (index === row.cells.length - 1) cell.classList.add('mobile-record-actions');
          if (headings[index] === '金额') cell.classList.add('mobile-record-amount');
          if (headings[index] === '经办 / 状态') cell.classList.add('mobile-record-handler');
          if (index === (kind === 'project' ? 2 : kind === 'global' ? 1 : 0)) cell.classList.add('mobile-record-title');
        });
      });
    });
    table.classList.add('mobile-records-ready');
  });

  function disclose(element, label, className) {
    if (!element) return;
    const wrapper = document.createElement('details');
    wrapper.className = `ledger-disclosure ${className}`;
    const summary = document.createElement('summary');
    summary.textContent = label;
    element.before(wrapper);
    wrapper.append(summary, element);
    disclosures.push(wrapper);
  }
  disclose(document.querySelector('.ledger-kpi-grid'), '收支汇总与待办', 'ledger-summary-disclosure');
  const filter = document.querySelector('.ledger-filter-band');
  if (filter) {
    const active = [...filter.elements].filter(el => el.name && el.name !== 'per_page' && el.value).length;
    disclose(filter, active ? `筛选条件 · 已设置 ${active} 项` : '筛选条件 · 全部记录', 'ledger-filter-disclosure');
    filter.addEventListener('submit', () => {
      // Return to the results after applying a filter, retaining the server's query semantics.
      const table = document.querySelector('[data-mobile-records]');
      table.id ||= 'ledgerResults';
      filter.action = `${window.location.pathname}#${table.id}`;
    });
  }
  tables.forEach(table => { table.id ||= 'ledgerResults'; });
  document.querySelectorAll('.pagination-container a[rel]').forEach(link => {
    const url = new URL(link.href);
    url.hash = 'ledgerResults';
    link.href = url.href;
  });
  function adapt() { disclosures.forEach(details => { details.open = !mobile.matches; }); }
  adapt();
  mobile.addEventListener('change', adapt);

  // Number inputs should bring up the decimal keyboard, including on iOS.
  document.querySelectorAll('input[name="amount"]').forEach(input => input.inputMode = 'decimal');
  const date = document.getElementById('addDate');
  if (date && !date.value) {
    const now = new Date();
    date.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  // Open/close callbacks remain owned by the page; add keyboard dismissal and focus recovery.
  let opener = null;
  document.addEventListener('click', event => {
    const button = event.target.closest('button, a');
    if (button && !button.closest('.modal')) opener = button;
  }, true);
  const modalObserver = new MutationObserver(records => {
    records.forEach(record => {
      const modal = record.target;
      if (modal.classList.contains('open')) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        const title = modal.querySelector('.modal-title');
        if (title) { title.id ||= `${modal.id}Title`; modal.setAttribute('aria-labelledby', title.id); }
        modal.querySelector('.modal-close')?.focus({preventScroll: true});
      } else if (opener?.isConnected) opener.focus({preventScroll: true});
    });
  });
  document.querySelectorAll('.modal').forEach(modal => modalObserver.observe(modal, {attributes: true, attributeFilter: ['class']}));
  document.addEventListener('keydown', event => {
    const modal = document.querySelector('.modal.open');
    if (!modal) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(modal.id); }
    if (event.key === 'Tab') {
      const controls = [...modal.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
})();

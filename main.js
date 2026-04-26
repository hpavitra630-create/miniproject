const STORAGE_KEY = 'churn_records';

function normalizeRecord(r) {
  const start = Number(r.start ?? 0);
  const acquired = Number(r.acquired ?? 0);
  const lost = Number(r.lost ?? 0);
  let churnPercent = r.churnPercent;
  if (churnPercent === undefined || churnPercent === null || isNaN(Number(churnPercent))) {
    churnPercent = computeChurnPercent(start, lost);
  }
  churnPercent = Number(churnPercent) || 0;
  const note = (r.note ?? '').toString();
  const ps = r.ps ?? '';
  const pe = r.pe ?? '';
  return { start, acquired, lost, churnPercent, note, ps, pe };
}

function getRecords() {
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    raw = [];
  }
  if (!Array.isArray(raw)) raw = [];
  return raw.map(normalizeRecord);
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function computeChurnPercent(start, lost) {
  if (start <= 0) return 0;
  return (lost / start) * 100;
}

// ----- Dashboard logic -----
function handleCalculateSave() {
  const startEl = document.getElementById('start');
  const acqEl = document.getElementById('acquired');
  const lostEl = document.getElementById('lost');
  const psEl = document.getElementById('ps');
  const peEl = document.getElementById('pe');
  const noteEl = document.getElementById('note');
  const msgEl = document.getElementById('churnMsg');

  const start = parseInt(startEl.value, 10) || 0;
  const acquired = parseInt(acqEl.value, 10) || 0;
  const lost = parseInt(lostEl.value, 10) || 0;
  const ps = psEl.value;
  const pe = peEl.value;
  const note = noteEl.value.trim();

  if (start === 0 || acquired === 0 || lost === 0) {
    if (msgEl) {
      msgEl.classList.remove('success');
      msgEl.classList.add('error');
      msgEl.textContent = 'Invalid or no churn recorded';
    }
    alert('Invalid or no churn recorded. Values cannot be zero.');
    return;
  }

  if (ps && pe) {
    const startDate = new Date(ps);
    const endDate = new Date(pe);
    if (endDate < startDate) {
      if (msgEl) {
        msgEl.classList.remove('success');
        msgEl.classList.add('error');
        msgEl.textContent = 'Period End cannot be before Period Start.';
      }
      alert('Period End cannot be before Period Start.');
      return;
    }
  }

  const churnPercent = computeChurnPercent(start, lost);

  if (msgEl) {
    msgEl.classList.remove('error');
    msgEl.classList.add('success');
    msgEl.textContent = 'Churn Rate: ' + churnPercent.toFixed(2) + '%';
  }

  const newRecord = { start, acquired, lost, churnPercent, note, ps, pe };
  const records = getRecords();
  records.push(newRecord);
  saveRecords(records);

  alert('Churn record saved successfully!');
  window.location.href = 'chart.html';
}

function handleClear() {
  const ids = ['start','acquired','lost','ps','pe','note'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'TEXTAREA') el.value = '';
    else el.value = '0';
  });
  const msgEl = document.getElementById('churnMsg');
  if (msgEl) msgEl.textContent = '';
}

// ----- Records table + filter + CSV -----
function renderRecordsTable() {
  const body = document.getElementById('recordsBody2');
  if (!body) return;

  const filterSelect = document.getElementById('filterSelect');
  const allRecords = getRecords();

  body.innerHTML = '';

  if (!allRecords.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.textContent = 'No records yet. Go to Dashboard and save one.';
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  let records = [...allRecords];

  if (filterSelect) {
    const mode = filterSelect.value;
    if (mode === 'last5') {
      records = records.slice(-5);
    } else if (mode === 'high') {
      records.sort((a,b) => b.churnPercent - a.churnPercent);
    }
  }

  records.forEach((rec, index) => {
    const tr = document.createElement('tr');

    let churnClass = 'churn-low';
    if (rec.churnPercent > 30) churnClass = 'churn-high';
    else if (rec.churnPercent > 15) churnClass = 'churn-medium';

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${rec.start}</td>
      <td>${rec.acquired}</td>
      <td>${rec.lost}</td>
      <td class="${churnClass}">${rec.churnPercent.toFixed(2)}</td>
      <td>${(rec.note || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
      <td>${rec.ps || ''}</td>
      <td>${rec.pe || ''}</td>
    `;
    body.appendChild(tr);
  });
}

function exportCsv() {
  const records = getRecords();
  if (!records.length) {
    alert('No records to export.');
    return;
  }
  const header = ['S.No','Start','Acquired','Lost','Churn %','Notes','Start Date','End Date'];
  const rows = records.map((r, idx) => [
    idx + 1,
    r.start,
    r.acquired,
    r.lost,
    r.churnPercent.toFixed(2),
    '"' + (r.note || '').replace(/"/g,'""') + '"',
    r.ps || '',
    r.pe || ''
  ]);

  const csvLines = [header.join(','), ...rows.map(r => r.join(','))];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'churn_records.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function resetAllRecords() {
  const confirmReset = confirm('This will clear all stored churn records. Continue?');
  if (!confirmReset) return;
  localStorage.removeItem(STORAGE_KEY);
  renderRecordsTable();
  alert('All churn records have been cleared.');
}

// ----- Pie chart -----
function drawPieChart() {
  const canvas = document.getElementById('pieChart');
  const legendEl = document.getElementById('legendText');
  const noDataMsg = document.getElementById('noDataMsg');
  if (!canvas || typeof Chart === 'undefined') return;
  const records = getRecords();
  if (!records.length) {
    if (noDataMsg) noDataMsg.textContent = 'No data yet. Go to Dashboard and save one.';
    if (legendEl) legendEl.textContent = '';
    return;
  }
  const rec = records[records.length - 1];
  const lost = rec.lost || 0;
  const acquired = rec.acquired || 0;
  let remaining = rec.start + acquired - lost;
  if (remaining < 0) remaining = 0;

  const ctx = canvas.getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Lost', 'Acquired', 'Remaining'],
      datasets: [{
        data: [lost, acquired, remaining],
        backgroundColor: ['#ff5252', '#42a5f5', '#2ecc71']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } }
    }
  });

  if (noDataMsg) noDataMsg.textContent = '';
  if (legendEl) {
    legendEl.textContent =
      'Lost (Red): ' + lost +
      '\nAcquired (Blue): ' + acquired +
      '\nRemaining (Green): ' + remaining +
      '\nChurn Rate: ' + rec.churnPercent.toFixed(2) + '%';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const calcBtn = document.getElementById('calcBtn');
  const clearBtn = document.getElementById('clearBtn');
  if (calcBtn) calcBtn.addEventListener('click', handleCalculateSave);
  if (clearBtn) clearBtn.addEventListener('click', handleClear);

  if (document.getElementById('recordsBody2')) {
    const filterSelect = document.getElementById('filterSelect');
    if (filterSelect) {
      filterSelect.addEventListener('change', renderRecordsTable);
    }
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportCsv);
    }
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetAllRecords);
    }
    renderRecordsTable();
  }
  if (document.getElementById('pieChart')) {
    drawPieChart();
  }
});
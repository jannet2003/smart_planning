import { state, CATS, renderAll } from '../state.js';
import { dateAdd, fmtShort, dayName, inRange, formatDateDMY } from '../utils/helpers.js';
import { getHoliday } from './calendar.js';
import { isOnLeave } from './leaves.js';

export const EXT_DUTY_CATS = ['SENIOR', 'RESIDENT', 'TECH'];
export const EXT_DUTY_CAT_LABELS = { SENIOR: 'Seniors', RESIDENT: 'Résidents', TECH: 'Techniciens' };
export const EXT_DUTY_BASE_TAGS = [
  { id: 'GARDE', label: 'Garde', color: '#b7293f' },
  { id: 'REPOS_POST_GARDE', label: 'Repos post-garde', color: '#57677a' },
  { id: 'POSTE_GARDE', label: 'Poste Garde', color: '#c9852e' },
  { id: 'ENGAGEMENT_FAC', label: 'Engagement Facultaire', color: '#6a3aa8' }
];

let draggedDataExt = null;
let addTagCatKey = null;

export function initExtDuty() {
  window.handleDragStartExt = handleDragStartExt;
  window.getExtDutyTagInfo = getExtDutyTagInfo;
  window.openAddTagModal = openAddTagModal;
  window.closeAddTagModal = closeAddTagModal;
  window.saveCustomExtDutyTag = saveCustomExtDutyTag;
  window.deleteCustomExtDutyTag = deleteCustomExtDutyTag;
  window.setExtDutyDayCellV2 = setExtDutyDayCellV2;
  window.clearExtDutyDayCell = clearExtDutyDayCell;
  window.renderExtDutyPalette = renderExtDutyPalette;
  window.triggerExtDutyImport = triggerExtDutyImport;
  window.handleExtDutyFileSelected = handleExtDutyFileSelected;
  window.setExtDutyCellV2 = setExtDutyCellV2;
  window.updateShiftValV2 = updateShiftValV2;
  window.renderExtDutyTab = renderExtDutyTab;
  window.changeExtDutyWeek = changeExtDutyWeek;

  initExtDutyDates();
}

function initExtDutyDates() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff)).toISOString().slice(0, 10);
  const sunday = dateAdd(monday, 6);
  setTimeout(() => {
    if (document.getElementById('startDateExt')) document.getElementById('startDateExt').value = monday;
    if (document.getElementById('endDateExt')) document.getElementById('endDateExt').value = sunday;
  }, 100);
  state.externalDuty.weekStart = monday;
}

export function handleDragStartExt(e, type, label) {
  draggedDataExt = { type, label };
  e.dataTransfer.setData('text/plain', type);
}

export function getExtDutyTagInfo(catKey, tagId) {
  const base = EXT_DUTY_BASE_TAGS.find(t => t.id === tagId);
  if (base) return base;
  const custom = (state.externalDuty[catKey]?.customTags || []).find(t => t.id === tagId);
  if (custom) return custom;
  return { id: tagId, label: tagId, color: '#a0aec0' };
}

export function openAddTagModal() {
  const catSelect = document.getElementById('categorySelectExt');
  addTagCatKey = catSelect ? catSelect.value : 'SENIOR';
  const nameInput = document.getElementById('tag-name');
  const colorInput = document.getElementById('tag-color');
  if (nameInput) nameInput.value = '';
  if (colorInput) colorInput.value = '#4a5568';
  document.getElementById('add-tag-modal')?.classList.add('active');
}

export function closeAddTagModal() {
  document.getElementById('add-tag-modal')?.classList.remove('active');
}

function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateStr) {
  return formatDateDMY(dateStr);
}

function fmtLong(dateStr) {
  return formatDateDMY(dateStr);
}

function formatDateRange(start, end) {
  return `${formatDateDMY(start)} — ${formatDateDMY(end)}`;
}

function formatIsoDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextSunday(dateStr) {
  const date = parseDate(dateStr);
  const day = date.getDay();
  const offset = day === 0 ? 0 : 7 - day;
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  return formatIsoDate(result);
}

function getExtDutyWeeks(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (start > end) return [];

  const weeks = [];
  let weekStart = new Date(start);
  let isFirstWeek = true;

  while (weekStart <= end) {
    let weekEnd = new Date(weekStart);
    if (isFirstWeek) {
      const offset = weekStart.getDay() === 0 ? 0 : 7 - weekStart.getDay();
      weekEnd.setDate(weekEnd.getDate() + offset);
    } else {
      weekEnd.setDate(weekEnd.getDate() + 6);
    }
    if (weekEnd > end) {
      weekEnd = new Date(end);
    }

    const dates = [];
    const d = new Date(weekStart);
    while (d <= weekEnd) {
      dates.push(formatIsoDate(d));
      d.setDate(d.getDate() + 1);
    }

    weeks.push({ start: dates[0], end: dates[dates.length - 1], dates });
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
    isFirstWeek = false;
  }

  return weeks;
}

function resetExtDutyPeriodIfNeeded(startVal, endVal) {
  if (state.externalDuty.periodStart !== startVal || state.externalDuty.periodEnd !== endVal || !Array.isArray(state.externalDuty.weeks) || state.externalDuty.weeks.length === 0) {
    state.externalDuty.periodStart = startVal;
    state.externalDuty.periodEnd = endVal;
    state.externalDuty.weeks = getExtDutyWeeks(startVal, endVal);
    state.externalDuty.currentWeekIndex = 0;
  }
}

export function changeExtDutyWeek(direction) {
  const weeks = state.externalDuty.weeks || [];
  if (!weeks.length) return;
  const nextIndex = (state.externalDuty.currentWeekIndex || 0) + direction;
  if (nextIndex < 0 || nextIndex >= weeks.length) return;
  state.externalDuty.currentWeekIndex = nextIndex;
  renderExtDutyTab();
}

export function saveCustomExtDutyTag() {
  const nameInput = document.getElementById('tag-name');
  const colorInput = document.getElementById('tag-color');
  const label = nameInput.value.trim();
  if (!label) { window.toast("⚠ Veuillez saisir un intitulé pour la case."); return; }
  const color = colorInput.value || '#4a5568';
  const catKey = addTagCatKey || 'SENIOR';
  state.externalDuty[catKey].customTags ||= [];
  const id = 'CUSTOM_' + Date.now();
  state.externalDuty[catKey].customTags.push({ id, label, color });
  closeAddTagModal();
  renderExtDutyTab();
  window.toast(`✅ Nouvelle case ajoutée : ${label}`);
}

export function deleteCustomExtDutyTag(catKey, tagId) {
  const tags = state.externalDuty[catKey]?.customTags;
  if (!tags) return;
  state.externalDuty[catKey].customTags = tags.filter(t => t.id !== tagId);
  const dayRecords = state.externalDuty[catKey]?.dayRecords;
  if (dayRecords) {
    Object.keys(dayRecords).forEach(k => { if (dayRecords[k] === tagId) delete dayRecords[k]; });
  }
  renderExtDutyTab();
  window.toast('🗑 Case supprimée.');
}

export function setExtDutyDayCellV2(catKey, mat, date, tagId) {
  if (!tagId) return;
  state.externalDuty[catKey].dayRecords ||= {};
  const key = `${mat}_${date}`;
  state.externalDuty[catKey].dayRecords[key] = tagId;
  renderExtDutyTab();
}

export function clearExtDutyDayCell(catKey, mat, date) {
  const key = `${mat}_${date}`;
  if (state.externalDuty[catKey].dayRecords) delete state.externalDuty[catKey].dayRecords[key];
  renderExtDutyTab();
}

export function renderExtDutyPalette(catKey) {
  const label = document.getElementById('palette-cat-label');
  if (label) label.textContent = `(${EXT_DUTY_CAT_LABELS[catKey] || catKey})`;
  const container = document.getElementById('customTagsContainer');
  if (!container) return;
  const tags = state.externalDuty[catKey]?.customTags || [];
  container.innerHTML = tags.map(t => `
    <div class="drag-item" draggable="true" ondragstart="handleDragStartExt(event, '${t.id}', '${t.label}')"
      style="background:${t.color}; padding:6px 12px; border-radius:4px; color:white; font-size:12px; font-weight:bold; cursor:grab; display:flex; align-items:center; gap:8px;">
      <span>${t.label}</span>
      <span onclick="event.stopPropagation(); deleteCustomExtDutyTag('${catKey}','${t.id}')" style="cursor:pointer; opacity:0.85;" title="Supprimer cette case">✕</span>
    </div>
  `).join('');
}

export function triggerExtDutyImport(catKey) {
  const input = document.getElementById('extduty-import-input');
  if (input) {
    input.dataset.catKey = catKey;
    input.click();
  }
}

export function handleExtDutyFileSelected(event) {
  const file = event.target.files[0];
  const catKey = event.target.dataset.catKey;
  if (!file || !catKey) return;
  window.toast(`⏳ Traitement de ${file.name}...`);
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      let count = 0;
      const startVal = document.getElementById('startDateExt').value;
      const endVal = document.getElementById('endDateExt').value;
      resetExtDutyPeriodIfNeeded(startVal, endVal);
      const periodDates = state.externalDuty.weeks.flatMap(w => w.dates);
      const activeStaff = state.staff.filter(s => catKey === 'RESIDENT' ? s.cat.startsWith('RESIDENT') : s.cat === catKey);
      json.forEach((row, rowIdx) => {
        if (rowIdx === 0 || !row[0]) return;
        const nameOrId = String(row[0]).trim().toLowerCase();
        const agent = activeStaff.find(s => s.name.toLowerCase().includes(nameOrId) || s.matricule.toLowerCase() === nameOrId);
        if (agent) {
          for (let d = 0; d < periodDates.length; d++) {
            const cellVal = row[d + 1];
            if (cellVal) {
              const date = periodDates[d];
              const tagStr = String(cellVal).trim().toUpperCase();
              let tagId = 'GARDE';
              if (tagStr.includes('POSTE')) tagId = 'POSTE_GARDE';
              else if (tagStr.includes('FAC') || tagStr.includes('ENGAGEMENT')) tagId = 'ENGAGEMENT_FAC';
              setExtDutyCellV2(catKey, agent.matricule, date, tagId, true);
              count++;
            }
          }
        }
      });
      window.toast(`✅ Import réussi : ${count} affectation(s).`);
      renderExtDutyTab();
    } catch (err) {
      console.error(err);
      window.toast(`❌ Erreur lors de l'import.`);
    }
  };
  reader.readAsArrayBuffer(file);
}

export function setExtDutyCellV2(catKey, mat, date, tagId, silent = false) {
  const agent = state.staff.find(s => s.matricule === mat);
  if (!agent) return;
  const getsPostGuardRest = ['RESIDENT_MAJEUR', 'TECH'].includes(agent.cat);
  if (tagId === 'GARDE' && agent.cat === 'RESIDENT_1ERE') {
    if (!silent) window.toast("⚠ Il est interdit d'attribuer une garde aux résidents de 1ère année.");
    return;
  }
  const key = `${mat}_${date}`;
  const nextDate = dateAdd(date, 1);
  const nextKey = `${mat}_${nextDate}`;
  if (!state.schedule) {
    state.schedule = { gridAssignments: {}, nightAssignments: {}, datesList: [] };
  }
  state.schedule.gridAssignments ||= {};
  state.schedule.nightAssignments ||= {};
  state.externalDuty[catKey].autoRestDays ||= {};

  if (!tagId) {
    const oldTag = state.externalDuty[catKey].records[key];
    delete state.externalDuty[catKey].records[key];
    if (state.schedule.nightAssignments) delete state.schedule.nightAssignments[key];

    if (getsPostGuardRest && oldTag === 'GARDE') {
      if (state.externalDuty[catKey].records[nextKey] === 'REPOS_POST_GARDE') {
        delete state.externalDuty[catKey].records[nextKey];
      }
      if (state.externalDuty[catKey].autoRestDays[key] && state.schedule.gridAssignments[key] === 'REPOS') {
        delete state.schedule.gridAssignments[key];
        delete state.externalDuty[catKey].autoRestDays[key];
      }
      if (state.externalDuty[catKey].autoRestDays[nextKey] && state.schedule.gridAssignments[nextKey] === 'REPOS') {
        delete state.schedule.gridAssignments[nextKey];
        delete state.externalDuty[catKey].autoRestDays[nextKey];
      }
    }
  } else {
    state.externalDuty[catKey].records[key] = tagId;
    if (tagId === 'GARDE' && getsPostGuardRest) {
      state.externalDuty[catKey].records[nextKey] = 'REPOS_POST_GARDE';
      if (!state.schedule.gridAssignments[key]) {
        state.schedule.gridAssignments[key] = 'REPOS';
        state.externalDuty[catKey].autoRestDays[key] = 'REPOS_POST_GARDE';
      }
      if (!state.schedule.gridAssignments[nextKey]) {
        state.schedule.gridAssignments[nextKey] = 'REPOS';
        state.externalDuty[catKey].autoRestDays[nextKey] = 'REPOS_POST_GARDE';
      }
      state.schedule.nightAssignments[key] = 'GARDE';
      if (!silent) window.toast('✅ Garde affectée : Repos auto J (jour) et J+1 (jour & nuit).');
    }
  }
  if (!silent) renderExtDutyTab();
}

export function updateShiftValV2(catKey, mat, date, val) {
  const key = `${mat}_${date}`;
  state.schedule ||= { gridAssignments: {} };
  state.schedule.gridAssignments[key] = val;
}

export function renderExtDutyTab() {
  const startInput = document.getElementById('startDateExt');
  const endInput = document.getElementById('endDateExt');
  const catSelect = document.getElementById('categorySelectExt');
  const messageEl = document.getElementById('extDutyMessage');
  const navBar = document.getElementById('extDutyNavBar');
  if (!startInput || !endInput || !catSelect || !messageEl || !navBar) return;
  const startVal = startInput.value;
  const endVal = endInput.value;
  const catKey = catSelect.value;
  if (!startVal || !endVal) return;
  const start = parseDate(startVal);
  const end = parseDate(endVal);
  if (start > end) {
    messageEl.textContent = '⚠ La date de début doit être antérieure ou égale à la date de fin.';
    navBar.innerHTML = '';
    return;
  }
  resetExtDutyPeriodIfNeeded(startVal, endVal);
  const weeks = state.externalDuty.weeks || [];
  const currentWeekIndex = state.externalDuty.currentWeekIndex || 0;
  const currentWeek = weeks[currentWeekIndex] || { dates: [] };
  const diffDays = Math.round((end - start) / 86400000) + 1;
  const gridTitle = document.getElementById('gridTitleExt');
  if (gridTitle) gridTitle.innerHTML = `Grille de Saisie - ${EXT_DUTY_CAT_LABELS[catKey] || catKey} (${diffDays} jours)`;
  messageEl.textContent = `Période : ${formatDateRange(startVal, endVal)}`;
  if (weeks.length > 1) {
    navBar.innerHTML = `
      <button class="btn secondary" style="min-width:120px;" ${currentWeekIndex === 0 ? 'disabled' : ''} onclick="changeExtDutyWeek(-1)">← Semaine précédente</button>
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; font-size:0.95rem; color:var(--text-dim);">
        <span>${formatDateRange(currentWeek.start, currentWeek.end)}</span>
        <strong>Semaine ${currentWeekIndex + 1} / ${weeks.length}</strong>
      </div>
      <button class="btn secondary" style="min-width:120px;" ${currentWeekIndex === weeks.length - 1 ? 'disabled' : ''} onclick="changeExtDutyWeek(1)">Semaine suivante →</button>
    `;
  } else {
    navBar.innerHTML = `<div style="font-size:0.95rem; color:var(--text-dim);">${formatDateRange(currentWeek.start, currentWeek.end)}</div>`;
  }
  renderExtDutyPalette(catKey);
  const headerTr = document.getElementById('tableHeaderExt');
  if (!headerTr) return;
  let hHtml = '<tr><th style="background:var(--accent-blue); color:white; padding:10px; position:sticky; left:0; z-index:10;">Personnel</th>';
  currentWeek.dates.forEach(date => {
    hHtml += `<th style="background:var(--accent-blue); color:white; padding:10px; text-align:center;">${dayName(date).slice(0, 3)}<br>${fmtShort(date)}</th>`;
  });
  hHtml += '</tr>';
  headerTr.innerHTML = hHtml;
  const bodyTb = document.getElementById('tableBodyExt');
  if (!bodyTb) return;
  bodyTb.innerHTML = '';
  const activeStaff = state.staff.filter(s => s.status === 'actif' && (catKey === 'RESIDENT' ? s.cat.startsWith('RESIDENT') : s.cat === catKey));
  activeStaff.forEach(s => {
    let rowHtml = `<tr><td style="padding:10px; border:1px solid var(--border-soft); font-weight:600; background:#f9fbfc; position:sticky; left:0; z-index:5;">${s.name}<br><span class="badge ${s.cat}">${CATS[s.cat]?.short || s.cat}</span></td>`;
    currentWeek.dates.forEach(date => {
      const key = `${s.matricule}_${date}`;
      const nightTag = state.externalDuty[catKey]?.records[key];
      const dayTask = state.schedule?.gridAssignments?.[key] || '';
      const autoRest = !!state.externalDuty[catKey]?.autoRestDays?.[key];
      const isGarde = nightTag === 'GARDE';
      const isRest = nightTag === 'REPOS_POST_GARDE';
      let dayDisplay = '';
      if (isRest || dayTask === 'REPOS') {
        const restLabel = autoRest ? '💤 REPOS (garde)' : '💤 REPOS';
        const restTitle = autoRest ? 'Repos généré automatiquement par une garde de nuit' : 'Repos';
        dayDisplay = `<span class="badge" style="background:var(--color-repos); color:white; font-size:10px;" title="${restTitle}">${restLabel}</span>`;
      } else {
        const dayDropVal = state.externalDuty[catKey]?.dayRecords?.[key];
        let content = `<span style="font-size:10px; color:var(--text-faint);">Glisser ici</span>`;
        if (dayDropVal) {
          const tagObj = getExtDutyTagInfo(catKey, dayDropVal);
          content = `<span class="badge" style="background:${tagObj.color}; color:white; font-size:10px; cursor:pointer;" title="Cliquer pour retirer" onclick="event.stopPropagation(); clearExtDutyDayCell('${catKey}', '${s.matricule}', '${date}')">${tagObj.label} ✕</span>`;
        }
        dayDisplay = `<div class="drop-cell" style="min-height:30px; border:1px dashed #cbd5e0; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer;" ondragover="event.preventDefault(); this.style.background='#e2e8f0';" ondragleave="this.style.background='';" ondrop="event.preventDefault(); this.style.background=''; setExtDutyDayCellV2('${catKey}', '${s.matricule}', '${date}', event.dataTransfer.getData('text/plain'))">${content}</div>`;
      }
      rowHtml += `<td style="padding:8px; border:1px solid var(--border-soft); text-align:center;">
        <div style="margin-bottom:6px; padding-bottom:4px; border-bottom:1px dashed #eee;">
          <div style="font-size:9px; color:var(--text-faint); margin-bottom:2px;">JOURNÉE</div>
          ${dayDisplay}
        </div>
        <div>
          <div style="font-size:9px; color:var(--text-faint); margin-bottom:2px;">NUIT</div>
          <button class="night-duty-toggle ${isGarde ? 'active' : ''}" style="width:100%; border:1px solid #cbd5e0; border-radius:4px; padding:4px; font-size:10px; font-weight:bold; cursor:pointer; background:${isGarde ? 'var(--color-garde)' : (isRest ? 'var(--color-repos-nuit)' : '#fff')}; color:${isGarde || isRest ? 'white' : '#667'};" onclick="setExtDutyCellV2('${catKey}', '${s.matricule}', '${date}', '${isGarde ? '' : 'GARDE'}')">${isGarde ? '🌙 GARDE' : (isRest ? '💤 REPOS' : '— Nuit')}</button>
        </div>
      </td>`;
    });
    rowHtml += '</tr>';
    bodyTb.innerHTML += rowHtml;
  });
}

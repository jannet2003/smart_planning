import { state, CATS, TASK_CLASSES, TASK_LABELS, renderAll } from '../state.js';
import { dateAdd, fmtShort, dayName, rangeLen, inRange } from '../utils/helpers.js';
import { getHoliday } from './calendar.js';
import { isOnLeave, totalLeaveDays, totalFlexLeaveDays } from './leaves.js';
import * as api from '../api/api.js';

export function initPlanning() {
  window.syncLeavesAndHolidaysIntoSchedule = syncLeavesAndHolidaysIntoSchedule;
  window.updateWeekLabelAutomatically = updateWeekLabelAutomatically;
  window.saveCurrentWeek = saveCurrentWeek;
  window.updateArchivesDropdown = updateArchivesDropdown;
  window.loadSelectedWeekFromDropdown = loadSelectedWeekFromDropdown;
  window.toggleEditMode = toggleEditMode;
  window.isWeeklyAvailable = isWeeklyAvailable;
  window.toggleWeeklyAvailability = toggleWeeklyAvailability;
  window.setAllWeeklyAvailability = setAllWeeklyAvailability;
  window.isRoomWeeklyAvailable = isRoomWeeklyAvailable;
  window.toggleRoomWeeklyAvailability = toggleRoomWeeklyAvailability;
  window.setAllRoomWeeklyAvailability = setAllRoomWeeklyAvailability;
  window.renderAvailabilityChecklist = renderAvailabilityChecklist;
  window.exportAvailabilityToPDF = exportAvailabilityToPDF;
  window.runOptimization = runOptimization;
  window.setRestitView = setRestitView;
  window.handleToolboxDragStart = handleToolboxDragStart;
  window.handleDragOver = handleDragOver;
  window.handleDragLeave = handleDragLeave;
  window.handleDrop = handleDrop;
  window.canCombineSeniorRooms = canCombineSeniorRooms;
  window.assignStaffToRoomSlot = assignStaffToRoomSlot;
  window.renderRoomsView = renderRoomsView;
  window.renderRestitution = renderRestitution;
  window.checkRulesAndConflicts = checkRulesAndConflicts;
  window.exportToPDF = exportToPDF;
  window.closeConflictsModal = closeConflictsModal;
}

export function syncLeavesAndHolidaysIntoSchedule() {
  if (!state.schedule) return;
  const dates = state.schedule.datesList;
  const activeStaff = state.staff.filter(s => s.status === 'actif');
  dates.forEach(date => {
    const holiday = getHoliday(date);
    activeStaff.forEach(agent => {
      const key = `${agent.matricule}_${date}`;
      const current = state.schedule.gridAssignments[key];
      if (isOnLeave(agent.matricule, date)) {
        state.schedule.gridAssignments[key] = 'CONGE';
      } else if (holiday) {
        state.schedule.gridAssignments[key] = 'FERIE';
      } else if (current === 'CONGE' || current === 'FERIE') {
        state.schedule.gridAssignments[key] = 'REPOS';
      }
    });
  });
}

export function updateWeekLabelAutomatically() {
  const startVal = document.getElementById('week-start-date').value;
  if (startVal) {
    const dateObj = new Date(startVal + 'T00:00:00');
    document.getElementById('week-name').value = `Semaine du ${dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
}

export async function saveCurrentWeek() {
  if (!state.schedule) { window.toast('⚠ Aucun planning généré'); return; }
  const startVal = document.getElementById('week-start-date').value;
  const nameVal = document.getElementById('week-name').value.trim();
  const key = `${startVal}_${Date.now()}`;
  
  const scheduleData = {
    semaine_code: startVal,
    snapshot_personnel: state.staff,
    snapshot_salles: state.rooms,
    affectations: state.schedule
  };

  try {
    await api.savePlanning(scheduleData);
    state.archives[key] = { name: nameVal, start: startVal, schedule: JSON.parse(JSON.stringify(state.schedule)) };
    updateArchivesDropdown();
    window.toast('💾 Semaine sauvegardée dans la base de données !');
  } catch (err) {
    console.error(err);
    window.toast('🛑 Erreur lors de la sauvegarde du planning');
  }
}

export function updateArchivesDropdown() {
  const select = document.getElementById('opt-week-select-tab5');
  if (!select) return;
  select.innerHTML = '<option value="">-- Choisir une semaine --</option>';
  Object.keys(state.archives).forEach(key => {
    const arch = state.archives[key];
    select.innerHTML += `<option value="${key}">${arch.name} (${arch.start})</option>`;
  });
}

export function loadSelectedWeekFromDropdown(key) {
  if (!key) return;
  const selectedArch = state.archives[key];
  if (selectedArch) {
    state.schedule = JSON.parse(JSON.stringify(selectedArch.schedule));
    document.getElementById('week-start-date').value = selectedArch.start;
    document.getElementById('week-name').value = selectedArch.name;
    state.isEditing = false;
    const btn = document.getElementById('btn-toggle-edit');
    if (btn) btn.classList.remove('active');
    const tb = document.getElementById('draggable-toolbox-panel');
    if (tb) tb.style.display = 'none';
    renderRestitution();
  }
}

export function toggleEditMode() {
  if (!state.schedule) { window.toast('⚠ Aucun planning généré à modifier.'); return; }
  state.isEditing = !state.isEditing;
  const btn = document.getElementById('btn-toggle-edit');
  const toolbox = document.getElementById('draggable-toolbox-panel');
  if (state.isEditing) {
    if (btn) {
      btn.classList.add('active');
      btn.innerHTML = '✓ Verrouiller';
    }
    if (toolbox && state.activeRestitTab !== 'ROOMS') toolbox.style.display = 'block';
  } else {
    if (btn) {
      btn.classList.remove('active');
      btn.innerHTML = '✏️ Modifier';
    }
    if (toolbox) toolbox.style.display = 'none';
  }
  renderRestitution();
}

export function isWeeklyAvailable(mat) {
  return state.weeklyAvailability[mat] !== false;
}

export function toggleWeeklyAvailability(mat, checked) {
  state.weeklyAvailability[mat] = checked;
  renderRestitution();
}

export function setAllWeeklyAvailability(value) {
  let filteredStaff = state.staff.filter(s => s.status === 'actif');
  if (state.activeRestitTab === 'SENIOR') filteredStaff = filteredStaff.filter(s => s.cat === 'SENIOR');
  if (state.activeRestitTab === 'RESIDENT') filteredStaff = filteredStaff.filter(s => s.cat.startsWith('RESIDENT'));
  if (state.activeRestitTab === 'TECH') filteredStaff = filteredStaff.filter(s => s.cat === 'TECH');
  filteredStaff.forEach(s => { state.weeklyAvailability[s.matricule] = value; });
  renderRestitution();
}

export function isRoomWeeklyAvailable(roomId) {
  return state.weeklyRoomAvailability[roomId] !== false;
}

export function toggleRoomWeeklyAvailability(roomId, checked) {
  state.weeklyRoomAvailability[roomId] = checked;
  renderRestitution();
}

export function setAllRoomWeeklyAvailability(value) {
  state.rooms.filter(r => !r.isBroken).forEach(r => { state.weeklyRoomAvailability[r.id] = value; });
  renderRestitution();
}

export function renderAvailabilityChecklist(target) {
  let filteredStaff = state.staff.filter(s => s.status === 'actif');
  if (state.activeRestitTab === 'SENIOR') filteredStaff = filteredStaff.filter(s => s.cat === 'SENIOR');
  if (state.activeRestitTab === 'RESIDENT') filteredStaff = filteredStaff.filter(s => s.cat.startsWith('RESIDENT'));
  if (state.activeRestitTab === 'TECH') filteredStaff = filteredStaff.filter(s => s.cat === 'TECH');
  const isRoomsTab = state.activeRestitTab === 'ROOMS';
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
      <div style="color:var(--text-dim); font-size:0.9rem;">☑️ Cochez le personnel <b>disponible cette semaine</b>, puis cliquez sur <b>⚡ Générer par IA</b>.</div>
      <div style="display:flex; gap:8px;">
        <button class="btn secondary" style="padding:6px 14px; font-size:12px;" onclick="setAllWeeklyAvailability(true)">✔ Tout cocher</button>
        <button class="btn secondary" style="padding:6px 14px; font-size:12px;" onclick="setAllWeeklyAvailability(false)">✕ Tout décocher</button>
        <button class="btn" style="padding:6px 14px; font-size:12px; background:var(--accent-blue); color:white;" onclick="exportAvailabilityToPDF()"><i class="fas fa-file-pdf"></i> Exporter en PDF</button>
      </div>
    </div>
    <div class="table-scroll" id="availability-print-area">
    ${isRoomsTab ? `<div style="font-weight:700; font-size:14px; color:var(--accent-blue); margin:0 0 10px;">👤 Personnel</div>` : ''}
    <table><thead><tr><th style="background:var(--accent-blue); color:white; padding:10px; text-align:left;">Agent</th><th style="background:var(--accent-blue); color:white; padding:10px; text-align:center; width:180px;">Disponible cette semaine</th></tr></thead><tbody>`;
  filteredStaff.forEach(s => {
    const checked = isWeeklyAvailable(s.matricule);
    html += `<tr style="background:${checked ? '#fff' : '#fdf2f2'};">
      <td style="padding:10px; border:1px solid var(--border-soft); font-weight:600;">${s.name}<br><span class="badge ${s.cat}">${CATS[s.cat] ? CATS[s.cat].short : s.cat}</span></td>
      <td style="padding:10px; border:1px solid var(--border-soft); text-align:center;"><input type="checkbox" style="width:20px; height:20px; cursor:pointer;" ${checked ? 'checked' : ''} onchange="toggleWeeklyAvailability('${s.matricule}', this.checked)"></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  if (isRoomsTab) {
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin:24px 0 10px;">
        <div style="font-weight:700; font-size:14px; color:var(--accent-blue);">🏥 Salles d'examen</div>
        <div style="display:flex; gap:8px;">
          <button class="btn secondary" style="padding:5px 12px; font-size:11px;" onclick="setAllRoomWeeklyAvailability(true)">✔ Tout cocher</button>
          <button class="btn secondary" style="padding:5px 12px; font-size:11px;" onclick="setAllRoomWeeklyAvailability(false)">✕ Tout décocher</button>
        </div>
      </div>
      <table><thead><tr><th style="background:var(--accent-blue); color:white; padding:10px; text-align:left;">Salle</th><th style="background:var(--accent-blue); color:white; padding:10px; text-align:center; width:180px;">Disponible cette semaine</th></tr></thead><tbody>`;
    state.rooms.forEach(room => {
      const checked = isRoomWeeklyAvailable(room.id) && !room.isBroken;
      html += `<tr style="background:${checked ? '#fff' : '#fdf2f2'};">
        <td style="padding:10px; border:1px solid var(--border-soft); font-weight:600;">${room.name}${room.isBroken ? ` <span class="status-badge hors_service" style="font-size:10px;">En Panne</span>` : ''}</td>
        <td style="padding:10px; border:1px solid var(--border-soft); text-align:center;"><input type="checkbox" style="width:20px; height:20px; cursor:pointer;" ${checked ? 'checked' : ''} ${room.isBroken ? 'disabled title="Salle en panne — gérée dans Configurations Salles"' : ''} onchange="toggleRoomWeeklyAvailability('${room.id}', this.checked)"></td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }
  html += `</div>`;
  target.innerHTML = html;
}

export function exportAvailabilityToPDF() {
  const area = document.getElementById('availability-print-area');
  if (!area) return;
  const catLabels = { SENIOR: 'Seniors', RESIDENT: 'Résidents', TECH: 'Techniciens', GLOBAL: 'Tout le personnel', ROOMS: 'Tout le personnel' };
  const catLabel = catLabels[state.activeRestitTab] || '';
  const weekName = document.getElementById('week-name')?.value || '';
  const weekStart = document.getElementById('week-start-date')?.value || '';
  const w = window.open('', '_blank');
  if (!w) { window.toast('⚠ Veuillez autoriser les pop-ups pour exporter en PDF.'); return; }
  w.document.write(`
    <html><head><title>Disponibilités - ${catLabel}</title>
    <style>
      body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; padding:30px; color:#2d3748;}
      h1{font-size:20px; margin-bottom:2px;}
      p{color:#718096; margin-top:0; font-size:13px;}
      table{border-collapse:collapse; width:100%; margin-top:20px;}
      th, td{border:1px solid #e2e8f0; padding:8px 10px; font-size:13px; text-align:left;}
      th{background:#3182ce; color:white;}
      .badge{display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; background:#edf2f7;}
    </style>
    </head><body>
      <h1>Liste de disponibilité du personnel — ${catLabel}</h1>
      <p>${weekName ? `Semaine « ${weekName} » ` : 'Semaine '}${weekStart ? `à partir du ${weekStart}` : ''}</p>
      ${area.innerHTML}
    </body></html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}

export function runOptimization() {
  const startVal = document.getElementById('week-start-date').value;
  if (!startVal) { window.toast('⚠ Sélectionnez une date de début'); return; }
  let gridAssignments = {};
  let nightAssignments = {};
  let datesList = [];
  for (let d = 0; d < 7; d++) datesList.push(dateAdd(startVal, d));
  const activeStaff = state.staff.filter(s => s.status === 'actif' && isWeeklyAvailable(s.matricule));
  datesList.forEach((date, dayIdx) => {
    let busyToday = new Set();
    const holiday = getHoliday(date);
    activeStaff.forEach(agent => {
      if (isOnLeave(agent.matricule, date)) {
        gridAssignments[`${agent.matricule}_${date}`] = 'CONGE';
        busyToday.add(agent.matricule);
      } else if (holiday) {
        gridAssignments[`${agent.matricule}_${date}`] = 'FERIE';
        busyToday.add(agent.matricule);
      }
    });
    if (dayIdx > 0) {
      const prevDate = datesList[dayIdx - 1];
      activeStaff.forEach(agent => {
        if (agent.cat === 'RESIDENT_MAJEUR' && nightAssignments[`${agent.matricule}_${prevDate}`] === 'GARDE') {
          gridAssignments[`${agent.matricule}_${date}`] = 'REPOS';
          busyToday.add(agent.matricule);
        }
      });
    }
    activeStaff.forEach(agent => {
      if (busyToday.has(agent.matricule)) return;
      const key = `${agent.matricule}_${date}`;
      const allowed = agent.allowedRooms;
      if (allowed.includes('Scanner') && Math.random() > 0.6) gridAssignments[key] = 'SCAN_M';
      else if (allowed.includes('IRM') && Math.random() > 0.6) gridAssignments[key] = 'IRM_M';
      else if (allowed.includes('Radio') && Math.random() > 0.5) gridAssignments[key] = 'RAD_M';
      else gridAssignments[key] = 'REPOS';
    });
  });
  state.schedule = { datesList, gridAssignments, nightAssignments };
  renderRestitution();
  window.toast('⚡ Planning hebdomadaire généré avec succès !');
}

export function setRestitView(tabName) {
  state.activeRestitTab = tabName;
  document.querySelectorAll('.planning-tab').forEach(b => b.classList.remove('active'));
  const btnMap = { SENIOR: 'btn-tab-senior', RESIDENT: 'btn-tab-resident', TECH: 'btn-tab-tech', GLOBAL: 'btn-tab-global', ROOMS: 'btn-tab-rooms' };
  const targetBtn = document.getElementById(btnMap[tabName]);
  if (targetBtn) targetBtn.classList.add('active');

  const toolbox = document.getElementById('draggable-toolbox-panel');
  if (tabName === 'ROOMS') {
    if (toolbox) toolbox.style.display = 'none';
  } else if (state.isEditing && toolbox) {
    toolbox.style.display = 'block';
  }
  renderRestitution();
}

export function handleToolboxDragStart(ev, taskCode) {
  ev.dataTransfer.setData('text/plain', taskCode);
}

export function handleDragOver(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.add('dragover');
}

export function handleDragLeave(ev) {
  ev.currentTarget.classList.remove('dragover');
}

export function handleDrop(ev, mat, date) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('dragover');
  const taskCode = ev.dataTransfer.getData('text/plain');
  if (taskCode && state.schedule) {
    const agent = state.staff.find(s => s.matricule === mat);
    if (!agent) return;
    if (taskCode === 'GARDE') {
      if (agent.cat === 'RESIDENT_1ERE') {
        window.toast("⚠ Il est interdit d'attribuer une garde aux résidents de 1ère année.");
        return;
      }
      if (!['SENIOR', 'RESIDENT_MAJEUR', 'TECH'].includes(agent.cat)) {
        window.toast('⚠ La garde de nuit est réservée aux séniors, résidents majeurs et techniciens.');
        return;
      }
      if (!state.schedule.nightAssignments) state.schedule.nightAssignments = {};
      state.schedule.nightAssignments[`${mat}_${date}`] = 'GARDE';
      if (['RESIDENT_MAJEUR', 'TECH'].includes(agent.cat)) {
        const dayIndex = state.schedule.datesList.indexOf(date);
        const nextDate = state.schedule.datesList[dayIndex + 1];
        if (!isOnLeave(mat, date) && !getHoliday(date)) {
          state.schedule.gridAssignments[`${mat}_${date}`] = 'REPOS';
        }
        if (nextDate && !isOnLeave(mat, nextDate) && !getHoliday(nextDate)) {
          state.schedule.gridAssignments[`${mat}_${nextDate}`] = 'REPOS';
        }
        if (nextDate) {
          if (!state.externalDuty) state.externalDuty = { SENIOR: { records: {} }, RESIDENT: { records: {} }, TECH: { records: {} } };
          const catKey = agent.cat === 'TECH' ? 'TECH' : 'RESIDENT';
          state.externalDuty[catKey].records[`${mat}_${nextDate}`] = 'REPOS_POST_GARDE';
        }
        window.toast('✅ Garde affectée : Repos auto J et J+1.');
      }
    } else {
      const dayIndex = state.schedule.datesList.indexOf(date);
      const prevDate = state.schedule.datesList[dayIndex - 1];
      if (['RESIDENT_MAJEUR', 'TECH'].includes(agent.cat) && prevDate && state.schedule.nightAssignments?.[`${mat}_${prevDate}`] === 'GARDE') {
        if (taskCode !== 'REPOS') {
          window.toast('⚠ Repos post-garde obligatoire le lendemain.');
          return;
        }
      }
      state.schedule.gridAssignments[`${mat}_${date}`] = taskCode;
    }
    renderRestitution();
    if (window.renderExtDutyTab) {
      window.renderExtDutyTab();
    }
  }
}

export function canCombineSeniorRooms(firstCode, secondCode) {
  const first = state.rooms.find(r => r.code === firstCode);
  const second = state.rooms.find(r => r.code === secondCode);
  if (!first || !second || firstCode === secondCode) return false;
  const mode1 = first.seniorMode || 'EXCLUSIVE';
  const mode2 = second.seniorMode || 'EXCLUSIVE';
  if (mode1 === 'EXCLUSIVE' || mode2 === 'EXCLUSIVE') return false;
  const permits = (room, other) => room.seniorMode === 'COMBINABLE' || (room.seniorMode === 'SELECTIVE' && room.seniorCompatibleRooms?.includes(other.id));
  return permits(first, second) && permits(second, first);
}

export function assignStaffToRoomSlot(mat, roomCode, date) {
  if (!state.schedule) return;
  const oldVal = state.schedule.gridAssignments[`${mat}_${date}`];
  const agent = state.staff.find(s => s.matricule === mat);
  const key = `${mat}_${date}`;
  state.schedule.additionalSeniorAssignments ||= {};
  const extraRooms = state.schedule.additionalSeniorAssignments[key] ||= [];
  if (agent?.cat === 'SENIOR' && extraRooms.includes(roomCode)) {
    state.schedule.additionalSeniorAssignments[key] = extraRooms.filter(code => code !== roomCode);
  } else if (agent?.cat === 'SENIOR' && oldVal && !['REPOS', 'CONGE', 'FERIE'].includes(oldVal) && oldVal !== roomCode) {
    if (!canCombineSeniorRooms(oldVal, roomCode)) {
      window.toast('⚠ Ces deux salles ne sont pas combinables pour un senior.');
      return;
    }
    state.schedule.additionalSeniorAssignments[key].push(roomCode);
  } else {
    state.schedule.gridAssignments[key] = (oldVal === roomCode) ? 'REPOS' : roomCode;
  }
  renderRestitution();
}

export function renderRoomsView(target, dates) {
  const activeStaff = state.staff.filter(s => s.status === 'actif');
  let html = `<div class="table-scroll"><table><thead><tr><th>Salle / Examen</th>`;
  dates.forEach(d => html += `<th style="text-align:center">${dayName(d)}<br><small style="font-weight:normal">${fmtShort(d)}</small></th>`);
  html += `</tr></thead><tbody>`;
  state.rooms.forEach(room => {
    html += `<tr><td style="vertical-align:top; background:var(--panel-2);"><div style="font-weight:700; font-size:13px; color:var(--accent-blue-dark);">${room.name}</div><div style="font-size:10px; color:var(--text-faint);">Code: ${room.code}</div></td>`;
    dates.forEach(d => {
      const isBroken = room.isBroken && inRange(d, room.brokenStart, room.brokenEnd);
      if (isBroken) {
        html += `<td style="background:var(--red-dim); text-align:center; vertical-align:middle;"><span style="color:var(--red); font-weight:bold; font-size:11px;">⚠️ EN PANNE / MAINTENANCE</span></td>`;
      } else {
        const assigned = activeStaff.filter(s => state.schedule.gridAssignments[`${s.matricule}_${d}`] === room.code);
        html += `<td style="vertical-align:top; background:#fff; padding:6px;"><div class="room-people-list">`;
        ['SENIOR', 'RESIDENT', 'TECH', 'INF'].forEach(catKey => {
          const catAssigned = assigned.filter(s => catKey === 'RESIDENT' ? s.cat.startsWith('RESIDENT') : s.cat === catKey);
          if (catAssigned.length > 0 || state.isEditing) {
            html += `<div class="role-group-container"><div class="role-group-title">${catKey}</div>`;
            catAssigned.forEach(a => {
              html += `<div class="staff-slot-row"><span style="font-size:11px; flex-grow:1; font-weight:600;">${a.name}</span>${state.isEditing ? `<button class="room-btn-clear" onclick="assignStaffToRoomSlot('${a.matricule}', '${room.code}', '${d}')">✕</button>` : ''}</div>`;
            });
            if (state.isEditing) {
              const available = activeStaff.filter(s => {
                const isMatchingCat = catKey === 'RESIDENT' ? s.cat.startsWith('RESIDENT') : s.cat === catKey;
                const currentTask = state.schedule.gridAssignments[`${s.matricule}_${d}`];
                return isMatchingCat && currentTask !== room.code && currentTask !== 'CONGE' && currentTask !== 'FERIE';
              });
              if (available.length > 0) {
                html += `<div class="staff-slot-row" style="margin-top:2px;"><select class="room-person-select" onchange="if(this.value) assignStaffToRoomSlot(this.value, '${room.code}', '${d}')"><option value="">+ Ajouter...</option>${available.map(a => `<option value="${a.matricule}">${a.name}</option>`).join('')}</select></div>`;
              }
            }
            html += `</div>`;
          }
        });
        if (assigned.length === 0 && !state.isEditing) {
          html += `<div style="text-align:center; font-size:11px; color:var(--text-faint); padding:8px;">— Non Affecté —</div>`;
        }
        html += `</div></td>`;
      }
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  target.innerHTML = html;
}

export function renderRestitution() {
  const target = document.getElementById('restitution-content-target');
  if (!target) return;
  if (!state.schedule) {
    renderAvailabilityChecklist(target);
    return;
  }
  const dates = state.schedule.datesList;
  if (state.activeRestitTab === 'ROOMS') {
    renderRoomsView(target, dates);
    return;
  }
  let filteredStaff = state.staff.filter(s => s.status === 'actif');
  if (state.activeRestitTab === 'SENIOR') filteredStaff = filteredStaff.filter(s => s.cat === 'SENIOR');
  if (state.activeRestitTab === 'RESIDENT') filteredStaff = filteredStaff.filter(s => s.cat.startsWith('RESIDENT'));
  if (state.activeRestitTab === 'TECH') filteredStaff = filteredStaff.filter(s => s.cat === 'TECH');
  let html = `<div class="table-scroll"><table><thead><tr><th>Agent</th>`;
  dates.forEach(d => html += `<th style="text-align:center">${dayName(d)}<br><small style="font-weight:normal">${fmtShort(d)}</small></th>`);
  html += `</tr></thead><tbody>`;
  filteredStaff.forEach(s => {
    html += `<tr><td style="font-weight:600;">${s.name} <br><span class="badge ${s.cat}">${CATS[s.cat] ? CATS[s.cat].short : s.cat}</span></td>`;
    dates.forEach(d => {
      const taskCode = state.schedule.gridAssignments[`${s.matricule}_${d}`] || 'REPOS';
      const nightTask = state.schedule.nightAssignments?.[`${s.matricule}_${d}`];
      const cellClass = TASK_CLASSES[taskCode] || 'task-cell repos';
      const label = TASK_LABELS[taskCode] || taskCode;
      html += `<td style="padding:4px;"><div class="slot-container" ${state.isEditing ? `ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event, '${s.matricule}', '${d}')"` : ''}><div class="${cellClass}">${label}</div>${nightTask ? `<div class="${TASK_CLASSES[nightTask] || 'task-cell garde'} night-duty">🌙 ${TASK_LABELS[nightTask] || nightTask}</div>` : ''}</div></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  target.innerHTML = html;
}

export function checkRulesAndConflicts() {
  if (!state.schedule) { window.toast('⚠ Aucun planning chargé'); return; }
  let conflicts = [];
  const dates = state.schedule.datesList;
  const activeStaff = state.staff.filter(s => s.status === 'actif');
  dates.forEach((date, idx) => {
    activeStaff.forEach(agent => {
      const key = `${agent.matricule}_${date}`;
      const task = state.schedule.gridAssignments[key];
      if (isOnLeave(agent.matricule, date) && task !== 'CONGE') {
        conflicts.push(`<b>${agent.name}</b> est planifié (${TASK_LABELS[task] || task}) le <b>${date}</b> pendant son congé.`);
      }
      const isBrokenDay = state.rooms.some(r => r.code === task && r.isBroken && inRange(date, r.brokenStart, r.brokenEnd));
      if (isBrokenDay) {
        conflicts.push(`<b>${agent.name}</b> est affecté à une machine en panne le <b>${date}</b>.`);
      }
    });
  });
  
  const hList = document.getElementById('modal-conflicts-list');
  if (!hList) return;
  hList.innerHTML = conflicts.length === 0 ? `<p style="font-size:13px; color:green; text-align:center; font-weight:bold;">🟢 Aucune violation de règle détectée. Le planning est conforme !</p>` : conflicts.map(c => `<div class="history-item"><span style="color:var(--red)">⚠️ Violation :</span> ${c}</div>`).join('');
  document.getElementById('conflicts-modal')?.classList.add('active');
}

export function closeConflictsModal() {
  document.getElementById('conflicts-modal')?.classList.remove('active');
}

export function exportToPDF() {
  const content = document.getElementById('restitution-content-target');
  if (!content) return;
  const weekName = document.getElementById('week-name')?.value || '';
  const weekStart = document.getElementById('week-start-date')?.value || '';
  const w = window.open('', '_blank');
  if (!w) { window.toast('⚠ Autorisez les fenêtres pop-up'); return; }
  w.document.write(`
    <html><head><title>Planning Radiologie - ${weekName}</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #2d3748; }
      h1 { font-size: 18px; margin-bottom: 2px; }
      p { font-size: 12px; color: #718096; margin-top: 0; }
      table { border-collapse: collapse; width: 100%; margin-top: 15px; }
      th, td { border: 1px solid #cbd5e0; padding: 6px 8px; font-size: 11px; text-align: left; }
      th { background: #f7fafc; }
      .task-cell { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; display: inline-block; }
      .scanner { background: #fee2e2; color: #991b1b; }
      .irm { background: #e0f2fe; color: #075985; }
      .echo { background: #dcfce7; color: #166534; }
      .lecture { background: #fef9c3; color: #854d0e; }
      .repos { background: #f3f4f6; color: #374151; }
      .conge { background: #f5f3ff; color: #5b21b6; }
      .ferie { background: #fffbeb; color: #92400e; }
      .night-duty { font-size: 9px; margin-top: 2px; color: #1e3a8a; }
      .badge { display: inline-block; padding: 1px 5px; font-size: 9px; background: #edf2f7; border-radius: 4px; }
    </style>
    </head><body>
      <h1>SmartPlanning Radiologie CHU Monastir</h1>
      <p><b>Planning :</b> ${weekName} (${weekStart})</p>
      ${content.innerHTML}
    </body></html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 350);
}

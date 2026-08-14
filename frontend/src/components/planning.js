import { state, CATS, TASK_CLASSES, TASK_LABELS, getTaskClass, getTaskLabel, renderAll } from '../state.js';
import { dateAdd, fmtShort, dayName, rangeLen, inRange } from '../utils/helpers.js';
import { getHoliday } from './calendar.js';
import { isOnLeave, totalLeaveDays, totalFlexLeaveDays } from './leaves.js';
import { isRoomUnavailableOnDate } from './rooms.js';
import * as api from '../api/api.js';

export function normalizeTask(task) {
  if (!task) return 'REPOS';
  if (task === 'SCAN_M' || task === 'SCAN_A') return 'Scanner';
  if (task === 'IRM_M' || task === 'IRM_A') return 'IRM';
  if (task === 'RAD_M' || task === 'RAD_A') return 'Échographie / Doppler';
  if (task === 'LECT_M' || task === 'LECT_A') return 'Salle de Lecture';
  return task;
}

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
  const startVal = document.getElementById('week-start-date')?.value;
  if (startVal) {
    const dateObj = new Date(startVal + 'T00:00:00');
    const lbl = document.getElementById('week-name');
    if (lbl) lbl.value = `Semaine du ${dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
}

export async function saveCurrentWeek() {
  if (!state.schedule) { window.toast('⚠ Aucun planning généré'); return; }
  const startVal = document.getElementById('week-start-date')?.value || '';
  const nameVal = document.getElementById('week-name')?.value?.trim() || '';
  
  const frozenStaff = JSON.parse(JSON.stringify(state.staff));
  const frozenRooms = JSON.parse(JSON.stringify(state.rooms));
  const frozenSchedule = JSON.parse(JSON.stringify(state.schedule));

  const scheduleData = {
    semaine_code: startVal,
    snapshot_personnel: frozenStaff,
    snapshot_salles: frozenRooms,
    affectations: frozenSchedule
  };

  try {
    const saved = await api.savePlanning(scheduleData);
    const archKey = `${startVal}_DB_${saved ? saved.id : Date.now()}`;
    state.archives[archKey] = {
      name: nameVal || `Semaine du ${startVal} (Validé)`,
      start: startVal,
      schedule: frozenSchedule,
      snapshotPersonnel: frozenStaff,
      snapshotSalles: frozenRooms
    };
    updateArchivesDropdown();
    window.toast('💾 Semaine sauvegardée et snapshot figé dans SQLite !');
  } catch (err) {
    console.error(err);
    window.toast(`🛑 ${err.message || "Erreur lors de la sauvegarde du planning"}`);
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
    if (document.getElementById('week-start-date')) document.getElementById('week-start-date').value = selectedArch.start;
    if (document.getElementById('week-name')) document.getElementById('week-name').value = selectedArch.name;
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
  state.rooms.forEach(r => { state.weeklyRoomAvailability[r.id] = value; });
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
      <td style="padding:10px; border:1px solid var(--border-soft); font-weight:600;">${s.name} (${s.matricule})<br><span class="badge ${s.cat}">${CATS[s.cat] ? CATS[s.cat].short : s.cat}</span></td>
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
      const checked = isRoomWeeklyAvailable(room.id);
      html += `<tr style="background:${checked ? '#fff' : '#fdf2f2'};">
        <td style="padding:10px; border:1px solid var(--border-soft); font-weight:600;">${room.nom || room.name}</td>
        <td style="padding:10px; border:1px solid var(--border-soft); text-align:center;"><input type="checkbox" style="width:20px; height:20px; cursor:pointer;" ${checked ? 'checked' : ''} onchange="toggleRoomWeeklyAvailability('${room.id}', this.checked)"></td>
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
  const w = window.open('', '_blank');
  if (!w) { window.toast('⚠ Veuillez autoriser les pop-ups pour exporter en PDF.'); return; }
  w.document.write(`
    <html><head><title>Disponibilités - ${catLabel}</title>
    <style>
      body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; padding:30px; color:#2d3748;}
      table{width:100%; border-collapse:collapse; margin-top:20px;}
      th,td{border:1px solid #cbd5e1; padding:8px 12px; text-align:left;}
      th{background-color:#0c7c8c; color:white;}
      .badge{padding:2px 6px; border-radius:4px; font-size:11px; background:#e2e8f0;}
      @media print{.no-print{display:none;}}
    </style></head><body>
    <h2>Feuille de Disponibilités Hebdomadaires - Radiologie</h2>
    <p><b>Période :</b> ${weekName} | <b>Groupe :</b> ${catLabel}</p>
    ${area.innerHTML}
    <div style="margin-top:30px; text-align:right;"><button class="no-print" style="padding:8px 16px; background:#0c7c8c; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="window.print()">🖨️ Imprimer</button></div>
    </body></html>
  `);
  w.document.close();
}

export function runOptimization() {
  const startVal = document.getElementById('week-start-date')?.value;
  if (!startVal) { window.toast('⚠ Précisez la date de début de la semaine.'); return; }
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(dateAdd(startVal, i));
  }

  const grid = {};
  const activeStaff = state.staff.filter(s => s.status === 'actif');

  // Algorithme d'affectation respectant congés, jours fériés, indisponibilités des salles et salles autorisées
  dates.forEach(d => {
    const isHoliday = !!getHoliday(d);
    
    // Récupérer les salles disponibles ce jour-là
    const availableRooms = state.rooms.filter(r => isRoomWeeklyAvailable(r.id) && !isRoomUnavailableOnDate(r.id, d));
    
    // Affecter les agents
    activeStaff.forEach(agent => {
      const key = `${agent.matricule}_${d}`;
      if (isOnLeave(agent.matricule, d)) {
        grid[key] = 'CONGE';
      } else if (isHoliday) {
        grid[key] = 'FERIE';
      } else if (!isWeeklyAvailable(agent.matricule)) {
        grid[key] = 'REPOS';
      } else {
        // Sélectionner parmi ses salles autorisées qui sont disponibles ce jour-là
        const allowedIds = (agent.salle_ids || []).map(Number);
        const candidateRooms = availableRooms.filter(r => allowedIds.length === 0 || allowedIds.includes(Number(r.id)));
        if (candidateRooms.length > 0) {
          const chosen = candidateRooms[Math.floor(Math.random() * candidateRooms.length)];
          grid[key] = chosen.nom || chosen.name;
        } else {
          grid[key] = 'REPOS';
        }
      }
    });
  });

  state.schedule = {
    datesList: dates,
    gridAssignments: grid,
    additionalSeniorAssignments: {}
  };

  renderRestitution();
  window.toast('⚡ Planning généré avec succès en tenant compte de toutes les contraintes !');
}

export function setRestitView(viewName) {
  state.activeRestitTab = viewName;
  document.querySelectorAll('.restit-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === viewName);
  });
  renderRestitution();
}

export function handleToolboxDragStart(e, taskCode) {
  e.dataTransfer.setData('text/plain', taskCode);
}

export function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

export function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

export function handleDrop(e, mat, date) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const taskCode = e.dataTransfer.getData('text/plain');
  if (taskCode && state.schedule) {
    state.schedule.gridAssignments[`${mat}_${date}`] = taskCode;
    renderRestitution();
  }
}

export function canCombineSeniorRooms(firstCode, secondCode) {
  const check = canCombineSeniorRoomsWithReason(firstCode, secondCode);
  return check.ok;
}

export function canCombineSeniorRoomsWithReason(firstCode, secondCode) {
  const norm1 = normalizeTask(firstCode);
  const norm2 = normalizeTask(secondCode);
  const first = state.rooms.find(r => (r.nom || r.name) === norm1 || String(r.id) === String(norm1));
  const second = state.rooms.find(r => (r.nom || r.name) === norm2 || String(r.id) === String(norm2));
  if (!first || !second || norm1 === norm2) return { ok: false, msg: `Affectation impossible : salles non reconnues (${norm1} / ${norm2}).` };
  
  const r1_name = first.nom || first.name;
  const r2_name = second.nom || second.name;
  const mode1 = first.senior_mode || first.seniorMode || 'EXCLUSIVE';
  const mode2 = second.senior_mode || second.seniorMode || 'EXCLUSIVE';

  if (mode1 === 'EXCLUSIVE') return { ok: false, msg: `Affectation impossible : ${r1_name} est une salle exclusive. Ce senior ne peut pas être affecté à une autre salle dans le même poste.` };
  if (mode2 === 'EXCLUSIVE') return { ok: false, msg: `Affectation impossible : ${r2_name} est une salle exclusive. Ce senior ne peut pas être affecté à une autre salle dans le même poste.` };

  const permits = (room, other) => {
    const rmode = room.senior_mode || room.seniorMode || 'EXCLUSIVE';
    if (rmode === 'COMBINABLE') return true;
    if (rmode === 'SELECTIVE' || rmode === 'SEULEMENT_CERTAINES') {
      const compat = room.compatible_salle_ids || room.seniorCompatibleRooms || [];
      const otherId = Number(other.id);
      return compat.map(Number).includes(otherId) || compat.includes(other.nom || other.name);
    }
    return false;
  };

  const r1_is_comb = (mode1 === 'COMBINABLE');
  const r2_is_comb = (mode2 === 'COMBINABLE');

  if (r1_is_comb && r2_is_comb) {
    return { ok: true, msg: null };
  } else if (r1_is_comb && !r2_is_comb) {
    if (!permits(second, first)) {
      return { ok: false, msg: `Affectation impossible : La salle ${r2_name} ne permet pas d'être combinée avec ${r1_name}.` };
    }
    return { ok: true, msg: null };
  } else if (!r1_is_comb && r2_is_comb) {
    if (!permits(first, second)) {
      return { ok: false, msg: `Affectation impossible : La salle ${r1_name} ne permet pas d'être combinée avec ${r2_name}.` };
    }
    return { ok: true, msg: null };
  } else {
    if (!permits(first, second) || !permits(second, first)) {
      return { ok: false, msg: `Affectation impossible : Les salles ${r1_name} et ${r2_name} ne sont pas compatibles entre elles.` };
    }
    return { ok: true, msg: null };
  }
}

export function assignStaffToRoomSlot(mat, roomName, date) {
  if (!state.schedule) return;
  const targetRoom = normalizeTask(roomName);
  const oldVal = normalizeTask(state.schedule.gridAssignments[`${mat}_${date}`]);
  const agent = state.staff.find(s => s.matricule === mat);
  const key = `${mat}_${date}`;
  state.schedule.additionalSeniorAssignments ||= {};
  const extraRooms = state.schedule.additionalSeniorAssignments[key] ||= [];
  
  if (agent?.cat === 'SENIOR' && extraRooms.includes(targetRoom)) {
    state.schedule.additionalSeniorAssignments[key] = extraRooms.filter(r => r !== targetRoom);
  } else if (agent?.cat === 'SENIOR' && oldVal && !['REPOS', 'CONGE', 'FERIE'].includes(oldVal) && oldVal !== targetRoom) {
    const check = canCombineSeniorRoomsWithReason(oldVal, targetRoom);
    if (!check.ok) {
      window.toast(`⚠ ${check.msg}`);
      return;
    }
    for (const extra of extraRooms) {
      const checkExtra = canCombineSeniorRoomsWithReason(extra, targetRoom);
      if (!checkExtra.ok) {
        window.toast(`⚠ ${checkExtra.msg}`);
        return;
      }
    }
    state.schedule.additionalSeniorAssignments[key].push(targetRoom);
  } else {
    state.schedule.gridAssignments[key] = (oldVal === targetRoom) ? 'REPOS' : targetRoom;
  }
  renderRestitution();
}

export function renderRoomsView(target, dates) {
  const activeStaff = state.staff.filter(s => s.status === 'actif');
  let html = `<div class="table-scroll"><table><thead><tr><th>Salle / Examen</th>`;
  dates.forEach(d => html += `<th style="text-align:center">${dayName(d)}<br><small style="font-weight:normal">${fmtShort(d)}</small></th>`);
  html += `</tr></thead><tbody>`;
  state.rooms.forEach(room => {
    const rName = room.nom || room.name;
    html += `<tr><td style="vertical-align:top; background:var(--panel-2);"><div style="font-weight:700; font-size:14px; color:var(--accent-blue-dark);">${rName}</div></td>`;
    dates.forEach(d => {
      const isUnavail = isRoomUnavailableOnDate(room.id, d);
      if (isUnavail) {
        html += `<td style="background:var(--red-dim); text-align:center; vertical-align:middle;"><span style="color:var(--red); font-weight:bold; font-size:11px;">⚠️ INDISPONIBLE / MAINTENANCE</span></td>`;
      } else {
        const assigned = activeStaff.filter(s => normalizeTask(state.schedule.gridAssignments[`${s.matricule}_${d}`]) === rName);
        html += `<td style="vertical-align:top; background:#fff; padding:6px;"><div class="room-people-list">`;
        ['SENIOR', 'RESIDENT', 'TECH', 'INF'].forEach(catKey => {
          const catAssigned = assigned.filter(s => catKey === 'RESIDENT' ? s.cat.startsWith('RESIDENT') : s.cat === catKey);
          if (catAssigned.length > 0 || state.isEditing) {
            html += `<div class="role-group-container"><div class="role-group-title">${catKey}</div>`;
            catAssigned.forEach(a => {
              html += `<div class="staff-slot-row"><span style="font-size:11px; flex-grow:1; font-weight:600;">${a.name}</span>${state.isEditing ? `<button class="room-btn-clear" onclick="assignStaffToRoomSlot('${a.matricule}', '${rName}', '${d}')">✕</button>` : ''}</div>`;
            });
            if (state.isEditing) {
              const available = activeStaff.filter(s => {
                const isMatchingCat = catKey === 'RESIDENT' ? s.cat.startsWith('RESIDENT') : s.cat === catKey;
                const currentTask = normalizeTask(state.schedule.gridAssignments[`${s.matricule}_${d}`]);
                return isMatchingCat && currentTask !== rName && currentTask !== 'CONGE' && currentTask !== 'FERIE';
              });
              if (available.length > 0) {
                html += `<div class="staff-slot-row" style="margin-top:2px;"><select class="room-person-select" onchange="if(this.value) assignStaffToRoomSlot(this.value, '${rName}', '${d}')"><option value="">+ Ajouter...</option>${available.map(a => `<option value="${a.matricule}">${a.name}</option>`).join('')}</select></div>`;
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
    html += `<tr><td style="font-weight:600;">${s.name} (${s.matricule}) <br><span class="badge ${s.cat}">${CATS[s.cat] ? CATS[s.cat].short : s.cat}</span></td>`;
    dates.forEach(d => {
      const rawTask = state.schedule.gridAssignments[`${s.matricule}_${d}`] || 'REPOS';
      const taskCode = normalizeTask(rawTask);
      const nightTask = state.schedule.nightAssignments?.[`${s.matricule}_${d}`];
      const cellClass = getTaskClass(taskCode);
      const label = getTaskLabel(taskCode);
      html += `<td style="padding:4px;"><div class="slot-container" ${state.isEditing ? `ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event, '${s.matricule}', '${d}')"` : ''}><div class="${cellClass}">${label}</div>${nightTask ? `<div class="${getTaskClass(nightTask) || 'task-cell garde'} night-duty">🌙 ${getTaskLabel(nightTask) || nightTask}</div>` : ''}</div></td>`;
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
  dates.forEach((date) => {
    activeStaff.forEach(agent => {
      const key = `${agent.matricule}_${date}`;
      const rawTask = state.schedule.gridAssignments[key];
      const normTask = normalizeTask(rawTask);
      if (isOnLeave(agent.matricule, date) && normTask !== 'CONGE') {
        conflicts.push(`<b>${agent.name}</b> est planifié (${getTaskLabel(normTask)}) le <b>${date}</b> pendant son congé.`);
      }
      const matchedRoom = state.rooms.find(r => (r.nom || r.name) === normTask || String(r.id) === normTask);
      if (matchedRoom && isRoomUnavailableOnDate(matchedRoom.id, date)) {
        conflicts.push(`<b>${agent.name}</b> est affecté à la salle <b>${matchedRoom.nom || matchedRoom.name}</b> qui est indisponible/en maintenance le <b>${date}</b>.`);
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
  const w = window.open('', '_blank');
  if (!w) { window.toast('⚠ Autorisez les fenêtres pop-up'); return; }
  w.document.write(`
    <html><head><title>Planning Radiologie - ${weekName}</title>
    <style>
      body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; padding:20px; color:#2d3748;}
      table{width:100%; border-collapse:collapse; font-size:11px;}
      th,td{border:1px solid #cbd5e1; padding:4px; text-align:left;}
      th{background:#0c7c8c; color:white;}
      .badge{padding:2px 4px; border-radius:3px; font-size:9px;}
      @media print{.no-print{display:none;}}
    </style></head><body>
    <h2>Planning Hebdomadaire - Service Radiologie</h2>
    <p><b>Période :</b> ${weekName}</p>
    ${content.innerHTML}
    <div style="margin-top:20px; text-align:right;"><button class="no-print" style="padding:6px 14px; background:#0c7c8c; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="window.print()">🖨️ Imprimer</button></div>
    </body></html>
  `);
  w.document.close();
}

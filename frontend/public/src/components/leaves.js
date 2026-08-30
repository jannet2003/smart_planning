import { state, renderAll } from '../state.js';
import { dateAdd, rangeLen, inRange, formatDateDMY } from '../utils/helpers.js';
import { populateStaffSelects } from './staff.js';
import * as api from '../api/api.js';

async function refreshLeavesFromApi() {
  const conges = await api.fetchConges();
  state.leaves = { summer: {}, flex: [] };
  conges.forEach(conge => {
    const staff = state.staff.find(item => item.id === conge.personnel_id);
    if (!staff) return;
    if (conge.type_conge === 'ete') {
      state.leaves.summer[staff.matricule] = { id: conge.id, start: conge.date_debut, personnelId: staff.id };
    } else {
      state.leaves.flex.push({ id: conge.id, type: conge.type_conge, personnelId: staff.id, staffId: staff.matricule, start: conge.date_debut, end: conge.date_fin, reason: conge.raison || 'Sans objet' });
    }
  });
}

export async function deleteLeave(congeId, matricule) {
  if (!congeId) return;
  try {
    await api.deleteConge(congeId);
    await refreshLeavesFromApi();
    if (window.syncLeavesAndHolidaysIntoSchedule) {
      window.syncLeavesAndHolidaysIntoSchedule();
    }
    renderAll();
    if (matricule) {
      openModal(matricule);
    }
    if (window.toast) window.toast('✓ Congé supprimé avec succès');
  } catch (error) {
    console.error(error);
    if (window.toast) window.toast('🛑 Erreur de suppression du congé');
  }
}

export function initLeaves() {
  window.openLeaveModal = openLeaveModal;
  window.closeLeaveModal = closeLeaveModal;
  window.openFlexLeaveModal = openLeaveModal;
  window.closeFlexLeaveModal = closeLeaveModal;
  window.openSummerBlockModal = () => openLeaveModal('radiologie');
  window.closeSummerBlockModal = closeLeaveModal;
  window.onLeaveTypeChange = onLeaveTypeChange;
  window.onLeaveDateChange = onLeaveDateChange;
  window.submitLeave = submitLeave;
  window.addFlexLeave = submitLeave;
  window.assignSummerBlock = submitLeave;
  window.deleteLeave = deleteLeave;
  window.checkLimitAlert = checkLimitAlert;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.renderLeaveTable = renderLeaveTable;
  window.totalLeaveDays = totalLeaveDays;
  window.totalFlexLeaveDays = totalFlexLeaveDays;
  window.isOnLeave = isOnLeave;
}

// Attachement immédiat sur window au chargement du module
window.openLeaveModal = openLeaveModal;
window.closeLeaveModal = closeLeaveModal;
window.openFlexLeaveModal = openLeaveModal;
window.closeFlexLeaveModal = closeLeaveModal;
window.openSummerBlockModal = () => openLeaveModal('radiologie');
window.closeSummerBlockModal = closeLeaveModal;
window.onLeaveTypeChange = onLeaveTypeChange;
window.onLeaveDateChange = onLeaveDateChange;
window.submitLeave = submitLeave;
window.addFlexLeave = submitLeave;
window.assignSummerBlock = submitLeave;
window.deleteLeave = deleteLeave;
window.checkLimitAlert = checkLimitAlert;
window.openModal = openModal;
window.closeModal = closeModal;
window.renderLeaveTable = renderLeaveTable;
window.totalLeaveDays = totalLeaveDays;
window.totalFlexLeaveDays = totalFlexLeaveDays;
window.isOnLeave = isOnLeave;

export function openLeaveModal(defaultType = 'flexible') {
  populateStaffSelects();
  const modal = document.getElementById('leave-modal') || document.getElementById('flex-leave-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
  if (window.initDatePickers) window.initDatePickers();
  const typeSelect = document.getElementById('lv-type');
  if (typeSelect) {
    typeSelect.value = defaultType;
  }
  const startInput = document.getElementById('lv-start');
  if (startInput) {
    if (startInput._flatpickr) startInput._flatpickr.clear();
    else startInput.value = '';
  }
  const endInput = document.getElementById('lv-end');
  if (endInput) {
    if (endInput._flatpickr) endInput._flatpickr.clear();
    else endInput.value = '';
  }
  const reason = document.getElementById('lv-reason');
  if (reason) reason.value = '';
  const reasonBlock = document.getElementById('reason-block');
  if (reasonBlock) reasonBlock.style.display = 'none';

  onLeaveTypeChange();
}

export function closeLeaveModal() {
  const modal = document.getElementById('leave-modal') || document.getElementById('flex-leave-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

export function openFlexLeaveModal() {
  openLeaveModal('flexible');
}

export function closeFlexLeaveModal() {
  closeLeaveModal();
}

export function openSummerBlockModal() {
  openLeaveModal('radiologie');
}

export function closeSummerBlockModal() {
  closeLeaveModal();
}

export function onLeaveTypeChange() {
  const typeEl = document.getElementById('lv-type');
  const type = typeEl ? typeEl.value : 'flexible';
  const startEl = document.getElementById('lv-start');
  const start = startEl ? startEl.value : '';
  const endInput = document.getElementById('lv-end');
  const durationHint = document.getElementById('lv-duration-hint');
  const reasonBlock = document.getElementById('reason-block');

  if (type === 'radiologie' || type === 'ete') {
    if (endInput) {
      if (start) {
        const calculatedEnd = dateAdd(start, 29);
        if (endInput._flatpickr) endInput._flatpickr.setDate(calculatedEnd, true);
        else endInput.value = calculatedEnd;
      }
      endInput.readOnly = true;
      if (endInput._flatpickr?.altInput) {
        endInput._flatpickr.altInput.readOnly = true;
        endInput._flatpickr.altInput.style.backgroundColor = '#f1f5f9';
        endInput._flatpickr.altInput.style.cursor = 'not-allowed';
      }
    }
    if (durationHint) {
      durationHint.style.display = 'block';
      durationHint.textContent = 'ℹ️ Durée automatique fixe de 30 jours consécutifs.';
    }
    if (reasonBlock) reasonBlock.style.display = 'none';
  } else {
    if (endInput) {
      endInput.readOnly = false;
      if (endInput._flatpickr?.altInput) {
        endInput._flatpickr.altInput.readOnly = false;
        endInput._flatpickr.altInput.style.backgroundColor = '';
        endInput._flatpickr.altInput.style.cursor = 'auto';
      }
    }
    if (durationHint) durationHint.style.display = 'none';
    checkLimitAlert();
  }
}

export function onLeaveDateChange() {
  const typeEl = document.getElementById('lv-type');
  const type = typeEl ? typeEl.value : 'flexible';
  const startEl = document.getElementById('lv-start');
  const start = startEl ? startEl.value : '';
  const endInput = document.getElementById('lv-end');

  if ((type === 'radiologie' || type === 'ete') && start && endInput) {
    const calculatedEnd = dateAdd(start, 29);
    if (endInput._flatpickr) endInput._flatpickr.setDate(calculatedEnd, true);
    else endInput.value = calculatedEnd;
  }
  checkLimitAlert();
}

export function totalLeaveDays(staffId) {
  let total = 0;
  if (state.leaves.summer[staffId]) total += 30;
  state.leaves.flex.filter(l => l.staffId === staffId).forEach(l => {
    total += rangeLen(l.start, l.end);
  });
  return total;
}

export function totalFlexLeaveDays(staffId) {
  let total = 0;
  state.leaves.flex.filter(l => l.staffId === staffId).forEach(l => {
    total += rangeLen(l.start, l.end);
  });
  return total;
}

export function isOnLeave(staffId, dateStr) {
  const sb = state.leaves.summer[staffId];
  if (sb && inRange(dateStr, sb.start, dateAdd(sb.start, 29))) return true;
  return state.leaves.flex.some(l => l.staffId === staffId && inRange(dateStr, l.start, l.end));
}

export function checkLimitAlert() {
  const staffSelect = document.getElementById('lv-staff');
  const startInput = document.getElementById('lv-start');
  const endInput = document.getElementById('lv-end');
  const typeEl = document.getElementById('lv-type');
  const type = typeEl ? typeEl.value : 'flexible';

  if (type === 'radiologie' || type === 'ete') return;
  if (!staffSelect || !startInput || !endInput) return;

  const staffId = staffSelect.value;
  const start = startInput.value;
  const end = endInput.value;
  if (!start || !end) return;

  const currentTotal = totalLeaveDays(staffId);
  const requestedDays = rangeLen(start, end);
  const reasonBlock = document.getElementById('reason-block');
  if (reasonBlock) reasonBlock.style.display = (currentTotal + requestedDays > 60) ? 'block' : 'none';
}

export async function submitLeave() {
  const staffSelect = document.getElementById('lv-staff');
  const typeEl = document.getElementById('lv-type');
  const startInput = document.getElementById('lv-start');
  const endInput = document.getElementById('lv-end');

  const staffId = staffSelect ? staffSelect.value : '';
  const leaveType = typeEl ? typeEl.value : 'flexible';
  const start = startInput ? startInput.value : '';
  let end = endInput ? endInput.value : '';

  if (!staffId) { window.toast('⚠ Veuillez sélectionner un agent'); return; }
  if (!start) { window.toast('⚠ Précisez la date de début'); return; }

  const staff = state.staff.find(s => s.matricule === staffId);
  if (!staff?.id) { window.toast('🛑 Personnel introuvable'); return; }

  if (leaveType === 'radiologie' || leaveType === 'ete') {
    end = dateAdd(start, 29);
    try {
      const existingSummer = state.leaves?.summer?.[staff.matricule];
      if (existingSummer && existingSummer.id) {
        await api.deleteConge(existingSummer.id).catch(() => undefined);
      }
      await api.createConge({ personnel_id: staff.id, type_conge: 'ete', date_debut: start, date_fin: end, raison: 'Congé radiologie (Bloc 30j)' });
      await refreshLeavesFromApi();
    } catch (error) { window.toast('🛑 Erreur d’enregistrement du congé de radiologie'); return; }

    if (window.syncLeavesAndHolidaysIntoSchedule) {
      window.syncLeavesAndHolidaysIntoSchedule();
    }
    closeLeaveModal();
    renderAll();
    window.toast('✓ Congé de radiologie (30 jours) attribué');
    return;
  }

  // Type Congé Flexible
  if (!end) { window.toast('⚠ Précisez la date de fin'); return; }
  const futureTotal = totalLeaveDays(staffId) + rangeLen(start, end);
  let reason = "";
  if (futureTotal > 60) {
    const reasonInput = document.getElementById('lv-reason');
    reason = reasonInput ? reasonInput.value.trim() : '';
    if (!reason) { window.toast('🛑 Le cumul dépasse 60 jours. Justificatif obligatoire !'); return; }
  }
  const typeConge = `flexible_${Date.now()}`;
  try {
    await api.createConge({ personnel_id: staff.id, type_conge: typeConge, date_debut: start, date_fin: end, raison: reason || 'Sans objet' });
    await refreshLeavesFromApi();
  } catch (error) { window.toast('🛑 Erreur d’enregistrement du congé'); return; }

  const reasonInput = document.getElementById('lv-reason');
  if (reasonInput) reasonInput.value = '';
  const reasonBlock = document.getElementById('reason-block');
  if (reasonBlock) reasonBlock.style.display = 'none';

  if (window.syncLeavesAndHolidaysIntoSchedule) {
    window.syncLeavesAndHolidaysIntoSchedule();
  }
  closeLeaveModal();
  renderAll();
  window.toast('✓ Période de congé validée');
}

export const addFlexLeave = submitLeave;
export const assignSummerBlock = submitLeave;

export function openModal(matricule) {
  const agent = state.staff.find(s => s.matricule === matricule);
  if (!agent) return;
  const lbl = document.getElementById('modal-agent-name');
  if (lbl) lbl.textContent = `Historique d'Absences — ${agent.name}`;
  const hList = document.getElementById('modal-history-list');
  if (!hList) return;
  hList.innerHTML = '';
  let listItems = [];
  const sb = state.leaves.summer[matricule];
  if (sb) {
    listItems.push(`
      <div class="history-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:8px; background:var(--panel-2); border-radius:6px; border:1px solid var(--border);">
        <div class="dates">
          <span style="font-weight:700; color:var(--accent-blue-dark);">🏖️ Bloc de 30 jours (Été)</span><br>
          <span style="font-size:12px; color:var(--text-dim);">Du ${formatDateDMY(sb.start)} au ${formatDateDMY(dateAdd(sb.start, 29))}</span>
        </div>
        ${sb.id ? `<button class="btn danger" type="button" style="padding:5px 10px; font-size:12px; cursor:pointer;" onclick="deleteLeave(${sb.id}, '${matricule}')" title="Supprimer ce congé">🗑 Supprimer</button>` : ''}
      </div>
    `);
  }
  state.leaves.flex.filter(l => l.staffId === matricule).forEach(l => {
    listItems.push(`
      <div class="history-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:8px; background:var(--panel-2); border-radius:6px; border:1px solid var(--border);">
        <div class="dates">
          <span style="font-weight:700; color:var(--accent-blue);">🌴 Congé Flexible (${rangeLen(l.start, l.end)}j)</span><br>
          <span style="font-size:12px; color:var(--text-dim);">Du ${formatDateDMY(l.start)} au ${formatDateDMY(l.end)}</span>
          ${l.reason && l.reason !== 'Sans objet' ? `<div class="reason" style="font-size:11.5px; margin-top:2px; color:var(--text-dim);"><b>Motif :</b> ${l.reason}</div>` : ''}
        </div>
        ${l.id ? `<button class="btn danger" type="button" style="padding:5px 10px; font-size:12px; cursor:pointer;" onclick="deleteLeave(${l.id}, '${matricule}')" title="Supprimer ce congé">🗑 Supprimer</button>` : ''}
      </div>
    `);
  });
  hList.innerHTML = listItems.length === 0 ? `<p style="font-size:12px; color:var(--text-faint); text-align:center; padding:16px;">Aucun congé enregistré.</p>` : listItems.join('');
  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeModal() {
  const modal = document.getElementById('history-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

export function renderLeaveTable() {
  const tbody = document.getElementById('leave-tbody');
  if (tbody) {
    tbody.innerHTML = state.staff.map(s => {
      const sumDays = totalLeaveDays(s.matricule);
      const alertLabel = sumDays > 60 ? '<span style="color:red; font-weight:bold;">🚨 DÉPASSEMENT (>60j)</span>' : '<span style="color:green; font-weight:600;">🟢 Conforme</span>';
      return `
        <tr>
          <td>${s.matricule}</td>
          <td><a href="#" style="color:var(--accent-blue); font-weight:600; text-decoration:none;" onclick="openModal('${s.matricule}')">${s.name}</a></td>
          <td>${state.leaves.summer[s.matricule] ? '30 jours' : '—'}</td>
          <td><b>${totalFlexLeaveDays(s.matricule)} jours</b></td>
          <td><b>${sumDays} j</b></td>
          <td>${alertLabel}</td>
        </tr>
      `;
    }).join('');
  }
}

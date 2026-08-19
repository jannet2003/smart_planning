import { state, renderAll } from '../state.js';
import { dateAdd, rangeLen, inRange } from '../utils/helpers.js';
import { populateStaffSelects } from './staff.js';
import * as api from '../api/api.js';

async function refreshLeavesFromApi() {
  const conges = await api.fetchConges();
  state.leaves = { summer: {}, flex: [] };
  conges.forEach(conge => {
    const staff = state.staff.find(item => item.id === conge.personnel_id);
    if (!staff) return;
    if (conge.type_conge === 'ete') {
      state.leaves.summer[staff.matricule] = { start: conge.date_debut, personnelId: staff.id };
    } else {
      state.leaves.flex.push({ id: conge.type_conge, personnelId: staff.id, staffId: staff.matricule, start: conge.date_debut, end: conge.date_fin, reason: conge.raison || 'Sans objet' });
    }
  });
}

export function initLeaves() {
  window.openFlexLeaveModal = openFlexLeaveModal;
  window.closeFlexLeaveModal = closeFlexLeaveModal;
  window.openSummerBlockModal = openSummerBlockModal;
  window.closeSummerBlockModal = closeSummerBlockModal;
  window.checkLimitAlert = checkLimitAlert;
  window.addFlexLeave = addFlexLeave;
  window.assignSummerBlock = assignSummerBlock;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.renderLeaveTable = renderLeaveTable;
  window.totalLeaveDays = totalLeaveDays;
  window.totalFlexLeaveDays = totalFlexLeaveDays;
  window.isOnLeave = isOnLeave;
}

// Attachement immédiat sur window au chargement du module
window.openFlexLeaveModal = openFlexLeaveModal;
window.closeFlexLeaveModal = closeFlexLeaveModal;
window.openSummerBlockModal = openSummerBlockModal;
window.closeSummerBlockModal = closeSummerBlockModal;

export function openFlexLeaveModal() {
  populateStaffSelects();
  const modal = document.getElementById('flex-leave-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeFlexLeaveModal() {
  const modal = document.getElementById('flex-leave-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

export function openSummerBlockModal() {
  populateStaffSelects();
  const modal = document.getElementById('summer-block-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeSummerBlockModal() {
  const modal = document.getElementById('summer-block-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
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
  const staffId = document.getElementById('lv-staff').value;
  const start = document.getElementById('lv-start').value;
  const end = document.getElementById('lv-end').value;
  if (!start || !end) return;
  const currentTotal = totalLeaveDays(staffId);
  const requestedDays = rangeLen(start, end);
  const reasonBlock = document.getElementById('reason-block');
  if (reasonBlock) reasonBlock.style.display = (currentTotal + requestedDays > 60) ? 'block' : 'none';
}

export async function addFlexLeave() {
  const staffId = document.getElementById('lv-staff').value;
  const start = document.getElementById('lv-start').value;
  const end = document.getElementById('lv-end').value;
  if (!start || !end) { window.toast('⚠ Précisez les dates'); return; }
  const futureTotal = totalLeaveDays(staffId) + rangeLen(start, end);
  let reason = "";
  if (futureTotal > 60) {
    reason = document.getElementById('lv-reason').value.trim();
    if (!reason) { window.toast('🛑 Le cumul dépasse 60 jours. Justificatif obligatoire !'); return; }
  }
  const staff = state.staff.find(s => s.matricule === staffId);
  if (!staff?.id) { window.toast('🛑 Personnel introuvable'); return; }
  const typeConge = `flexible_${Date.now()}`;
  try {
    await api.createConge({ personnel_id: staff.id, type_conge: typeConge, date_debut: start, date_fin: end, raison: reason || 'Sans objet' });
    await refreshLeavesFromApi();
  } catch (error) { window.toast('🛑 Erreur d’enregistrement du congé'); return; }
  document.getElementById('lv-reason').value = '';
  const reasonBlock = document.getElementById('reason-block');
  if (reasonBlock) reasonBlock.style.display = 'none';
  
  if (window.syncLeavesAndHolidaysIntoSchedule) {
    window.syncLeavesAndHolidaysIntoSchedule();
  }
  closeFlexLeaveModal();
  renderAll();
  window.toast('✓ Période de congé validée');
}

export async function assignSummerBlock() {
  const start = document.getElementById('sb-start').value;
  if (!start) { window.toast('⚠ Précisez la date de début'); return; }
  const staffId = document.getElementById('sb-staff').value;
  const staff = state.staff.find(s => s.matricule === staffId);
  if (!staff?.id) { window.toast('🛑 Personnel introuvable'); return; }
  try {
    await api.deleteConge(staff.id, 'ete').catch(() => undefined);
    await api.createConge({ personnel_id: staff.id, type_conge: 'ete', date_debut: start, date_fin: dateAdd(start, 29), raison: 'Bloc été' });
    await refreshLeavesFromApi();
  } catch (error) { window.toast('🛑 Erreur d’enregistrement du bloc été'); return; }
  if (window.syncLeavesAndHolidaysIntoSchedule) {
    window.syncLeavesAndHolidaysIntoSchedule();
  }
  closeSummerBlockModal();
  renderAll();
  window.toast('✓ Bloc de 30 jours attribué');
}

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
  if (sb) listItems.push(`<div class="history-item"><div class="dates"><span> Bloc de 30 jours </span><span>Du ${sb.start} au ${dateAdd(sb.start, 29)}</span></div></div>`);
  state.leaves.flex.filter(l => l.staffId === matricule).forEach(l => {
    listItems.push(`<div class="history-item"><div class="dates"><span> Congé Flexible (${rangeLen(l.start, l.end)}j)</span><span>Du ${l.start} au ${l.end}</span></div>${l.reason && l.reason !== 'Sans objet' ? `<div class="reason"><b>Motif :</b> ${l.reason}</div>` : ''}</div>`);
  });
  hList.innerHTML = listItems.length === 0 ? `<p style="font-size:12px; color:var(--text-faint); text-align:center;">Aucun congé enregistré.</p>` : listItems.join('');
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

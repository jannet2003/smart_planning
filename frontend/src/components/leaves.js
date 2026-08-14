import { state, renderAll } from '../state.js';
import { dateAdd, rangeLen, inRange } from '../utils/helpers.js';
import { populateStaffSelects } from './staff.js';
import * as api from '../api/api.js';

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
  window.deleteCongeItem = deleteCongeItem;
  window.renderLeaveTable = renderLeaveTable;
  window.totalLeaveDays = totalLeaveDays;
  window.totalFlexLeaveDays = totalFlexLeaveDays;
  window.isOnLeave = isOnLeave;
}

window.openFlexLeaveModal = openFlexLeaveModal;
window.closeFlexLeaveModal = closeFlexLeaveModal;
window.openSummerBlockModal = openSummerBlockModal;
window.closeSummerBlockModal = closeSummerBlockModal;
window.deleteCongeItem = deleteCongeItem;

export function openFlexLeaveModal() {
  populateStaffSelects();
  const startEl = document.getElementById('lv-start');
  const endEl = document.getElementById('lv-end');
  const reasonEl = document.getElementById('lv-reason');
  if (startEl) startEl.value = '';
  if (endEl) endEl.value = '';
  if (reasonEl) reasonEl.value = '';
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
  const startEl = document.getElementById('sb-start');
  if (startEl) startEl.value = '';
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

function getAgentByMatriculeOrId(matOrId) {
  const str = String(matOrId);
  return state.staff.find(s => s.matricule === str || String(s.id) === str);
}

export function totalLeaveDays(staffMatOrId) {
  const agent = getAgentByMatriculeOrId(staffMatOrId);
  if (!agent) return 0;
  let total = 0;
  const agentConges = state.leavesList.filter(c => Number(c.personnel_id) === Number(agent.id));
  agentConges.forEach(l => {
    total += rangeLen(l.date_debut, l.date_fin);
  });
  return total;
}

export function totalFlexLeaveDays(staffMatOrId) {
  const agent = getAgentByMatriculeOrId(staffMatOrId);
  if (!agent) return 0;
  let total = 0;
  const flexConges = state.leavesList.filter(c => Number(c.personnel_id) === Number(agent.id) && c.type !== 'bloc_30');
  flexConges.forEach(l => {
    total += rangeLen(l.date_debut, l.date_fin);
  });
  return total;
}

export function isOnLeave(staffMatOrId, dateStr) {
  const agent = getAgentByMatriculeOrId(staffMatOrId);
  if (!agent) return false;
  return state.leavesList.some(c => {
    if (Number(c.personnel_id) !== Number(agent.id)) return false;
    return dateStr >= c.date_debut && dateStr <= c.date_fin;
  });
}

export function checkLimitAlert() {
  const matVal = document.getElementById('lv-staff').value;
  const start = document.getElementById('lv-start').value;
  const end = document.getElementById('lv-end').value;
  if (!start || !end) return;
  const currentTotal = totalLeaveDays(matVal);
  const requestedDays = rangeLen(start, end);
  const reasonBlock = document.getElementById('reason-block');
  if (reasonBlock) reasonBlock.style.display = (currentTotal + requestedDays > 60) ? 'block' : 'none';
}

export async function addFlexLeave() {
  const matVal = document.getElementById('lv-staff').value;
  const start = document.getElementById('lv-start').value;
  const end = document.getElementById('lv-end').value;
  if (!start || !end) { window.toast('⚠ Précisez les dates'); return; }
  
  const agent = getAgentByMatriculeOrId(matVal);
  if (!agent) { window.toast('⚠ Agent non trouvé'); return; }

  const futureTotal = totalLeaveDays(matVal) + rangeLen(start, end);
  let reason = "";
  if (futureTotal > 60) {
    reason = document.getElementById('lv-reason').value.trim();
    if (!reason) { window.toast('🛑 Le cumul dépasse 60 jours. Justificatif obligatoire !'); return; }
  }

  try {
    const saved = await api.createConge({
      personnel_id: agent.id,
      type: 'flexible',
      date_debut: start,
      date_fin: end,
      raison: reason || 'Sans objet'
    });
    state.leavesList.push(saved);
    
    document.getElementById('lv-reason').value = '';
    const reasonBlock = document.getElementById('reason-block');
    if (reasonBlock) reasonBlock.style.display = 'none';
    
    if (window.syncLeavesAndHolidaysIntoSchedule) {
      window.syncLeavesAndHolidaysIntoSchedule();
    }
    closeFlexLeaveModal();
    renderAll();
    window.toast('✓ Période de congé validée et enregistrée en base');
  } catch (err) {
    console.error(err);
    window.toast(`🛑 ${err.message || "Erreur d'enregistrement du congé"}`);
  }
}

export async function assignSummerBlock() {
  const matVal = document.getElementById('sb-staff').value;
  const start = document.getElementById('sb-start').value;
  if (!start) { window.toast('⚠ Précisez la date de début'); return; }
  
  const agent = getAgentByMatriculeOrId(matVal);
  if (!agent) { window.toast('⚠ Agent non trouvé'); return; }

  const end = dateAdd(start, 29);

  try {
    const saved = await api.createConge({
      personnel_id: agent.id,
      type: 'bloc_30',
      date_debut: start,
      date_fin: end,
      raison: 'Bloc de 30 jours (Été)'
    });
    state.leavesList.push(saved);
    
    if (window.syncLeavesAndHolidaysIntoSchedule) {
      window.syncLeavesAndHolidaysIntoSchedule();
    }
    closeSummerBlockModal();
    renderAll();
    window.toast('✓ Bloc de 30 jours attribué et enregistré en base');
  } catch (err) {
    console.error(err);
    window.toast(`🛑 ${err.message || "Erreur d'enregistrement du bloc"}`);
  }
}

export async function deleteCongeItem(id) {
  try {
    await api.deleteConge(id);
    state.leavesList = state.leavesList.filter(c => c.id !== id);
    if (window.syncLeavesAndHolidaysIntoSchedule) {
      window.syncLeavesAndHolidaysIntoSchedule();
    }
    renderAll();
    window.toast('✓ Congé supprimé');
  } catch (err) {
    window.toast('🛑 Erreur de suppression du congé');
  }
}

export function openModal(matricule) {
  const agent = getAgentByMatriculeOrId(matricule);
  if (!agent) return;
  const lbl = document.getElementById('modal-agent-name');
  if (lbl) lbl.textContent = `Historique d'Absences — ${agent.name} (${agent.matricule})`;
  const hList = document.getElementById('modal-history-list');
  if (!hList) return;
  
  const conges = state.leavesList.filter(c => Number(c.personnel_id) === Number(agent.id));
  
  let listItems = conges.map(c => {
    const isSummer = c.type === 'bloc_30';
    const tag = isSummer ? '🌴 Bloc de 30 jours (Été)' : `✈️ Congé Flexible (${rangeLen(c.date_debut, c.date_fin)}j)`;
    return `
      <div class="history-item" style="display:flex; justify-content:space-between; align-items:center;">
        <div style="flex:1;">
          <div class="dates"><span>${tag}</span><span>Du ${c.date_debut} au ${c.date_fin}</span></div>
          ${c.raison && c.raison !== 'Sans objet' ? `<div class="reason"><b>Motif :</b> ${c.raison}</div>` : ''}
        </div>
        <button class="btn danger" style="padding:2px 6px; font-size:11px; margin-left:8px;" onclick="deleteCongeItem(${c.id}); openModal('${agent.matricule}');">✕</button>
      </div>
    `;
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
      const summerConge = state.leavesList.find(c => Number(c.personnel_id) === Number(s.id) && c.type === 'bloc_30');
      const alertLabel = sumDays > 60 ? '<span style="color:red; font-weight:bold;">🚨 DÉPASSEMENT (>60j)</span>' : '<span style="color:green; font-weight:600;">🟢 Conforme</span>';
      return `
        <tr>
          <td><b style="font-family:monospace; color:var(--accent-blue-dark);">${s.matricule}</b></td>
          <td><a href="#" style="color:var(--accent-blue); font-weight:600; text-decoration:none;" onclick="openModal('${s.matricule}')">${s.name}</a></td>
          <td>${summerConge ? `30 jours (${summerConge.date_debut})` : '—'}</td>
          <td><b>${totalFlexLeaveDays(s.matricule)} jours</b></td>
          <td><b>${sumDays} j</b></td>
          <td>${alertLabel}</td>
        </tr>
      `;
    }).join('');
  }
}

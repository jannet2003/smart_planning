import { state, renderAll } from '../state.js';
import { dateAdd, rangeLen, inRange } from '../utils/helpers.js';

export function initLeaves() {
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

export function addFlexLeave() {
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
  state.leaves.flex.push({ id: Date.now(), staffId, start, end, reason: reason || 'Sans objet' });
  document.getElementById('lv-reason').value = '';
  const reasonBlock = document.getElementById('reason-block');
  if (reasonBlock) reasonBlock.style.display = 'none';
  
  if (window.syncLeavesAndHolidaysIntoSchedule) {
    window.syncLeavesAndHolidaysIntoSchedule();
  }
  renderAll();
  window.toast('✓ Période de congé validée');
}

export function assignSummerBlock() {
  const start = document.getElementById('sb-start').value;
  if (!start) { window.toast('⚠ Précisez la date de début'); return; }
  state.leaves.summer[document.getElementById('sb-staff').value] = { start };
  if (window.syncLeavesAndHolidaysIntoSchedule) {
    window.syncLeavesAndHolidaysIntoSchedule();
  }
  renderAll();
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
  if (sb) listItems.push(`<div class="history-item"><div class="dates"><span>🌴 Bloc de 30 jours (Été)</span><span>Du ${sb.start} au ${dateAdd(sb.start, 29)}</span></div></div>`);
  state.leaves.flex.filter(l => l.staffId === matricule).forEach(l => {
    listItems.push(`<div class="history-item"><div class="dates"><span>✈️ Congé Flexible (${rangeLen(l.start, l.end)}j)</span><span>Du ${l.start} au ${l.end}</span></div>${l.reason && l.reason !== 'Sans objet' ? `<div class="reason"><b>Motif :</b> ${l.reason}</div>` : ''}</div>`);
  });
  hList.innerHTML = listItems.length === 0 ? `<p style="font-size:12px; color:var(--text-faint); text-align:center;">Aucun congé enregistré.</p>` : listItems.join('');
  document.getElementById('history-modal')?.classList.add('active');
}

export function closeModal() {
  document.getElementById('history-modal')?.classList.remove('active');
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

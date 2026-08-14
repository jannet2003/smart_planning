import { state, renderAll } from '../state.js';
import * as api from '../api/api.js';

let currentEditingCompatRoomIdx = null;
let currentEditingUnavailRoomIdx = null;

export function initRooms() {
  window.openAddRoomModal           = openAddRoomModal;
  window.closeAddRoomModal          = closeAddRoomModal;
  window.submitAddRoom              = submitAddRoom;
  window.renderRooms                = renderRooms;
  window.updateRoomProp             = updateRoomProp;
  window.handleSeniorModeChange     = handleSeniorModeChange;
  window.openCompatibilityModal     = openCompatibilityModal;
  window.closeCompatibilityModal    = closeCompatibilityModal;
  window.saveCompatibilityModal     = saveCompatibilityModal;
  window.openUnavailabilityModal    = openUnavailabilityModal;
  window.closeUnavailabilityModal   = closeUnavailabilityModal;
  window.saveUnavailabilityModal    = saveUnavailabilityModal;
  window.deleteIndisponibiliteItem  = deleteIndisponibiliteItem;
  window.clearUnavailability        = clearUnavailability;
  window.deleteRoom                 = deleteRoom;
}

window.openAddRoomModal           = openAddRoomModal;
window.closeAddRoomModal          = closeAddRoomModal;
window.submitAddRoom              = submitAddRoom;
window.renderRooms                = renderRooms;
window.updateRoomProp             = updateRoomProp;
window.handleSeniorModeChange     = handleSeniorModeChange;
window.openCompatibilityModal     = openCompatibilityModal;
window.closeCompatibilityModal    = closeCompatibilityModal;
window.saveCompatibilityModal     = saveCompatibilityModal;
window.openUnavailabilityModal    = openUnavailabilityModal;
window.closeUnavailabilityModal   = closeUnavailabilityModal;
window.saveUnavailabilityModal    = saveUnavailabilityModal;
window.deleteIndisponibiliteItem  = deleteIndisponibiliteItem;
window.clearUnavailability        = clearUnavailability;
window.deleteRoom                 = deleteRoom;

function roomToPayload(room) {
  return {
    nom:                room.nom || room.name || '',
    min_senior:         Number(room.min_senior ?? room.minSenior) || 0,
    max_senior:         Number(room.max_senior ?? room.maxSenior) || 0,
    min_resident:       Number(room.min_resident ?? room.minResident) || 0,
    max_resident:       Number(room.max_resident ?? room.maxResident) || 0,
    min_inf:            Number(room.min_inf ?? room.minInf) || 0,
    max_inf:            Number(room.max_inf ?? room.maxInf) || 0,
    min_tech:           Number(room.min_tech ?? room.minTech) || 0,
    max_tech:           Number(room.max_tech ?? room.maxTech) || 0,
    senior_mode:        room.senior_mode || room.seniorMode || 'EXCLUSIVE',
    mode_compatibilite: room.mode_compatibilite || 'AUCUNE',
    compatible_salle_ids: (room.compatible_salle_ids || room.seniorCompatibleRooms || []).map(Number)
  };
}

export function apiRoomToLocal(r) {
  return {
    id:                   r.id,
    nom:                  r.nom,
    name:                 r.nom,
    min_senior:           r.min_senior,
    max_senior:           r.max_senior,
    min_resident:         r.min_resident,
    max_resident:         r.max_resident,
    min_inf:              r.min_inf,
    max_inf:              r.max_inf,
    min_tech:             r.min_tech,
    max_tech:             r.max_tech,
    minSenior:            r.min_senior,
    maxSenior:            r.max_senior,
    minResident:          r.min_resident,
    maxResident:          r.max_resident,
    minInf:               r.min_inf,
    maxInf:               r.max_inf,
    minTech:              r.min_tech,
    maxTech:              r.max_tech,
    senior_mode:          r.senior_mode || 'EXCLUSIVE',
    seniorMode:           r.senior_mode || 'EXCLUSIVE',
    mode_compatibilite:   r.mode_compatibilite || 'AUCUNE',
    compatible_salle_ids: r.compatible_salle_ids || [],
    seniorCompatibleRooms: r.compatible_salle_ids || []
  };
}

async function persistRoom(room) {
  const payload = roomToPayload(room);
  if (room.id && typeof room.id === 'number') {
    return await api.updateSalle(room.id, payload);
  } else {
    return await api.createSalle(payload);
  }
}

export async function updateRoomProp(idx, prop, rawValue) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  const numericProps = ['minSenior', 'maxSenior', 'minResident', 'maxResident', 'minInf', 'maxInf', 'minTech', 'maxTech', 'min_senior', 'max_senior', 'min_resident', 'max_resident', 'min_inf', 'max_inf', 'min_tech', 'max_tech'];

  if (numericProps.includes(prop)) {
    const parsed = parseInt(rawValue, 10);
    const val = isNaN(parsed) ? 0 : Math.max(0, parsed);
    room[prop] = val;
    // Mirror camelCase & snake_case
    if (prop === 'minSenior' || prop === 'min_senior') { room.minSenior = val; room.min_senior = val; }
    if (prop === 'maxSenior' || prop === 'max_senior') { room.maxSenior = val; room.max_senior = val; }
    if (prop === 'minResident' || prop === 'min_resident') { room.minResident = val; room.min_resident = val; }
    if (prop === 'maxResident' || prop === 'max_resident') { room.maxResident = val; room.max_resident = val; }
    if (prop === 'minInf' || prop === 'min_inf') { room.minInf = val; room.min_inf = val; }
    if (prop === 'maxInf' || prop === 'max_inf') { room.maxInf = val; room.max_inf = val; }
    if (prop === 'minTech' || prop === 'min_tech') { room.minTech = val; room.min_tech = val; }
    if (prop === 'maxTech' || prop === 'max_tech') { room.maxTech = val; room.max_tech = val; }
  } else {
    room[prop] = rawValue;
  }

  try {
    await persistRoom(room);
  } catch (err) {
    if (window.toast) window.toast(`🛑 ${err.message || "Erreur de sauvegarde de la salle"}`);
  }
}

export async function handleSeniorModeChange(idx, mode) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  room.senior_mode = mode;
  room.seniorMode = mode;
  if (mode !== 'SELECTIVE' && mode !== 'SEULEMENT_CERTAINES') {
    room.compatible_salle_ids = [];
    room.seniorCompatibleRooms = [];
  }
  renderRooms();
  try {
    await persistRoom(room);
    if (mode === 'SELECTIVE' || mode === 'SEULEMENT_CERTAINES') {
      openCompatibilityModal(idx);
    }
  } catch (err) {
    if (window.toast) window.toast(`🛑 ${err.message || "Erreur lors du changement de mode senior"}`);
  }
}

export function openCompatibilityModal(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  currentEditingCompatRoomIdx = idx;
  const room = state.rooms[idx];
  const listContainer = document.getElementById('compat-modal-room-list');
  if (!listContainer) return;

  const currentCompat = (room.compatible_salle_ids || room.seniorCompatibleRooms || []).map(Number);
  const otherRooms = state.rooms.filter((_, i) => i !== idx);

  if (otherRooms.length === 0) {
    listContainer.innerHTML = '<p style="color:var(--text-faint); font-size:12px;">Aucune autre salle disponible.</p>';
  } else {
    listContainer.innerHTML = otherRooms.map(r => {
      const isChecked = currentCompat.includes(Number(r.id));
      return `
        <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
          <input type="checkbox" value="${r.id}" ${isChecked ? 'checked' : ''} class="compat-room-checkbox">
          <span>${r.nom || r.name}</span>
        </label>
      `;
    }).join('');
  }

  const modal = document.getElementById('room-compat-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeCompatibilityModal() {
  const modal = document.getElementById('room-compat-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  currentEditingCompatRoomIdx = null;
}

export async function saveCompatibilityModal() {
  if (currentEditingCompatRoomIdx === null || !state.rooms[currentEditingCompatRoomIdx]) return;
  const room = state.rooms[currentEditingCompatRoomIdx];
  const selected = [];
  document.querySelectorAll('.compat-room-checkbox:checked').forEach(cb => {
    const num = parseInt(cb.value, 10);
    if (!isNaN(num)) selected.push(num);
  });
  room.compatible_salle_ids = selected;
  room.seniorCompatibleRooms = selected;
  try {
    await persistRoom(room);
    closeCompatibilityModal();
    renderRooms();
    if (window.toast) window.toast('✓ Compatibilités enregistrées');
  } catch (err) {
    if (window.toast) window.toast(`🛑 ${err.message || "Erreur de sauvegarde"}`);
  }
}

export function openUnavailabilityModal(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  currentEditingUnavailRoomIdx = idx;
  const room = state.rooms[idx];
  
  const titleEl = document.getElementById('unavail-modal-room-name');
  if (titleEl) titleEl.textContent = `Indisponibilités — ${room.nom || room.name}`;
  
  const startEl = document.getElementById('unavail-start');
  const endEl = document.getElementById('unavail-end');
  const reasonEl = document.getElementById('unavail-reason');
  if (startEl) startEl.value = '';
  if (endEl) endEl.value = '';
  if (reasonEl) reasonEl.value = '';

  renderRoomUnavailabilityHistory(room.id);

  const modal = document.getElementById('room-unavail-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function renderRoomUnavailabilityHistory(salleId) {
  const historyContainer = document.getElementById('unavail-history-list');
  if (!historyContainer) return;

  const list = state.indisponibilitesList.filter(i => Number(i.salle_id) === Number(salleId));
  if (list.length === 0) {
    historyContainer.innerHTML = '<p style="color:var(--text-faint); font-size:12px; margin:8px 0;">Aucune indisponibilité enregistrée.</p>';
    return;
  }

  historyContainer.innerHTML = list.map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--panel-2); padding:6px 10px; border-radius:4px; margin-bottom:6px; border:1px solid var(--border); font-size:12px;">
      <div>
        <b>Du ${item.date_debut} au ${item.date_fin}</b>
        <span style="color:var(--text-dim); margin-left:8px;">(${item.motif || 'Sans motif'})</span>
      </div>
      <button class="btn danger" style="padding:2px 6px; font-size:11px;" onclick="deleteIndisponibiliteItem(${item.id})">✕</button>
    </div>
  `).join('');
}

export async function deleteIndisponibiliteItem(id) {
  try {
    await api.deleteIndisponibilite(id);
    state.indisponibilitesList = state.indisponibilitesList.filter(i => i.id !== id);
    if (currentEditingUnavailRoomIdx !== null && state.rooms[currentEditingUnavailRoomIdx]) {
      renderRoomUnavailabilityHistory(state.rooms[currentEditingUnavailRoomIdx].id);
    }
    renderRooms();
    renderAll();
    if (window.toast) window.toast('✓ Indisponibilité supprimée');
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur de suppression');
  }
}

export function closeUnavailabilityModal() {
  const modal = document.getElementById('room-unavail-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  currentEditingUnavailRoomIdx = null;
}

export async function saveUnavailabilityModal() {
  if (currentEditingUnavailRoomIdx === null || !state.rooms[currentEditingUnavailRoomIdx]) return;
  const room = state.rooms[currentEditingUnavailRoomIdx];
  const start = document.getElementById('unavail-start')?.value;
  const end = document.getElementById('unavail-end')?.value;
  const reason = document.getElementById('unavail-reason')?.value?.trim() || '';

  if (!start || !end) {
    if (window.toast) window.toast('⚠ Veuillez renseigner la date de début et de fin');
    return;
  }

  try {
    const saved = await api.createIndisponibilite({
      salle_id: room.id,
      date_debut: start,
      date_fin: end,
      motif: reason || 'Maintenance'
    });
    state.indisponibilitesList.push(saved);
    renderRoomUnavailabilityHistory(room.id);
    renderRooms();
    renderAll();
    if (window.toast) window.toast('✓ Période d\'indisponibilité ajoutée');
  } catch (err) {
    if (window.toast) window.toast(`🛑 ${err.message || "Erreur de sauvegarde"}`);
  }
}

export async function clearUnavailability(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  const toDelete = state.indisponibilitesList.filter(i => Number(i.salle_id) === Number(room.id));
  for (const item of toDelete) {
    try {
      await api.deleteIndisponibilite(item.id);
    } catch (e) {
      console.warn("Erreur suppression indisp:", e);
    }
  }
  state.indisponibilitesList = state.indisponibilitesList.filter(i => Number(i.salle_id) !== Number(room.id));
  renderRooms();
  renderAll();
  if (window.toast) window.toast('✓ Toutes les indisponibilités de cette salle ont été effacées');
}

export function openAddRoomModal() {
  const nomEl = document.getElementById('new-room-name');
  if (nomEl) nomEl.value = '';
  const modal = document.getElementById('add-room-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeAddRoomModal() {
  const modal = document.getElementById('add-room-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

export async function submitAddRoom() {
  const nom = document.getElementById('new-room-name')?.value?.trim();
  if (!nom) {
    if (window.toast) window.toast('⚠ Veuillez saisir le nom de la salle');
    return;
  }
  const minSen = parseInt(document.getElementById('new-room-min-senior')?.value, 10) || 1;
  const maxSen = parseInt(document.getElementById('new-room-max-senior')?.value, 10) || 2;
  const minRes = parseInt(document.getElementById('new-room-min-res')?.value, 10) || 1;
  const maxRes = parseInt(document.getElementById('new-room-max-res')?.value, 10) || 3;
  const minInf = parseInt(document.getElementById('new-room-min-inf')?.value, 10) || 0;
  const maxInf = parseInt(document.getElementById('new-room-max-inf')?.value, 10) || 1;
  const minTech = parseInt(document.getElementById('new-room-min-tech')?.value, 10) || 1;
  const maxTech = parseInt(document.getElementById('new-room-max-tech')?.value, 10) || 3;
  const seniorMode = document.getElementById('new-room-senior-mode')?.value || 'EXCLUSIVE';

  const payload = {
    nom,
    min_senior: minSen,
    max_senior: maxSen,
    min_resident: minRes,
    max_resident: maxRes,
    min_inf: minInf,
    max_inf: maxInf,
    min_tech: minTech,
    max_tech: maxTech,
    senior_mode: seniorMode,
    mode_compatibilite: 'AUCUNE'
  };

  try {
    const saved = await api.createSalle(payload);
    state.rooms.push(apiRoomToLocal(saved));
    closeAddRoomModal();
    renderRooms();
    renderAll();
    if (window.toast) window.toast('✓ Nouvelle salle créée');
  } catch (err) {
    if (window.toast) window.toast(`🛑 ${err.message || "Erreur de création de la salle"}`);
  }
}

export async function deleteRoom(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  if (!confirm(`Supprimer la salle "${room.nom || room.name}" ?`)) return;
  try {
    if (room.id) {
      await api.deleteSalle(room.id);
    }
    state.rooms.splice(idx, 1);
    renderRooms();
    renderAll();
    if (window.toast) window.toast('✓ Salle supprimée');
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur de suppression de la salle');
  }
}

export function isRoomUnavailableOnDate(salleId, dateStr) {
  return state.indisponibilitesList.some(i => {
    if (Number(i.salle_id) !== Number(salleId)) return false;
    return dateStr >= i.date_debut && dateStr <= i.date_fin;
  });
}

export function renderRooms() {
  const tbody = document.getElementById('rooms-tbody');
  if (!tbody) return;

  tbody.innerHTML = (state.rooms || []).map((room, idx) => {
    const roomIndisps = state.indisponibilitesList.filter(i => Number(i.salle_id) === Number(room.id));
    const isCurrentlyBroken = roomIndisps.length > 0;
    const sMode = room.senior_mode || room.seniorMode || 'EXCLUSIVE';
    const compatCount = (room.compatible_salle_ids || room.seniorCompatibleRooms || []).length;

    return `
      <tr>
        <td><b>${room.nom || room.name}</b></td>
        <td>
          <input type="number" min="0" max="10" value="${room.min_senior ?? room.minSenior ?? 1}" style="width:50px; padding:2px;" onchange="updateRoomProp(${idx}, 'min_senior', this.value)">
          -
          <input type="number" min="0" max="10" value="${room.max_senior ?? room.maxSenior ?? 2}" style="width:50px; padding:2px;" onchange="updateRoomProp(${idx}, 'max_senior', this.value)">
        </td>
        <td>
          <input type="number" min="0" max="10" value="${room.min_resident ?? room.minResident ?? 1}" style="width:50px; padding:2px;" onchange="updateRoomProp(${idx}, 'min_resident', this.value)">
          -
          <input type="number" min="0" max="10" value="${room.max_resident ?? room.maxResident ?? 3}" style="width:50px; padding:2px;" onchange="updateRoomProp(${idx}, 'max_resident', this.value)">
        </td>
        <td>
          <input type="number" min="0" max="10" value="${room.min_inf ?? room.minInf ?? 0}" style="width:50px; padding:2px;" onchange="updateRoomProp(${idx}, 'min_inf', this.value)">
          -
          <input type="number" min="0" max="10" value="${room.max_inf ?? room.maxInf ?? 1}" style="width:50px; padding:2px;" onchange="updateRoomProp(${idx}, 'max_inf', this.value)">
        </td>
        <td>
          <input type="number" min="0" max="10" value="${room.min_tech ?? room.minTech ?? 1}" style="width:50px; padding:2px;" onchange="updateRoomProp(${idx}, 'min_tech', this.value)">
          -
          <input type="number" min="0" max="10" value="${room.max_tech ?? room.maxTech ?? 3}" style="width:50px; padding:2px;" onchange="updateRoomProp(${idx}, 'max_tech', this.value)">
        </td>
        <td>
          <select style="width:170px; padding:4px;" onchange="handleSeniorModeChange(${idx}, this.value)">
            <option value="EXCLUSIVE" ${sMode === 'EXCLUSIVE' ? 'selected' : ''}>Exclusif</option>
            <option value="COMBINABLE" ${sMode === 'COMBINABLE' ? 'selected' : ''}>Combinable (Toutes)</option>
            <option value="SELECTIVE" ${sMode === 'SELECTIVE' || sMode === 'SEULEMENT_CERTAINES' ? 'selected' : ''}>Seulement certaines</option>
          </select>
          ${(sMode === 'SELECTIVE' || sMode === 'SEULEMENT_CERTAINES') ? `
            <button class="btn secondary" style="padding:2px 6px; font-size:11px; margin-left:4px;" onclick="openCompatibilityModal(${idx})">⚙ (${compatCount})</button>
          ` : ''}
        </td>
        <td>
          ${isCurrentlyBroken ? `
            <span style="color:#d9534f; font-weight:600; font-size:12px;">⚠️ ${roomIndisps.length} période(s)</span>
          ` : `
            <span style="color:#5cb85c; font-weight:600; font-size:12px;">✓ Disponible</span>
          `}
          <button class="btn secondary" style="padding:2px 6px; font-size:11px; margin-left:6px;" onclick="openUnavailabilityModal(${idx})">📅 Gérer</button>
        </td>
        <td>
          <button class="btn danger" style="padding:4px 8px; font-size:11px;" onclick="deleteRoom(${idx})">✕</button>
        </td>
      </tr>
    `;
  }).join('');

  const countInd = document.getElementById('count-rooms');
  if (countInd) countInd.textContent = (state.rooms || []).length;
}
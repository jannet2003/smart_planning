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
  window.clearUnavailability        = clearUnavailability;
  window.deleteRoom                 = deleteRoom;
}

// Attachement immédiat sur window au chargement du module
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
window.clearUnavailability        = clearUnavailability;
window.deleteRoom                 = deleteRoom;

// ─────────────────────────────────────────────
// Conversion objet local → payload API backend
// ─────────────────────────────────────────────
function roomToPayload(room) {
  return {
    nom:          room.name || room.nom || '',
    actif:        !room.isBroken,
    min_senior:   Number(room.minSenior)   || 0,
    max_senior:   Number(room.maxSenior)   || 0,
    min_resident: Number(room.minResident) || 0,
    max_resident: Number(room.maxResident) || 0,
    min_inf:      Number(room.minInf)      || 0,
    max_inf:      Number(room.maxInf)      || 0,
    min_tech:     Number(room.minTech)     || 0,
    max_tech:     Number(room.maxTech)     || 0,
    senior_mode:  room.seniorMode          || 'EXCLUSIVE',
    senior_compatible_rooms: Array.isArray(room.seniorCompatibleRooms)
      ? room.seniorCompatibleRooms.join(',')
      : (room.seniorCompatibleRooms || ''),
    is_broken:    !!room.isBroken,
    broken_start: room.brokenStart  || '',
    broken_end:   room.brokenEnd    || '',
    broken_reason: room.brokenReason || ''
  };
}

// ─────────────────────────────────────────────
// Conversion payload API → objet local
// ─────────────────────────────────────────────
export function apiRoomToLocal(r) {
  return {
    id:           r.id,
    name:         r.nom,
    minSenior:    r.min_senior,
    maxSenior:    r.max_senior,
    minResident:  r.min_resident,
    maxResident:  r.max_resident,
    minInf:       r.min_inf,
    maxInf:       r.max_inf,
    minTech:      r.min_tech,
    maxTech:      r.max_tech,
    seniorMode:   r.senior_mode || 'EXCLUSIVE',
    seniorCompatibleRooms: r.senior_compatible_rooms
      ? r.senior_compatible_rooms.split(',').filter(Boolean)
      : [],
    isBroken:     r.is_broken || !r.actif,
    brokenStart:  r.broken_start  || '',
    brokenEnd:    r.broken_end    || '',
    brokenReason: r.broken_reason || ''
  };
}

// ─────────────────────────────────────────────
// Sauvegarde d'une salle en BD (create ou update)
// ─────────────────────────────────────────────
async function persistRoom(room) {
  const payload = roomToPayload(room);
  try {
    if (room.id && typeof room.id === 'number') {
      const updated = await api.updateSalle(room.id, payload);
      return updated;
    } else {
      const created = await api.createSalle(payload);
      return created;
    }
  } catch (err) {
    console.error('Erreur persistRoom:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────
// updateRoomProp : met à jour + sauvegarde en BD
// ─────────────────────────────────────────────
export async function updateRoomProp(idx, prop, rawValue) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  const numericProps = ['minSenior', 'maxSenior', 'minResident', 'maxResident', 'minInf', 'maxInf', 'minTech', 'maxTech'];

  if (numericProps.includes(prop)) {
    const parsed = parseInt(rawValue, 10);
    room[prop] = isNaN(parsed) ? 0 : Math.max(0, parsed);
  } else {
    room[prop] = rawValue;
  }

  try {
    await persistRoom(room);
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur de sauvegarde de la salle');
  }
}

// ─────────────────────────────────────────────
// Mode d'affectation des seniors
// ─────────────────────────────────────────────
export async function handleSeniorModeChange(idx, mode) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  room.seniorMode = mode;
  if (mode !== 'SELECTIVE') {
    room.seniorCompatibleRooms = [];
  }
  renderRooms();
  try {
    await persistRoom(room);
    if (mode === 'SELECTIVE') {
      openCompatibilityModal(idx);
    }
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur lors du changement de mode senior');
  }
}

// ─────────────────────────────────────────────
// Modale de configuration des salles compatibles
// ─────────────────────────────────────────────
export function openCompatibilityModal(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  currentEditingCompatRoomIdx = idx;
  const room = state.rooms[idx];

  const titleEl = document.getElementById('compat-modal-title');
  if (titleEl) titleEl.textContent = `⚙️ Salles compatibles — ${room.name}`;

  const listContainer = document.getElementById('compat-rooms-list');
  if (listContainer) {
    const otherRooms = state.rooms.filter((_, i) => i !== idx);
    if (otherRooms.length === 0) {
      listContainer.innerHTML = '<span style="font-size:12px; color:var(--text-dim);">Aucune autre salle configurée dans l\'application.</span>';
    } else {
      listContainer.innerHTML = otherRooms.map(other => {
        const isChecked = room.seniorCompatibleRooms?.includes(String(other.id)) || room.seniorCompatibleRooms?.includes(String(other.name));
        return `
          <label style="display:flex; align-items:center; gap:10px; margin:0; text-transform:none; font-size:13px; cursor:pointer;">
            <input type="checkbox" class="compat-room-checkbox" value="${other.id || other.name}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; margin:0;">
            <span>${other.name}</span>
          </label>
        `;
      }).join('');
    }
  }

  const modal = document.getElementById('room-compatibility-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeCompatibilityModal() {
  const modal = document.getElementById('room-compatibility-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  currentEditingCompatRoomIdx = null;
}

export async function saveCompatibilityModal() {
  if (currentEditingCompatRoomIdx === null || !state.rooms[currentEditingCompatRoomIdx]) return;
  const room = state.rooms[currentEditingCompatRoomIdx];

  const checkedIds = [];
  document.querySelectorAll('.compat-room-checkbox:checked').forEach(cb => {
    checkedIds.push(cb.value);
  });

  room.seniorCompatibleRooms = checkedIds;

  try {
    await persistRoom(room);
    closeCompatibilityModal();
    renderAll();
    if (window.toast) window.toast(`✓ Salles compatibles configurées pour ${room.name}`);
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur lors de l\'enregistrement des salles compatibles');
  }
}

// ─────────────────────────────────────────────
// Modale de configuration d'indisponibilité
// ─────────────────────────────────────────────
export function openUnavailabilityModal(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  currentEditingUnavailRoomIdx = idx;
  const room = state.rooms[idx];

  const titleEl = document.getElementById('unavail-modal-title');
  if (titleEl) titleEl.textContent = `🛠️ Indisponibilité — ${room.name}`;

  const isBrokenCb = document.getElementById('unavail-is-broken');
  if (isBrokenCb) isBrokenCb.checked = !!room.isBroken;

  const startInput = document.getElementById('unavail-start');
  if (startInput) startInput.value = room.brokenStart || '';

  const endInput = document.getElementById('unavail-end');
  if (endInput) endInput.value = room.brokenEnd || '';

  const reasonInput = document.getElementById('unavail-reason');
  if (reasonInput) reasonInput.value = room.brokenReason || '';

  const modal = document.getElementById('room-unavailability-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeUnavailabilityModal() {
  const modal = document.getElementById('room-unavailability-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  currentEditingUnavailRoomIdx = null;
}

export async function saveUnavailabilityModal() {
  if (currentEditingUnavailRoomIdx === null || !state.rooms[currentEditingUnavailRoomIdx]) return;
  const room = state.rooms[currentEditingUnavailRoomIdx];

  const isBroken = document.getElementById('unavail-is-broken')?.checked ?? true;
  const start = document.getElementById('unavail-start')?.value || '';
  const end = document.getElementById('unavail-end')?.value || '';
  const reason = document.getElementById('unavail-reason')?.value.trim() || '';

  room.isBroken = isBroken;
  room.brokenStart = start;
  room.brokenEnd = end;
  room.brokenReason = reason;

  try {
    await persistRoom(room);
    closeUnavailabilityModal();
    renderAll();
    if (window.toast) window.toast(isBroken ? `⚠ ${room.name} configurée en indisponibilité` : `✓ ${room.name} remise en service`);
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur de sauvegarde de l\'indisponibilité');
  }
}

export async function clearUnavailability(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  room.isBroken = false;
  room.brokenStart = '';
  room.brokenEnd = '';
  room.brokenReason = '';

  try {
    await persistRoom(room);
    renderAll();
    if (window.toast) window.toast(`✓ Indisponibilité retirée pour ${room.name}`);
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur lors de la remise en service');
  }
}

// ─────────────────────────────────────────────
// Modal ajout salle
// ─────────────────────────────────────────────
export function openAddRoomModal() {
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
  const arName = document.getElementById('ar-name');
  if (arName) arName.value = '';
}

export async function submitAddRoom() {
  const nameInput = document.getElementById('ar-name');
  const name = nameInput ? nameInput.value.trim() : '';

  if (!name) {
    if (window.toast) window.toast('⚠ Le nom de la salle est obligatoire');
    return;
  }

  const newRoom = {
    name:         name,
    minSenior:    parseInt(document.getElementById('ar-min-senior')?.value,   10) || 0,
    maxSenior:    parseInt(document.getElementById('ar-max-senior')?.value,   10) || 0,
    minResident:  parseInt(document.getElementById('ar-min-resident')?.value, 10) || 0,
    maxResident:  parseInt(document.getElementById('ar-max-resident')?.value, 10) || 0,
    minInf:       parseInt(document.getElementById('ar-min-inf')?.value,      10) || 0,
    maxInf:       parseInt(document.getElementById('ar-max-inf')?.value,      10) || 0,
    minTech:      parseInt(document.getElementById('ar-min-tech')?.value,     10) || 0,
    maxTech:      parseInt(document.getElementById('ar-max-tech')?.value,     10) || 0,
    seniorMode:   'EXCLUSIVE',
    seniorCompatibleRooms: [],
    isBroken:     false,
    brokenStart:  '',
    brokenEnd:    '',
    brokenReason: ''
  };

  try {
    const saved = await api.createSalle(roomToPayload(newRoom));
    const localRoom = apiRoomToLocal(saved);
    if (!Array.isArray(state.rooms)) state.rooms = [];
    state.rooms.push(localRoom);

    closeAddRoomModal();
    renderAll();
    if (window.toast) window.toast('✓ Nouvelle salle d\'examen configurée et enregistrée');
  } catch (err) {
    console.error(err);
    if (window.toast) window.toast('🛑 Erreur lors de la configuration de la salle');
  }
}

// ─────────────────────────────────────────────
// deleteRoom : supprime de l'état local + BD
// ─────────────────────────────────────────────
export async function deleteRoom(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  if (!confirm(`Voulez-vous vraiment supprimer la salle "${room.name}" ?`)) return;

  try {
    if (room.id && typeof room.id === 'number') {
      await api.deleteSalle(room.id);
    }
    state.rooms.splice(idx, 1);
    renderAll();
    if (window.toast) window.toast(`✓ Salle "${room.name}" supprimée`);
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur lors de la suppression de la salle');
  }
}

// ─────────────────────────────────────────────
// renderRooms : affichage du tableau récapitulatif
// ─────────────────────────────────────────────
export function renderRooms() {
  const tbody = document.getElementById('rooms-tbody');
  if (!tbody) return;

  if (!Array.isArray(state.rooms) || state.rooms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="padding:24px; text-align:center; color:var(--text-dim);">Aucune salle d\'examen configurée. Cliquer sur "+ Ajouter une salle" ci-dessus.</td></tr>';
    return;
  }

  tbody.innerHTML = state.rooms.map((room, idx) => {
    const isBroken = !!room.isBroken;
    const compatCount = (room.seniorCompatibleRooms || []).length;
    const seniorMode = room.seniorMode || 'EXCLUSIVE';

    // Formatage de l'indisponibilité
    let unavailHtml = '';
    if (!isBroken) {
      unavailHtml = `
        <button class="btn-unavail-add" type="button" onclick="openUnavailabilityModal(${idx})" title="Signaler une maintenance ou panne">
          + Indisponibilité
        </button>
      `;
    } else {
      const datesStr = (room.brokenStart || room.brokenEnd)
        ? `${room.brokenStart ? room.brokenStart.substring(5) : ''} → ${room.brokenEnd ? room.brokenEnd.substring(5) : ''}`
        : 'Panne active';
      unavailHtml = `
        <div class="unavail-badge">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <span>Indisponible</span>
            <div style="display:flex; gap:3px;">
              <button type="button" onclick="openUnavailabilityModal(${idx})" style="background:none; border:none; color:#7f1d1d; cursor:pointer; font-size:11px; padding:0;" title="Modifier les détails">✎</button>
              <button type="button" onclick="clearUnavailability(${idx})" style="background:none; border:none; color:#7f1d1d; cursor:pointer; font-size:11px; padding:0;" title="Remettre en service">✕</button>
            </div>
          </div>
          <small style="font-size:10px; opacity:0.85;">${datesStr}</small>
        </div>
      `;
    }

    // Formatage du mode Senior
    let seniorConfigHtml = `
      <select class="room-mode-select" onchange="handleSeniorModeChange(${idx}, this.value)">
        <option value="EXCLUSIVE" ${seniorMode === 'EXCLUSIVE' ? 'selected' : ''}>Exclusif — aucune autre salle</option>
        <option value="COMBINABLE" ${seniorMode === 'COMBINABLE' ? 'selected' : ''}>Combinable — toutes salles</option>
        <option value="SELECTIVE" ${seniorMode === 'SELECTIVE' ? 'selected' : ''}>Seulement avec certaines salles</option>
      </select>
    `;

    if (seniorMode === 'SELECTIVE') {
      seniorConfigHtml += `
        <br>
        <button class="btn-compat-config" type="button" onclick="openCompatibilityModal(${idx})">
          Certaines salles (${compatCount}) ⚙
        </button>
      `;
    }

    return `
      <tr class="${isBroken ? 'broken-row' : ''}">
        <!-- COLONNE STICKY : SALLE & STATUT -->
        <td class="sticky-col">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <strong style="font-size:14px; font-weight:700; color:var(--text-primary);">${room.name || 'Salle sans nom'}</strong>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="status-badge ${isBroken ? 'hors_service' : 'actif'}" style="font-size:10px; padding:2px 6px;">
                ${isBroken ? 'Hors Service' : 'Opérationnel'}
              </span>
            </div>
          </div>
        </td>

        <!-- SENIORS MIN / MAX -->
        <td style="text-align:center;">
          <input type="number" class="room-num-input" min="0" value="${room.minSenior ?? 0}" onchange="updateRoomProp(${idx}, 'minSenior', this.value)">
        </td>
        <td style="text-align:center;">
          <input type="number" class="room-num-input" min="0" value="${room.maxSenior ?? 0}" onchange="updateRoomProp(${idx}, 'maxSenior', this.value)">
        </td>

        <!-- RÉSIDENTS MIN / MAX -->
        <td style="text-align:center;">
          <input type="number" class="room-num-input" min="0" value="${room.minResident ?? 0}" onchange="updateRoomProp(${idx}, 'minResident', this.value)">
        </td>
        <td style="text-align:center;">
          <input type="number" class="room-num-input" min="0" value="${room.maxResident ?? 0}" onchange="updateRoomProp(${idx}, 'maxResident', this.value)">
        </td>

        <!-- INFIRMIERS MIN / MAX -->
        <td style="text-align:center;">
          <input type="number" class="room-num-input" min="0" value="${room.minInf ?? 0}" onchange="updateRoomProp(${idx}, 'minInf', this.value)">
        </td>
        <td style="text-align:center;">
          <input type="number" class="room-num-input" min="0" value="${room.maxInf ?? 0}" onchange="updateRoomProp(${idx}, 'maxInf', this.value)">
        </td>

        <!-- TECHNICIENS MIN / MAX -->
        <td style="text-align:center;">
          <input type="number" class="room-num-input" min="0" value="${room.minTech ?? 0}" onchange="updateRoomProp(${idx}, 'minTech', this.value)">
        </td>
        <td style="text-align:center;">
          <input type="number" class="room-num-input" min="0" value="${room.maxTech ?? 0}" onchange="updateRoomProp(${idx}, 'maxTech', this.value)">
        </td>

        <!-- AFFECTATION SENIORS -->
        <td>
          ${seniorConfigHtml}
        </td>

        <!-- INDISPONIBILITÉ -->
        <td>
          ${unavailHtml}
        </td>

        <!-- ACTIONS -->
        <td style="text-align:center;">
          <button class="btn danger" type="button" style="padding:4px 8px; font-size:12px;" onclick="deleteRoom(${idx})" title="Supprimer la salle">
            🗑
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
import { state, renderAll } from '../state.js';
import * as api from '../api/api.js';

export function initRooms() {
  window.openAddRoomModal   = openAddRoomModal;
  window.closeAddRoomModal  = closeAddRoomModal;
  window.submitAddRoom      = submitAddRoom;
  window.saveRoomMaintenance = saveRoomMaintenance;
  window.setSeniorRoomMode  = setSeniorRoomMode;
  window.setSeniorRoomCompatibility = setSeniorRoomCompatibility;
  window.renderRooms        = renderRooms;
  window.updateRoomProp     = updateRoomProp;
  window.toggleRoomBroken   = toggleRoomBroken;
  window.deleteRoom         = deleteRoom;
}

// ─────────────────────────────────────────────
// Conversion objet local → payload API backend
// ─────────────────────────────────────────────
function roomToPayload(room) {
  return {
    nom:          room.name || room.nom || '',
    type_salle:   room.type_salle || room.name || '',
    code:         room.code || '',
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
    type_salle:   r.type_salle,
    code:         r.code || r.type_salle,
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
      // Mise à jour salle existante
      const updated = await api.updateSalle(room.id, payload);
      return updated;
    } else {
      // Création nouvelle salle
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
// toggleRoomBroken : panne/opérationnel
// ─────────────────────────────────────────────
export async function toggleRoomBroken(idx, checked) {
  if (!state.rooms || !state.rooms[idx]) return;
  state.rooms[idx].isBroken = checked;
  renderRooms();
  try {
    await persistRoom(state.rooms[idx]);
    if (window.toast) window.toast(checked ? '⚠ Salle signalée en panne' : '✓ Salle remise en service');
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur de mise à jour du statut de la salle');
  }
}

// ─────────────────────────────────────────────
// Modal ajout salle
// ─────────────────────────────────────────────
export function openAddRoomModal() {
  document.getElementById('add-room-modal')?.classList.add('active');
}

export function closeAddRoomModal() {
  document.getElementById('add-room-modal')?.classList.remove('active');
  const arName = document.getElementById('ar-name');
  if (arName) arName.value = '';
}

export async function submitAddRoom() {
  const nameInput = document.getElementById('ar-name');
  const name = nameInput ? nameInput.value.trim() : '';
  const code = document.getElementById('ar-code')?.value || 'SCAN_M';

  if (!name) {
    if (window.toast) window.toast('⚠ Le nom de la salle est obligatoire');
    return;
  }

  const newRoom = {
    // Champs locaux
    name:         name,
    code:         code,
    type_salle:   code,
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
    // Sauvegarde en BD (pas d'id → création)
    const saved = await api.createSalle(roomToPayload(newRoom));
    // Ajouter dans le state avec l'id retourné par la BD
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
// saveRoomMaintenance : sauvegarde les dates de panne
// ─────────────────────────────────────────────
export async function saveRoomMaintenance(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  room.brokenStart  = document.getElementById(`room-broken-start-${idx}`)?.value  || '';
  room.brokenEnd    = document.getElementById(`room-broken-end-${idx}`)?.value    || '';
  room.brokenReason = document.getElementById(`room-broken-reason-${idx}`)?.value.trim() || '';

  try {
    await persistRoom(room);
    if (window.toast) window.toast(`✓ Maintenance enregistrée pour ${room.name}`);
    renderAll();
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur lors de la sauvegarde de la maintenance');
  }
}

// ─────────────────────────────────────────────
// setSeniorRoomMode + setSeniorRoomCompatibility
// ─────────────────────────────────────────────
export async function setSeniorRoomMode(idx, mode) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  room.seniorMode = mode;
  if (mode !== 'SELECTIVE') room.seniorCompatibleRooms = [];
  renderRooms();
  try {
    await persistRoom(room);
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur de sauvegarde du mode senior');
  }
}

export async function setSeniorRoomCompatibility(idx, roomId, checked) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  room.seniorCompatibleRooms = room.seniorCompatibleRooms || [];
  if (checked && !room.seniorCompatibleRooms.includes(roomId)) {
    room.seniorCompatibleRooms.push(roomId);
  } else if (!checked) {
    room.seniorCompatibleRooms = room.seniorCompatibleRooms.filter(id => id !== roomId);
  }
  try {
    await persistRoom(room);
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur de sauvegarde de la compatibilité');
  }
}

// ─────────────────────────────────────────────
// deleteRoom : supprime de l'état local + BD
// ─────────────────────────────────────────────
export async function deleteRoom(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
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
// renderRooms : affichage du tableau de configuration
// ─────────────────────────────────────────────
export function renderRooms() {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;

  if (!Array.isArray(state.rooms) || state.rooms.length === 0) {
    grid.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-dim);">Aucune salle configurée.</div>';
    return;
  }

  grid.innerHTML = state.rooms.map((room, idx) => `
    <div class="room-card ${room.isBroken ? 'broken' : ''}">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-soft); padding-bottom:10px;">
        <span style="font-weight:700; font-size:15px; font-family:var(--disp);">${room.name || 'Salle sans nom'}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="status-badge ${room.isBroken ? 'hors_service' : 'actif'}">${room.isBroken ? 'En Panne' : 'Opérationnel'}</span>
          <button class="btn danger" style="padding:4px 8px; font-size:11px;" onclick="deleteRoom(${idx})" title="Supprimer la salle">✕</button>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        <div style="display:grid; grid-template-columns:auto 1fr 1fr; gap:6px; align-items:center; font-size:11px; font-weight:600; color:var(--text-dim); margin-bottom:2px;">
          <span></span><span style="text-align:center;">Min</span><span style="text-align:center;">Max</span>
        </div>
        <div class="minmax-row">
          <span>Seniors</span>
          <input type="number" min="0" value="${room.minSenior ?? 0}" onchange="updateRoomProp(${idx}, 'minSenior', this.value)">
          <input type="number" min="0" value="${room.maxSenior ?? 0}" onchange="updateRoomProp(${idx}, 'maxSenior', this.value)">
        </div>
        <div class="minmax-row">
          <span>Résidents</span>
          <input type="number" min="0" value="${room.minResident ?? 0}" onchange="updateRoomProp(${idx}, 'minResident', this.value)">
          <input type="number" min="0" value="${room.maxResident ?? 0}" onchange="updateRoomProp(${idx}, 'maxResident', this.value)">
        </div>
        <div class="minmax-row">
          <span>Infirmiers</span>
          <input type="number" min="0" value="${room.minInf ?? 0}" onchange="updateRoomProp(${idx}, 'minInf', this.value)">
          <input type="number" min="0" value="${room.maxInf ?? 0}" onchange="updateRoomProp(${idx}, 'maxInf', this.value)">
        </div>
        <div class="minmax-row">
          <span>Techniciens</span>
          <input type="number" min="0" value="${room.minTech ?? 0}" onchange="updateRoomProp(${idx}, 'minTech', this.value)">
          <input type="number" min="0" value="${room.maxTech ?? 0}" onchange="updateRoomProp(${idx}, 'maxTech', this.value)">
        </div>
      </div>
      <div style="margin-top:12px; padding:10px; background:var(--panel-2); border:1px solid var(--border-soft); border-radius:6px;">
        <label style="margin:0 0 6px; font-size:10px;">AFFECTATION D'UN SENIOR</label>
        <select style="font-size:11px; padding:7px;" onchange="setSeniorRoomMode(${idx}, this.value)">
          <option value="EXCLUSIVE"  ${(room.seniorMode || 'EXCLUSIVE') === 'EXCLUSIVE'  ? 'selected' : ''}>Exclusif — aucune autre salle</option>
          <option value="COMBINABLE" ${room.seniorMode === 'COMBINABLE' ? 'selected' : ''}>Combinable — toutes les salles compatibles</option>
          <option value="SELECTIVE"  ${room.seniorMode === 'SELECTIVE'  ? 'selected' : ''}>Seulement avec certaines salles</option>
        </select>
        <div style="font-size:10px; color:var(--text-faint); margin-top:7px;">Le min./max. indique le personnel nécessaire dans cette salle.</div>
        ${room.seniorMode === 'SELECTIVE' ? `
          <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;">
            ${state.rooms.filter(other => other.id !== room.id).map(other => `
              <label style="display:flex; align-items:center; gap:4px; margin:0; text-transform:none; font-size:10px; cursor:pointer;">
                <input type="checkbox" style="width:auto; margin:0;" ${room.seniorCompatibleRooms?.includes(String(other.id)) ? 'checked' : ''} onchange="setSeniorRoomCompatibility(${idx}, '${other.id}', this.checked)">${other.name}
              </label>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div style="margin-top:10px; padding-top:10px; border-top: 1px solid var(--border-soft);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; font-weight:600; color:var(--text-dim)">Signaler une indisponibilité :</span>
          <input type="checkbox" ${room.isBroken ? 'checked' : ''} onchange="toggleRoomBroken(${idx}, this.checked)" style="width:18px; height:18px; margin:0; cursor:pointer;">
        </div>
        ${room.isBroken ? `
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:12px; background:rgba(220,38,38,0.05); padding:10px; border-radius:6px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div><label style="margin-top:0; font-size:9px; color:var(--red);">Début</label><input type="date" id="room-broken-start-${idx}" value="${room.brokenStart || ''}"></div>
              <div><label style="margin-top:0; font-size:9px; color:var(--red);">Fin</label><input type="date" id="room-broken-end-${idx}" value="${room.brokenEnd || ''}"></div>
            </div>
            <div><label style="margin-top:0; font-size:9px; color:var(--red);">Raison</label><input type="text" id="room-broken-reason-${idx}" value="${room.brokenReason || ''}"></div>
            <button class="btn block" style="background-color: var(--red); margin-top:6px; padding: 6px 12px; font-size: 11px;" onclick="saveRoomMaintenance(${idx})">💾 Enregistrer la maintenance</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}
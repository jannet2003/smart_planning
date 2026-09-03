import { state, renderAll } from '../state.js';
import * as api from '../api/api.js';
import { formatDateDMY } from '../utils/helpers.js';

// ─────────────────────────────────────────────
// État interne du module
// ─────────────────────────────────────────────
let currentEditingCompatRoomIdx = null;
let currentEditingUnavailRoomIdx = null; // pour modal ajout (section 2)
let currentEditingUnavailId = null;      // pour édition d'une période existante
let currentDrawerRoomIdx = null;         // pour le drawer détaillé

// Section active de la sidebar rooms (capacites | indisponibilites)
let activeRoomsSection = 'capacites';

export function initRooms() {
  window.openAddRoomModal           = openAddRoomModal;
  window.closeAddRoomModal          = closeAddRoomModal;
  window.submitAddRoom              = submitAddRoom;
  window.renderRooms                = renderRooms;
  window.renderRoomsUnavailability  = renderRoomsUnavailability;
  window.renderRoomsCreneaux        = renderRoomsCreneaux;
  window.updateRoomProp             = updateRoomProp;
  window.updateRoomCreneau          = updateRoomCreneau;
  window.handleSeniorModeChange     = handleSeniorModeChange;
  window.openCompatibilityModal     = openCompatibilityModal;
  window.closeCompatibilityModal    = closeCompatibilityModal;
  window.saveCompatibilityModal     = saveCompatibilityModal;
  window.deleteRoom                 = deleteRoom;
  window.switchRoomsSubSection      = switchRoomsSubSection;
  window.openUnavailDrawer          = openUnavailDrawer;
  window.closeUnavailDrawer         = closeUnavailDrawer;
  window.openAddUnavailModal        = openAddUnavailModal;
  window.closeUnavailModal          = closeUnavailModal;
  window.saveUnavailModal           = saveUnavailModal;
  window.deleteUnavailPeriod        = deleteUnavailPeriod;
  // Compatibilité avec les anciens appels
  window.openUnavailabilityModal    = (idx) => openUnavailDrawer(idx);
  window.closeUnavailabilityModal   = closeUnavailDrawer;
  window.clearUnavailability        = clearUnavailability;
}

// Attachement immédiat sur window au chargement du module
window.openAddRoomModal           = openAddRoomModal;
window.closeAddRoomModal          = closeAddRoomModal;
window.submitAddRoom              = submitAddRoom;
window.renderRooms                = renderRooms;
window.renderRoomsUnavailability  = renderRoomsUnavailability;
window.renderRoomsCreneaux        = renderRoomsCreneaux;
window.updateRoomProp             = updateRoomProp;
window.updateRoomCreneau          = updateRoomCreneau;
window.handleSeniorModeChange     = handleSeniorModeChange;
window.openCompatibilityModal     = openCompatibilityModal;
window.closeCompatibilityModal    = closeCompatibilityModal;
window.saveCompatibilityModal     = saveCompatibilityModal;
window.deleteRoom                 = deleteRoom;
window.switchRoomsSubSection      = switchRoomsSubSection;
window.openUnavailDrawer          = openUnavailDrawer;
window.closeUnavailDrawer         = closeUnavailDrawer;
window.openAddUnavailModal        = openAddUnavailModal;
window.closeUnavailModal          = closeUnavailModal;
window.saveUnavailModal           = saveUnavailModal;
window.deleteUnavailPeriod        = deleteUnavailPeriod;
window.openUnavailabilityModal    = (idx) => openUnavailDrawer(idx);
window.closeUnavailabilityModal   = closeUnavailDrawer;
window.clearUnavailability        = clearUnavailability;
window.saveUnavailabilityModal    = saveUnavailModal; // compat alias

// ─────────────────────────────────────────────
// Navigation sidebar
// ─────────────────────────────────────────────
export function switchRoomsSubSection(section) {
  activeRoomsSection = section;

  document.querySelectorAll('.rooms-subnav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  const s1 = document.getElementById('rooms-section-capacites');
  const s2 = document.getElementById('rooms-section-indisponibilites');
  const s3 = document.getElementById('rooms-section-creneaux');
  if (s1) s1.classList.toggle('rooms-subsection-active', section === 'capacites');
  if (s2) s2.classList.toggle('rooms-subsection-active', section === 'indisponibilites');
  if (s3) s3.classList.toggle('rooms-subsection-active', section === 'creneaux');
}

// ─────────────────────────────────────────────
// Logique métier : statut temporel
// ─────────────────────────────────────────────
// Sentinel pour "sans date de fin" (indéfinie / en cours jusqu'à nouvel ordre)
const OPEN_END_DATE = '9999-12-31';

function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

/** Retourne true si la date_fin représente une période ouverte (sans fin définie). */
function isOpenEnd(dateFin) {
  return !dateFin || dateFin === OPEN_END_DATE || dateFin.startsWith('9999');
}

/**
 * Calcule dynamiquement le statut temporel d'une période.
 * Une période sans date_fin est toujours EN_COURS si date_debut <= aujourd'hui.
 * @returns {'EN_COURS'|'A_VENIR'|'TERMINEE'}
 */
function getUnavailStatus(periode) {
  const today = todayDate();
  const debut = parseDate(periode.date_debut);
  if (!debut) return 'TERMINEE';
  if (isOpenEnd(periode.date_fin)) {
    // Pas de fin : EN_COURS si déjà commencé, À VENIR sinon
    return debut <= today ? 'EN_COURS' : 'A_VENIR';
  }
  const fin = parseDate(periode.date_fin);
  if (!fin) return 'TERMINEE';
  if (today >= debut && today <= fin) return 'EN_COURS';
  if (debut > today) return 'A_VENIR';
  return 'TERMINEE';
}

/**
 * Sélectionne la période "principale" à afficher dans le badge.
 * Priorité : EN_COURS > A_VENIR (la plus proche).
 * Les périodes TERMINÉES ne sont pas affichées en badge.
 */
function getPrimaryUnavail(periodes) {
  const active = periodes.find(p => getUnavailStatus(p) === 'EN_COURS');
  if (active) return active;
  const future = periodes
    .filter(p => getUnavailStatus(p) === 'A_VENIR')
    .sort((a, b) => (a.date_debut || '').localeCompare(b.date_debut || ''));
  return future[0] || null;
}

/**
 * Retourne true si la salle a une indisponibilité EN COURS AUJOURD'HUI.
 * Utilisé pour le badge "Hors service" de la section 1.
 */
function isRoomUnavailableToday(roomId) {
  if (!Array.isArray(state.indisponibilitesList)) return false;
  return state.indisponibilitesList
    .filter(p => p.salle_id === roomId)
    .some(p => getUnavailStatus(p) === 'EN_COURS');
}

/**
 * Retourne toutes les indisponibilités d'une salle depuis l'état global.
 */
function getRoomPeriodes(roomId) {
  if (!Array.isArray(state.indisponibilitesList)) return [];
  return state.indisponibilitesList.filter(p => p.salle_id === roomId);
}

// ─────────────────────────────────────────────
// Génération de badge pour une période
// ─────────────────────────────────────────────
function getBadgeClass(periode) {
  const status = getUnavailStatus(periode);
  if (status === 'EN_COURS') return 'unavail-badge-en-cours';
  if (status === 'A_VENIR')  return 'unavail-badge-a-venir';
  return 'unavail-badge-termine';
}

/**
 * Formate la raison pour l'affichage compact (tronquée à 40 chars).
 */
function truncateRaison(raison, maxLen = 40) {
  if (!raison) return 'Indisponibilité';
  return raison.length > maxLen ? raison.slice(0, maxLen).trimEnd() + '…' : raison;
}

/**
 * Construit le badge HTML compact pour la colonne Statut.
 * Affiche la raison (tronquée) + indicateur temporel.
 */
function buildPeriodeBadgeHtml(periode) {
  const status = getUnavailStatus(periode);
  const badgeClass = getBadgeClass(periode);
  const raison = truncateRaison(periode.raison);

  let icon, suffix;
  if (status === 'EN_COURS') {
    icon   = '🔴';
    suffix = isOpenEnd(periode.date_fin)
      ? '— en cours'
      : `— jusqu'au ${formatDateDMY(periode.date_fin)}`;
  } else if (status === 'A_VENIR') {
    icon   = '🟠';
    suffix = `— à partir du ${formatDateDMY(periode.date_debut)}`;
  } else {
    icon   = '✓';
    suffix = `${formatDateDMY(periode.date_debut)} → ${formatDateDMY(periode.date_fin)}`;
  }

  const fullTitle = `${periode.raison || 'Indisponibilité'} ${suffix}`;
  return `<span class="unavail-badge ${badgeClass}" title="${fullTitle}">${icon} ${raison} ${suffix}</span>`;
}

// ─────────────────────────────────────────────
// Conversion objet local → payload API backend
// ─────────────────────────────────────────────
function roomToPayload(room) {
  return {
    nom:          room.name || room.nom || '',
    actif:        true,
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
    is_broken:    false,
    broken_start: '',
    broken_end:   '',
    broken_reason: '',
    // Disponibilité par créneaux
    ouvert_matin_semaine:      room.ouvertMatinSemaine      !== false,
    ouvert_apres_midi_semaine: room.ouvertApresMidiSemaine  !== false,
    ouvert_nuit_semaine:       room.ouvertNuitSemaine        !== false,
    ouvert_samedi_matin:       room.ouvertSamediMatin        !== false,
    ouvert_samedi_apres_midi:  room.ouvertSamediApresMidi   !== false,
    ouvert_samedi_nuit:        room.ouvertSamediNuit         !== false,
    ouvert_dimanche:           room.ouvertDimanche           !== false,
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
    isBroken:     r.is_broken || false,
    brokenStart:  r.broken_start  || '',
    brokenEnd:    r.broken_end    || '',
    brokenReason: r.broken_reason || '',
    // Disponibilité par créneaux (défaut true si absent de l'API)
    ouvertMatinSemaine:     r.ouvert_matin_semaine      !== false,
    ouvertApresMidiSemaine: r.ouvert_apres_midi_semaine  !== false,
    ouvertNuitSemaine:      r.ouvert_nuit_semaine        !== false,
    ouvertSamediMatin:      r.ouvert_samedi_matin        !== false,
    ouvertSamediApresMidi:  r.ouvert_samedi_apres_midi   !== false,
    ouvertSamediNuit:       r.ouvert_samedi_nuit         !== false,
    ouvertDimanche:         r.ouvert_dimanche            !== false,
  };
}

// ─────────────────────────────────────────────
// Sauvegarde d'une salle en BD (create ou update)
// ─────────────────────────────────────────────
async function persistRoom(room) {
  const payload = roomToPayload(room);
  try {
    if (room.id && typeof room.id === 'number') {
      return await api.updateSalle(room.id, payload);
    } else {
      return await api.createSalle(payload);
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
    name,
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
    isBroken: false,
    brokenStart: '',
    brokenEnd: '',
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
    if (window.toast) window.toast(`🛑 ${err.message || 'Erreur lors de la configuration de la salle'}`);
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
    // Nettoyer les indisponibilités de cette salle de l'état local
    if (Array.isArray(state.indisponibilitesList)) {
      state.indisponibilitesList = state.indisponibilitesList.filter(p => p.salle_id !== room.id);
    }
    renderAll();
    if (window.toast) window.toast(`✓ Salle "${room.name}" supprimée`);
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur lors de la suppression de la salle');
  }
}

// Compatibilité (ancienne API, ne fait plus rien de destructeur)
export async function clearUnavailability(idx) {
  if (window.toast) window.toast('ℹ️ Gérez les indisponibilités depuis l\'onglet dédié');
}

// ─────────────────────────────────────────────
// SECTION 1 : Paramétrage & capacités
// renderRooms — tableau existant sans colonne Indisponibilité
// ─────────────────────────────────────────────
export function renderRooms() {
  const tbody = document.getElementById('rooms-tbody');
  if (!tbody) return;

  if (!Array.isArray(state.rooms) || state.rooms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="padding:24px; text-align:center; color:var(--text-dim);">Aucune salle d\'examen configurée. Cliquer sur \"+ Ajouter une salle\" ci-dessus.</td></tr>';
    return;
  }

  tbody.innerHTML = state.rooms.map((room, idx) => {
    const isBrokenToday = isRoomUnavailableToday(room.id);
    const compatCount = (room.seniorCompatibleRooms || []).length;
    const seniorMode = room.seniorMode || 'EXCLUSIVE';

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
      <tr class="${isBrokenToday ? 'broken-row' : ''}">
        <!-- COLONNE STICKY : SALLE & STATUT -->
        <td class="sticky-col">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <strong style="font-size:14px; font-weight:700; color:var(--text-primary);">${room.name || 'Salle sans nom'}</strong>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="status-badge ${isBrokenToday ? 'hors_service' : 'actif'}" style="font-size:10px; padding:2px 6px;">
                ${isBrokenToday ? 'Hors Service' : 'Opérationnel'}
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

// ─────────────────────────────────────────────
// SECTION 2 : Indisponibilité et maintenance
// renderRoomsUnavailability — tableau 2 colonnes
// ─────────────────────────────────────────────
export function renderRoomsUnavailability() {
  const tbody = document.getElementById('unavail-rooms-tbody');
  if (!tbody) return;

  if (!Array.isArray(state.rooms) || state.rooms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="padding:24px; text-align:center; color:var(--text-dim);">Aucune salle configurée.</td></tr>';
    return;
  }

  tbody.innerHTML = state.rooms.map((room, idx) => {
    const isBrokenToday = isRoomUnavailableToday(room.id);
    const allPeriodes = getRoomPeriodes(room.id);
    const visiblePeriodes = allPeriodes.filter(p => getUnavailStatus(p) !== 'TERMINEE');
    const primaryPeriode = getPrimaryUnavail(visiblePeriodes);

    // Colonne 1 — SALLE : nom + badge statut
    const salleHtml = `
      <div class="unavail-room-name">
        <strong>${room.name || 'Salle sans nom'}</strong>
        <span class="status-badge ${isBrokenToday ? 'hors_service' : 'actif'}" style="font-size:10px; padding:2px 6px;">
          ${isBrokenToday ? 'Hors service' : 'Opérationnel'}
        </span>
      </div>`;

    // Colonne 2 — STATUT / INDISPONIBILITÉ
    let statutHtml = '';
    if (!primaryPeriode) {
      statutHtml = `
        <span class="unavail-disponible">
          <span class="unavail-disponible-icon">✓</span>
          Disponible
        </span>`;
    } else {
      const extraCount = visiblePeriodes.length - 1;
      const badgeHtml = buildPeriodeBadgeHtml(primaryPeriode);
      const extraBtn = extraCount > 0
        ? `<button class="btn-more-unavail" type="button" onclick="openUnavailDrawer(${idx})" title="Voir toutes les périodes">+${extraCount} autre${extraCount > 1 ? 's' : ''}</button>`
        : '';
      statutHtml = `
        <div class="unavail-badges-row" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          ${badgeHtml}
          ${extraBtn}
        </div>`;
    }

    // Colonne 3 — ACTIONS : toujours visibles
    const actionsHtml = `
      <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
        <button class="btn-add-unavail" type="button" onclick="openAddUnavailModal(${idx})" title="Ajouter une période d'indisponibilité">
          + Ajouter
        </button>
        <button class="btn-drawer-open" type="button" onclick="openUnavailDrawer(${idx})" title="Voir l'historique">
          ···
        </button>
      </div>`;

    return `
      <tr class="unavail-row">
        <td class="unavail-td-salle">${salleHtml}</td>
        <td class="unavail-td-statut" style="vertical-align:middle;">${statutHtml}</td>
        <td style="text-align:center; vertical-align:middle; white-space:nowrap;">${actionsHtml}</td>
      </tr>`;
  }).join('');
}

// ─────────────────────────────────────────────
// DRAWER DÉTAILLÉ
// ─────────────────────────────────────────────
export function openUnavailDrawer(idx) {
  if (!state.rooms || !state.rooms[idx]) return;
  currentDrawerRoomIdx = idx;
  window._drawerRoomIdx = idx; // Bridge pour le bouton HTML inline
  const room = state.rooms[idx];

  const drawerTitle = document.getElementById('unavail-drawer-title');
  if (drawerTitle) drawerTitle.textContent = `🛠 ${room.name} — Indisponibilités`;

  _renderDrawerContent(idx);

  const drawer = document.getElementById('unavail-drawer');
  const overlay = document.getElementById('unavail-drawer-overlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeUnavailDrawer() {
  const drawer = document.getElementById('unavail-drawer');
  const overlay = document.getElementById('unavail-drawer-overlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
  currentDrawerRoomIdx = null;
}

function _renderDrawerContent(idx) {
  const room = state.rooms[idx];
  if (!room) return;

  const list = document.getElementById('unavail-drawer-list');
  if (!list) return;

  const allPeriodes = getRoomPeriodes(room.id).sort((a, b) => {
    // Tri : EN_COURS en premier, A_VENIR ensuite, TERMINEE à la fin
    const order = { EN_COURS: 0, A_VENIR: 1, TERMINEE: 2 };
    const sa = order[getUnavailStatus(a)] ?? 3;
    const sb = order[getUnavailStatus(b)] ?? 3;
    if (sa !== sb) return sa - sb;
    return (a.date_debut || '').localeCompare(b.date_debut || '');
  });

  if (allPeriodes.length === 0) {
    list.innerHTML = `
      <div class="drawer-empty">
        <span style="font-size:32px;">📋</span>
        <p>Aucune indisponibilité enregistrée pour cette salle.</p>
      </div>`;
    return;
  }

  list.innerHTML = allPeriodes.map(periode => {
    const status = getUnavailStatus(periode);
    const isTerminee = status === 'TERMINEE';

    // Ligne de dates : affiche "en cours" si pas de fin définie
    const dateLine = isOpenEnd(periode.date_fin)
      ? `📅 Depuis le ${formatDateDMY(periode.date_debut)} — <em>en cours</em>`
      : `📅 ${formatDateDMY(periode.date_debut)} → ${formatDateDMY(periode.date_fin)}`;

    const actionsBtns = isTerminee
      ? `<span class="unavail-readonly-label">Archivé</span>`
      : `
        <button class="btn-drawer-edit" type="button" onclick="openAddUnavailModal(${idx}, ${periode.id})" title="Modifier">✎</button>
        <button class="btn-drawer-delete" type="button" onclick="deleteUnavailPeriod(${periode.id}, ${room.id})" title="Supprimer">🗑</button>
      `;

    return `
      <div class="drawer-periode-item ${isTerminee ? 'drawer-periode-terminee' : ''}" data-id="${periode.id}">
        <div class="drawer-periode-top">
          <div class="drawer-periode-info">
            <span class="drawer-periode-type-icon">${status === 'EN_COURS' ? '🔴' : status === 'A_VENIR' ? '🟠' : '✓'}</span>
            <div>
              <div class="drawer-periode-type-label">${periode.raison || 'Indisponibilité'}</div>
              <div class="drawer-periode-dates">${dateLine}</div>
            </div>
          </div>
          <div class="drawer-periode-right">
            <span class="drawer-status-badge ${
              status === 'EN_COURS' ? 'status-en-cours' :
              status === 'A_VENIR'  ? 'status-a-venir'  :
              'status-termine'
            }">${
              status === 'EN_COURS' ? '● En cours' :
              status === 'A_VENIR'  ? '⏰ À venir' :
              '✓ Terminée'
            }</span>
            <div class="drawer-periode-actions">${actionsBtns}</div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// MODAL AJOUT / ÉDITION D'UNE PÉRIODE
// ─────────────────────────────────────────────
export function openAddUnavailModal(roomIdx, periodId = null) {
  currentEditingUnavailRoomIdx = roomIdx;
  currentEditingUnavailId = periodId;

  const room = state.rooms[roomIdx];
  if (!room) return;

  const title = document.getElementById('unavail-modal-room-name');
  if (title) {
    title.textContent = periodId
      ? `✎ Modifier l'indisponibilité — ${room.name}`
      : `➕ Nouvelle indisponibilité — ${room.name}`;
  }

  // Pré-remplir si édition
  let periode = null;
  if (periodId !== null) {
    periode = (state.indisponibilitesList || []).find(p => p.id === periodId);
  }

  const startEl  = document.getElementById('unavail-start');
  const endEl    = document.getElementById('unavail-end');
  const reasonEl = document.getElementById('unavail-reason');

  if (startEl) {
    const val = periode?.date_debut || '';
    if (startEl._flatpickr) startEl._flatpickr.setDate(val, true);
    else startEl.value = val;
  }
  if (endEl) {
    // Si la date de fin est la sentinelle "ouverte", laisser le champ vide
    const rawEnd = periode?.date_fin || '';
    const displayEnd = isOpenEnd(rawEnd) ? '' : rawEnd;
    if (endEl._flatpickr) endEl._flatpickr.setDate(displayEnd, true);
    else endEl.value = displayEnd;
  }
  if (reasonEl) reasonEl.value = periode?.raison || '';

  const modal = document.getElementById('room-unavail-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeUnavailModal() {
  const modal = document.getElementById('room-unavail-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  currentEditingUnavailRoomIdx = null;
  currentEditingUnavailId = null;
}

export async function saveUnavailModal() {
  if (currentEditingUnavailRoomIdx === null) return;
  const room = state.rooms[currentEditingUnavailRoomIdx];
  if (!room) return;

  const start  = document.getElementById('unavail-start')?.value || '';
  const end    = document.getElementById('unavail-end')?.value || '';
  const reason = document.getElementById('unavail-reason')?.value.trim() || '';

  if (!start) {
    if (window.toast) window.toast('⚠ La date de début est obligatoire');
    return;
  }
  if (!reason) {
    if (window.toast) window.toast('⚠ La raison est obligatoire (décrivez la cause de l\'indisponibilité)');
    return;
  }
  // Si une date de fin est fournie, vérifier qu'elle est >= date de début
  if (end && end < start) {
    if (window.toast) window.toast('⚠ La date de fin doit être après ou égale à la date de début');
    return;
  }

  // Date de fin vide → sentinelle "sans fin définie"
  const dateFin = end || OPEN_END_DATE;

  const payload = {
    salle_id: room.id,
    date_debut: start,
    date_fin: dateFin,
    raison: reason,
    type_indisponibilite: 'maintenance', // champ conservé en base, non exposé
  };

  try {
    let saved;
    if (currentEditingUnavailId !== null) {
      // Mise à jour d'une période existante
      saved = await api.updateIndisponibilite(currentEditingUnavailId, payload);
      // Mettre à jour dans l'état local
      if (Array.isArray(state.indisponibilitesList)) {
        const idx = state.indisponibilitesList.findIndex(p => p.id === currentEditingUnavailId);
        if (idx !== -1) state.indisponibilitesList[idx] = saved;
      }
      if (window.toast) window.toast('✓ Indisponibilité modifiée');
    } else {
      // Création d'une nouvelle période
      saved = await api.createIndisponibilite(payload);
      if (!Array.isArray(state.indisponibilitesList)) state.indisponibilitesList = [];
      state.indisponibilitesList.push(saved);
      if (window.toast) window.toast(`⚠ ${room.name} : nouvelle indisponibilité enregistrée`);
    }

    closeUnavailModal();
    // Si le drawer est ouvert sur la même salle, le re-rendre
    if (currentDrawerRoomIdx === currentEditingUnavailRoomIdx) {
      _renderDrawerContent(currentDrawerRoomIdx);
    }
    renderRoomsUnavailability();
    renderRooms(); // Mettre à jour le badge dans la section 1
  } catch (err) {
    console.error(err);
    if (window.toast) window.toast(`🛑 ${err.message || 'Erreur de sauvegarde'}`);
  }
}

export async function deleteUnavailPeriod(periodId, roomId) {
  if (!confirm('Voulez-vous vraiment supprimer cette période d\'indisponibilité ?')) return;

  try {
    await api.deleteIndisponibilite(periodId);
    // Retirer de l'état local
    if (Array.isArray(state.indisponibilitesList)) {
      state.indisponibilitesList = state.indisponibilitesList.filter(p => p.id !== periodId);
    }
    // Rafraîchir le drawer si ouvert
    if (currentDrawerRoomIdx !== null) {
      _renderDrawerContent(currentDrawerRoomIdx);
    }
    renderRoomsUnavailability();
    renderRooms();
    if (window.toast) window.toast('✓ Période supprimée');
  } catch (err) {
    if (window.toast) window.toast('🛑 Erreur lors de la suppression');
  }
}

// ─────────────────────────────────────────────
// SECTION 3 : Disponibilité par créneaux
// ─────────────────────────────────────────────

/**
 * Met à jour un champ de disponibilité par créneau sur la salle state.rooms[idx]
 * et sauvegarde immédiatement en BD (même pattern que updateRoomProp).
 * @param {number} idx - Index dans state.rooms
 * @param {string} field - Nom du champ camelCase (ex: 'ouvertMatinSemaine')
 * @param {boolean} checked - Valeur de la case à cocher
 */
export async function updateRoomCreneau(idx, field, checked) {
  if (!state.rooms || !state.rooms[idx]) return;
  const room = state.rooms[idx];
  room[field] = checked;

  try {
    await persistRoom(room);
  } catch (err) {
    console.error('Erreur updateRoomCreneau:', err);
    if (window.toast) window.toast('🛑 Erreur de sauvegarde de la disponibilité');
  }
}

/**
 * Génère le tableau de disponibilité par créneaux.
 * Une ligne par salle, 3 groupes de colonnes : Semaine / Samedi / Dimanche.
 */
export function renderRoomsCreneaux() {
  const tbody = document.getElementById('creneaux-rooms-tbody');
  if (!tbody) return;

  if (!Array.isArray(state.rooms) || state.rooms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="padding:24px; text-align:center; color:var(--text-dim);">Aucune salle configurée.</td></tr>';
    return;
  }

  tbody.innerHTML = state.rooms.map((room, idx) => {
    /**
     * Génère une case à cocher pour un champ de disponibilité donné.
     * Appel onclick: updateRoomCreneau(idx, 'field', this.checked)
     */
    function checkbox(field, value) {
      const checked = value !== false ? 'checked' : '';
      return `<input type="checkbox" class="creneau-checkbox" ${checked}
        title="${checked ? 'Ouvert' : 'Fermé'}"
        onchange="updateRoomCreneau(${idx}, '${field}', this.checked)">`;
    }

    return `
      <tr class="creneau-row">
        <td class="creneau-td-salle">
          <strong>${room.name || 'Salle sans nom'}</strong>
        </td>
        <td class="creneau-td-check">${checkbox('ouvertMatinSemaine',     room.ouvertMatinSemaine)}</td>
        <td class="creneau-td-check">${checkbox('ouvertApresMidiSemaine', room.ouvertApresMidiSemaine)}</td>
        <td class="creneau-td-check">${checkbox('ouvertNuitSemaine',      room.ouvertNuitSemaine)}</td>
        <td class="creneau-td-check">${checkbox('ouvertSamediMatin',      room.ouvertSamediMatin)}</td>
        <td class="creneau-td-check">${checkbox('ouvertSamediApresMidi',  room.ouvertSamediApresMidi)}</td>
        <td class="creneau-td-check">${checkbox('ouvertSamediNuit',       room.ouvertSamediNuit)}</td>
        <td class="creneau-td-check">${checkbox('ouvertDimanche',         room.ouvertDimanche)}</td>
      </tr>`;
  }).join('');
}


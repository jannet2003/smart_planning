import { state, renderAll } from '../state.js';
import * as api from '../api/api.js';

export function initRooms() {
  window.openAddRoomModal = openAddRoomModal;
  window.closeAddRoomModal = closeAddRoomModal;
  window.submitAddRoom = submitAddRoom;
  window.saveRoomMaintenance = saveRoomMaintenance;
  window.setSeniorRoomMode = setSeniorRoomMode;
  window.setSeniorRoomCompatibility = setSeniorRoomCompatibility;
  window.renderRooms = renderRooms;
}

export function openAddRoomModal() {
  document.getElementById('add-room-modal')?.classList.add('active');
}

export function closeAddRoomModal() {
  document.getElementById('add-room-modal')?.classList.remove('active');
  const arName = document.getElementById('ar-name');
  if (arName) arName.value = '';
}

export async function submitAddRoom() {
  const name = document.getElementById('ar-name').value.trim();
  const code = document.getElementById('ar-code').value;
  if (!name) { window.toast('⚠ Le nom de la salle est obligatoire'); return; }
  
  const newRoom = {
    nom: name,
    type_salle: code,
    capacite: 1,
    actif: true
  };

  try {
    const saved = await api.createSalle(newRoom);
    state.rooms.push({
      id: saved.id || name.replace(/\s+/g, ''),
      name: name,
      code: code,
      minSenior: parseInt(document.getElementById('ar-min-senior').value) || 0,
      maxSenior: parseInt(document.getElementById('ar-max-senior').value) || 0,
      minResident: parseInt(document.getElementById('ar-min-resident').value) || 0,
      maxResident: parseInt(document.getElementById('ar-max-resident').value) || 0,
      minInf: parseInt(document.getElementById('ar-min-inf').value) || 0,
      maxInf: parseInt(document.getElementById('ar-max-inf').value) || 0,
      minTech: parseInt(document.getElementById('ar-min-tech').value) || 0,
      maxTech: parseInt(document.getElementById('ar-max-tech').value) || 0,
      seniorMode: 'EXCLUSIVE',
      seniorCompatibleRooms: [],
      isBroken: false
    });
    
    closeAddRoomModal();
    renderAll();
    window.toast('✓ Nouvelle salle d\'examen configurée');
  } catch (err) {
    console.error(err);
    window.toast('🛑 Erreur lors de la configuration de la salle');
  }
}

export function saveRoomMaintenance(idx) {
  state.rooms[idx].brokenStart = document.getElementById(`room-broken-start-${idx}`).value;
  state.rooms[idx].brokenEnd = document.getElementById(`room-broken-end-${idx}`).value;
  state.rooms[idx].brokenReason = document.getElementById(`room-broken-reason-${idx}`).value.trim();
  window.toast(`✓ Maintenance enregistrée pour ${state.rooms[idx].name}`);
  renderAll();
}

export function setSeniorRoomMode(idx, mode) {
  state.rooms[idx].seniorMode = mode;
  if (mode !== 'SELECTIVE') state.rooms[idx].seniorCompatibleRooms = [];
  renderRooms();
}

export function setSeniorRoomCompatibility(idx, roomId, checked) {
  const room = state.rooms[idx];
  room.seniorCompatibleRooms ||= [];
  if (checked && !room.seniorCompatibleRooms.includes(roomId)) room.seniorCompatibleRooms.push(roomId);
  if (!checked) room.seniorCompatibleRooms = room.seniorCompatibleRooms.filter(id => id !== roomId);
}

export function renderRooms() {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;
  grid.innerHTML = state.rooms.map((room, idx) => `
    <div class="room-card ${room.isBroken ? 'broken' : ''}">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-soft); padding-bottom:10px;">
        <span style="font-weight:700; font-size:15px; font-family:var(--disp);">${room.name}</span>
        <span class="status-badge ${room.isBroken ? 'hors_service' : 'actif'}">${room.isBroken ? 'En Panne' : 'Opérationnel'}</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        <div class="minmax-row"><span>Seniors</span><input type="number" value="${room.minSenior}" onchange="state.rooms[${idx}].minSenior=parseInt(this.value)||0;"><input type="number" value="${room.maxSenior}" onchange="state.rooms[${idx}].maxSenior=parseInt(this.value)||0;"></div>
        <div class="minmax-row"><span>Résidents</span><input type="number" value="${room.minResident}" onchange="state.rooms[${idx}].minResident=parseInt(this.value)||0;"><input type="number" value="${room.maxResident}" onchange="state.rooms[${idx}].maxResident=parseInt(this.value)||0;"></div>
        <div class="minmax-row"><span>Infirmiers</span><input type="number" value="${room.minInf}" onchange="state.rooms[${idx}].minInf=parseInt(this.value)||0;"><input type="number" value="${room.maxInf}" onchange="state.rooms[${idx}].maxInf=parseInt(this.value)||0;"></div>
        <div class="minmax-row"><span>Techniciens</span><input type="number" value="${room.minTech}" onchange="state.rooms[${idx}].minTech=parseInt(this.value)||0;"><input type="number" value="${room.maxTech}" onchange="state.rooms[${idx}].maxTech=parseInt(this.value)||0;"></div>
      </div>
      <div style="margin-top:12px; padding:10px; background:var(--panel-2); border:1px solid var(--border-soft); border-radius:6px;">
        <label style="margin:0 0 6px; font-size:10px;">AFFECTATION D'UN SENIOR</label>
        <select style="font-size:11px; padding:7px;" onchange="setSeniorRoomMode(${idx}, this.value)">
          <option value="EXCLUSIVE" ${(room.seniorMode || 'EXCLUSIVE') === 'EXCLUSIVE' ? 'selected' : ''}>Exclusif — aucune autre salle</option>
          <option value="COMBINABLE" ${room.seniorMode === 'COMBINABLE' ? 'selected' : ''}>Combinable — toutes les salles compatibles</option>
          <option value="SELECTIVE" ${room.seniorMode === 'SELECTIVE' ? 'selected' : ''}>Seulement avec certaines salles</option>
        </select>
        <div style="font-size:10px; color:var(--text-faint); margin-top:7px;">Le min./max. indique le personnel nécessaire dans cette salle. La combinabilité autorise seulement le même senior à compter dans une autre salle.</div>
        ${(room.seniorMode === 'SELECTIVE') ? `<div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;">${state.rooms.filter(other => other.id !== room.id).map(other => `<label style="display:flex; align-items:center; gap:4px; margin:0; text-transform:none; font-size:10px; cursor:pointer;"><input type="checkbox" style="width:auto; margin:0;" ${room.seniorCompatibleRooms?.includes(other.id) ? 'checked' : ''} onchange="setSeniorRoomCompatibility(${idx}, '${other.id}', this.checked)">${other.name}</label>`).join('')}</div>` : ''}
      </div>
      <div style="margin-top:10px; padding-top:10px; border-top: 1px solid var(--border-soft);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; font-weight:600; color:var(--text-dim)">Signaler une indisponibilité :</span>
          <input type="checkbox" ${room.isBroken ? 'checked' : ''} onchange="state.rooms[${idx}].isBroken=this.checked; renderAll();" style="width:18px; height:18px; margin:0; cursor:pointer;">
        </div>
        ${room.isBroken ? `
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:12px; background:rgba(220,38,38,0.05); padding:10px; border-radius:6px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div><label style="margin-top:0; font-size:9px; color:var(--red);">Début</label><input type="date" id="room-broken-start-${idx}" value="${room.brokenStart || ''}"></div>
              <div><label style="margin-top:0; font-size:9px; color:var(--red);">Fin</label><input type="date" id="room-broken-end-${idx}" value="${room.brokenEnd || ''}"></div>
            </div>
            <div><label style="margin-top:0; font-size:9px; color:var(--red);">Raison</label><input type="text" id="room-broken-reason-${idx}" value="${room.brokenReason || ''}"></div>
            <button class="btn block" style="background-color: var(--red); margin-top:6px; padding: 6px 12px; font-size: 11px;" onclick="saveRoomMaintenance(${idx})">💾 Enregistrer</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

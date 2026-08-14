import { state, CATS, renderAll } from '../state.js';
import * as api from '../api/api.js';
import { normalizeStatus, getStatusLabel } from '../utils/staffUtils.js';

// Helper de recherche d'agent par ID ou Matricule
export function findAgent(agentId) {
  if (!agentId) return null;
  const str = String(agentId);
  return state.staff.find(s => (s.id && String(s.id) === str) || s.matricule === agentId);
}

export function initStaff() {
  window.openAddModal = openAddModal;
  window.closeAddModal = closeAddModal;
  window.addStaff = addStaff;
  window.openEditModal = openEditModal;
  window.closeEditModal = closeEditModal;
  window.saveStaffEdit = saveStaffEdit;
  window.changeStaffStatus = changeStaffStatus;
  window.removeStaff = removeStaff;
  window.renderStaffTable = renderStaffTable;
  window.toggleAllRoomsAdd = toggleAllRoomsAdd;
  window.toggleAllRoomsEdit = toggleAllRoomsEdit;
}

export function renderAddRoomCheckboxes() {
  const container = document.getElementById('add-rooms-list');
  if (!container) return;
  const rooms = Array.isArray(state.rooms) ? state.rooms : [];
  if (rooms.length === 0) {
    container.innerHTML = '<span style="font-size:12px; color:var(--text-dim);">Aucune salle configurée.</span>';
    return;
  }
  container.innerHTML = rooms.map(room => {
    const val = room.id || room.name;
    return `
      <label style="display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--text); cursor: pointer;">
        <input type="checkbox" class="f-room-checkbox" value="${val}" checked style="width: auto; margin: 0; cursor: pointer;"> ${room.name}
      </label>
    `;
  }).join('');
  const selectAllCb = document.getElementById('f-room-select-all');
  if (selectAllCb) selectAllCb.checked = true;
}

export function renderEditRoomCheckboxes(agent) {
  const container = document.getElementById('edit-rooms-list');
  if (!container) return;
  const rooms = Array.isArray(state.rooms) ? state.rooms : [];
  if (rooms.length === 0) {
    container.innerHTML = '<span style="font-size:12px; color:var(--text-dim);">Aucune salle configurée.</span>';
    return;
  }
  let allChecked = true;
  container.innerHTML = rooms.map(room => {
    const roomIdStr = String(room.id);
    const roomNameStr = room.name;
    const isAllowed = agent && Array.isArray(agent.allowedRooms) && (
      agent.allowedRooms.includes(roomIdStr) || agent.allowedRooms.includes(roomNameStr)
    );
    if (!isAllowed) allChecked = false;
    const val = room.id || room.name;
    return `
      <label style="display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--text); cursor: pointer;">
        <input type="checkbox" class="edit-room-checkbox" value="${val}" ${isAllowed ? 'checked' : ''} style="width: auto; margin: 0; cursor: pointer;"> ${room.name}
      </label>
    `;
  }).join('');
  const selectAllCb = document.getElementById('edit-room-select-all');
  if (selectAllCb) selectAllCb.checked = allChecked;
}

export function openAddModal() {
  renderAddRoomCheckboxes();
  const matEl = document.getElementById('f-matricule');
  if (matEl) matEl.value = '';
  const nameEl = document.getElementById('f-name');
  if (nameEl) nameEl.value = '';
  const modal = document.getElementById('add-staff-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeAddModal() {
  const modal = document.getElementById('add-staff-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

export function toggleAllRoomsAdd(master) {
  document.querySelectorAll('.f-room-checkbox').forEach(cb => cb.checked = master.checked);
}

export function toggleAllRoomsEdit(master) {
  document.querySelectorAll('.edit-room-checkbox').forEach(cb => cb.checked = master.checked);
}

export async function addStaff() {
  const matEl = document.getElementById('f-matricule');
  const matricule = matEl ? matEl.value.trim() : '';
  const name = document.getElementById('f-name').value.trim();
  const cat = document.getElementById('f-cat').value;
  const status = document.getElementById('f-status').value;
  if (!name) { window.toast('⚠ Complétez le nom de l\'agent'); return; }
  
  let allowedRooms = [];
  document.querySelectorAll('.f-room-checkbox:checked').forEach(cb => allowedRooms.push(cb.value));
  
  const normalizedStatus = normalizeStatus(status);
  const newAgentPayload = {
    matricule: matricule || undefined,
    nom: name,
    role: cat,
    statut: normalizedStatus,
    actif: normalizedStatus === 'actif',
    allowed_rooms: allowedRooms.join(',')
  };

  try {
    const saved = await api.createPersonnel(newAgentPayload);
    const savedRooms = saved.allowed_rooms ? saved.allowed_rooms.split(',').filter(Boolean) : allowedRooms;
    state.staff.push({
      id: saved.id,
      matricule: saved.matricule || matricule || `ID-${saved.id}`,
      name: saved.nom || name,
      cat: saved.role || cat,
      status: saved.statut || normalizedStatus,
      allowedRooms: savedRooms
    });
    
    if (matEl) matEl.value = '';
    document.getElementById('f-name').value = '';
    
    closeAddModal();
    renderAll();
    window.toast('✓ Agent enregistré');
  } catch (err) {
    console.error(err);
    window.toast('🛑 Erreur de sauvegarde de l\'agent');
  }
}

export function openEditModal(agentId) {
  const agent = findAgent(agentId);
  if (!agent) return;
  const editIdEl = document.getElementById('edit-id');
  if (editIdEl) editIdEl.value = agent.id || '';
  const editMatEl = document.getElementById('edit-matricule');
  if (editMatEl) editMatEl.value = agent.matricule || (agent.id ? `ID-${agent.id}` : '');
  document.getElementById('edit-name').value = agent.name;
  document.getElementById('edit-cat').value = agent.cat;
  const editStatusEl = document.getElementById('edit-status');
  if (editStatusEl) editStatusEl.value = normalizeStatus(agent.status);
  
  renderEditRoomCheckboxes(agent);

  const modal = document.getElementById('edit-staff-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

export function closeEditModal() {
  const modal = document.getElementById('edit-staff-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

export async function saveStaffEdit() {
  const targetId = document.getElementById('edit-id')?.value;
  const targetMat = document.getElementById('edit-matricule')?.value;

  const agent = findAgent(targetId);
  if (!agent) return;
  
  const newMatricule = targetMat !== undefined ? targetMat.trim() : agent.matricule;
  const newName = document.getElementById('edit-name').value.trim();
  const newCat = document.getElementById('edit-cat').value;
  const editStatusEl = document.getElementById('edit-status');
  const newStatus = editStatusEl ? editStatusEl.value : agent.status;
  const normalizedStatus = normalizeStatus(newStatus);

  let updatedRooms = [];
  document.querySelectorAll('.edit-room-checkbox:checked').forEach(cb => updatedRooms.push(cb.value));

  const payload = {
    matricule: newMatricule,
    nom: newName,
    role: newCat,
    statut: normalizedStatus,
    actif: normalizedStatus === 'actif',
    allowed_rooms: updatedRooms.join(',')
  };

  try {
    if (agent.id) {
      const saved = await api.updatePersonnel(agent.id, payload);
      if (saved) {
        if (saved.allowed_rooms !== undefined) {
          updatedRooms = saved.allowed_rooms ? saved.allowed_rooms.split(',').filter(Boolean) : updatedRooms;
        }
        agent.matricule = saved.matricule || newMatricule || `ID-${agent.id}`;
        agent.name = saved.nom || newName;
        agent.cat = saved.role || newCat;
        agent.status = saved.statut || normalizedStatus;
        agent.allowedRooms = updatedRooms;
      }
    }
    
    closeEditModal();
    renderAll();
    window.toast('✓ Profil de l\'agent mis à jour');
  } catch (err) {
    console.error(err);
    window.toast('🛑 Erreur de mise à jour de l\'agent');
  }
}

export async function changeStaffStatus(agentId, newStatus) {
  const agent = findAgent(agentId);
  if (!agent) return;
  
  const normalizedStatus = normalizeStatus(newStatus);
  const isActif = normalizedStatus === 'actif';
  try {
    if (agent.id) {
      await api.updatePersonnel(agent.id, {
        statut: normalizedStatus,
        actif: isActif
      });
    }
    agent.status = normalizedStatus;
    renderAll();
    window.toast(`✓ Statut de l'agent mis à jour (${normalizedStatus})`);
  } catch (err) {
    console.error(err);
    window.toast('🛑 Erreur de modification du statut');
  }
}

export async function removeStaff(agentId) {
  const agent = findAgent(agentId);
  if (agent && agent.id) {
    try {
      await api.deletePersonnel(agent.id);
    } catch (err) {
      console.warn("Erreur de suppression en BD:", err);
    }
  }
  state.staff = state.staff.filter(s => String(s.id) !== String(agentId) && s.matricule !== agentId);
  renderAll();
  window.toast('✓ Agent supprimé');
}

export function renderStaffTable() {
  const qEl = document.getElementById('staff-search');
  const q = qEl ? qEl.value.toLowerCase() : '';
  const filtered = state.staff.filter(s => 
    s.name.toLowerCase().includes(q) || 
    (s.matricule && s.matricule.toLowerCase().includes(q)) ||
    (s.id && String(s.id).includes(q))
  );
  const tbody = document.getElementById('staff-tbody');
  if (tbody) {
    tbody.innerHTML = filtered.map(s => {
      const matOrId = s.matricule || (s.id ? `ID-${s.id}` : '—');
      return `
        <tr>
          <td><b style="font-family: monospace; font-size: 12px; color: var(--accent-blue-dark); background: var(--panel-2); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">${matOrId}</b></td>
          <td><b>${s.name}</b></td>
          <td><span class="badge ${s.cat}">${CATS[s.cat] ? CATS[s.cat].short : s.cat}</span></td>
          <td><span class="status-badge ${normalizeStatus(s.status)}">${getStatusLabel(s.status)}</span></td>
          <td><select style="width:140px; padding:4px;" onchange="changeStaffStatus('${s.id || s.matricule}', this.value)">
            <option value="actif" ${normalizeStatus(s.status) === 'actif' ? 'selected' : ''}>Actif</option>
            <option value="retrait" ${normalizeStatus(s.status) === 'retrait' ? 'selected' : ''}>En Retrait (Définitif)</option>
            <option value="hors_service" ${normalizeStatus(s.status) === 'hors_service' ? 'selected' : ''}>Hors Service (Temp.)</option>
          </select></td>
          <td>
            <button class="btn secondary" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="openEditModal('${s.id}')">✏️ Éditer</button>
            <button class="btn danger" style="padding:4px 8px; font-size:11px" onclick="removeStaff('${s.id}')">✕</button>
          </td>
        </tr>
      `;
    }).join('');
  }
  const countInd = document.getElementById('count-indicator');
  if (countInd) countInd.textContent = state.staff.length;
}

export function populateStaffSelects() {
  const opts = state.staff.map(s => `<option value="${s.matricule || s.id}">${s.name}</option>`).join('');
  const lvS = document.getElementById('lv-staff');
  if (lvS) lvS.innerHTML = opts;
  const sbS = document.getElementById('sb-staff');
  if (sbS) sbS.innerHTML = opts;
}

import { state, CATS, renderAll } from '../state.js';
import * as api from '../api/api.js';
import { normalizeStatus, getStatusLabel } from '../utils/staffUtils.js';

export function findAgent(agentId) {
  if (!agentId) return null;
  const str = String(agentId);
  return state.staff.find(s => (s.id && String(s.id) === str) || s.matricule === str);
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
    return `
      <label style="display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--text); cursor: pointer;">
        <input type="checkbox" class="f-room-checkbox" value="${room.id}" checked style="width: auto; margin: 0; cursor: pointer;"> ${room.nom || room.name}
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
  const rawAllowed = (agent && (agent.allowedRooms || agent.salle_ids)) ? (agent.allowedRooms || agent.salle_ids) : [];
  const allowedIds = rawAllowed.map(r => {
    const num = parseInt(r, 10);
    if (!isNaN(num)) return num;
    const found = rooms.find(rm => rm.name === r || rm.nom === r);
    return found ? found.id : null;
  }).filter(id => id !== null);

  container.innerHTML = rooms.map(room => {
    const isAllowed = allowedIds.length === 0 || allowedIds.includes(Number(room.id));
    if (!isAllowed) allChecked = false;
    return `
      <label style="display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--text); cursor: pointer;">
        <input type="checkbox" class="edit-room-checkbox" value="${room.id}" ${isAllowed ? 'checked' : ''} style="width: auto; margin: 0; cursor: pointer;"> ${room.nom || room.name}
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
  if (!matricule) { window.toast('⚠ Complétez le matricule de l\'agent'); return; }
  
  let selectedSalleIds = [];
  document.querySelectorAll('.f-room-checkbox:checked').forEach(cb => {
    const num = parseInt(cb.value, 10);
    if (!isNaN(num)) selectedSalleIds.push(num);
  });
  
  const normalizedStatus = normalizeStatus(status);
  const newAgentPayload = {
    matricule: matricule,
    nom: name,
    nom_prenom: name,
    categorie: cat,
    role: cat,
    statut: normalizedStatus,
    status: normalizedStatus,
    allowed_rooms: selectedSalleIds.join(','),
    salle_ids: selectedSalleIds
  };

  try {
    const saved = await api.createPersonnel(newAgentPayload);
    state.staff.push({
      id: saved.id,
      matricule: saved.matricule || matricule,
      name: saved.nom || saved.nom_prenom || name,
      cat: saved.categorie || saved.role || cat,
      status: saved.statut || saved.status || normalizedStatus,
      allowedRooms: selectedSalleIds.map(String)
    });
    
    if (matEl) matEl.value = '';
    document.getElementById('f-name').value = '';
    
    closeAddModal();
    renderAll();
    window.toast('✓ Agent enregistré');
  } catch (err) {
    console.error(err);
    window.toast(`🛑 ${err.message || "Erreur de sauvegarde de l'agent"}`);
  }
}

export function openEditModal(agentId) {
  const agent = findAgent(agentId);
  if (!agent) return;
  const editIdEl = document.getElementById('edit-id');
  if (editIdEl) editIdEl.value = agent.id || '';
  const editMatEl = document.getElementById('edit-matricule');
  if (editMatEl) editMatEl.value = agent.matricule || '';
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
  
  const newMatricule = targetMat ? targetMat.trim() : agent.matricule;
  const newName = document.getElementById('edit-name').value.trim();
  const newCat = document.getElementById('edit-cat').value;
  const editStatusEl = document.getElementById('edit-status');
  const newStatus = editStatusEl ? editStatusEl.value : agent.status;
  const normalizedStatus = normalizeStatus(newStatus);

  if (!newMatricule) { window.toast('⚠ La matricule est obligatoire'); return; }
  if (!newName) { window.toast('⚠ Le nom est obligatoire'); return; }

  let selectedSalleIds = [];
  document.querySelectorAll('.edit-room-checkbox:checked').forEach(cb => {
    const num = parseInt(cb.value, 10);
    if (!isNaN(num)) selectedSalleIds.push(num);
  });

  const payload = {
    matricule: newMatricule,
    nom: newName,
    nom_prenom: newName,
    categorie: newCat,
    role: newCat,
    statut: normalizedStatus,
    status: normalizedStatus,
    allowed_rooms: selectedSalleIds.join(','),
    salle_ids: selectedSalleIds
  };

  try {
    if (agent.id) {
      const saved = await api.updatePersonnel(agent.id, payload);
      if (saved) {
        agent.matricule = saved.matricule || newMatricule;
        agent.name = saved.nom || saved.nom_prenom || newName;
        agent.cat = saved.categorie || saved.role || newCat;
        agent.status = saved.statut || saved.status || normalizedStatus;
        agent.allowedRooms = selectedSalleIds.map(String);
      }
    } else {
      agent.matricule = newMatricule;
      agent.name = newName;
      agent.cat = newCat;
      agent.status = normalizedStatus;
      agent.allowedRooms = selectedSalleIds.map(String);
    }
    
    closeEditModal();
    renderAll();
    window.toast('✓ Profil de l\'agent mis à jour');
  } catch (err) {
    console.error(err);
    window.toast(`🛑 ${err.message || "Erreur de mise à jour de l'agent"}`);
  }
}

export async function changeStaffStatus(agentId, newStatus) {
  const agent = findAgent(agentId);
  if (!agent) return;
  
  const normalizedStatus = normalizeStatus(newStatus);
  try {
    if (agent.id) {
      await api.updatePersonnel(agent.id, {
        statut: normalizedStatus
      });
    }
    agent.status = normalizedStatus;
    renderAll();
    window.toast(`✓ Statut mis à jour (${getStatusLabel(normalizedStatus)})`);
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
  state.staff = state.staff.filter(s => String(s.id) !== String(agentId) && s.matricule !== String(agentId));
  renderAll();
  window.toast('✓ Agent supprimé');
}

export function renderStaffTable() {
  const qEl = document.getElementById('staff-search');
  const q = qEl ? (qEl.value || '').toLowerCase().trim() : '';
  const staffList = Array.isArray(state.staff) ? state.staff : [];
  const filtered = staffList.filter(s => {
    if (!s) return false;
    const name = String(s.name || '').toLowerCase();
    const mat = String(s.matricule || '').toLowerCase();
    const idStr = String(s.id || '');
    return name.includes(q) || mat.includes(q) || idStr.includes(q);
  });
  
  const tbody = document.getElementById('staff-tbody');
  if (tbody) {
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-dim);">Aucun agent trouvé.</td></tr>';
    } else {
      tbody.innerHTML = filtered.map(s => {
        const mat = s.matricule || `ID-${s.id}`;
        const catInfo = CATS[s.cat] ? CATS[s.cat].short : (s.cat || 'Agent');
        const statusVal = normalizeStatus(s.status);
        const statusLabel = getStatusLabel(statusVal);
        return `
          <tr>
            <td><b style="font-family: monospace; font-size: 13px; color: var(--accent-blue-dark); background: var(--panel-2); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border);">${mat}</b></td>
            <td><b>${s.name || 'Agent sans nom'}</b></td>
            <td><span class="badge ${s.cat || 'SENIOR'}">${catInfo}</span></td>
            <td><span class="status-badge ${statusVal}">${statusLabel}</span></td>
            <td><select style="width:140px; padding:4px;" onchange="changeStaffStatus('${s.id}', this.value)">
              <option value="actif" ${statusVal === 'actif' ? 'selected' : ''}>Actif</option>
              <option value="en_retrait" ${statusVal === 'en_retrait' ? 'selected' : ''}>En Retrait (Définitif)</option>
              <option value="hors_service" ${statusVal === 'hors_service' ? 'selected' : ''}>Hors Service (Temp.)</option>
            </select></td>
            <td>
              <button class="btn secondary" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="openEditModal('${s.id}')">✏️ Éditer</button>
              <button class="btn danger" style="padding:4px 8px; font-size:11px" onclick="removeStaff('${s.id}')">✕</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
  const countInd = document.getElementById('count-indicator');
  if (countInd) countInd.textContent = staffList.length;
}

export function populateStaffSelects() {
  const opts = state.staff.map(s => `<option value="${s.matricule}">${s.name} (${s.matricule})</option>`).join('');
  const lvS = document.getElementById('lv-staff');
  if (lvS) lvS.innerHTML = opts;
  const sbS = document.getElementById('sb-staff');
  if (sbS) sbS.innerHTML = opts;
}

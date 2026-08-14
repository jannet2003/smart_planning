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
  const allowedIds = (agent && Array.isArray(agent.salle_ids)) ? agent.salle_ids.map(Number) : [];
  container.innerHTML = rooms.map(room => {
    const isAllowed = allowedIds.includes(Number(room.id));
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
    categorie: cat,
    statut: normalizedStatus,
    salle_ids: selectedSalleIds
  };

  try {
    const saved = await api.createPersonnel(newAgentPayload);
    state.staff.push({
      id: saved.id,
      matricule: saved.matricule,
      name: saved.nom,
      cat: saved.categorie,
      status: saved.statut,
      salle_ids: saved.salle_ids || selectedSalleIds
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
    categorie: newCat,
    statut: normalizedStatus,
    salle_ids: selectedSalleIds
  };

  try {
    if (agent.id) {
      const saved = await api.updatePersonnel(agent.id, payload);
      if (saved) {
        agent.matricule = saved.matricule;
        agent.name = saved.nom;
        agent.cat = saved.categorie;
        agent.status = saved.statut;
        agent.salle_ids = saved.salle_ids || selectedSalleIds;
      }
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
  const q = qEl ? qEl.value.toLowerCase() : '';
  const filtered = state.staff.filter(s => 
    s.name.toLowerCase().includes(q) || 
    (s.matricule && s.matricule.toLowerCase().includes(q)) ||
    (s.id && String(s.id).includes(q))
  );
  const tbody = document.getElementById('staff-tbody');
  if (tbody) {
    tbody.innerHTML = filtered.map(s => {
      const mat = s.matricule || `ID-${s.id}`;
      return `
        <tr>
          <td><b style="font-family: monospace; font-size: 13px; color: var(--accent-blue-dark); background: var(--panel-2); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border);">${mat}</b></td>
          <td><b>${s.name}</b></td>
          <td><span class="badge ${s.cat}">${CATS[s.cat] ? CATS[s.cat].short : s.cat}</span></td>
          <td><span class="status-badge ${normalizeStatus(s.status)}">${getStatusLabel(s.status)}</span></td>
          <td><select style="width:140px; padding:4px;" onchange="changeStaffStatus('${s.id}', this.value)">
            <option value="actif" ${normalizeStatus(s.status) === 'actif' ? 'selected' : ''}>Actif</option>
            <option value="en_retrait" ${normalizeStatus(s.status) === 'en_retrait' ? 'selected' : ''}>En Retrait (Définitif)</option>
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
  const opts = state.staff.map(s => `<option value="${s.matricule}">${s.name} (${s.matricule})</option>`).join('');
  const lvS = document.getElementById('lv-staff');
  if (lvS) lvS.innerHTML = opts;
  const sbS = document.getElementById('sb-staff');
  if (sbS) sbS.innerHTML = opts;
}

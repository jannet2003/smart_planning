import { state, CATS, renderAll } from '../state.js';
import * as api from '../api/api.js';
import { buildStaffName, getStaffCategoryFlags, normalizeStatus, getStatusLabel } from '../utils/staffUtils.js';

export function initStaff() {
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

export function toggleAllRoomsAdd(master) {
  document.querySelectorAll('.f-room-checkbox').forEach(cb => cb.checked = master.checked);
}

export function toggleAllRoomsEdit(master) {
  document.querySelectorAll('.edit-room-checkbox').forEach(cb => cb.checked = master.checked);
}

export async function addStaff() {
  const mat = document.getElementById('f-id-manual').value.trim();
  const name = document.getElementById('f-name').value.trim();
  const cat = document.getElementById('f-cat').value;
  const status = document.getElementById('f-status').value;
  if (!mat || !name) { window.toast('⚠ Complétez l\'identifiant et le nom'); return; }
  
  let allowedRooms = [];
  document.querySelectorAll('.f-room-checkbox:checked').forEach(cb => allowedRooms.push(cb.value));
  
  const normalizedStatus = normalizeStatus(status);
  const categoryFlags = getStaffCategoryFlags(cat);
  const newAgent = {
    matricule: mat,
    nom: name.split(' ').slice(1).join(' ') || name,
    prenom: name.split(' ')[0] || '',
    role: cat,
    quotite_horaire: 40,
    statut: normalizedStatus,
    actif: normalizedStatus === 'actif',
    allowed_rooms: allowedRooms.join(','),
    has_garde: categoryFlags.hasGarde
  };

  try {
    const saved = await api.createPersonnel(newAgent);
    // Attach details for local state compatibility
    state.staff.push({
      id: saved.id,
      matricule: mat,
      name: name,
      cat: cat,
      status: normalizedStatus,
      allowedRooms: allowedRooms,
      hasGarde: categoryFlags.hasGarde
    });
    
    document.getElementById('f-id-manual').value = '';
    document.getElementById('f-name').value = '';
    
    renderAll();
    window.toast('✓ Agent enregistré');
  } catch (err) {
    console.error(err);
    window.toast('🛑 Erreur de sauvegarde de l\'agent');
  }
}

export function openEditModal(matricule) {
  const agent = state.staff.find(s => s.matricule === matricule);
  if (!agent) return;
  document.getElementById('edit-matricule').value = agent.matricule;
  document.getElementById('edit-name').value = agent.name;
  document.getElementById('edit-cat').value = agent.cat;
  
  const checkboxes = document.querySelectorAll('.edit-room-checkbox');
  let allChecked = true;
  checkboxes.forEach(cb => {
    const isAllowed = agent.allowedRooms.includes(cb.value);
    cb.checked = isAllowed;
    if (!isAllowed) allChecked = false;
  });
  const selectAllCb = document.getElementById('edit-room-select-all');
  if (selectAllCb) selectAllCb.checked = allChecked;
  document.getElementById('edit-staff-modal')?.classList.add('active');
}

export function closeEditModal() {
  document.getElementById('edit-staff-modal')?.classList.remove('active');
}

export async function saveStaffEdit() {
  const mat = document.getElementById('edit-matricule').value;
  const agent = state.staff.find(s => s.matricule === mat);
  if (!agent) return;
  
  const newName = document.getElementById('edit-name').value.trim();
  const newCat = document.getElementById('edit-cat').value;
  let updatedRooms = [];
  document.querySelectorAll('.edit-room-checkbox:checked').forEach(cb => updatedRooms.push(cb.value));

  const prenom = newName.split(' ')[0] || '';
  const nom = newName.split(' ').slice(1).join(' ') || newName;
  const hasGarde = getStaffCategoryFlags(newCat).hasGarde;

  const payload = {
    nom,
    prenom,
    role: newCat,
    allowed_rooms: updatedRooms.join(','),
    has_garde: hasGarde
  };

  try {
    if (agent.id) {
      await api.updatePersonnel(agent.id, payload);
    }
    agent.name = newName;
    agent.cat = newCat;
    agent.allowedRooms = updatedRooms;
    agent.hasGarde = hasGarde;
    
    closeEditModal();
    renderAll();
    window.toast('✓ Profil de l\'agent mis à jour');
  } catch (err) {
    console.error(err);
    window.toast('🛑 Erreur de mise à jour de l\'agent');
  }
}

export async function changeStaffStatus(mat, newStatus) {
  const agent = state.staff.find(s => s.matricule === mat);
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

export async function removeStaff(mat) {
  const agent = state.staff.find(s => s.matricule === mat);
  if (agent && agent.id) {
    try {
      await api.deletePersonnel(agent.id);
    } catch (err) {
      console.warn("Erreur de suppression en BD (peut-être déjà supprimé ou ID introuvable):", err);
    }
  }
  state.staff = state.staff.filter(s => s.matricule !== mat);
  renderAll();
  window.toast('✓ Agent supprimé');
}

export function renderStaffTable() {
  const qEl = document.getElementById('staff-search');
  const q = qEl ? qEl.value.toLowerCase() : '';
  const filtered = state.staff.filter(s => s.name.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q));
  const tbody = document.getElementById('staff-tbody');
  if (tbody) {
    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td><b>${s.matricule}</b></td>
        <td>${s.name}${s.hasGarde ? '<span style="font-size:10px; color:var(--text-garde); font-weight:bold; margin-left:5px;">🌙 Garde</span>' : ''}</td>
        <td><span class="badge ${s.cat}">${CATS[s.cat] ? CATS[s.cat].short : s.cat}</span></td>
        <td><span class="status-badge ${normalizeStatus(s.status)}">${getStatusLabel(s.status)}</span></td>
        <td><select style="width:120px; padding:4px;" onchange="changeStaffStatus('${s.matricule}', this.value)">
          <option value="actif" ${normalizeStatus(s.status) === 'actif' ? 'selected' : ''}>Actif</option>
          <option value="retrait" ${normalizeStatus(s.status) === 'retrait' ? 'selected' : ''}>En Retrait</option>
          <option value="hors_service" ${normalizeStatus(s.status) === 'hors_service' ? 'selected' : ''}>Hors Service</option>
        </select></td>
        <td>
          <button class="btn secondary" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="openEditModal('${s.matricule}')">✏️ Éditer</button>
          <button class="btn danger" style="padding:4px 8px; font-size:11px" onclick="removeStaff('${s.matricule}')">✕</button>
        </td>
      </tr>
    `).join('');
  }
  const countInd = document.getElementById('count-indicator');
  if (countInd) countInd.textContent = state.staff.length;
}

export function populateStaffSelects() {
  const opts = state.staff.map(s => `<option value="${s.matricule}">${s.matricule} — ${s.name}</option>`).join('');
  const lvS = document.getElementById('lv-staff');
  if (lvS) lvS.innerHTML = opts;
  const sbS = document.getElementById('sb-staff');
  if (sbS) sbS.innerHTML = opts;
}

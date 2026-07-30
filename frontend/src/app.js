import { state, registerListener, renderAll } from './state.js';
import * as api from './api/api.js';
import { initStaff, renderStaffTable, populateStaffSelects } from './components/staff.js';
import { initRooms, renderRooms, apiRoomToLocal } from './components/rooms.js';
import { initLeaves, renderLeaveTable, totalLeaveDays } from './components/leaves.js';
import { initCalendar, renderHolidaysTable } from './components/calendar.js';
import { initPlanning, renderRestitution, updateArchivesDropdown } from './components/planning.js';
import { initExtDuty, renderExtDutyTab } from './components/extDuty.js';

// ---------- Initialisation des contrôleurs ----------
initStaff();
initRooms();
initLeaves();
initCalendar();
initPlanning();
initExtDuty();

// ---------- Éléments Globaux d'Interface ----------
window.toast = function(msg) {
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }
};

window.switchTab = function(tabNum) {
  document.querySelectorAll('.tabbtn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
  
  const btn = document.querySelector(`.tabbtn[data-tab="${tabNum}"]`);
  if (btn) btn.classList.add('active');
  
  const panel = document.getElementById(`tab${tabNum}`);
  if (panel) panel.classList.add('active');
  
  if (tabNum === 5) renderRestitution();
  if (tabNum === 7) renderExtDutyTab();
};

window.updateHeaderStats = function() {
  const sS = document.getElementById('statSeniors');
  if (sS) sS.textContent = state.staff.filter(s => s.cat === 'SENIOR' && s.status === 'actif').length;
  const sR = document.getElementById('statResidents');
  if (sR) sR.textContent = state.staff.filter(s => s.cat.startsWith('RESIDENT') && s.status === 'actif').length;
  const sT = document.getElementById('statTechs');
  if (sT) sT.textContent = state.staff.filter(s => s.cat === 'TECH' && s.status === 'actif').length;
  const sF = document.getElementById('statFeries');
  if (sF) sF.textContent = state.holidays.length;
  const sA = document.getElementById('statAlert');
  if (sA) sA.textContent = state.staff.filter(s => totalLeaveDays(s.matricule) > 60).length;
};

// ---------- Données par défaut pour le Seeding ----------
const defaultStaff = [
  { matricule: 'SR-001', name: 'Dr. Jannet Hazzouk', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'SR-002', name: 'Dr. Ahmed Kricha', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'SR-003', name: 'Dr Achour', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'SR-004', name: 'Dr Maatouk', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'SR-005', name: 'Dr Gaied', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'INF-001', name: 'Inf. Chaker Ben Salem', cat: 'INF', status: 'actif', allowedRooms: ['Scanner', 'Radio'], hasGarde: false }
];
for (let i = 1; i <= 6; i++) {
  let subCat = (i <= 3) ? 'RESIDENT_1ERE' : 'RESIDENT_MAJEUR';
  defaultStaff.push({ matricule: `RES-${String(i).padStart(3, '0')}`, name: `Dr. Résident R${i}`, cat: subCat, status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true });
}
for (let i = 1; i <= 15; i++) {
  defaultStaff.push({ matricule: `TS-${String(i).padStart(3, '0')}`, name: `Tech. Radiologie ${i}`, cat: 'TECH', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio'], hasGarde: false });
}

const defaultRooms = [
  { id: 'Scanner', name: 'Scanner', minSenior: 1, maxSenior: 3, minResident: 1, maxResident: 3, minInf: 0, maxInf: 2, minTech: 2, maxTech: 4, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'SCAN_M' },
  { id: 'IRM', name: 'IRM', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 3, minInf: 0, maxInf: 1, minTech: 1, maxTech: 3, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'IRM_M' },
  { id: 'Radio', name: 'Échographie / Doppler', minSenior: 1, maxSenior: 2, minResident: 2, maxResident: 4, minInf: 1, maxInf: 2, minTech: 1, maxTech: 2, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'RAD_M' },
  { id: 'Lecture', name: 'Salle de Lecture', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 2, minInf: 0, maxInf: 0, minTech: 0, maxTech: 1, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'LECT_M' }
];

async function seedAndLoadData() {
  try {
    // 1. Seeding Personnel
    // On ne re-seed QUE si la base est vide
    const existingStaff = await api.fetchPersonnel();
    if (existingStaff.length === 0) {
      console.log("Seeding du personnel complet (27 agents) dans la base de données...");
      for (const agent of defaultStaff) {
        await api.createPersonnel({
          matricule: agent.matricule,
          nom: agent.name.split(' ').slice(1).join(' ') || agent.name,
          prenom: agent.name.split(' ')[0] || '',
          role: agent.cat,
          quotite_horaire: 40,
          statut: agent.status,
          actif: agent.status === 'actif',
          allowed_rooms: (agent.allowedRooms || []).join(','),
          has_garde: agent.hasGarde
        });
      }
    }
    
    // 2. Seeding Salles
    const existingRooms = await api.fetchSalles();
    if (existingRooms.length === 0) {
      console.log("Seeding des salles dans la base de données...");
      for (const room of defaultRooms) {
        await api.createSalle({
          nom:          room.name,
          type_salle:   room.code,
          code:         room.code,
          actif:        !room.isBroken,
          min_senior:   room.minSenior,
          max_senior:   room.maxSenior,
          min_resident: room.minResident,
          max_resident: room.maxResident,
          min_inf:      room.minInf,
          max_inf:      room.maxInf,
          min_tech:     room.minTech,
          max_tech:     room.maxTech,
          senior_mode:  room.seniorMode,
          senior_compatible_rooms: (room.seniorCompatibleRooms || []).join(','),
          is_broken:    room.isBroken,
          broken_start: room.brokenStart  || '',
          broken_end:   room.brokenEnd    || '',
          broken_reason: room.brokenReason || ''
        });
      }
    }

    // 3. Charger le personnel depuis la BD
    const dbStaff = await api.fetchPersonnel();
    state.staff = dbStaff.map((s, idx) => {
      const fullName = `${s.prenom} ${s.nom}`.trim();
      const lowerName = fullName.toLowerCase();
      const subCat = s.role;
      let matricule = s.matricule || `ID-${s.id}`;
      
      // Récupérer le matricule d'origine pour compatibilité si absent
      if (!s.matricule) {
        if (subCat === 'SENIOR') {
          if (lowerName.includes('jannet')) matricule = 'SR-001';
          else if (lowerName.includes('ahmed')) matricule = 'SR-002';
          else if (lowerName.includes('achour')) matricule = 'SR-003';
          else if (lowerName.includes('maatouk')) matricule = 'SR-004';
          else if (lowerName.includes('gaied')) matricule = 'SR-005';
          else matricule = `SR-${String(s.id).padStart(3, '0')}`;
        } else if (subCat.startsWith('RESIDENT')) {
          const match = fullName.match(/R(\d+)/i);
          if (match) matricule = `RES-${match[1].padStart(3, '0')}`;
          else matricule = `RES-${String(s.id).padStart(3, '0')}`;
        } else if (subCat === 'TECH') {
          const match = fullName.match(/(\d+)/);
          if (match) matricule = `TS-${match[1].padStart(3, '0')}`;
          else matricule = `TS-${String(s.id).padStart(3, '0')}`;
        } else if (subCat === 'INF') {
          matricule = 'INF-001';
        }
      }
      
      let allowedRooms = ['Scanner', 'IRM', 'Radio', 'Lecture'];
      if (s.allowed_rooms !== undefined && s.allowed_rooms !== null && s.allowed_rooms !== '') {
        allowedRooms = s.allowed_rooms.split(',').filter(Boolean);
      } else {
        if (subCat === 'INF') allowedRooms = ['Scanner', 'Radio'];
        if (subCat === 'TECH') allowedRooms = ['Scanner', 'IRM', 'Radio'];
      }

      const status = s.statut || (s.actif ? 'actif' : 'retrait');
      const hasGarde = s.has_garde !== undefined && s.has_garde !== null ? s.has_garde : ['SENIOR', 'RESIDENT_MAJEUR', 'TECH'].includes(subCat);

      return {
        id: s.id,
        matricule: matricule,
        name: fullName,
        cat: subCat,
        status: status,
        allowedRooms: allowedRooms,
        hasGarde: hasGarde
      };
    });

    // 4. Charger les salles depuis la BD (avec tous les champs enregistrés)
    const dbRooms = await api.fetchSalles();
    state.rooms = dbRooms.map(r => apiRoomToLocal(r));

    // 5. Charger les plannings enregistrés depuis la BD
    const dbPlannings = await api.fetchPlannings();
    dbPlannings.forEach(p => {
      const key = `${p.semaine_code}_DB_${p.id}`;
      state.archives[key] = {
        name: `Semaine du ${p.semaine_code} (Sauvegardé)`,
        start: p.semaine_code,
        schedule: p.affectations
      };
    });
    updateArchivesDropdown();

    // Rendu final après chargement
    renderAll();
    console.log("Données initialisées avec succès !");
  } catch (err) {
    console.error("Erreur d'initialisation des données:", err);
    window.toast("🛑 Erreur d'initialisation avec l'API Back-End.");
    // Fallback locale si API en panne
    state.staff = defaultStaff;
    state.rooms = defaultRooms;
    renderAll();
  }
}

// ---------- Enregistrement du Dispatcher de Rendu ----------
registerListener(() => {
  window.updateHeaderStats();
  renderStaffTable();
  populateStaffSelects();
  renderLeaveTable();
  renderHolidaysTable();
  renderRooms();
  renderRestitution();
  renderExtDutyTab();
});

// ---------- Démarrage de l'Application ----------
document.addEventListener('DOMContentLoaded', () => {
  seedAndLoadData();
});

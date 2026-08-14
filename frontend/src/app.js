import { state, registerListener, renderAll } from './state.js';
import * as api from './api/api.js';
import { initStaff, renderStaffTable, populateStaffSelects } from './components/staff.js';
import { initRooms, renderRooms, apiRoomToLocal } from './components/rooms.js';
import { initLeaves, renderLeaveTable, totalLeaveDays } from './components/leaves.js';
import { initCalendar, renderHolidaysTable } from './components/calendar.js';
import { initPlanning, renderRestitution, updateArchivesDropdown } from './components/planning.js';
import { initExtDuty, renderExtDutyTab } from './components/extDuty.js';
import { defaultStaff, defaultRooms } from './utils/appSeedData.js';

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
  const teamLayout = document.getElementById('team-layout') || document.getElementById('subnav-team');

  // Désactiver tous les boutons principaux et tous les panels
  document.querySelectorAll('.tabbtn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));

  // Activer le bouton principal cliqué
  const btn = document.querySelector(`.tabbtn[data-tab="${tabNum}"]`);
  if (btn) btn.classList.add('active');

  if (tabNum === 'team') {
    // Afficher la section Gestion de l'équipe (Sidebar + Contenu)
    if (teamLayout) teamLayout.classList.add('visible');
    // Afficher le dernier sous-onglet actif (Personnel par défaut)
    const activeSubBtn = document.querySelector('.subnav-btn.active');
    const activeSubId = activeSubBtn ? activeSubBtn.dataset.subtab : '1';
    const subPanel = document.getElementById(`tab${activeSubId}`);
    if (subPanel) subPanel.classList.add('active');
    if (String(activeSubId) === '7') renderExtDutyTab();
  } else {
    // Cacher la section Gestion de l'équipe
    if (teamLayout) teamLayout.classList.remove('visible');
    const panel = document.getElementById(`tab${tabNum}`);
    if (panel) panel.classList.add('active');
    if (tabNum === 5) renderRestitution();
    if (tabNum === 7) renderExtDutyTab();
  }
};

window.switchSubTab = function(subTabNum) {
  // Mettre à jour les boutons de sous-navigation
  document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active'));
  const subBtn = document.querySelector(`.subnav-btn[data-subtab="${subTabNum}"]`);
  if (subBtn) subBtn.classList.add('active');

  // Afficher uniquement le panel correspondant (parmi tab1, tab2, tab7)
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`tab${subTabNum}`);
  if (panel) panel.classList.add('active');

  if (subTabNum === 7) renderExtDutyTab();
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

async function seedAndLoadData() {
  try {
    const safeJson = async (request, fallback = []) => {
      try {
        const response = await request();
        return Array.isArray(response) ? response : fallback;
      } catch (error) {
        console.warn('API unavailable, using fallback', error);
        return fallback;
      }
    };

    // 1. Seeding / Vérification du Personnel par défaut
    const existingStaff = await safeJson(() => api.fetchPersonnel(), []);
    for (const agent of defaultStaff) {
      const exists = existingStaff.some(s => {
        const fullName = (s.nom || '').trim().toLowerCase();
        return fullName.includes(agent.name.toLowerCase());
      });
      if (!exists) {
        console.log(`Seeding de l'agent manquant (${agent.name})...`);
        try {
          await api.createPersonnel({
            nom: agent.name,
            role: agent.cat,
            statut: agent.status,
            actif: agent.status === 'actif',
            allowed_rooms: (agent.allowedRooms || []).join(',')
          });
        } catch (e) {
          console.warn(`Erreur lors du seeding de ${agent.name}:`, e);
        }
      }
    }

    // 2. Seeding / Vérification des Salles par défaut
    const existingRooms = await safeJson(() => api.fetchSalles(), []);
    for (const room of defaultRooms) {
      const exists = existingRooms.some(r => r.nom.toLowerCase() === room.name.toLowerCase());
      if (!exists) {
        console.log(`Seeding de la salle manquante (${room.name})...`);
        try {
          await api.createSalle({
            nom:          room.name,
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
        } catch (e) {
          console.warn(`Erreur lors du seeding de la salle ${room.name}:`, e);
        }
      }
    }

    // 3. Charger les salles depuis la BD
    const dbRooms = await safeJson(() => api.fetchSalles(), []);
    if (dbRooms.length > 0) {
      state.rooms = dbRooms.map(r => apiRoomToLocal(r));
    } else {
      state.rooms = defaultRooms;
    }

    // 4. Charger le personnel complet depuis la BD
    const dbStaff = await safeJson(() => api.fetchPersonnel(), []);
    if (dbStaff.length > 0) {
      state.staff = dbStaff.map(s => {
        const fullName = (s.nom || '').trim();
        const subCat = s.role;

        let allowedRooms = state.rooms.map(r => String(r.id || r.name));
        if (s.allowed_rooms !== undefined && s.allowed_rooms !== null && s.allowed_rooms !== '') {
          allowedRooms = s.allowed_rooms.split(',').filter(Boolean);
        } else {
          if (subCat === 'INF') allowedRooms = state.rooms.filter(r => ['Scanner', 'Radio', 'Échographie / Doppler'].includes(r.name)).map(r => String(r.id || r.name));
        }

        const status = s.statut || (s.actif ? 'actif' : 'retrait');

        return {
          id: s.id,
          matricule: s.matricule || `ID-${s.id}`,
          name: fullName,
          cat: subCat,
          status: status,
          allowedRooms: allowedRooms
        };
      });
    } else {
      state.staff = defaultStaff;
    }

    // 5. Charger les plannings enregistrés depuis la BD
    const dbPlannings = await safeJson(() => api.fetchPlannings(), []);
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
    state.ui.isHydrated = true;
    renderAll();
    console.log("Données initialisées et synchronisées avec succès !");
  } catch (err) {
    console.error("Erreur d'initialisation des données:", err);
    window.toast("🛑 Erreur d'initialisation avec l'API Back-End.");
    state.staff = defaultStaff;
    state.rooms = defaultRooms;
    state.ui.isHydrated = true;
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

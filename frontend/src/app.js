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
  const teamLayout = document.getElementById('team-layout') || document.getElementById('subnav-team');

  document.querySelectorAll('.tabbtn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));

  const btn = document.querySelector(`.tabbtn[data-tab="${tabNum}"]`);
  if (btn) btn.classList.add('active');

  if (tabNum === 'team') {
    if (teamLayout) teamLayout.classList.add('visible');
    const activeSubBtn = document.querySelector('.subnav-btn.active');
    const activeSubId = activeSubBtn ? activeSubBtn.dataset.subtab : '1';
    const subPanel = document.getElementById(`tab${activeSubId}`);
    if (subPanel) subPanel.classList.add('active');
    if (String(activeSubId) === '7') renderExtDutyTab();
  } else {
    if (teamLayout) teamLayout.classList.remove('visible');
    const panel = document.getElementById(`tab${tabNum}`);
    if (panel) panel.classList.add('active');
    if (tabNum === 5) renderRestitution();
    if (tabNum === 7) renderExtDutyTab();
  }
};

window.switchSubTab = function(subTabNum) {
  document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active'));
  const subBtn = document.querySelector(`.subnav-btn[data-subtab="${subTabNum}"]`);
  if (subBtn) subBtn.classList.add('active');

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

async function loadDataFromDB() {
  try {
    const safeJson = async (request, fallback = []) => {
      try {
        const response = await request();
        return Array.isArray(response) ? response : fallback;
      } catch (error) {
        console.warn('API fetch fallback', error);
        return fallback;
      }
    };

    // 1. Charger le Personnel depuis la base
    const dbStaff = await safeJson(() => api.fetchPersonnel(), []);
    state.staff = dbStaff.map(s => ({
      id: s.id,
      matricule: s.matricule,
      name: s.nom,
      cat: s.categorie,
      status: s.statut || 'actif',
      salle_ids: s.salle_ids || []
    }));

    // 2. Charger les Salles depuis la base
    const dbRooms = await safeJson(() => api.fetchSalles(), []);
    state.rooms = dbRooms.map(r => apiRoomToLocal(r));

    // 3. Charger les Congés depuis la base
    const dbConges = await safeJson(() => api.fetchConges(), []);
    state.leavesList = dbConges;

    // 4. Charger les Indisponibilités depuis la base
    const dbIndisps = await safeJson(() => api.fetchIndisponibilites(), []);
    state.indisponibilitesList = dbIndisps;

    // 5. Charger les Jours Fériés depuis la base
    const dbFeries = await safeJson(() => api.fetchJoursFeries(), []);
    state.holidays = dbFeries.map(h => ({
      id: h.id,
      date: h.date,
      name: h.libelle,
      libelle: h.libelle
    }));

    // 6. Charger l'historique des plannings sauvegardés
    const dbPlannings = await safeJson(() => api.fetchPlannings(), []);
    state.archives = {};
    dbPlannings.forEach(p => {
      const key = `${p.semaine_code}_DB_${p.id}`;
      state.archives[key] = {
        name: `Semaine du ${p.semaine_code} (Validé)`,
        start: p.semaine_code,
        schedule: p.affectations,
        snapshotPersonnel: p.snapshot_personnel,
        snapshotSalles: p.snapshot_salles
      };
    });

    state.ui.isHydrated = true;
    updateArchivesDropdown();
    renderAll();
    window.updateHeaderStats();
    console.log('Données hydratées depuis SQLite avec succès !');
  } catch (err) {
    console.error("Erreur d'hydratation des données:", err);
  }
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  registerListener(renderStaffTable);
  registerListener(renderRooms);
  registerListener(renderLeaveTable);
  registerListener(renderHolidaysTable);
  registerListener(populateStaffSelects);
  registerListener(window.updateHeaderStats);

  loadDataFromDB();
});

import { state, registerListener, renderAll } from './state.js';
import * as api from './api/api.js';
import { initStaff, renderStaffTable, populateStaffSelects } from './components/staff.js';
import { initRooms, renderRooms, apiRoomToLocal } from './components/rooms.js';
import { initLeaves, renderLeaveTable, totalLeaveDays, isOnLeave } from './components/leaves.js';
import { initCalendar, renderHolidaysTable } from './components/calendar.js';
import { initPlanning, renderRestitution, updateArchivesDropdown } from './components/planning.js';
import { initExtDuty, renderExtDutyTab } from './components/extDuty.js';
import { defaultRooms } from './utils/appSeedData.js';

// ---------- Initialisation des contrôleurs ----------
initStaff();
initRooms();
initLeaves();
initCalendar();
initPlanning();
initExtDuty();

// ---------- Éléments Globaux d'Interface ----------
window.toast = function (msg) {
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }
};

window.switchTab = function (tabNum) {
  const teamLayout =
    document.getElementById('team-layout') ||
    document.getElementById('subnav-team');

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

    if (String(activeSubId) === '7') {
      renderExtDutyTab();
    }
  } else {
    if (teamLayout) teamLayout.classList.remove('visible');

    const panel = document.getElementById(`tab${tabNum}`);
    if (panel) panel.classList.add('active');

    if (tabNum === 5) renderRestitution();
    if (tabNum === 7) renderExtDutyTab();
  }
};

window.switchSubTab = function (subTabNum) {
  document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active'));

  const subBtn = document.querySelector(`.subnav-btn[data-subtab="${subTabNum}"]`);
  if (subBtn) subBtn.classList.add('active');

  document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));

  const panel = document.getElementById(`tab${subTabNum}`);
  if (panel) panel.classList.add('active');

  if (subTabNum === 7) {
    renderExtDutyTab();
  }
};

window.updateHeaderStats = function () {
  const sS = document.getElementById('statSeniors');
  if (sS) {
    sS.textContent = state.staff.filter(
      s => s.cat === 'SENIOR' && s.status === 'actif'
    ).length;
  }

  const sR = document.getElementById('statResidents');
  if (sR) {
    sR.textContent = state.staff.filter(
      s => s.cat.startsWith('RESIDENT') && s.status === 'actif'
    ).length;
  }

  const sT = document.getElementById('statTechs');
  if (sT) {
    sT.textContent = state.staff.filter(
      s => s.cat === 'TECH' && s.status === 'actif'
    ).length;
  }

  const sF = document.getElementById('statFeries');
  if (sF) {
    sF.textContent = state.holidays.length;
  }

  const sA = document.getElementById('statAlert');
  if (sA) {
    sA.textContent = state.staff.filter(
      s => totalLeaveDays(s.matricule) > 60
    ).length;
  }
};

async function seedAndLoadData() {
  try {
    const safeJson = async (request, fallback = []) => {
      try {
        const response = await request();
        return Array.isArray(response) ? response : fallback;
      } catch (error) {
        console.warn('API unavailable', error);
        return fallback;
      }
    };

    // 1. Charger les salles depuis la BD
    const dbRooms = await safeJson(() => api.fetchSalles(), []);
    state.rooms = dbRooms.map(r => apiRoomToLocal(r));

    // 2. Charger le personnel UNIQUEMENT depuis la BD
    const dbStaff = await safeJson(() => api.fetchPersonnel(), []);
    if (dbStaff.length > 0) {
      state.staff = dbStaff.map(s => {
        const fullName = (s.nom || s.nom_prenom || '').trim();
        const rawRole = String(s.role || s.categorie || '').trim().toLowerCase();
        let subCat = 'SENIOR';
        if (rawRole.includes('1ere') || rawRole.includes('1ère') || rawRole === 'resident_1ere') {
          subCat = 'RESIDENT_1ERE';
        } else if (rawRole.includes('majeur') || rawRole === 'resident_majeur') {
          subCat = 'RESIDENT_MAJEUR';
        } else if (rawRole.includes('tech')) {
          subCat = 'TECH';
        } else if (rawRole.includes('inf')) {
          subCat = 'INF';
        } else if (rawRole.includes('senior')) {
          subCat = 'SENIOR';
        } else {
          subCat = rawRole.toUpperCase() || 'SENIOR';
        }
        let allowedRooms = state.rooms.map(r => String(r.id || r.name));
        if (s.allowed_rooms !== undefined && s.allowed_rooms !== null && s.allowed_rooms !== '') {
          allowedRooms = s.allowed_rooms.split(',').map(r => r.trim()).filter(Boolean);
        } else if (subCat === 'INF') {
          allowedRooms = state.rooms
            .filter(r => ['Scanner', 'Radio', 'Échographie / Doppler'].includes(r.name))
            .map(r => String(r.id || r.name));
        }
        const rawStatus = String(s.statut || s.status || (s.actif ? 'actif' : 'hors_service')).toLowerCase();
        let status = 'actif';
        if (['hors_service', 'inactif', 'horsservice', 'false'].includes(rawStatus) || s.actif === false) {
          status = 'hors_service';
        } else if (['retrait', 'en_retrait'].includes(rawStatus)) {
          status = 'en_retrait';
        }
        return { id: s.id, matricule: s.matricule || `ID-${s.id}`, name: fullName, cat: subCat, status: status, allowedRooms: allowedRooms };
      });
    } else {
      state.staff = [];
    }

    // 3. Charger les congés & jours fériés depuis la BD
    const dbConges = await safeJson(() => api.fetchConges(), []);
    state.leaves = { summer: {}, flex: [] };
    dbConges.forEach(conge => {
      const staff = state.staff.find(s => s.id === conge.personnel_id);
      if (!staff) return;
      if (conge.type_conge === 'ete') state.leaves.summer[staff.matricule] = { start: conge.date_debut, personnelId: staff.id };
      else state.leaves.flex.push({ id: conge.type_conge, personnelId: staff.id, staffId: staff.matricule, start: conge.date_debut, end: conge.date_fin, reason: conge.raison || 'Sans objet' });
    });

    const dbJoursFeries = await safeJson(() => api.fetchJoursFeries(), []);
    state.holidays = dbJoursFeries.map(jour => ({ date: jour.date, name: jour.libelle, impactGarde: true }));

    // 4. Charger les plannings enregistrés depuis la BD
    const dbPlannings = await safeJson(() => api.fetchPlannings(), []);
    state.archives = {};
    if (Array.isArray(dbPlannings) && dbPlannings.length > 0) {
      const weeksMap = {};
      dbPlannings.forEach(p => {
        if (!p.date) return;
        const d = new Date(p.date + 'T00:00:00');
        const dayOfWeek = (d.getDay() + 6) % 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - dayOfWeek);
        const mondayStr = monday.toISOString().split('T')[0];
        if (!weeksMap[mondayStr]) weeksMap[mondayStr] = [];
        weeksMap[mondayStr].push(p);
      });
      Object.keys(weeksMap).forEach(mondayStr => {
        const records = weeksMap[mondayStr];
        const datesList = Array.from({ length: 7 }, (_, i) => {
          const dt = new Date(mondayStr + 'T00:00:00');
          dt.setDate(dt.getDate() + i);
          return dt.toISOString().split('T')[0];
        });
        const gridAssignments = {};
        const nightAssignments = {};
        const additionalSeniorAssignments = {};
        const activeStaff = state.staff.filter(s => s.status === 'actif');
        datesList.forEach(dStr => {
          const hol = state.holidays.find(h => h.date === dStr);
          activeStaff.forEach(st => {
            const k = `${st.matricule}_${dStr}`;
            const isL = isOnLeave(st.matricule, dStr);
            if (isL) gridAssignments[k] = 'CONGE';
            else if (hol) gridAssignments[k] = 'FERIE';
            else gridAssignments[k] = 'REPOS';
          });
        });
        records.forEach(rec => {
          const staffObj = state.staff.find(s => s.id === rec.personnel_id);
          const roomObj = state.rooms.find(r => r.id === rec.salle_id);
          if (!staffObj || !roomObj) return;
          const k = `${staffObj.matricule}_${rec.date}`;
          if (rec.periode === 'nuit') {
            nightAssignments[k] = 'GARDE';
          } else {
            if (gridAssignments[k] && gridAssignments[k] !== 'REPOS' && gridAssignments[k] !== 'CONGE' && gridAssignments[k] !== 'FERIE') {
              additionalSeniorAssignments[k] = additionalSeniorAssignments[k] || [];
              if (!additionalSeniorAssignments[k].includes(roomObj.name)) {
                additionalSeniorAssignments[k].push(roomObj.name);
              }
            } else {
              gridAssignments[k] = roomObj.name;
            }
          }
        });
        const key = `${mondayStr}_DB`;
        const mondayDate = new Date(mondayStr + 'T00:00:00');
        const formattedLabel = mondayDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        state.archives[key] = {
          name: `Semaine du ${formattedLabel}`,
          start: mondayStr,
          schedule: { datesList, gridAssignments, nightAssignments, additionalSeniorAssignments }
        };
      });
    }
    updateArchivesDropdown();

    // 5. Rendu final
    state.ui.isHydrated = true;
    renderAll();
    console.log("Données initialisées depuis la BD avec succès !");
  } catch (err) {
    console.error("Erreur d'initialisation des données:", err);
    window.toast("🛑 Erreur d'initialisation avec l'API Back-End.");
    state.staff = [];
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

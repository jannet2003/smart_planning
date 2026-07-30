export const CATS = {
  SENIOR: { label: 'Médecin Senior', short: 'Senior' },
  RESIDENT_1ERE: { label: 'Résident 1ère Année', short: 'Rés. 1ère' },
  RESIDENT_MAJEUR: { label: 'Résident Majeur', short: 'Rés. Majeur' },
  INF: { label: 'Infirmier', short: 'Infirmier' },
  TECH: { label: 'Technicien Supérieur', short: 'Technicien' }
};

export const TASK_CLASSES = {
  'SCAN_M': 'task-cell scanner', 'SCAN_A': 'task-cell scanner',
  'IRM_M': 'task-cell irm', 'IRM_A': 'task-cell irm',
  'RAD_M': 'task-cell echo', 'RAD_A': 'task-cell echo',
  'LECT_M': 'task-cell lecture', 'LECT_A': 'task-cell lecture',
  'GARDE': 'task-cell garde', 'REPOS': 'task-cell repos', 'CONGE': 'task-cell conge',
  'FERIE': 'task-cell ferie'
};

export const TASK_LABELS = {
  'SCAN_M': 'Scanner', 'SCAN_A': 'Scanner',
  'IRM_M': 'IRM', 'IRM_A': 'IRM',
  'RAD_M': 'Écho / Doppler', 'RAD_A': 'Écho / Doppler',
  'LECT_M': 'Salle de lecture', 'LECT_A': 'Salle de lecture',
  'GARDE': 'Garde', 'REPOS': 'Repos', 'CONGE': 'Congé',
  'FERIE': 'Férié'
};

export const state = {
  staff: [],
  leaves: { summer: {}, flex: [] },
  holidays: [
    { date: '2026-01-14', name: 'Révolution tunisienne', impactGarde: true },
    { date: '2026-03-20', name: 'Fête de l\'Indépendance', impactGarde: true },
    { date: '2026-05-01', name: 'Fête du Travail', impactGarde: true },
    { date: '2026-07-25', name: 'Fête de la République', impactGarde: true },
    { date: '2026-08-13', name: 'Fête de la Femme', impactGarde: true }
  ],
  rooms: [
    { id: 'Scanner', name: 'Scanner', minSenior: 1, maxSenior: 3, minResident: 1, maxResident: 3, minInf: 0, maxInf: 2, minTech: 2, maxTech: 4, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'SCAN_M' },
    { id: 'IRM', name: 'IRM', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 3, minInf: 0, maxInf: 1, minTech: 1, maxTech: 3, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'IRM_M' },
    { id: 'Radio', name: 'Échographie / Doppler', minSenior: 1, maxSenior: 2, minResident: 2, maxResident: 4, minInf: 1, maxInf: 2, minTech: 1, maxTech: 2, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'RAD_M' },
    { id: 'Lecture', name: 'Salle de Lecture', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 2, minInf: 0, maxInf: 0, minTech: 0, maxTech: 1, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'LECT_M' }
  ],
  schedule: null,
  activeRestitTab: 'SENIOR',
  archives: {},
  isEditing: false,
  weeklyAvailability: {},
  weeklyRoomAvailability: {},
  externalDuty: {
    weekStart: null,
    SENIOR: { manualOpen: false, customTags: [], records: {}, dayRecords: {} },
    RESIDENT: { manualOpen: false, customTags: [], records: {}, dayRecords: {} },
    TECH: { manualOpen: false, customTags: [], records: {}, dayRecords: {} }
  }
};

window.state = state;

const listeners = [];

export function registerListener(callback) {
  listeners.push(callback);
}

export function renderAll() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error("Error in render listener:", e);
    }
  });
}

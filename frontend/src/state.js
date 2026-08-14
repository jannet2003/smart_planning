export const CATS = {
  SENIOR: { label: 'Médecin Senior', short: 'Senior' },
  RESIDENT_1ERE: { label: 'Résident 1ère Année', short: 'Rés. 1ère' },
  RESIDENT_MAJEUR: { label: 'Résident Majeur', short: 'Rés. Majeur' },
  INF: { label: 'Infirmier', short: 'Infirmier' },
  TECH: { label: 'Technicien Supérieur', short: 'Technicien' }
};

export const TASK_CLASSES = {
  'Scanner': 'task-cell scanner',
  'IRM': 'task-cell irm',
  'Échographie / Doppler': 'task-cell echo',
  'Radio': 'task-cell echo',
  'Salle de Lecture': 'task-cell lecture',
  'GARDE': 'task-cell garde',
  'REPOS': 'task-cell repos',
  'CONGE': 'task-cell conge',
  'FERIE': 'task-cell ferie'
};

export const TASK_LABELS = {
  'Scanner': 'Scanner',
  'IRM': 'IRM',
  'Échographie / Doppler': 'Écho / Doppler',
  'Radio': 'Écho / Doppler',
  'Salle de Lecture': 'Salle de lecture',
  'GARDE': 'Garde',
  'REPOS': 'Repos',
  'CONGE': 'Congé',
  'FERIE': 'Férié'
};

export function getTaskClass(taskName) {
  if (!taskName) return 'task-cell repos';
  if (TASK_CLASSES[taskName]) return TASK_CLASSES[taskName];
  // Normalisation rétrocompatible si ancien code
  if (taskName === 'SCAN_M' || taskName === 'SCAN_A') return 'task-cell scanner';
  if (taskName === 'IRM_M' || taskName === 'IRM_A') return 'task-cell irm';
  if (taskName === 'RAD_M' || taskName === 'RAD_A') return 'task-cell echo';
  if (taskName === 'LECT_M' || taskName === 'LECT_A') return 'task-cell lecture';
  return 'task-cell scanner';
}

export function getTaskLabel(taskName) {
  if (!taskName) return '';
  if (TASK_LABELS[taskName]) return TASK_LABELS[taskName];
  if (taskName === 'SCAN_M' || taskName === 'SCAN_A') return 'Scanner';
  if (taskName === 'IRM_M' || taskName === 'IRM_A') return 'IRM';
  if (taskName === 'RAD_M' || taskName === 'RAD_A') return 'Écho / Doppler';
  if (taskName === 'LECT_M' || taskName === 'LECT_A') return 'Salle de lecture';
  return taskName;
}

export const state = {
  staff: [],
  leaves: { summer: {}, flex: [] },
  ui: { isHydrated: false },
  holidays: [
    { date: '2026-01-14', name: 'Révolution tunisienne', impactGarde: true },
    { date: '2026-03-20', name: 'Fête de l\'Indépendance', impactGarde: true },
    { date: '2026-05-01', name: 'Fête du Travail', impactGarde: true },
    { date: '2026-07-25', name: 'Fête de la République', impactGarde: true },
    { date: '2026-08-13', name: 'Fête de la Femme', impactGarde: true }
  ],
  rooms: [
    { id: 'Scanner', name: 'Scanner', minSenior: 1, maxSenior: 3, minResident: 1, maxResident: 3, minInf: 0, maxInf: 2, minTech: 2, maxTech: 4, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '' },
    { id: 'IRM', name: 'IRM', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 3, minInf: 0, maxInf: 1, minTech: 1, maxTech: 3, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '' },
    { id: 'Radio', name: 'Échographie / Doppler', minSenior: 1, maxSenior: 2, minResident: 2, maxResident: 4, minInf: 1, maxInf: 2, minTech: 1, maxTech: 2, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '' },
    { id: 'Lecture', name: 'Salle de Lecture', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 2, minInf: 0, maxInf: 0, minTech: 0, maxTech: 1, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '' }
  ],
  schedule: null,
  activeRestitTab: 'SENIOR',
  archives: {},
  isEditing: false,
  weeklyAvailability: {},
  weeklyRoomAvailability: {},
  externalDuty: {
    weekStart: null,
    SENIOR: { manualOpen: false, customTags: [], records: {}, dayRecords: {}, autoRestDays: {} },
    RESIDENT: { manualOpen: false, customTags: [], records: {}, dayRecords: {}, autoRestDays: {} },
    TECH: { manualOpen: false, customTags: [], records: {}, dayRecords: {}, autoRestDays: {} }
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

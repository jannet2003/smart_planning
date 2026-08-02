export const defaultStaff = [
  { matricule: 'SR-001', name: 'Dr. Jannet Hazzouk', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'SR-002', name: 'Dr. Ahmed Kricha', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'SR-003', name: 'Dr Achour', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'SR-004', name: 'Dr Maatouk', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'SR-005', name: 'Dr Gaied', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true },
  { matricule: 'INF-001', name: 'Inf. Chaker Ben Salem', cat: 'INF', status: 'actif', allowedRooms: ['Scanner', 'Radio'], hasGarde: false }
];

for (let i = 1; i <= 6; i++) {
  const subCat = (i <= 3) ? 'RESIDENT_1ERE' : 'RESIDENT_MAJEUR';
  defaultStaff.push({ matricule: `RES-${String(i).padStart(3, '0')}`, name: `Dr. Résident R${i}`, cat: subCat, status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'], hasGarde: true });
}

for (let i = 1; i <= 15; i++) {
  defaultStaff.push({ matricule: `TS-${String(i).padStart(3, '0')}`, name: `Tech. Radiologie ${i}`, cat: 'TECH', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio'], hasGarde: false });
}

export const defaultRooms = [
  { id: 'Scanner', name: 'Scanner', minSenior: 1, maxSenior: 3, minResident: 1, maxResident: 3, minInf: 0, maxInf: 2, minTech: 2, maxTech: 4, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'SCAN_M' },
  { id: 'IRM', name: 'IRM', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 3, minInf: 0, maxInf: 1, minTech: 1, maxTech: 3, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'IRM_M' },
  { id: 'Radio', name: 'Échographie / Doppler', minSenior: 1, maxSenior: 2, minResident: 2, maxResident: 4, minInf: 1, maxInf: 2, minTech: 1, maxTech: 2, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'RAD_M' },
  { id: 'Lecture', name: 'Salle de Lecture', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 2, minInf: 0, maxInf: 0, minTech: 0, maxTech: 1, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '', code: 'LECT_M' }
];

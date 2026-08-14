export const defaultStaff = [
  { name: 'Dr. Jannet Hazzouk', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'] },
  { name: 'Dr. Ahmed Kricha', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'] },
  { name: 'Dr Achour', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'] },
  { name: 'Dr Maatouk', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'] },
  { name: 'Dr Gaied', cat: 'SENIOR', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'] },
  { name: 'Inf. Chaker Ben Salem', cat: 'INF', status: 'actif', allowedRooms: ['Scanner', 'Radio'] }
];

for (let i = 1; i <= 6; i++) {
  const subCat = (i <= 3) ? 'RESIDENT_1ERE' : 'RESIDENT_MAJEUR';
  defaultStaff.push({ name: `Dr. Résident R${i}`, cat: subCat, status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio', 'Lecture'] });
}

for (let i = 1; i <= 15; i++) {
  defaultStaff.push({ name: `Tech. Radiologie ${i}`, cat: 'TECH', status: 'actif', allowedRooms: ['Scanner', 'IRM', 'Radio'] });
}

export const defaultRooms = [
  { id: 'Scanner', name: 'Scanner', minSenior: 1, maxSenior: 3, minResident: 1, maxResident: 3, minInf: 0, maxInf: 2, minTech: 2, maxTech: 4, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '' },
  { id: 'IRM', name: 'IRM', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 3, minInf: 0, maxInf: 1, minTech: 1, maxTech: 3, seniorMode: 'EXCLUSIVE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '' },
  { id: 'Radio', name: 'Échographie / Doppler', minSenior: 1, maxSenior: 2, minResident: 2, maxResident: 4, minInf: 1, maxInf: 2, minTech: 1, maxTech: 2, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '' },
  { id: 'Lecture', name: 'Salle de Lecture', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 2, minInf: 0, maxInf: 0, minTech: 0, maxTech: 1, seniorMode: 'COMBINABLE', seniorCompatibleRooms: [], isBroken: false, brokenStart: '', brokenEnd: '', brokenReason: '' }
];

export const defaultStaff = [
  { matricule: '101', name: 'Dr. Jannet Hazzouk', cat: 'SENIOR', status: 'actif' },
  { matricule: '102', name: 'Dr. Ahmed Kricha', cat: 'SENIOR', status: 'actif' },
  { matricule: '103', name: 'Dr Achour', cat: 'SENIOR', status: 'actif' },
  { matricule: '104', name: 'Dr Maatouk', cat: 'SENIOR', status: 'actif' },
  { matricule: '105', name: 'Dr Gaied', cat: 'SENIOR', status: 'actif' },
  { matricule: '201', name: 'Inf. Chaker Ben Salem', cat: 'INF', status: 'actif' }
];

for (let i = 1; i <= 6; i++) {
  const subCat = (i <= 3) ? 'RESIDENT_1ERE' : 'RESIDENT_MAJEUR';
  defaultStaff.push({ matricule: `R00${i}`, name: `Dr. Résident R${i}`, cat: subCat, status: 'actif' });
}

for (let i = 1; i <= 15; i++) {
  defaultStaff.push({ matricule: `T${String(i).padStart(2, '0')}`, name: `Tech. Radiologie ${i}`, cat: 'TECH', status: 'actif' });
}

export const defaultRooms = [
  { id: 1, name: 'Scanner', minSenior: 1, maxSenior: 3, minResident: 1, maxResident: 3, minInf: 0, maxInf: 2, minTech: 2, maxTech: 4, seniorMode: 'EXCLUSIVE' },
  { id: 2, name: 'IRM', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 3, minInf: 0, maxInf: 1, minTech: 1, maxTech: 3, seniorMode: 'EXCLUSIVE' },
  { id: 3, name: 'Échographie / Doppler', minSenior: 1, maxSenior: 2, minResident: 2, maxResident: 4, minInf: 1, maxInf: 2, minTech: 1, maxTech: 2, seniorMode: 'COMBINABLE' },
  { id: 4, name: 'Salle de Lecture', minSenior: 1, maxSenior: 2, minResident: 1, maxResident: 2, minInf: 0, maxInf: 0, minTech: 0, maxTech: 1, seniorMode: 'COMBINABLE' }
];

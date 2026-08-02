const STATUS_VALUES = ['actif', 'retrait', 'hors_service'];

export function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  return STATUS_VALUES.includes(value) ? value : 'actif';
}

export function getStatusLabel(status) {
  return normalizeStatus(status).toUpperCase().replace('_', ' ');
}

export function getStaffCategoryFlags(cat) {
  return {
    hasGarde: ['SENIOR', 'RESIDENT_MAJEUR', 'TECH'].includes(cat),
  };
}

export function buildStaffName(prenom, nom, fallback = '') {
  const fullName = [prenom, nom].filter(Boolean).join(' ').trim();
  return fullName || fallback;
}

export function getFilteredStaff(staff, activeRestitTab, onlyActive = true) {
  let filtered = Array.isArray(staff) ? staff : [];

  if (onlyActive) {
    filtered = filtered.filter((member) => normalizeStatus(member.status) === 'actif');
  }

  if (activeRestitTab === 'SENIOR') {
    filtered = filtered.filter((member) => member.cat === 'SENIOR');
  } else if (activeRestitTab === 'RESIDENT') {
    filtered = filtered.filter((member) => member.cat.startsWith('RESIDENT'));
  } else if (activeRestitTab === 'TECH') {
    filtered = filtered.filter((member) => member.cat === 'TECH');
  }

  return filtered;
}

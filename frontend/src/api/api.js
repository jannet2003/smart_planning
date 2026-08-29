// Détermination dynamique de l'URL de base de l'API
const BASE_URL = (() => {
  if (typeof window === 'undefined') return 'http://localhost:8000/api';
  
  // Si servi par FastAPI directement (ex: http://localhost:8000 ou 8011), utiliser le chemin relatif /api
  if (window.location.protocol.startsWith('http') && window.location.port && window.location.port !== '5500' && window.location.port !== '5501') {
    return '/api';
  }
  
  // Si ouvert via Live Server (port 5500) ou fichier local, pointer vers le port 8000 de debug (ou 8011 si spécifié)
  return window.location.port === '8011' ? 'http://localhost:8011/api' : 'http://localhost:8000/api';
})();

export async function fetchPersonnel() {
  const res = await fetch(`${BASE_URL}/personnel/`);
  if (!res.ok) throw new Error("Erreur de récupération du personnel");
  return res.json();
}

export async function createPersonnel(personnel) {
  const res = await fetch(`${BASE_URL}/personnel/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personnel)
  });
  if (!res.ok) throw new Error("Erreur de création de l'agent");
  return res.json();
}

export async function updatePersonnel(id, personnel) {
  const res = await fetch(`${BASE_URL}/personnel/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personnel)
  });
  if (!res.ok) throw new Error("Erreur de mise à jour de l'agent");
  return res.json();
}

export async function deletePersonnel(id) {
  const res = await fetch(`${BASE_URL}/personnel/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Erreur de suppression de l'agent");
  return res.json();
}

export async function fetchSalles() {
  const res = await fetch(`${BASE_URL}/salles/`);
  if (!res.ok) throw new Error("Erreur de récupération des salles");
  return res.json();
}

export async function createSalle(salle) {
  const res = await fetch(`${BASE_URL}/salles/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(salle)
  });
  if (!res.ok) {
    let message = 'Erreur lors de la création de la salle';
    try {
      const error = await res.json();
      message = error.detail || message;
    } catch (_) {
      // Réponse non JSON : conserver un message clair pour l'utilisateur.
    }
    throw new Error(message);
  }
  return res.json();
}

export async function updateSalle(id, salle) {
  const res = await fetch(`${BASE_URL}/salles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(salle)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur de mise à jour de la salle: ${errText}`);
  }
  return res.json();
}

export async function deleteSalle(id) {
  const res = await fetch(`${BASE_URL}/salles/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Erreur de suppression de la salle");
  return res.json();
}

export async function fetchIndisponibilites(salleId = null) {
  const url = salleId
    ? `${BASE_URL}/indisponibilites/?salle_id=${salleId}`
    : `${BASE_URL}/indisponibilites/`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur de récupération des indisponibilités");
  return res.json();
}

export async function createIndisponibilite(data) {
  const res = await fetch(`${BASE_URL}/indisponibilites/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    let message = "Erreur lors de la création de l'indisponibilité";
    try { const err = await res.json(); message = err.detail || message; } catch (_) {}
    throw new Error(message);
  }
  return res.json();
}

export async function updateIndisponibilite(id, data) {
  const res = await fetch(`${BASE_URL}/indisponibilites/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    let message = "Erreur lors de la mise à jour de l'indisponibilité";
    try { const err = await res.json(); message = err.detail || message; } catch (_) {}
    throw new Error(message);
  }
  return res.json();
}

export async function deleteIndisponibilite(id) {
  const res = await fetch(`${BASE_URL}/indisponibilites/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Erreur de suppression de l'indisponibilité");
}

export async function fetchConges() {
  const res = await fetch(`${BASE_URL}/conges`);
  if (!res.ok) throw new Error("Erreur de récupération des congés");
  return res.json();
}

export async function createConge(conge) {
  const res = await fetch(`${BASE_URL}/conges`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conge) });
  if (!res.ok) throw new Error("Erreur d'enregistrement du congé");
  return res.json();
}

export async function deleteConge(personnelId, typeConge) {
  const res = await fetch(`${BASE_URL}/conges/${personnelId}/${encodeURIComponent(typeConge)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error("Erreur de suppression du congé");
}

export async function fetchJoursFeries() {
  const res = await fetch(`${BASE_URL}/jours-feries`);
  if (!res.ok) throw new Error("Erreur de récupération des jours fériés");
  return res.json();
}

export async function createJourFerie(jourFerie) {
  const res = await fetch(`${BASE_URL}/jours-feries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jourFerie) });
  if (!res.ok) throw new Error("Erreur d'enregistrement du jour férié");
  return res.json();
}

export async function deleteJourFerie(date) {
  const res = await fetch(`${BASE_URL}/jours-feries/${date}`, { method: 'DELETE' });
  if (!res.ok) throw new Error("Erreur de suppression du jour férié");
}

export async function fetchPlannings() {
  const res = await fetch(`${BASE_URL}/planning/`);
  if (!res.ok) throw new Error("Erreur de récupération des plannings");
  return res.json();
}

export async function fetchPlanningByWeek(weekCode) {
  const res = await fetch(`${BASE_URL}/planning/${weekCode}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Erreur lors de la récupération du planning");
  return res.json();
}

export async function savePlanning(planning) {
  const res = await fetch(`${BASE_URL}/planning/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planning)
  });
  if (!res.ok) throw new Error("Erreur lors de la sauvegarde du planning");
  return res.json();
}

export async function fetchVoeux(jourDebut = null, jourFin = null) {
  let url = `${BASE_URL}/voeux`;
  const params = [];
  if (jourDebut) params.push(`jour_debut=${jourDebut}`);
  if (jourFin) params.push(`jour_fin=${jourFin}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur de récupération des vœux");
  return res.json();
}

export async function createVoeu(data) {
  const res = await fetch(`${BASE_URL}/voeux`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    let message = "Erreur lors de l'enregistrement du vœu";
    try { const err = await res.json(); message = err.detail || message; } catch (_) {}
    throw new Error(message);
  }
  return res.json();
}

export async function deleteVoeu(id) {
  const res = await fetch(`${BASE_URL}/voeux/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Erreur lors de la suppression du vœu");
}

export const createvoeu = createVoeu;
export const fetchvoeux = fetchVoeux;
export const deletevoeu = deleteVoeu;

// Attachement global sur window.api pour garantir la disponibilité
const apiMethods = {
  fetchPersonnel,
  createPersonnel,
  updatePersonnel,
  deletePersonnel,
  fetchSalles,
  createSalle,
  updateSalle,
  deleteSalle,
  fetchIndisponibilites,
  createIndisponibilite,
  updateIndisponibilite,
  deleteIndisponibilite,
  fetchConges,
  createConge,
  deleteConge,
  fetchJoursFeries,
  createJourFerie,
  deleteJourFerie,
  fetchPlannings,
  fetchPlanningByWeek,
  savePlanning,
  fetchVoeux,
  fetchvoeux,
  createVoeu,
  createvoeu,
  deleteVoeu,
  deletevoeu
};

if (typeof window !== 'undefined') {
  window.api = { ...(window.api || {}), ...apiMethods };
}

export default apiMethods;




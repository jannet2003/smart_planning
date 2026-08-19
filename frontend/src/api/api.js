const BASE_URL = '/api';

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

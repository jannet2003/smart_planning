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
    const errText = await res.text();
    throw new Error(`Erreur de création de la salle: ${errText}`);
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

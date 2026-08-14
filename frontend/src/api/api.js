const BASE_URL = '/api';

// ========== PERSONNEL ==========
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur de création de l'agent" }));
    throw new Error(err.detail || "Erreur de création de l'agent");
  }
  return res.json();
}

export async function updatePersonnel(id, personnel) {
  const res = await fetch(`${BASE_URL}/personnel/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(personnel)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur de mise à jour de l'agent" }));
    throw new Error(err.detail || "Erreur de mise à jour de l'agent");
  }
  return res.json();
}

export async function deletePersonnel(id) {
  const res = await fetch(`${BASE_URL}/personnel/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Erreur de suppression de l'agent");
  return res.json();
}


// ========== SALLES ==========
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
    const err = await res.json().catch(() => ({ detail: "Erreur de création de la salle" }));
    throw new Error(err.detail || "Erreur de création de la salle");
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
    const err = await res.json().catch(() => ({ detail: "Erreur de mise à jour de la salle" }));
    throw new Error(err.detail || "Erreur de mise à jour de la salle");
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


// ========== CONGÉS ==========
export async function fetchConges() {
  const res = await fetch(`${BASE_URL}/conges/`);
  if (!res.ok) throw new Error("Erreur de récupération des congés");
  return res.json();
}

export async function createConge(conge) {
  const res = await fetch(`${BASE_URL}/conges/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conge)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur d'enregistrement du congé" }));
    throw new Error(err.detail || "Erreur d'enregistrement du congé");
  }
  return res.json();
}

export async function deleteConge(id) {
  const res = await fetch(`${BASE_URL}/conges/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Erreur de suppression du congé");
  return res.json();
}


// ========== INDISPONIBILITÉS SALLES ==========
export async function fetchIndisponibilites() {
  const res = await fetch(`${BASE_URL}/indisponibilites/`);
  if (!res.ok) throw new Error("Erreur de récupération des indisponibilités");
  return res.json();
}

export async function createIndisponibilite(indisp) {
  const res = await fetch(`${BASE_URL}/indisponibilites/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(indisp)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur d'enregistrement de l'indisponibilité" }));
    throw new Error(err.detail || "Erreur d'enregistrement de l'indisponibilité");
  }
  return res.json();
}

export async function deleteIndisponibilite(id) {
  const res = await fetch(`${BASE_URL}/indisponibilites/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Erreur de suppression de l'indisponibilité");
  return res.json();
}


// ========== JOURS FÉRIÉS ==========
export async function fetchJoursFeries() {
  const res = await fetch(`${BASE_URL}/jours-feries/`);
  if (!res.ok) throw new Error("Erreur de récupération des jours fériés");
  return res.json();
}

export async function createJourFerie(ferie) {
  const res = await fetch(`${BASE_URL}/jours-feries/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ferie)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur d'enregistrement du jour férié" }));
    throw new Error(err.detail || "Erreur d'enregistrement du jour férié");
  }
  return res.json();
}

export async function deleteJourFerie(id) {
  const res = await fetch(`${BASE_URL}/jours-feries/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error("Erreur de suppression du jour férié");
  return res.json();
}


// ========== PLANNING & SNAPSHOTS ==========
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur lors de la sauvegarde du planning" }));
    throw new Error(err.detail || "Erreur lors de la sauvegarde du planning");
  }
  return res.json();
}

import { state, renderAll } from '../state.js';
import * as api from '../api/api.js';

let calendarCurrentYear = 2026;
let calendarCurrentMonth = 0;

export function initCalendar() {
  window.getHoliday = getHoliday;
  window.addHoliday = addHoliday;
  window.removeHoliday = removeHoliday;
  window.renderHolidaysTable = renderHolidaysTable;
  window.renderInteractiveCalendar = renderInteractiveCalendar;
  window.navigateCalendar = navigateCalendar;
  window.syncCalendarWithInputDate = syncCalendarWithInputDate;
  window.toggleDayHoliday = toggleDayHoliday;
}

window.getHoliday = getHoliday;
window.addHoliday = addHoliday;
window.removeHoliday = removeHoliday;
window.renderHolidaysTable = renderHolidaysTable;
window.renderInteractiveCalendar = renderInteractiveCalendar;
window.navigateCalendar = navigateCalendar;
window.syncCalendarWithInputDate = syncCalendarWithInputDate;
window.toggleDayHoliday = toggleDayHoliday;

export function getHoliday(dateStr) {
  return (state.holidays || []).find(h => h.date === dateStr);
}

export async function addHoliday() {
  const date = document.getElementById('h-date')?.value;
  const name = document.getElementById('h-name')?.value?.trim();
  if (!date || !name) { window.toast('⚠ Complétez la date et la désignation'); return; }
  if (state.holidays.some(h => h.date === date)) { window.toast('⚠ Un événement existe déjà à cette date'); return; }
  
  try {
    const saved = await api.createJourFerie({ date, libelle: name });
    state.holidays.push({ id: saved.id, date: saved.date, name: saved.libelle, libelle: saved.libelle });
    if (document.getElementById('h-date')) document.getElementById('h-date').value = '';
    if (document.getElementById('h-name')) document.getElementById('h-name').value = '';
    
    if (window.syncLeavesAndHolidaysIntoSchedule) {
      window.syncLeavesAndHolidaysIntoSchedule();
    }
    renderAll();
    window.toast('✓ Jour férié enregistré en base');
  } catch (err) {
    window.toast(`🛑 ${err.message || "Erreur d'enregistrement"}`);
  }
}

export async function removeHoliday(dateOrId) {
  const item = state.holidays.find(h => h.date === dateOrId || String(h.id) === String(dateOrId));
  if (!item) return;
  try {
    if (item.id) {
      await api.deleteJourFerie(item.id);
    }
    state.holidays = state.holidays.filter(h => h !== item);
    if (window.syncLeavesAndHolidaysIntoSchedule) {
      window.syncLeavesAndHolidaysIntoSchedule();
    }
    renderAll();
    window.toast('✕ Jour férié supprimé');
  } catch (err) {
    window.toast('🛑 Erreur de suppression du jour férié');
  }
}

export function renderHolidaysTable() {
  state.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
  const formatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const tbody = document.getElementById('feries-tbody');
  if (tbody) {
    tbody.innerHTML = state.holidays.map(h => {
      const formattedDate = formatter.format(new Date(h.date + 'T00:00:00')).replace('.', '');
      const splitted = formattedDate.split(' ');
      const displayDate = `<span style="color:#0c7c8c; font-weight:700;">${splitted[0]} ${splitted[1]}. ${splitted[2]}</span>`;
      return `<div class="holiday-list-item"><div class="date-lbl">${displayDate}</div><div class="name-lbl">${h.libelle || h.name}</div><button class="holiday-btn-delete" onclick="removeHoliday('${h.id || h.date}')">✕</button></div>`;
    }).join('');
  }
  const countF = document.getElementById('count-feries');
  if (countF) countF.textContent = state.holidays.length;
  renderInteractiveCalendar();
}

export function renderInteractiveCalendar() {
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const myLbl = document.getElementById('calendar-month-year');
  if (myLbl) myLbl.textContent = `${monthNames[calendarCurrentMonth]} ${calendarCurrentYear}`;
  const firstDayIndex = (new Date(calendarCurrentYear, calendarCurrentMonth, 1).getDay() + 6) % 7;
  const totalDaysInMonth = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();
  const container = document.getElementById('calendar-days-container');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'calendar-day empty';
    container.appendChild(emptyDiv);
  }
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    dayDiv.textContent = day;
    const dString = `${calendarCurrentYear}-${String(calendarCurrentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (getHoliday(dString)) dayDiv.classList.add('holiday-active');
    dayDiv.onclick = () => toggleDayHoliday(dString);
    container.appendChild(dayDiv);
  }
}

export function navigateCalendar(dir) {
  calendarCurrentMonth += dir;
  if (calendarCurrentMonth < 0) { calendarCurrentMonth = 11; calendarCurrentYear--; }
  else if (calendarCurrentMonth > 11) { calendarCurrentMonth = 0; calendarCurrentYear++; }
  renderInteractiveCalendar();
}

export function syncCalendarWithInputDate(dateVal) {
  if (!dateVal) return;
  const d = new Date(dateVal + 'T00:00:00');
  calendarCurrentYear = d.getFullYear();
  calendarCurrentMonth = d.getMonth();
  renderInteractiveCalendar();
}

export async function toggleDayHoliday(dateStr) {
  const hol = getHoliday(dateStr);
  if (hol) {
    await removeHoliday(hol.id || hol.date);
  } else {
    const defaultName = prompt("Entrez le libellé pour ce jour férié :", "Jour férié");
    if (defaultName !== null && defaultName.trim() !== "") {
      try {
        const saved = await api.createJourFerie({ date: dateStr, libelle: defaultName.trim() });
        state.holidays.push({ id: saved.id, date: saved.date, name: saved.libelle, libelle: saved.libelle });
        if (window.syncLeavesAndHolidaysIntoSchedule) {
          window.syncLeavesAndHolidaysIntoSchedule();
        }
        renderAll();
        window.toast('✓ Jour férié ajouté');
      } catch (err) {
        window.toast(`🛑 ${err.message || "Erreur"}`);
      }
    }
  }
}

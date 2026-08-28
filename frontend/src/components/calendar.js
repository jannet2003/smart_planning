import { state, renderAll } from '../state.js';
import * as api from '../api/api.js';
import { formatDateDMY } from '../utils/helpers.js';

async function refreshHolidaysFromApi() {
  const joursFeries = await api.fetchJoursFeries();
  state.holidays = joursFeries.map(jour => ({ date: jour.date, name: jour.libelle, impactGarde: true }));
}

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
  window.openAddHolidayModal = openAddHolidayModal;
  window.closeAddHolidayModal = closeAddHolidayModal;
}

// Attachement immédiat sur window
window.getHoliday = getHoliday;
window.addHoliday = addHoliday;
window.removeHoliday = removeHoliday;
window.renderHolidaysTable = renderHolidaysTable;
window.renderInteractiveCalendar = renderInteractiveCalendar;
window.navigateCalendar = navigateCalendar;
window.syncCalendarWithInputDate = syncCalendarWithInputDate;
window.toggleDayHoliday = toggleDayHoliday;
window.openAddHolidayModal = openAddHolidayModal;
window.closeAddHolidayModal = closeAddHolidayModal;

export function openAddHolidayModal(presetDate = '') {
  const modal = document.getElementById('add-holiday-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
  if (window.initDatePickers) window.initDatePickers();
  const d = document.getElementById('h-date');
  if (d) {
    if (presetDate) {
      if (d._flatpickr) d._flatpickr.setDate(presetDate, true);
      else d.value = presetDate;
      syncCalendarWithInputDate(presetDate);
    } else {
      if (d._flatpickr) d._flatpickr.clear();
      else d.value = '';
    }
  }
  const n = document.getElementById('h-name');
  if (n) {
    setTimeout(() => n.focus(), 50);
  }
}

export function closeAddHolidayModal() {
  const modal = document.getElementById('add-holiday-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  const d = document.getElementById('h-date');
  if (d) {
    if (d._flatpickr) d._flatpickr.clear();
    else d.value = '';
  }
  const n = document.getElementById('h-name');
  if (n) n.value = '';
}

export function getHoliday(dateStr) {
  return state.holidays.find(h => h.date === dateStr);
}

export async function addHoliday() {
  const date = document.getElementById('h-date').value;
  const name = document.getElementById('h-name').value.trim();
  const impactEl = document.getElementById('h-impact-garde');
  const impactGarde = impactEl ? impactEl.checked : true;
  if (!date || !name) { window.toast('⚠ Complétez la date et la désignation'); return; }
  if (state.holidays.some(h => h.date === date)) { window.toast('⚠ Un événement existe déjà à cette date'); return; }
  try { await api.createJourFerie({ date, libelle: name }); await refreshHolidaysFromApi(); }
  catch (error) { window.toast('🛑 Erreur d’enregistrement du jour férié'); return; }
  
  closeAddHolidayModal();
  
  if (window.syncLeavesAndHolidaysIntoSchedule) {
    window.syncLeavesAndHolidaysIntoSchedule();
  }
  renderAll();
  window.toast('✓ Jour férié enregistré');
}

export async function removeHoliday(date) {
  try { await api.deleteJourFerie(date); await refreshHolidaysFromApi(); }
  catch (error) { window.toast('🛑 Erreur de suppression du jour férié'); return; }
  if (window.syncLeavesAndHolidaysIntoSchedule) {
    window.syncLeavesAndHolidaysIntoSchedule();
  }
  renderAll();
  window.toast('✕ Jour férié supprimé');
}

export function renderHolidaysTable() {
  state.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
  const tbody = document.getElementById('feries-tbody');
  if (tbody) {
    tbody.innerHTML = state.holidays.map(h => {
      const displayDate = `<span style="color:#0c7c8c; font-weight:700;">${formatDateDMY(h.date)}</span>`;
      return `<div class="holiday-list-item"><div class="date-lbl">${displayDate}</div><div class="name-lbl">${h.name}</div><button class="holiday-btn-delete" onclick="removeHoliday('${h.date}')">✕</button></div>`;
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
    await removeHoliday(dateStr);
  } else {
    const defaultName = prompt("Entrez le libellé pour ce jour férié :", "Jour férié");
    if (defaultName !== null && defaultName.trim() !== "") {
      try { await api.createJourFerie({ date: dateStr, libelle: defaultName.trim() }); await refreshHolidaysFromApi(); }
      catch (error) { window.toast('🛑 Erreur d’enregistrement du jour férié'); return; }
      if (window.syncLeavesAndHolidaysIntoSchedule) {
        window.syncLeavesAndHolidaysIntoSchedule();
      }
      renderAll();
      window.toast('✓ Jour férié ajouté');
    }
  }
}

/**
 * MOMENTUM — Habit Tracker
 * app.js — Main application module
 */

/* ═══════════════════════════════════════════════════════════
   STORAGE MODULE
═══════════════════════════════════════════════════════════ */
const Storage = (() => {
  const KEY = 'momentum_habits_v2';
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  };
  const save = (data) => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  };
  return { load, save };
})();

/* ═══════════════════════════════════════════════════════════
   DATE UTILITIES
═══════════════════════════════════════════════════════════ */
const DateUtils = (() => {
  const today = () => new Date().toISOString().split('T')[0];

  const yesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const daysBetween = (a, b) => {
    const ms = new Date(b) - new Date(a);
    return Math.floor(ms / 86400000);
  };

  const formatDisplay = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatShort = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFull = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const startOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().split('T')[0];
  };

  const startOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };

  return { today, yesterday, daysAgo, daysBetween, formatDisplay, formatShort, formatFull, startOfWeek, startOfMonth };
})();

/* ═══════════════════════════════════════════════════════════
   HABIT LOGIC MODULE
═══════════════════════════════════════════════════════════ */
const HabitLogic = (() => {

  const getCompletionForDate = (habit, date) =>
    habit.completions.find(c => c.date === date) || null;

  const getTodayCount = (habit) => {
    const rec = getCompletionForDate(habit, DateUtils.today());
    return rec ? rec.count : 0;
  };

  const isDailyDoneToday = (habit) => {
    if (habit.type !== 'daily') return false;
    return getTodayCount(habit) >= 1;
  };

  const complete = (habit) => {
    const t = DateUtils.today();
    const existing = getCompletionForDate(habit, t);
    if (habit.type === 'daily' && existing) return habit; // already done
    if (existing) {
      existing.count += 1;
    } else {
      habit.completions.push({ date: t, count: 1 });
    }
    recalcStreaks(habit);
    return habit;
  };

  const recalcStreaks = (habit) => {
    // Build a Set of active dates (dates with at least 1 completion)
    const activeDates = new Set(habit.completions.filter(c => c.count > 0).map(c => c.date));
    if (activeDates.size === 0) {
      habit.currentStreak = 0;
      habit.longestStreak = 0;
      return;
    }

    const sorted = [...activeDates].sort();
    let longest = 1, cur = 1;

    for (let i = 1; i < sorted.length; i++) {
      const diff = DateUtils.daysBetween(sorted[i - 1], sorted[i]);
      if (diff === 1) { cur++; if (cur > longest) longest = cur; }
      else { cur = 1; }
    }
    habit.longestStreak = longest;

    // Current streak: count backwards from today
    const t = DateUtils.today();
    let streak = 0;
    let checkDate = t;
    // If today has no completion, check from yesterday
    if (!activeDates.has(t)) {
      checkDate = DateUtils.yesterday();
    }
    while (activeDates.has(checkDate)) {
      streak++;
      const d = new Date(checkDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split('T')[0];
    }
    habit.currentStreak = streak;
  };

  const computeStats = (habit) => {
    const totalDays = DateUtils.daysBetween(habit.createdAt, DateUtils.today()) + 1;
    const activeDates = new Set(habit.completions.filter(c => c.count > 0).map(c => c.date));
    const totalCompletions = habit.completions.reduce((s, c) => s + c.count, 0);

    const completionRate = Math.min((totalCompletions / Math.max(habit.goal, 1)) * 100, 100);
    const consistency = (activeDates.size / Math.max(totalDays, 1)) * 100;
    const streakRatio = habit.longestStreak > 0 ? habit.currentStreak / habit.longestStreak : 0;
    const hsi = Math.min(
      (completionRate * 0.4) + (consistency * 0.3) + (streakRatio * 100 * 0.3),
      100
    );

    // This week
    const weekStart = DateUtils.startOfWeek();
    const thisWeek = habit.completions
      .filter(c => c.date >= weekStart)
      .reduce((s, c) => s + c.count, 0);

    // This month
    const monthStart = DateUtils.startOfMonth();
    const thisMonth = habit.completions
      .filter(c => c.date >= monthStart)
      .reduce((s, c) => s + c.count, 0);

    return {
      totalCompletions,
      activeDays: activeDates.size,
      totalDays,
      completionRate: Math.round(completionRate * 10) / 10,
      consistency: Math.round(consistency * 10) / 10,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      thisWeek,
      thisMonth,
      hsi: Math.round(hsi * 10) / 10,
      streakRatio
    };
  };

  const getLast14Days = (habit) => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = DateUtils.daysAgo(13 - i);
      const rec = getCompletionForDate(habit, date);
      return { date, count: rec ? rec.count : 0 };
    });
  };

  const getWeeklyFreq = (habit) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = new Array(7).fill(0);
    habit.completions.forEach(c => {
      const d = new Date(c.date + 'T00:00:00');
      counts[d.getDay()] += c.count;
    });
    return days.map((d, i) => ({ day: d, count: counts[i] }));
  };

  const getTotalCompletions = (habits) =>
    habits.reduce((s, h) => s + h.completions.reduce((a, c) => a + c.count, 0), 0);

  const getDoneToday = (habits) =>
    habits.filter(h => {
      const t = DateUtils.today();
      return h.completions.some(c => c.date === t && c.count > 0);
    }).length;

  const getBestStreak = (habits) =>
    habits.reduce((best, h) => Math.max(best, h.currentStreak), 0);

  return {
    complete, recalcStreaks, computeStats, isDailyDoneToday, getTodayCount,
    getLast14Days, getWeeklyFreq, getTotalCompletions, getDoneToday, getBestStreak
  };
})();

/* ═══════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════ */
const state = {
  habits: Storage.load(),
  currentView: 'habits',
  editingId: null,
  deletingId: null,
  selectedHabitId: null,
  barChart: null,
  lineChart: null,
  weekChart: null,
};

/* ═══════════════════════════════════════════════════════════
   UI HELPERS
═══════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const qs = (sel, el = document) => el.querySelector(sel);

const showModal = (id) => {
  $(id).hidden = false;
  $('modalBackdrop').hidden = false;
};

const hideModal = (id) => {
  $(id).hidden = true;
  $('modalBackdrop').hidden = true;
};

const hideAllModals = () => {
  ['habitModal', 'deleteModal'].forEach(id => $(id).hidden = true);
  $('modalBackdrop').hidden = true;
};

/* ═══════════════════════════════════════════════════════════
   RENDER: HABIT CARD
═══════════════════════════════════════════════════════════ */
const renderHabitCard = (habit) => {
  const todayCount = HabitLogic.getTodayCount(habit);
  const totalDone = habit.completions.reduce((s, c) => s + c.count, 0);
  const pct = Math.min(Math.round((totalDone / Math.max(habit.goal, 1)) * 100), 100);
  const isDaily = habit.type === 'daily';
  const doneTodayFlag = isDaily ? HabitLogic.isDailyDoneToday(habit) : false;
  const cardClass = (isDaily && doneTodayFlag) || (!isDaily && todayCount > 0)
    ? 'habit-card completed-today' : 'habit-card';

  const card = document.createElement('article');
  card.className = cardClass;
  card.dataset.id = habit.id;

  card.innerHTML = `
    <div class="habit-main">
      <div class="habit-top">
        <span class="habit-type-badge">${habit.type}</span>
        <span class="habit-name">${escapeHtml(habit.name)}</span>
      </div>
      <div class="habit-meta">
        <span class="habit-stat">
          <span>🔥</span>
          <strong>${habit.currentStreak}</strong>
          <span>streak</span>
        </span>
        <span class="habit-stat">
          <span>↑</span>
          <strong>${habit.longestStreak}</strong>
          <span>best</span>
        </span>
        <span class="habit-stat">
          <span>✓</span>
          <strong>${totalDone}</strong>
          <span>/ ${habit.goal}</span>
        </span>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill${pct >= 100 ? ' full' : ''}" style="width:${pct}%"></div>
        </div>
        <span class="progress-pct">${pct}%</span>
      </div>
    </div>
    <div class="habit-actions">
      <button
        class="complete-btn${(isDaily && doneTodayFlag) ? ' done' : ''}"
        data-id="${habit.id}"
        aria-label="Complete habit"
        ${isDaily && doneTodayFlag ? 'disabled' : ''}
      >${(isDaily && doneTodayFlag) ? '✓' : '+'}</button>
      <span class="count-badge">${isDaily ? (doneTodayFlag ? 'Done' : 'Today') : `×${todayCount}`}</span>
      <div class="icon-actions">
        <button class="icon-btn edit-btn" data-id="${habit.id}" title="Edit">✎</button>
        <button class="icon-btn delete icon-btn-delete" data-id="${habit.id}" title="Delete">⌫</button>
      </div>
    </div>
  `;
  return card;
};

/* ═══════════════════════════════════════════════════════════
   RENDER: HABITS VIEW
═══════════════════════════════════════════════════════════ */
const renderHabitsView = () => {
  const list = $('habitsList');
  const empty = $('emptyState');

  // Summary strip
  const strip = $('summaryStrip');
  const total = state.habits.length;
  const doneToday = HabitLogic.getDoneToday(state.habits);
  const bestStreak = HabitLogic.getBestStreak(state.habits);
  const totalComp = HabitLogic.getTotalCompletions(state.habits);

  strip.innerHTML = `
    <div class="summary-card">
      <div class="summary-label">Active Habits</div>
      <div class="summary-value">${total}</div>
      <div class="summary-sub">${doneToday} completed today</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Best Streak</div>
      <div class="summary-value">${bestStreak}</div>
      <div class="summary-sub">days running</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Total Completions</div>
      <div class="summary-value">${totalComp}</div>
      <div class="summary-sub">all time</div>
    </div>
  `;

  list.innerHTML = '';

  if (state.habits.length === 0) {
    empty.hidden = false;
    strip.hidden = true;
  } else {
    empty.hidden = true;
    strip.hidden = false;
    state.habits.forEach(h => list.appendChild(renderHabitCard(h)));
  }
};

/* ═══════════════════════════════════════════════════════════
   RENDER: DASHBOARD VIEW
═══════════════════════════════════════════════════════════ */
const renderDashboard = () => {
  const sel = $('dashboardSelect');
  const content = $('dashboardContent');
  const dashEmpty = $('dashboardEmpty');

  sel.innerHTML = '';

  if (state.habits.length === 0) {
    $('dashboardSelectWrap').hidden = true;
    content.hidden = true;
    dashEmpty.hidden = false;
    return;
  }

  dashEmpty.hidden = true;
  $('dashboardSelectWrap').hidden = false;

  state.habits.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.id;
    opt.textContent = h.name;
    sel.appendChild(opt);
  });

  // If we have a previously selected habit, keep it; else default to first
  if (state.selectedHabitId) {
    sel.value = state.selectedHabitId;
  } else {
    state.selectedHabitId = state.habits[0].id;
    sel.value = state.selectedHabitId;
  }

  renderDashboardStats();
};

const renderDashboardStats = () => {
  const habit = state.habits.find(h => h.id === state.selectedHabitId);
  if (!habit) return;

  const stats = HabitLogic.computeStats(habit);
  const content = $('dashboardContent');
  content.hidden = false;

  const grid = $('statsGrid');
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-card__accent stat-card__accent--purple">◈</div>
      <div class="stat-card__value">${stats.completionRate}%</div>
      <div class="stat-card__label">Completion Rate</div>
      <div class="stat-card__sub">${stats.totalCompletions} of ${habit.goal} goal</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__accent stat-card__accent--green">◎</div>
      <div class="stat-card__value">${stats.consistency}%</div>
      <div class="stat-card__label">Consistency Score</div>
      <div class="stat-card__sub">${stats.activeDays} of ${stats.totalDays} days</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__accent stat-card__accent--amber">🔥</div>
      <div class="stat-card__value">${stats.currentStreak}</div>
      <div class="stat-card__label">Current Streak</div>
      <div class="stat-card__sub">days in a row</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__accent stat-card__accent--blue">↑</div>
      <div class="stat-card__value">${stats.longestStreak}</div>
      <div class="stat-card__label">Longest Streak</div>
      <div class="stat-card__sub">personal best</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__accent stat-card__accent--pink">◉</div>
      <div class="stat-card__value">${stats.thisWeek}</div>
      <div class="stat-card__label">This Week</div>
      <div class="stat-card__sub">${stats.thisMonth} this month</div>
    </div>
    <div class="stat-card stat-card--hsi">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <div class="stat-card__value">${stats.hsi}</div>
          <div class="stat-card__label">Habit Strength Index</div>
          <div class="stat-card__sub">Completion × 0.4 + Consistency × 0.3 + Streak Ratio × 0.3</div>
        </div>
        <div style="font-size:2rem;opacity:0.6">${hsiEmoji(stats.hsi)}</div>
      </div>
      <div class="hsi-bar"><div class="hsi-fill" style="width:${stats.hsi}%"></div></div>
    </div>
  `;

  renderCharts(habit, stats);
};

const hsiEmoji = (score) => {
  if (score >= 80) return '🏆';
  if (score >= 60) return '💪';
  if (score >= 40) return '📈';
  if (score >= 20) return '🌱';
  return '🐣';
};

/* ═══════════════════════════════════════════════════════════
   CHARTS
═══════════════════════════════════════════════════════════ */
const CHART_DEFAULTS = {
  color: {
    accent: '#7c6bff',
    accent2: '#c084fc',
    green: '#34d399',
    grid: 'rgba(255,255,255,0.05)',
    text: '#6b6890',
  }
};

const destroyCharts = () => {
  if (state.barChart)  { state.barChart.destroy();  state.barChart = null; }
  if (state.lineChart) { state.lineChart.destroy(); state.lineChart = null; }
  if (state.weekChart) { state.weekChart.destroy(); state.weekChart = null; }
};

const chartDefaults = () => ({
  plugins: { legend: { display: false } },
  scales: {
    x: {
      grid: { color: CHART_DEFAULTS.color.grid },
      ticks: { color: CHART_DEFAULTS.color.text, font: { family: 'DM Sans', size: 11 } }
    },
    y: {
      grid: { color: CHART_DEFAULTS.color.grid },
      ticks: { color: CHART_DEFAULTS.color.text, font: { family: 'DM Sans', size: 11 } },
      beginAtZero: true
    }
  }
});

const renderCharts = (habit, stats) => {
  destroyCharts();

  const last14 = HabitLogic.getLast14Days(habit);
  const weekFreq = HabitLogic.getWeeklyFreq(habit);

  // Bar chart — last 14 days
  const barCtx = $('barChart').getContext('2d');
  const barGrad = barCtx.createLinearGradient(0, 0, 0, 200);
  barGrad.addColorStop(0, 'rgba(124,107,255,0.9)');
  barGrad.addColorStop(1, 'rgba(192,132,252,0.3)');

  state.barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: last14.map(d => DateUtils.formatShort(d.date)),
      datasets: [{
        data: last14.map(d => d.count),
        backgroundColor: barGrad,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      ...chartDefaults(),
      responsive: true,
      animation: { duration: 600, easing: 'easeOutQuart' },
    }
  });

  // Line chart — trend (running total last 14 days)
  const lineCtx = $('lineChart').getContext('2d');
  const lineGrad = lineCtx.createLinearGradient(0, 0, 0, 200);
  lineGrad.addColorStop(0, 'rgba(52,211,153,0.3)');
  lineGrad.addColorStop(1, 'rgba(52,211,153,0)');

  let running = 0;
  const trendData = last14.map(d => { running += d.count; return running; });

  state.lineChart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: last14.map(d => DateUtils.formatShort(d.date)),
      datasets: [{
        data: trendData,
        borderColor: CHART_DEFAULTS.color.green,
        backgroundColor: lineGrad,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: CHART_DEFAULTS.color.green,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      ...chartDefaults(),
      responsive: true,
      animation: { duration: 800, easing: 'easeOutQuart' },
    }
  });

  // Week frequency bar chart
  const weekCtx = $('weekChart').getContext('2d');
  const weekGrad = weekCtx.createLinearGradient(0, 0, 0, 200);
  weekGrad.addColorStop(0, 'rgba(192,132,252,0.9)');
  weekGrad.addColorStop(1, 'rgba(96,165,250,0.4)');

  state.weekChart = new Chart(weekCtx, {
    type: 'bar',
    data: {
      labels: weekFreq.map(d => d.day),
      datasets: [{
        data: weekFreq.map(d => d.count),
        backgroundColor: weekGrad,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      ...chartDefaults(),
      responsive: true,
      animation: { duration: 700, easing: 'easeOutQuart' },
    }
  });
};

/* ═══════════════════════════════════════════════════════════
   VIEW SWITCHING
═══════════════════════════════════════════════════════════ */
const switchView = (view) => {
  state.currentView = view;

  $('habitsView').classList.toggle('hidden', view !== 'habits');
  $('dashboardView').classList.toggle('hidden', view !== 'dashboard');

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  $('topbarTitle').textContent = view === 'habits' ? "Today's Habits" : 'Dashboard';
  $('addHabitBtn').hidden = view !== 'habits';

  if (view === 'dashboard') renderDashboard();

  // Close sidebar on mobile
  closeSidebar();
};

/* ═══════════════════════════════════════════════════════════
   SIDEBAR (MOBILE)
═══════════════════════════════════════════════════════════ */
let overlay = null;

const openSidebar = () => {
  $('sidebar').classList.add('open');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', closeSidebar);
  }
  overlay.classList.add('active');
};

const closeSidebar = () => {
  $('sidebar').classList.remove('open');
  if (overlay) overlay.classList.remove('active');
};

/* ═══════════════════════════════════════════════════════════
   HABIT MODAL
═══════════════════════════════════════════════════════════ */
let selectedType = 'daily';

const openAddModal = () => {
  state.editingId = null;
  selectedType = 'daily';
  $('modalTitle').textContent = 'New Habit';
  $('modalSave').textContent = 'Create Habit';
  $('habitName').value = '';
  $('habitGoal').value = '';
  setTypeActive('daily');
  showModal('habitModal');
  setTimeout(() => $('habitName').focus(), 50);
};

const openEditModal = (id) => {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  state.editingId = id;
  selectedType = habit.type;
  $('modalTitle').textContent = 'Edit Habit';
  $('modalSave').textContent = 'Save Changes';
  $('habitName').value = habit.name;
  $('habitGoal').value = habit.goal;
  setTypeActive(habit.type);
  showModal('habitModal');
  setTimeout(() => $('habitName').focus(), 50);
};

const setTypeActive = (type) => {
  selectedType = type;
  $('typeDaily').classList.toggle('active', type === 'daily');
  $('typeFlexible').classList.toggle('active', type === 'flexible');
};

const saveHabit = () => {
  const name = $('habitName').value.trim();
  const goal = parseInt($('habitGoal').value, 10);

  // Validation
  let valid = true;
  if (!name) { $('habitName').classList.add('error'); valid = false; }
  else $('habitName').classList.remove('error');
  if (!goal || goal < 1) { $('habitGoal').classList.add('error'); valid = false; }
  else $('habitGoal').classList.remove('error');
  if (!valid) return;

  if (state.editingId) {
    const habit = state.habits.find(h => h.id === state.editingId);
    if (habit) {
      habit.name = name;
      habit.goal = goal;
      habit.type = selectedType;
    }
  } else {
    const habit = {
      id: crypto.randomUUID(),
      name,
      goal,
      type: selectedType,
      createdAt: DateUtils.today(),
      completions: [],
      currentStreak: 0,
      longestStreak: 0,
    };
    state.habits.push(habit);
  }

  Storage.save(state.habits);
  hideModal('habitModal');
  renderHabitsView();
};

/* ═══════════════════════════════════════════════════════════
   DELETE MODAL
═══════════════════════════════════════════════════════════ */
const openDeleteModal = (id) => {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  state.deletingId = id;
  $('deleteHabitName').textContent = habit.name;
  showModal('deleteModal');
};

const confirmDelete = () => {
  state.habits = state.habits.filter(h => h.id !== state.deletingId);
  if (state.selectedHabitId === state.deletingId) state.selectedHabitId = null;
  Storage.save(state.habits);
  hideModal('deleteModal');
  renderHabitsView();
  if (state.currentView === 'dashboard') renderDashboard();
};

/* ═══════════════════════════════════════════════════════════
   COMPLETE HABIT
═══════════════════════════════════════════════════════════ */
const completeHabit = (id) => {
  const habit = state.habits.find(h => h.id === id);
  if (!habit) return;
  HabitLogic.complete(habit);
  Storage.save(state.habits);
  renderHabitsView();
};

/* ═══════════════════════════════════════════════════════════
   ESCAPE HELPER
═══════════════════════════════════════════════════════════ */
const escapeHtml = (str) =>
  str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* ═══════════════════════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════════════════════ */
const initEvents = () => {
  // Nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Topbar add btn
  $('addHabitBtn').addEventListener('click', openAddModal);
  $('emptyAddBtn').addEventListener('click', openAddModal);

  // Sidebar mobile
  $('menuBtn').addEventListener('click', openSidebar);
  $('sidebarClose').addEventListener('click', closeSidebar);

  // Habit list delegation
  $('habitsList').addEventListener('click', (e) => {
    const completeBtn = e.target.closest('.complete-btn');
    if (completeBtn) { completeHabit(completeBtn.dataset.id); return; }

    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) { openEditModal(editBtn.dataset.id); return; }

    const deleteBtn = e.target.closest('.icon-btn-delete');
    if (deleteBtn) { openDeleteModal(deleteBtn.dataset.id); return; }
  });

  // Modal: type toggle
  $('typeDaily').addEventListener('click', () => setTypeActive('daily'));
  $('typeFlexible').addEventListener('click', () => setTypeActive('flexible'));

  // Modal: save/cancel
  $('modalSave').addEventListener('click', saveHabit);
  $('modalCancel').addEventListener('click', () => hideModal('habitModal'));
  $('modalClose').addEventListener('click', () => hideModal('habitModal'));

  // Delete modal
  $('deleteConfirmBtn').addEventListener('click', confirmDelete);
  $('deleteCancelBtn').addEventListener('click', () => hideModal('deleteModal'));
  $('deleteModalClose').addEventListener('click', () => hideModal('deleteModal'));

  // Backdrop closes modals
  $('modalBackdrop').addEventListener('click', hideAllModals);

  // Dashboard habit select
  $('dashboardSelect').addEventListener('change', (e) => {
    state.selectedHabitId = e.target.value;
    renderDashboardStats();
  });

  // Keyboard: Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideAllModals();
  });

  // Enter submits habit form
  [$('habitName'), $('habitGoal')].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveHabit();
    });
  });
};

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
const init = () => {
  // Recalc streaks on load (handles missed days)
  state.habits.forEach(h => HabitLogic.recalcStreaks(h));
  Storage.save(state.habits);

  // Set date in sidebar
  $('sidebarDate').textContent = DateUtils.formatFull();

  initEvents();
  renderHabitsView();

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .catch(err => console.warn('SW registration failed:', err));
    });
  }
};

document.addEventListener('DOMContentLoaded', init);

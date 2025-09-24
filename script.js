const calendarEl = document.getElementById("calendar");
const currentMonthLabel = document.getElementById("current-month");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const viewModeSelect = document.getElementById("view-mode");

const modal = document.getElementById("task-modal");
const modalDateHeading = document.getElementById("modal-date-heading");
const closeModalBtn = document.getElementById("close-modal");
const taskListEl = document.getElementById("task-list");
const newTaskInput = document.getElementById("new-task-input");
const addTaskBtn = document.getElementById("add-task-btn");

const year = 2025;
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const today = new Date();
let currentMonth = today.getFullYear() === year ? today.getMonth() : 0;
let currentSelectedDate = null;

let tasks = JSON.parse(localStorage.getItem('tasks')) || {};
let chart;

// --- Render graph ---
function renderGraph(mode) {
  const labels = [];
  const completed = [];
  const total = [];

  const month = currentMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  if (mode === "daily") {
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      labels.push(d);
      const dayTasks = tasks[dateStr] || [];
      completed.push(dayTasks.filter(t => t.done).length);
      total.push(dayTasks.length - dayTasks.filter(t => t.done).length); // uncompleted
    }
  } else if (mode === "weekly") {
    let weekTotal = 0, weekCompleted = 0, weekCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTasks = tasks[dateStr] || [];
      weekTotal += dayTasks.length;
      weekCompleted += dayTasks.filter(t => t.done).length;
      if (d % 7 === 0 || d === daysInMonth) {
        weekCount++;
        labels.push("W" + weekCount);
        completed.push(weekCompleted);
        total.push(weekTotal - weekCompleted); // uncompleted
        weekTotal = 0;
        weekCompleted = 0;
      }
    }
  } else if (mode === "monthly") {
    for (let m = 0; m < 12; m++) {
      labels.push(monthNames[m]);
      let sum = 0, done = 0;
      const days = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayTasks = tasks[dateStr] || [];
        sum += dayTasks.length;
        done += dayTasks.filter(t => t.done).length;
      }
      completed.push(done);
      total.push(sum - done); // uncompleted
    }
  }

  const ctx = document.getElementById("taskChart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Completed",
          data: completed,
          backgroundColor: "#3f51b5",
          borderRadius: 6
        },
        {
          label: "Uncompleted",
          data: total,
          backgroundColor: "rgba(200,200,200,0.3)",
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#ccc",
            font: { size: 12, weight: "normal" }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: "#ccc",
            font: { size: 11, weight: "normal" },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          grid: { display: false }
        },
        y: {
          stacked: true,
          ticks: {
            color: "#ccc",
            font: { size: 11, weight: "normal" },
            stepSize: 1,
            callback: function (value) {
              return Number.isInteger(value) ? value : null;
            }
          },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      }
    }
  });
}

// --- Calendar ---
function renderMonth(year, month) {
  calendarEl.innerHTML = "";
  currentMonthLabel.textContent = `${monthNames[month]} ${year}`;

  weekdayNames.forEach(day => {
    const div = document.createElement("div");
    div.classList.add("weekday");
    div.textContent = day;
    calendarEl.appendChild(div);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.classList.add("day", "empty");
    calendarEl.appendChild(empty);
  }

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement("div");
    cell.classList.add("day");
    cell.textContent = day;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cell.dataset.date = dateStr;

    if (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    ) {
      cell.classList.add("today");
    }

    cell.addEventListener("click", () => openTaskModal(dateStr));
    calendarEl.appendChild(cell);
  }

  renderGraph(viewModeSelect.value);
}

// --- Modal ---
function openTaskModal(dateStr) {
  currentSelectedDate = dateStr;
  modalDateHeading.textContent = `Tasks for ${dateStr}`;
  newTaskInput.value = "";
  renderTasks();
  modal.classList.remove("hidden");
  newTaskInput.focus();
}

function renderTasks() {
  taskListEl.innerHTML = "";
  const dayTasks = tasks[currentSelectedDate] || [];

  if (dayTasks.length === 0) {
    taskListEl.innerHTML = `<li><em>No tasks yet</em></li>`;
    return;
  }

  dayTasks.forEach((task, i) => {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      tasks[currentSelectedDate][i].done = checkbox.checked;
      saveTasks();
      renderGraph(viewModeSelect.value);
    });

    const span = document.createElement("span");
    span.textContent = task.text;
    if (task.done) {
      span.style.textDecoration = "line-through";
      span.style.color = "#888";
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      tasks[currentSelectedDate].splice(i, 1);
      if (tasks[currentSelectedDate].length === 0) delete tasks[currentSelectedDate];
      saveTasks();
      renderTasks();
      renderGraph(viewModeSelect.value);
    });

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);

    taskListEl.appendChild(li);
  });
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

addTaskBtn.addEventListener("click", () => {
  const text = newTaskInput.value.trim();
  if (text === "") return;
  if (!tasks[currentSelectedDate]) tasks[currentSelectedDate] = [];
  tasks[currentSelectedDate].push({ text, done: false });
  saveTasks();
  renderTasks();
  newTaskInput.value = "";
  newTaskInput.focus();
  renderGraph(viewModeSelect.value);
});

closeModalBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  currentSelectedDate = null;
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
    currentSelectedDate = null;
  }
});

prevMonthBtn.addEventListener("click", () => {
  if (currentMonth > 0) {
    currentMonth--;
    renderMonth(year, currentMonth);
  }
});

nextMonthBtn.addEventListener("click", () => {
  if (currentMonth < 11) {
    currentMonth++;
    renderMonth(year, currentMonth);
  }
});

viewModeSelect.addEventListener("change", () => {
  renderGraph(viewModeSelect.value);
});

// Initial
renderMonth(year, currentMonth);

// --- Resize chart dynamically ---
function resizeChartContainer() {
  const chartContainer = document.querySelector(".chart-container");
  const container = document.querySelector(".container");
  const filterHeight = document.querySelector(".filter-container").offsetHeight;
  const calendarControlsHeight = document.querySelector(".calendar-controls").offsetHeight;
  const calendarHeight = document.querySelector("#calendar").offsetHeight;
  const padding = 60; // extra spacing

  // Calculate remaining height for chart
  const availableHeight = window.innerHeight - filterHeight - calendarControlsHeight - calendarHeight - padding;
  chartContainer.style.height = `${availableHeight}px`;

  if (chart) chart.resize(); // ensure chart.js redraws
}

// Call initially and on window resize
resizeChartContainer();
window.addEventListener("resize", resizeChartContainer);


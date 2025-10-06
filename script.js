// --- Global Variables ---
const tasks = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let chart;

// --- Persistence Helpers ---
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadTasks() {
  const saved = localStorage.getItem("tasks");
  if (saved) {
    Object.assign(tasks, JSON.parse(saved));
  }
}

// --- Utility Arrays ---
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// --- Render Graph ---
function renderGraph(mode) {
  const labels = [];
  const completed = [];
  const total = [];

  const month = currentMonth;
  const year = currentYear;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  if (mode === "currentWeek") {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const date = new Date(lastSunday);
      date.setDate(lastSunday.getDate() + i);

      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const dayTasks = tasks[dateStr] || [];

      labels.push(weekdayNames[date.getDay()]);
      completed.push(dayTasks.filter(t => t.done).length);
      total.push(dayTasks.length - dayTasks.filter(t => t.done).length);
    }

  } else if (mode === "daily") {
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      labels.push(d);
      const dayTasks = tasks[dateStr] || [];
      completed.push(dayTasks.filter(t => t.done).length);
      total.push(dayTasks.length - dayTasks.filter(t => t.done).length);
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
        total.push(weekTotal - weekCompleted);
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
      total.push(sum - done);
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
            font: { size: 11 },
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
            font: { size: 11 },
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

// --- Render Calendar ---
function renderMonth(month, year) {
  const calendar = document.querySelector(".calendar");
  calendar.innerHTML = "";

  const firstDay = new Date(year, month).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  document.getElementById("current-month").textContent = `${monthNames[month]} ${year}`;

  // Weekday headers
  for (let i = 0; i < 7; i++) {
    const weekday = document.createElement("div");
    weekday.className = "weekday";
    weekday.textContent = weekdayNames[i];
    calendar.appendChild(weekday);
  }

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    calendar.appendChild(empty);
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const day = document.createElement("div");
    day.className = "day";
    day.textContent = d;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const today = new Date();
    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      day.classList.add("today");
    }

    day.addEventListener("click", () => openModal(dateStr));
    calendar.appendChild(day);
  }
}

// --- Modal Handling ---
const modal = document.querySelector(".modal");
const closeBtn = document.querySelector(".close-btn");
const addTaskBtn = document.getElementById("add-task-btn");
const newTaskInput = document.getElementById("new-task-input");
let selectedDate = null;

function openModal(dateStr) {
  selectedDate = dateStr;
  modal.classList.remove("hidden");
  renderTasks(dateStr);
}

closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// NEW — close modal when clicking outside content
modal.addEventListener("click", function (e) {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});

// NEW — close modal when pressing Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) {
    modal.classList.add("hidden");
  }
});

function renderTasks(dateStr) {
  const list = document.getElementById("task-list");
  list.innerHTML = "";

  (tasks[dateStr] || []).forEach((task, index) => {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveTasks(); // persist on toggle
      renderGraph(document.getElementById("view-mode").value);
    });

    const span = document.createElement("span");
    span.textContent = task.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      tasks[dateStr].splice(index, 1);
      saveTasks(); // persist on delete
      renderTasks(dateStr);
      renderGraph(document.getElementById("view-mode").value);
    });

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

addTaskBtn.addEventListener("click", () => {
  const text = newTaskInput.value.trim();
  if (text && selectedDate) {
    if (!tasks[selectedDate]) tasks[selectedDate] = [];
    tasks[selectedDate].push({ text, done: false });
    saveTasks(); // persist on add
    newTaskInput.value = "";
    renderTasks(selectedDate);
    renderGraph(document.getElementById("view-mode").value);
  }
});

// --- Filter Dropdown ---
document.getElementById("view-mode").addEventListener("change", (e) => {
  renderGraph(e.target.value);
});

// --- Calendar Controls ---
document.getElementById("prev-month").addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderMonth(currentMonth, currentYear);
  renderGraph(document.getElementById("view-mode").value);
});

document.getElementById("next-month").addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderMonth(currentMonth, currentYear);
  renderGraph(document.getElementById("view-mode").value);
});

// --- Download Chart as PNG ---
document.getElementById("download-chart").addEventListener("click", () => {
  if (chart) {
    const link = document.createElement("a");
    link.href = chart.toBase64Image();
    link.download = `chart-${new Date().toISOString().split("T")[0]}.png`;
    link.click();
  } else {
    alert("No chart available to download yet.");
  }
});


// --- Init ---
loadTasks(); // load from localStorage first
renderMonth(currentMonth, currentYear);
renderGraph(document.getElementById("view-mode").value);

// Grab the elements we need from the page
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const subjectInput = document.getElementById("subject-input");
const dateInput = document.getElementById("date-input");
const prioritySelect = document.getElementById("priority-select");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");
const stats = document.getElementById("stats");
const clearBtn = document.getElementById("clear-btn");

// All tasks live in this array
let tasks = [];

// Used when two tasks share a due date: high first, low last
const priorityOrder = { high: 1, medium: 2, low: 3 };

function addTask(text, subject, dueDate, priority) {
  tasks.push({
    id: Date.now(),
    text: text,
    subject: subject,
    dueDate: dueDate, // stored as "YYYY-MM-DD"
    priority: priority,
    completed: false
  });
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  task.completed = !task.completed;
  renderTasks();

  // Celebrate only when a task becomes complete, not when unchecked
  if (task.completed) launchConfetti();
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  renderTasks();
}

// Turns "2026-11-25" into a readable date like "Nov 25, 2026"
function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Redraw the whole list from the tasks array
function renderTasks() {
  taskList.innerHTML = "";

  // Order: unfinished first, then earliest due date, then priority
  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  sorted.forEach(task => {
    const li = document.createElement("li");
    li.className = "task " + task.priority + (task.completed ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => toggleTask(task.id));

    // textContent keeps typed text safe (no HTML is run)
    const text = document.createElement("div");
    text.className = "task-text";
    text.textContent = task.text;

    const subject = document.createElement("span");
    subject.className = "subject";
    subject.textContent = task.subject;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.append(subject, " · Due " + formatDate(task.dueDate));

    const info = document.createElement("div");
    info.className = "task-info";
    info.append(text, meta);

    const badge = document.createElement("span");
    badge.className = "badge " + task.priority;
    badge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

    li.append(checkbox, info, badge);
    taskList.appendChild(li);
  });

  // Update the counter and empty message
  const doneCount = tasks.filter(t => t.completed).length;
  stats.textContent = "Tasks: " + tasks.length + " · Completed: " + doneCount;
  emptyMessage.style.display = tasks.length === 0 ? "block" : "none";
}

// Add a task when the form is submitted (button click or Enter key)
form.addEventListener("submit", event => {
  event.preventDefault(); // stop the page from reloading
  const text = input.value.trim();
  const subject = subjectInput.value.trim();
  if (text === "" || subject === "" || dateInput.value === "") return;

  addTask(text, subject, dateInput.value, prioritySelect.value);

  // Clear the text boxes for the next task (due date and priority are kept)
  input.value = "";
  subjectInput.value = "";
  input.focus();
});

clearBtn.addEventListener("click", clearCompleted);

// ---------- Confetti ----------

const confettiColors = ["#4A0E18", "#7A1F2B", "#A8424F", "#E9CDD1", "#F3E6D0"];
const lightColors = ["#E9CDD1", "#F3E6D0"]; // these get an outline so they show on cream
let confettiCanvas = null;
let confettiFrame = null;

function stopConfetti() {
  cancelAnimationFrame(confettiFrame);
  if (confettiCanvas) confettiCanvas.remove();
  confettiCanvas = null;
}

function launchConfetti() {
  // Skip the animation if the user prefers reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  stopConfetti(); // remove any burst that is still running

  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = window.devicePixelRatio || 1;

  // A temporary canvas covering the screen (it ignores clicks, see style.css)
  confettiCanvas = document.createElement("canvas");
  confettiCanvas.className = "confetti-canvas";
  confettiCanvas.width = width * ratio;
  confettiCanvas.height = height * ratio;
  document.body.appendChild(confettiCanvas);

  const ctx = confettiCanvas.getContext("2d");
  ctx.scale(ratio, ratio); // keeps pieces sharp on high-resolution screens

  // Create the paper pieces, all starting near the top-middle of the screen
  const pieces = [];
  for (let i = 0; i < 120; i++) {
    pieces.push({
      x: width / 2 + (Math.random() - 0.5) * 120,
      y: height * 0.3,
      vx: (Math.random() - 0.5) * width * 0.025,
      vy: -6 - Math.random() * 9,
      size: 6 + Math.random() * 6,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)]
    });
  }

  const duration = 4000; // total time in ms
  const fadeTime = 600;  // fade out during the last 0.6s
  const start = performance.now();
  let last = start;

  function draw(now) {
    const elapsed = now - start;
    const step = Math.min((now - last) / 16.67, 3); // keeps speed the same on any frame rate
    last = now;

    if (elapsed >= duration) {
      stopConfetti();
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = elapsed > duration - fadeTime ? (duration - elapsed) / fadeTime : 1;

    pieces.forEach(p => {
      p.vy += 0.3 * step; // gravity
      p.vx *= 0.99;       // air resistance
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.angle += p.spin * step;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
      if (lightColors.includes(p.color)) {
        ctx.strokeStyle = "#7A1F2B";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
      }
      ctx.restore();
    });

    confettiFrame = requestAnimationFrame(draw);
  }

  confettiFrame = requestAnimationFrame(draw);
}

// Show the empty state when the page first loads
renderTasks();

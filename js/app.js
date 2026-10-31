const STORAGE_KEY = "study-cabin-tasks";
//to test it change the focus and break to 5.
const FOCUS_SECONDS = 5;
const BREAK_SECONDS = 5;
const ARC_LENGTH = Math.PI * 90;

let tasks = [];
let remaining = FOCUS_SECONDS;
let intervalid = null;
let sessions = 0;
let mode = "focus";

const phase = document.getElementById("phase");
const breakBanner = document.getElementById("break-banner");
const arcFill = document.getElementById("arc-fill");
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function renderTasks() {
    const list = document.getElementById("task-list");
    list.innerHTML = "";

    tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.className = "task" + (task.done ? " task--done" : "");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.addEventListener("change", () => {
            tasks[index].done = checkbox.checked;
            saveTasks();
            renderTasks();
        });

        const text = document.createElement("span");
        text.className = "task__text";
        text.textContent = task.text;

        const del = document.createElement("button");
        del.className = "btn btn--ghost";
        del.textContent = "Delete";
        del.addEventListener("click", () => {
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
        });

        li.append(checkbox, text, del);
        list.appendChild(li);
    });

    updateProgress();
}

function updateProgress() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    document.getElementById("progress-fill").style.width = percent + "%";
    document.getElementById("progress-text").textContent = `${done} of ${total} done`;
    document.getElementById("empty-state").hidden = total > 0;
}

document.getElementById("task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("task-input");
    const text = input.value.trim();
    if (!text) return;

    tasks.push({ text, done: false });
    saveTasks();
    input.value = "";
    renderTasks();
});

function formatTime(seconds) {
    const sign = seconds < 0 ? "+" : "";
    const abs = Math.abs(seconds);
    const m = String(Math.floor(abs / 60)).padStart(2, "0");

    const s = String(abs % 60).padStart(2, "0");
    return `${sign}${m}:${s}`;
}

function drawTimer() {
    document.getElementById("timer").textContent = formatTime(remaining);
    drawArc();
    updateToggleLabel();
}

function drawArc() {
    const total = mode === "break" ? BREAK_SECONDS : FOCUS_SECONDS;
    let elapsed;

    if (mode === "break") {
        elapsed = BREAK_SECONDS - remaining;
    } else if (remaining >= 0) {
        elapsed = FOCUS_SECONDS - remaining;
    } else {
        elapsed = (-remaining) % FOCUS_SECONDS;
    }

    const fill = Math.min(elapsed / total, 1);
    arcFill.setAttribute("stroke-dasharray", ARC_LENGTH);
    arcFill.setAttribute("stroke-dashoffset", ARC_LENGTH * (1- fill));
    arcFill.classList.toggle("arc__fill--over", mode === "focus" && remaining < 0);
}

function updateToggleLabel() {
    const toggle = document.getElementById("toggle");

    if (intervalid === null) {
        toggle.textContent = "start";
    } else if (mode === "focus" && remaining < 0) {
        toggle.textContent = "Stop and break";
    } else {
        toggle.textContent = "pause";
    }
}

function startTimer() {
    if (intervalid) return;
    intervalid = setInterval(() => {
        remaining--;
        drawTimer();

        if (mode === "break" && remaining <= 0) {
            PauseTimer();
            document.getElementById("status").textContent = "Break over, GET back to focus"
            switchMode();
        }
    }, 1000);
    updateToggleLabel();
}

function finishFocus() {
    PauseTimer();
    sessions++;
    document.getElementById("sessions").textContent = sessions;
    switchMode();
    startTimer();
    document.getElementById("status").textContent = "Focus session saved. Go touch grass."
}

function PauseTimer() {
    clearInterval(intervalid);
    intervalid = null;
    updateToggleLabel();
}

function resetTimer() {
    PauseTimer();
    remaining = mode === "break" ? BREAK_SECONDS : FOCUS_SECONDS;
    drawTimer();
}

document.getElementById("toggle").addEventListener("click", () => {
    if (intervalid === null) {
        startTimer();
    } else if (mode === "focus" && remaining < 0) {
        finishFocus();
    } else {
        PauseTimer();
    }
});

document.getElementById("reset").addEventListener("click", resetTimer);

tasks = loadTasks();
renderTasks();
drawTimer();

//adding a 5 mins break rule 
function switchMode() {
    if (mode === "focus") {
        mode = "break";
    } else {
        mode = "focus";
    }

    remaining = mode === "break"
    ? BREAK_SECONDS
    : FOCUS_SECONDS;

    phase.textContent = mode === "break"
    ? "Break"
    : "Focus block"

    breakBanner.hidden = mode !== "break";

    drawTimer();
}

const THEME_KEY = "study-cabin-theme";
const themeToggle = document.getElementById("theme-toggle");

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme;
    applyTheme(current === "dark" ? "lignt" : "dark");
});

applyTheme(localStorage.getItem(THEME_KEY) || "light");


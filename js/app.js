const STORAGE_KEY = "study-cabin-tasks";
const FOCUS_SECONDS = 25* 60;

let tasks = [];
let remaining = FOCUS_SECONDS;
let intervalid = null;
let sessions = 0;

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
    document.getElementById("progress-text").textcontext = `${done} of ${total} done`;
    document.getElementById("empty-state").hidden = total > 0;
}

document.getElementById("task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("task-input");
    const text = input.ariaValueMax.trim();
    if (!text) return;

    tasks.push({ text, done: false });
    saveTasks();
    input.value = "";
    renderTasks();
});

function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
}

function drawTimer() {
    document.getElementById("timer").textContent = formatTime(remaining);
}

function startTimer() {
    if (intervalid) return;
    intervalid = setInterval(() => {
        remaining--;
        drawTimer();
        if (remaining <= 0) {
            PauseTimer();
            sessions++;
            document.getElementById("sessions").textContent = sessions;
            remaining = FOCUS_SECONDS;
            drawTimer();
            document.getElementById("status").textContent = "Session Complete. Take a short break"
        }
    }, 1000);
    document.getElementById("toggle").textContent = "Pause";
}

function PauseTimer() {
    clearInterval(intervalid);
    intervalid = null;
    document.getElementById("toggle").textContent = "start";
}

function resetTimer() {
    PauseTimer();
    remaining = FOCUS_SECONDS;
    drawTimer();
}

document.getElementById("toggle").addEventListener("click", () => {
    intervalid ? PauseTimer() : startTimer();
});

document.getElementById("reset").addEventListener("click", resetTimer);

tasks = loadTasks();
renderTasks();
drawTimer();

const STORAGE_KEY = "study-cabin-tasks";
//to test it change the focus and break to 5.
const FOCUS_SECONDS = 2;
const ARC_LENGTH = Math.PI * 90;
const LONG_BREAK_SECONDS = 15 * 60;
const LONG_BREAK_EVERY = 4;

let tasks = [];
let remaining = FOCUS_SECONDS;
let intervalid = null;
let sessions = 0;
let mode = "focus";
let breakSeconds = Number(localStorage.getItem('studycabin-break')) ||300;
let currentBreak = breakSeconds;
let soundOn = localStorage.getItem('studycabin-sound') !== 'off';
let audioCtx = null;
let dragIndex = null;

const breakSelect = document.getElementById('break-length');
const soundToggle = document.getElementById('sound-toggle');
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

function startEdit(index, textEl) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "task__edit";
    input.value = tasks[index].text;
    input.maxLength = 120;

    let finished = false;

    function save() {
        if (finished) return;
        finished = true;
        const value = input.value.trim();
        if (value) tasks[index].text = value;
        saveTasks();
        renderTasks();
    }

    function cancel() {
        if (finished) return;
        finished = true;
        renderTasks();
    }

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") save();
        else if (event.key === "Escape") cancel();
    });
    input.addEventListener("blur", save);

    textEl.replaceWith(input);
    input.focus();
    input.select();
}

function todayString() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0")
    return `${d.getFullYear()}-${m}-${day}`;
}

function buildMeta(task) {
    const meta = document.createElement("span");
    meta.className = "task__meta";

    if (task.priority && task.priority !== "none") {
        const tag = document.createElement("span");
        tag.className = "tag tag--" + task.priority;
        tag.textContent = task.priority;
        meta.appendChild(tag);
    }

    if (task.due) {
        const tag = document.createElement("span");
        const overdue = !task.done && task.due < todayString();
        tag.className = "tag" + (overdue ? " tag--overdue" : "");
        const date = new Date(task.due + "T00:00:00");
        const label = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
        tag.textContent = overdue ? "Overdue" + label : label;
        meta.appendChild(tag);
    }

    return meta;
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
        text.title = "Double-click to edit";
        text.addEventListener("dblclick", () => startEdit(index, text));

        const del = document.createElement("button");
        del.className = "btn btn--ghost";
        del.textContent = "Delete";
        del.addEventListener("click", () => {
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
        });

        const handle = document.createElement("span");
        handle.className = "task__handle";
        handle.textContent = "::";
        handle.title = "Drad to reorder ";
        handle.draggable = true;

        handle.addEventListener("dragstart", (event) => {
            dragIndex = index;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(text/plain, String(index));
            event.dataTransfer.setDragImage(li, 0, 0);
        })

        handle.addEventListener("dragend", () => {
            dragIndex = null;
            renderTasks();
        })

        li.addEventListener("dragover", (event) => {
            if (dragIndex === null) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            li.classList.add("task--over");
        });

        li.addEventListener("dragleave", (event) => {
            if (li.contains(event.relatedTarget)) {
                li.classList.remove("task-over");
            }
        });

        li.addEventListener("drop", (event) => {
            event.preventDefault();
            if (dragIndex === null || dragIndex === index) return;

            const [moved] = tasks.splice(dragIndex, 1);
            tasks.splice(index, 0, moved);
            dragIndex = null;

            saveTasks();
            renderTasks();
        })

        li.append(handle, checkbox, text, buildMeta(task), del);
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
    const priority = document.getElementById("task-priority");
    const due = document.getElementById("task-due");
    const text = input.value.trim();
    if (!text) return;

    tasks.push({ text, done: false, priority: priority.value, due: due.value });
    saveTasks();
    input.value = "";
    priority.value = "none";
    due.value = "";
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
    const total = mode === "break" ? currentBreak : FOCUS_SECONDS;
    let elapsed;

    if (mode === "break") {
        elapsed = currentBreak - remaining;
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

        if (mode === "focus" && remaining ===0) {
            playAlert();
        }

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

    sessions += 1;
    document.getElementById("sessions").textContent = sessions;

    playChime();

    const isLong = sessions % LONG_BREAK_EVERY === 0;

    mode = 'break';
    currentBreak = isLong ? LONG_BREAK_SECONDS : breakSeconds;
    remaining = currentBreak;
    
    phase.textContent = isLong ? 'Long break' : 'Break';
    breakBanner.textContent =
        isLong
        ? 'Long break. Step away for 15 minutes.'
        : 'Break time. Step away for a few minutes.';
    breakBanner.hidden = false;

    drawTimer();
    startTimer();
}

function PauseTimer() {
    clearInterval(intervalid);
    intervalid = null;
    updateToggleLabel();
}

function resetTimer() {
    PauseTimer();
    mode = "focus";
    remaining = FOCUS_SECONDS;

    phase.textContent = "Focus block";
    breakBanner.hidden = true;
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
    ? currentBreak
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
    applyTheme(current === "dark" ? "light" : "dark");
});

applyTheme(localStorage.getItem(THEME_KEY) || "light");

function playChime() {
    if (!soundOn) return;

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.AudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const start = now + i * 0.25;

        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.8);

        osc.connect(gain).connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.8);
    });
}

function updateSoundLabel() {
    soundToggle.textContent = soundOn ? 'Sound on' : 'Sound off';
    soundToggle.setAttribute('aria-pressed', String(soundOn));
}

soundToggle.addEventListener('click',() => {
    soundOn = !soundOn;
    localStorage.setItem('studycabin-sound', soundOn ? 'on' : 'off');
    updateSoundLabel();
});
breakSelect.value = String(breakSeconds);
breakSelect.addEventListener('change', () => {
    breakSeconds = Number(breakSelect.value);
    localStorage.setItem('studycabin-break', String(breakSeconds));
});

updateSoundLabel();

function playAlert() {
    if (!soundOn) return;

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.AudioContext)(); 
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now +0.25);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(start + 0.3);
}

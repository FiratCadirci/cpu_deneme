export const meta = {
  name: 'build-codeflow-ui',
  description: 'Build the CodeFlow simulator UI in parallel (Gantt+player, charts+comparison+lab, simulator core+app), integrate, review and fix',
  phases: [
    { title: 'Build', detail: '3 component agents in parallel, each owning its own files' },
    { title: 'Integrate', detail: 'wire everything in the real page, fix contract mismatches' },
    { title: 'Review', detail: 'visual/UX review and code/robustness review' },
    { title: 'Fix', detail: 'apply verified review findings' },
  ],
}

const ROOT = 'C:\\Users\\FIRAT\\Desktop\\codeflow'
const SCRATCH = 'C:\\Users\\FIRAT\\AppData\\Local\\Temp\\claude\\c--Users-FIRAT-Desktop-Denemne\\e02a6af4-2584-4cfd-a191-4a368c67c334\\scratchpad\\ui'

const CTX = `PROJECT: "CodeFlow" — a CPU scheduling simulator + landing page for a Turkish university Operating Systems course (3-student team). Location: ${ROOT} (Windows 11, PowerShell 5.1). NO Node.js / npm on this machine: everything is plain browser JavaScript loaded with classic <script> tags (no ES modules, no bundler, no frameworks, no external JS libraries) so that double-clicking index.html (file://) works. Each JS file is an IIFE that attaches to the global namespace, exactly like the existing files:
  (function (CodeFlow) { 'use strict'; ... CodeFlow.ui.Something = { create }; })(window.CodeFlow);
Code style: English identifiers, Turkish comments (moderate density: explain the why / the OS concept, not every line), 2-space indent, single quotes, semicolons. Read a couple of existing files (js/engine/simulation-engine.js, js/ui/dom.js, js/ui/format.js) first and match their style.

ALREADY DONE (read-only for you unless your task says otherwise):
- Engine (verified by 99 tests): js/codeflow.js, js/models/*.js, js/engine/*.js, js/algorithms/*.js, js/comparison/algorithm-comparator.js, js/scenarios/*.js. Key APIs:
  * CodeFlow.engine.SimulationEngine.run(algorithmId, processes, options) -> SimulationResult { algorithm:{id,name,shortName,preemptive}, options:{quantum?}, processes:[{id, arrivalTime, burstTime, priority, startTime, completionTime, turnaroundTime, waitingTime, responseTime}] (input order), timeline:[{processId|null (null = IDLE), start, end}] (sorted, merged, idle filled from t=0), events:[{time, type:'arrive'|'dispatch'|'preempt'|'complete'|'idle', processId|null, queue:[ids in order, right AFTER the event]}] (chronological), traceTruncated:boolean (huge scenarios drop events -> []), metrics:{avgWaitingTime, avgTurnaroundTime, avgResponseTime, totalTime, busyTime, idleTime, cpuUtilization (0..1), throughput, contextSwitches, processCount} }.
    Throws CodeFlow.errors.ValidationError (has .errors = [{index (row or null), field ('id'|'arrivalTime'|'burstTime'|'priority'|'quantum'|null), message (Turkish)}]) for bad input, CodeFlow.errors.ScheduleError for an impossible schedule.
  * CodeFlow.engine.SimulationEngine.stateAt(result, t) -> { time, running (id|null), ready (ordered ids), finished, notArrived, states: {id: 'new'|'ready'|'running'|'terminated'} }
  * CodeFlow.engine.ProcessManager.validate(processes) -> errors[] (same shape) ; .FIELDS
  * CodeFlow.algorithms.list() -> registered algorithms in order [fcfs, sjf, priority, rr]; each has {id, name, shortName, preemptive, description (Turkish), usesPriority, params:[{key, label, min, max, default}]} (RR: params=[{key:'quantum', label:'Time Quantum', min:1, max:1000, default:2}]). NEVER hardcode the list of algorithms in UI code — always iterate CodeFlow.algorithms.list() so a newly added algorithm appears automatically (this "extensibility" is graded).
  * CodeFlow.comparison.AlgorithmComparator.compare(processes, options, ids?) -> { results: SimulationResult[], best: { metricKey: [algorithmIds with the best value, ties included] } } ; .sweep(algorithmId, processes, paramKey, values) -> [{value, result}] ; .METRICS = [{key, label (Turkish), short, better:'lower'|'higher', format:'decimal'|'percent'|'decimal3'|'integer'}] for avgWaitingTime, avgTurnaroundTime, avgResponseTime, cpuUtilization, throughput, contextSwitches.
  * CodeFlow.scenarios.Datasets.list() / .get('A'..'D') -> {id, name, description, quantum, processes:[{id, arrivalTime, burstTime, priority}]} (copies)
  * CodeFlow.scenarios.ScenarioGenerator.generate({count, maxArrival, minBurst, maxBurst, minPriority, maxPriority, seed}) -> {seed, settings, processes} (accepts numeric strings; throws ValidationError) ; .DEFAULTS ; .MAX_SEED
  * CodeFlow.models.GanttEntry.formatTimeline(timeline) -> "P1 0-5 | IDLE 5-8 | ..."
- Shared UI helpers (use them, don't duplicate):
  * js/visualization/palette.js: CodeFlow.visualization.palette = { COLORS, IDLE_COLOR, TEXT_ON_COLOR, colorAt(i), colorMap(processes) -> Map(id -> color by input index) }. The same process must have the same color everywhere.
  * js/ui/dom.js: CodeFlow.ui.dom = { h(tag, props, ...children), svg(tag, attrs, ...children), icon(name, extraClass) -> sprite icon, clear(el), escapeHtml(s), download(filename, content, mime) }. h props: class, style (object, supports --vars), dataset, onClick/onInput..., text, any attribute. ALWAYS build DOM with h()/textContent — never put user-controlled strings (process ids, scenario names) into innerHTML (XSS).
  * js/ui/format.js: CodeFlow.ui.format = { decimal(v, digits=2) -> "4,75", integer(v), percent(ratio) -> "%52,9" / "%100", time(v), metric(metricKeyOrDescriptor, value) } — Turkish number formatting; use it for every displayed number.
  * Icon sprite in index.html, use via dom.icon(name): cpu, gantt, gauge, compare, arrow-right, arrow-circle, play, pause, skip-back, skip-forward, chevron-left, chevron-right, chevron-down, plus, minus, trash, dice, download, printer, layers, flask, users, code, help, check, queue, hourglass, flag, login, rotate, reset, cart, zap, menu, x, shield, puzzle, book, sliders, table, save, folder, trophy, info, alert, zoom-in, zoom-out, fit, cap, calendar, file.
  * css/base.css: design tokens (--brand-900..50, --gradient-brand, --gradient-brand-soft, --gradient-green, --green-700/600/100, --ink, --ink-soft, --muted, --line, --line-strong, --surface, --surface-soft, --danger(-soft), --warning(-soft), --success(-soft), --radius-xs/sm/(default 12)/lg 20/xl 30, --shadow-sm/--shadow/--shadow-lg, --font, --font-mono) and classes: .btn + .btn-primary/.btn-glow/.btn-green/.btn-light/.btn-outline/.btn-outline-light/.btn-danger + sizes .btn-sm/.btn-xs/.btn-icon/.btn-block; .card, .card-head, .card-blue, .glass; .field (label span + input), .input, .select, .input[aria-invalid=true]; .table-wrap + .table (th/td.num, tfoot); .chip, .badge + .badge--best/--info/--warn; .swatch; .alert + .alert--error/--info/--warn; .icon (+ --sm/--lg/--xl/--fill); .muted, .mono, .num, .sr-only, .grid-2, .stack. Design language = the team's existing blue landing page: blue gradient panels (#2b6db3 -> #6bb3ff -> #3079c6), white rounded cards, green highlight for "best" (like the original page's green price bar), font "Instrument Sans".
- index.html (DO NOT EDIT) already contains all landing sections and these MOUNT POINTS (all inside the page; your components render into them):
  #sim-settings (blue gradient panel, white text, ~380px wide on desktop), #sim-process-table (inside a white card), #sim-errors (role=alert, hidden by default), #sim-result-title, #sim-result-subtitle, #sim-export, #sim-metrics, #sim-gantt and #sim-player (both inside one white .card), #sim-process-results (inside a white .card);
  comparison section (blue gradient background): #compare-insights (white text on blue, left column), #compare-chart (inside a .glass card on the blue background, right column), #compare-table (white .card), #compare-gantts (white .card);
  lab section: #lab-quantum (white .card), #lab-scenarios (white .card).
  Landing buttons dispatch document CustomEvents handled by app.js: 'codeflow:select-algorithm' {detail:{algorithmId}} and 'codeflow:load-dataset' {detail:{datasetId, algorithmId?}} (page.js already dispatches them and scrolls). Do not use data-try-* attributes in your markup.
  Script order at the end of index.html: engine files, then js/visualization/palette.js, js/ui/dom.js, js/ui/format.js, js/visualization/gantt-chart.js, js/visualization/performance-chart.js, js/ui/step-player.js, js/ui/store.js, js/ui/settings-panel.js, js/ui/process-table.js, js/ui/results-view.js, js/ui/exporter.js, js/ui/comparison-view.js, js/ui/scenario-lab.js, js/ui/page.js, js/app.js. CSS: css/base.css, css/landing.css, css/simulator.css, css/gantt.css, css/comparison.css. These exact file names are fixed; do not add new files that would need extra <script>/<link> tags (put helpers inside your own files).

UI TEXT RULES: All user-facing text in Turkish, short and clear for first-time OS students; keep standard English OS terms where the course uses them (Process, Arrival Time, Burst Time, Priority, Time Quantum, Gantt, Waiting/Turnaround/Response Time, Ready Queue, context switch, IDLE). Never attach Turkish suffixes directly to a process id (write "P1: kuyruğun sonuna geçti", "P2 CPU'ya alındı", not "P1'in"); ids are user-defined. Numbers always via CodeFlow.ui.format.

QUALITY BAR: responsive down to 360px width with NO horizontal page scroll (inner scroll containers are fine), keyboard accessible (real <button>s, labels for inputs, visible focus), color is never the only signal, prefers-reduced-motion respected, no console errors. Scale: up to 1000 processes and ~100000 timeline entries must not freeze the page — use caps WITH an explicit visible notice (never silently drop data).

HOW TO RUN / TEST (no Node): use headless Chrome. Screenshot:
  Start-Process -FilePath "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" -ArgumentList @('--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run',"--user-data-dir=<YOUR_SCRATCH>\\chrome-profile",'--virtual-time-budget=6000','--screenshot=<YOUR_SCRATCH>\\shot.png','--window-size=1440,3000','file:///C:/Users/FIRAT/Desktop/codeflow/index.html') -Wait -NoNewWindow
  (then view the PNG with your Read tool; crop tall screenshots with System.Drawing in PowerShell if needed). DOM after scripts: same with '--dump-dom' and -RedirectStandardOutput. Console errors: add '--enable-logging=stderr','--v=1' and -RedirectStandardError <file>, then search the file for 'CONSOLE' lines containing 'Uncaught' or 'Error'. To test your component in isolation, write a harness .html in YOUR scratch dir that loads ${ROOT} files via absolute file:/// URLs (base.css + your css, the engine scripts in order, palette/dom/format, your scripts) plus the mount points you need, and also a small script that drives it (clicks, inputs) and writes results/errors into a <pre id="out">. ALWAYS use your own --user-data-dir (other agents run Chrome in parallel; a shared profile breaks). Index.html also contains an SVG <symbol> sprite for icons — copy the needed <symbol>s into your harness or include an <svg> sprite there.

!!! NARROW / MOBILE WIDTHS — IMPORTANT: headless Chrome on this Windows machine CLAMPS the viewport to a MINIMUM of 500px. '--window-size=390,...' silently renders at 500px and then crops the screenshot to 390px, which makes every page look cut off on the right even when the CSS is perfect. Do NOT trust --window-size below 500. Instead:
  - Screenshots at any narrow width: run the helper  & "C:\\Users\\FIRAT\\AppData\\Local\\Temp\\claude\\c--Users-FIRAT-Desktop-Denemne\\e02a6af4-2584-4cfd-a191-4a368c67c334\\scratchpad\\mobile-shot.ps1" -Url "file:///C:/Users/FIRAT/Desktop/codeflow/index.html" -Out "<YOUR_SCRATCH>\\m390.png" -Width 390 -Height 6000 -WorkDir "<YOUR_SCRATCH>\\mobile"  — it renders the page inside an iframe that is exactly -Width px wide (the page sees window.innerWidth === 390 and its @media rules apply), screenshots it and crops to that width. Works for your harness pages too (pass their file:/// URL; a #hash is allowed).
  - Measuring overflow at narrow widths: put the page (or your harness) in an <iframe style="width:390px;height:3000px"> inside a wrapper html in your scratch dir; inside the framed page run a script that posts {innerWidth, scrollWidth: document.documentElement.scrollWidth} to the parent via window.parent.postMessage(...); the wrapper writes it into a <pre> you read with --dump-dom (cross-file DOM access between file:// pages is blocked, postMessage works). For index.html itself you cannot add scripts, so use a scratch copy of index.html whose css/js URLs are absolute file:/// URLs plus your measurement script.
  - Widths >= 500 (e.g. 768, 1024, 1440) can use --window-size directly.

RULES: Only create/modify the files your task assigns to you. Never edit engine files, index.html, css/base.css, css/landing.css, js/ui/page.js, js/ui/dom.js, js/ui/format.js, js/visualization/palette.js. If you believe a change is needed there, describe it in your report instead. Scope every CSS selector in your own CSS file with your component prefix so files don't collide.`

const REPORT = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' }, description: 'files you created/modified' },
    api: { type: 'string', description: 'the exact public API you implemented (signatures), and any deviation from the contract' },
    verification: { type: 'string', description: 'what you actually ran/looked at (screenshots, harness results, console checks) and the outcome' },
    knownIssues: { type: 'array', items: { type: 'string' } },
    requestsForOthers: { type: 'array', items: { type: 'string' }, description: 'changes needed in files you do not own' },
  },
  required: ['files', 'api', 'verification', 'knownIssues', 'requestsForOthers'],
}

const TASK_A = `${CTX}

YOUR SCRATCH DIR: ${SCRATCH}\\gantt
YOUR FILES: js/visualization/gantt-chart.js, js/ui/step-player.js, css/gantt.css  (prefixes: .gantt-, .player-)

TASK A — Gantt chart + step-by-step player (the project's headline feature #2: "Görsel ve adım adım işlenebilir Gantt zaman çizelgesi").

1) CodeFlow.visualization.GanttChart.create(container, options?) -> instance
   options: { compact?: boolean (default false), label?: string (compact mode: title on the left, e.g. "RR · q=2"), timeScale?: number (draw width as if total time were this — used to put several charts on one common scale; default result.metrics.totalTime), showLegend?: boolean (default !compact) }
   instance: { element, render(result), setCursor(time|null), destroy() }
   - Draw result.timeline as a horizontal bar: each entry width proportional to its duration; process color from palette.colorMap(result.processes); white bold label (process id) when the block is wide enough; IDLE entries hatched light grey with "IDLE" label when wide enough.
   - Time axis under the bar like textbook Gantt charts: tick labels at every segment boundary (0 2 4 6 ...), thinned automatically when they would overlap; always show 0 and the end.
   - Tooltip on hover AND keyboard focus (segments focusable in non-compact mode; but avoid thousands of tab stops for large charts — e.g. only when entries <= 300): "P3 · 4 → 6 · 2 birim", idle: "CPU boşta · 3 → 8 · 5 birim". Tooltip must stay inside the viewport.
   - Non-compact: legend (swatch + id) and zoom controls (Uzaklaş / Yakınlaş / Sığdır) — zoom widens an inner scroll container (overflow-x:auto) so long timelines are readable; never cause page-level horizontal scroll.
   - setCursor(t): vertical line + "t = 7" label at time t, everything after t dimmed; null removes it.
   - Large inputs: if timeline.length > 3000 render the first 3000 entries and show a visible notice ("Gantt şeması çok büyük: ilk 3000 dilim gösteriliyor; metrikler ve tablolar tam veriyle hesaplandı."). Rendering 3000 entries must stay fast (build with DocumentFragment or one SVG).
   - Accessible: the chart has role="img" and an aria-label summary (algorithm, process count, total time), plus a visually hidden text version (formatTimeline) for screen readers when entries <= 300.
   - Compact mode (used by the comparison section to stack 4 charts): ~34px bar, label on the left (fixed width so bars align), sparse axis (0, end and a few ticks), no zoom/legend, tooltip still works.
2) CodeFlow.ui.StepPlayer.create(container, { gantt }) -> { element, load(result), destroy() }
   - Controls (real <button>s with aria-labels + icons): Başa (skip-back), Geri (chevron-left), Oynat/Duraklat (play/pause), İleri (chevron-right), Sona (skip-forward); a speed <select> (0,5× 1× 2× 4×; 1× = 1 time unit per ~700 ms); a range slider 0..totalTime; a "t = 7 / 20" readout.
   - After load(result): show the FULL chart (gantt.setCursor(null)), slider at the end, and a hint "Oynat'a basarak CPU'nun her anını adım adım izleyin". Any player interaction switches to step mode and calls gantt.setCursor(t). Playing from the end restarts at 0. Stops automatically at the end.
   - State panel for time t from SimulationEngine.stateAt(result, t): "CPU" (running id as a colored chip, or "Boşta (IDLE)"), "Hazır Kuyruk" (ordered chips, the front clearly marked "sıradaki"), "Tamamlananlar", "Henüz gelmeyenler"; and process states shown with text labels Yeni / Hazır / Çalışıyor / Bitti (not color only).
   - Event log: human-readable Turkish lines for result.events with time <= t (newest highlighted, scrolls to newest), e.g. "t=0 · P1 geldi, hazır kuyruğa girdi", "t=0 · P1 CPU'ya alındı", "t=2 · P1: quantum doldu, kuyruğun sonuna geçti", "t=5 · P1 tamamlandı", "t=3 · CPU boşta: hazır kuyrukta process yok". Show the queue after the event in muted text. If result.traceTruncated (or events is empty) show a notice that the detailed event log isn't available for this (very large) scenario and that the queue is shown approximately.
   - Keyboard: when focus is inside the player: Space = play/pause, ←/→ = step. Stop the timer on destroy() and when load() is called again.
   - Must not leak intervals; must handle result with totalTime up to 100000 (slider still works; playback steps of 1 unit; that's fine).
3) css/gantt.css — styles for both, matching base.css tokens; responsive (player controls wrap nicely at 360px; state panel stacks).
Verify with a harness page (render Dataset A under each algorithm, RR q=2; a 1000-process generated scenario with RR q=1 for the cap notice; compact mode x4 with a common timeScale), screenshots at 1440 and 390 widths, and no console errors.`

const TASK_B = `${CTX}

YOUR SCRATCH DIR: ${SCRATCH}\\compare
YOUR FILES: js/visualization/performance-chart.js, js/ui/comparison-view.js, js/ui/scenario-lab.js, css/comparison.css  (prefixes: .pchart-, .cmp-, .lab-)

TASK B — performance charts, comparison view and the parametric scenario lab (headline features #4 "Karşılaştırmalı analiz ve raporlama" and #5 "Parametrik senaryo laboratuvarı").

1) CodeFlow.visualization.PerformanceChart (pure SVG, no libraries):
   - groupedBars(container, { categories: string[], series: [{ key, label, values: number[] }], best?: boolean[][] (best[s][c] marks a bar to highlight in green), valueFormat?: (v) => string, theme?: 'light'|'dark' }) — replaces container content. Vertical grouped bars, value labels on/above bars, horizontal gridlines with a few nice y ticks, category labels below, legend. Style it like the team's original price chart: rounded blue-gradient bars, the highlighted ("best") bars in the green gradient (#58d164 -> #2cb842). 'dark' theme = drawn on the blue glass card (white text, translucent white gridlines); 'light' = on white cards.
   - lines(container, { x: number[], xLabel: string, yLabel?: string, series: [{ key, label, values: number[] }], valueFormat?, theme? }) — line chart with markers and a legend, for the quantum sweep.
   - Both: responsive (viewBox, width 100%, readable at 360px), accessible (role="img", <title>/aria-label summarizing the data), each series distinguishable by more than color (e.g. legend + different markers/dash for lines; labels on bars). Handle all-zero values and a single category.
2) CodeFlow.ui.ComparisonView.create({ insights, chart, table, gantts }) -> { render(comparison), clear() } where comparison = AlgorithmComparator.compare(...) output.
   - insights (white text on the blue section): 2-4 short generated Turkish sentences derived from best[], e.g. "En düşük ortalama bekleme: SJF ve Priority (4,75)." / "CPU'ya en hızlı ilk dokunuş: RR (ort. yanıt 2,00)." / "Tüm algoritmalarda CPU kullanımı aynı (%100): hepsi CPU'yu boş bırakmadan çalışıyor." Never declare one overall winner; mention ties explicitly. Render as a list with small icons.
   - chart: PerformanceChart.groupedBars with categories = algorithm shortNames (+ " q=2" for algorithms that have params), series = avgWaitingTime, avgTurnaroundTime, avgResponseTime (labels "Ort. Bekleme", "Ort. Tamamlanma", "Ort. Yanıt"), theme 'dark', best bars highlighted.
   - table: rows = AlgorithmComparator.METRICS (label + better direction hint "↓ düşük iyi" / "↑ yüksek iyi"), columns = algorithms; values via format.metric; best cells get class + a ".badge--best" "en iyi" text; if every algorithm ties for a metric, no highlight but a muted "hepsi eşit" note. Horizontal scroll container on small screens.
   - gantts: one compact Gantt per algorithm stacked, ALL with the same timeScale = max totalTime, using CodeFlow.visualization.GanttChart.create(el, { compact: true, label, timeScale }) (built in parallel by another agent: js/visualization/gantt-chart.js — instance.render(result), .destroy()). Destroy old instances on re-render. If GanttChart is missing (file not loaded), fall back to a simple text line with GanttEntry.formatTimeline so nothing crashes, plus a shared process-color legend under the stack.
3) CodeFlow.ui.ScenarioLab.create({ quantum, scenarios }, { getCurrent, onLoadScenario }) -> { refresh() }
   getCurrent() returns { processes, quantum } (the simulator's current input; processes may be invalid -> show the validation message instead of crashing). onLoadScenario({ name, processes, quantum }) asks the simulator to load a saved scenario.
   - Quantum experiment (#lab-quantum): title "Quantum Deneyi" (+ flask icon), one-paragraph explanation; text input "Denenecek quantum değerleri" default "1, 2, 3, 4, 6, 8" (parse comma/space separated integers 1..1000, dedupe, sort, max 12 values, Turkish inline errors); "Deneyi Çalıştır" button; runs AlgorithmComparator.sweep('rr', processes, 'quantum', values); shows PerformanceChart.lines (light theme) for avg waiting/turnaround/response vs q, and a table q | Ort. Bekleme | Ort. Tamamlanma | Ort. Yanıt | Context Switch where rows with q >= longest burst get a "FCFS ile aynı" badge, plus a one-line takeaway (e.g. which q gave the lowest average waiting, and how context switches change). Run it once automatically on create with the current data.
   - Scenario comparison (#lab-scenarios): title "Senaryo Karşılaştırma" (+ layers icon), short explanation; optional name input + "Mevcut Senaryoyu Kaydet" (default names "Senaryo 1", "Senaryo 2", ...); list of saved scenarios (name, process count, quantum) each with "Yükle" (calls onLoadScenario) and "Sil" buttons; a metric <select> (Ort. Bekleme / Ort. Tamamlanma / Ort. Yanıt / Context Switch); a table rows = saved scenarios, columns = every registered algorithm (CodeFlow.algorithms.list()), cells = that metric computed with AlgorithmComparator.compare(scenario.processes, {quantum}); the best cell per row highlighted with text badge. Persist to localStorage key 'codeflow.scenarios.v1' — wrap every access in try/catch, validate the shape of loaded data (ignore/clean corrupt entries), keep working in memory when storage is unavailable; max 12 scenarios (explain when the limit is reached). Empty state text when nothing is saved yet.
   - refresh(): re-reads getCurrent() (call it when the simulator's input changes after a run) and re-runs the quantum experiment with the current values.
4) css/comparison.css — styles for .pchart-, .cmp- and .lab- (insights list readable on the blue background; glass chart card; tables; responsive). Add @media print rules so the comparison chart is readable on white paper (the landing print CSS turns the blue section white: switch 'dark' theme text/gridlines to dark ink in print).
Verify in an isolated harness (Datasets A–D, a generated 50-process scenario, bad input) at 1440 and 390 widths; no console errors.`

const TASK_C = `${CTX}

YOUR SCRATCH DIR: ${SCRATCH}\\simcore
YOUR FILES: js/ui/store.js, js/ui/settings-panel.js, js/ui/process-table.js, js/ui/results-view.js, js/ui/exporter.js, js/app.js, css/simulator.css  (prefixes: .sim-, .ptable-, .settings-, .metric-card, .results-, .export-)

TASK C — simulator core UI + application wiring (headline features #1 modular engine usage, #3 "Otomatik metrik motoru").

1) js/ui/store.js: CodeFlow.ui.createStore(initialState) -> { get(), set(patch | (state) => patch), subscribe(fn) -> unsubscribe } — tiny observable state container (fn(state, prevState)).
   State shape (document it in a comment): { processes: [{id, arrivalTime, burstTime, priority}] (values may be strings while the user is typing), algorithmId, options: { quantum }, generator: {count, maxArrival, minBurst, maxBurst, minPriority, maxPriority, seed}, activeDatasetId|null, errors: [] (ValidationError.errors), result|null, comparison|null, dirty: boolean (input changed since last run) }.
2) js/ui/settings-panel.js: CodeFlow.ui.SettingsPanel.create(el, { store, onRun, onLoadDataset(datasetId), onGenerate(settings) }) — renders inside the BLUE panel #sim-settings (white text; inputs white):
   - "Hazır Veri Setleri": one button per CodeFlow.scenarios.Datasets.list() (label A/B/C/D + short name, title/description visible on hover or as small text), active one highlighted.
   - "Rastgele Senaryo" in a <details> block: fields count, maxArrival, minBurst, maxBurst, minPriority, maxPriority, seed (+ a dice button for a new random seed), "Senaryo Üret" button; show "seed: 12345" of the last generated scenario so it can be reproduced; inline Turkish errors from ValidationError.
   - "Algoritma": radio-card list built from CodeFlow.algorithms.list() (shortName, name, "Kesmeli"/"Kesmesiz" text badge, description). Selecting one updates the store and immediately re-runs if the current input is valid.
   - Parameter fields generated generically from the params of ALL registered algorithms (today only RR's quantum) — label e.g. "Time Quantum (RR)", number input with min/max from the param; always visible because the comparison always includes RR; visually emphasized when the selected algorithm uses it. Changing it re-runs.
   - Big primary action "Simülasyonu Çalıştır" (green gradient, like the original page's CTA) + secondary "Karşılaştırmayı Gör" (scrolls to #karsilastirma). Show a small "Değişiklikler henüz uygulanmadı" hint when state.dirty.
3) js/ui/process-table.js: CodeFlow.ui.ProcessTable.create(el, { store }) — editable table inside the white card #sim-process-table: columns #, Process ID, Arrival Time, Burst Time, Priority, (delete). Inputs: text for id (maxlength 16), number for the rest (min 0 / 1, step 1, inputmode numeric); every input has an aria-label like "P1 Arrival Time". Buttons: "Process Ekle" (new unique id P{n}, arrival = last arrival, burst 1..), "Tümünü Temizle" (asks confirm() first), per-row delete. Enter moves to the same column on the next row. Show cell-level errors from state.errors (aria-invalid + red outline) and keep focus/caret while typing (don't re-render the whole table on every keystroke — update the store and only re-render on structural changes). Show "N process" count. Very large sets (generator up to 1000): render at most 200 rows with an explicit notice + "Tümünü göster" button.
4) js/ui/results-view.js: CodeFlow.ui.ResultsView.create({ title, subtitle, metrics, table }) -> { render(result), clear(), setStale(boolean) }
   - title/subtitle: e.g. "Sonuçlar — Round Robin" and "4 process · q = 2 · toplam süre 20".
   - metrics: 6 metric cards (Ort. Bekleme, Ort. Tamamlanma, Ort. Yanıt, CPU Kullanımı, Throughput, Context Switch) with icon, big value (format.metric), a one-line Turkish explanation of what the number means; styled as white cards with a blue gradient accent (match the landing's blue cards).
   - table: per-process results: colored swatch + id, Arrival, Burst, Priority, Başlangıç, Bitiş (CT), Turnaround, Waiting, Response; tfoot row with averages; numeric columns right-aligned; responsive horizontal scroll.
   - setStale(true): visually indicates results no longer match the edited input.
5) js/ui/exporter.js: CodeFlow.ui.Exporter.create(el, { getResult, getComparison }) -> { update() } — buttons "CSV İndir", "JSON İndir", "Yazdır / PDF" (window.print(); landing.css already has print rules that keep only results + comparison). CSV: ';' separator, UTF-8 BOM, Turkish decimal comma, sections: algorithm + options, per-process table, averages/metrics, and the comparison table (all algorithms × METRICS) when available. Proper CSV quoting of ids. JSON: { generatedAt (ISO), input: processes + options, result (without huge events if traceTruncated), comparison: per algorithm metrics }. Filenames like codeflow-rr-q2.csv. Disabled when there is no result.
6) js/app.js — the composition root (keep it small and readable; it is what the instructor will read to understand the architecture):
   - Create the store with Dataset A, algorithm 'fcfs', quantum from the dataset, generator defaults = ScenarioGenerator.DEFAULTS.
   - Mount: SettingsPanel(#sim-settings), ProcessTable(#sim-process-table), ResultsView(#sim-result-title/#sim-result-subtitle/#sim-metrics/#sim-process-results), Exporter(#sim-export), GanttChart(#sim-gantt) + StepPlayer(#sim-player, { gantt }), ComparisonView({ insights:#compare-insights, chart:#compare-chart, table:#compare-table, gantts:#compare-gantts }), ScenarioLab({ quantum:#lab-quantum, scenarios:#lab-scenarios }, { getCurrent, onLoadScenario }).
     Those last four components are being written IN PARALLEL by other agents with exactly these APIs:
       GanttChart.create(el, opts) -> { element, render(result), setCursor(t|null), destroy() }
       StepPlayer.create(el, { gantt }) -> { element, load(result), destroy() }
       ComparisonView.create({ insights, chart, table, gantts }) -> { render(comparison), clear() }
       ScenarioLab.create({ quantum, scenarios }, { getCurrent: () => ({ processes, quantum }), onLoadScenario: ({ name, processes, quantum }) => void }) -> { refresh() }
     Mount every component defensively: if its global is missing or it throws, log console.error and show a small inline notice in its mount point, but keep the rest of the simulator working.
   - run(): validate with ProcessManager.validate (+ quantum via the engine) -> on errors: store.errors, render a Turkish error list into #sim-errors (unhide it), mark cells, keep the previous results but setStale(true); on success: result = SimulationEngine.run(algorithmId, processes, options) and comparison = AlgorithmComparator.compare(processes, options), render results, gantt.render + player.load, comparison.render, lab.refresh, exporter.update, clear errors, dirty=false. Catch ScheduleError and unexpected errors and show them in #sim-errors (never fail silently).
   - Run once on page load so the page never looks empty.
   - Handle document events 'codeflow:select-algorithm' (select + run) and 'codeflow:load-dataset' (load dataset processes and its quantum, optionally select algorithmId, run).
   - Table edits only set dirty=true (no auto-run on every keystroke); algorithm/quantum changes re-run immediately if valid.
   - onLoadScenario from the lab: load processes + quantum into the store, run, scroll to #simulator.
7) css/simulator.css — styles for everything above. The settings panel is on a blue gradient (white text, white inputs, translucent white section separators, selected radio-card = white card with blue text); the process table is inside a white card; metric cards grid (3 columns desktop, 2 tablet, 1 small phone).
Verify by loading the REAL index.html headlessly (other agents' files may not exist yet — your defensive mounting must cope): screenshots of the simulator section at 1440 and 390 widths, a scripted harness that edits a cell / triggers validation errors / switches algorithms / loads a dataset via the CustomEvents, and no console errors from your files.`

phase('Build')
const builds = await parallel([
  () => agent(TASK_A, { label: 'build:gantt+player', phase: 'Build', schema: REPORT }),
  () => agent(TASK_B, { label: 'build:charts+compare+lab', phase: 'Build', schema: REPORT }),
  () => agent(TASK_C, { label: 'build:simulator-core+app', phase: 'Build', schema: REPORT }),
])
const [repA, repB, repC] = builds
const buildSummary = JSON.stringify({ gantt_player: repA, charts_compare_lab: repB, simulator_core_app: repC }, null, 1)

phase('Integrate')
const integration = await agent(`${CTX}

YOUR SCRATCH DIR: ${SCRATCH}\\integrate
YOUR FILES: you may edit ALL UI files: js/visualization/gantt-chart.js, js/visualization/performance-chart.js, js/ui/step-player.js, js/ui/store.js, js/ui/settings-panel.js, js/ui/process-table.js, js/ui/results-view.js, js/ui/exporter.js, js/ui/comparison-view.js, js/ui/scenario-lab.js, js/app.js, css/simulator.css, css/gantt.css, css/comparison.css. Still do NOT edit engine files, index.html, base.css, landing.css, page.js, dom.js, format.js, palette.js — list needed changes there in requestsForOthers.

ROLE: Integrator. Three agents just built the simulator UI in parallel against shared contracts. Their reports:
${buildSummary}

Make the REAL page (file:///C:/Users/FIRAT/Desktop/codeflow/index.html) work end to end:
1. Load it headlessly with console logging; fix every console error and every API mismatch between app.js and the components (read each component's actual exported API — do not assume).
2. Write a scripted smoke test harness (in your scratch dir) that loads index.html in an <iframe> (same file:// origin — if Chrome blocks cross-file iframe access, instead copy index.html into your scratch dir with absolute file:/// URLs for css/js and append a test <script>) and drives the real UI: initial auto-run renders metrics/Gantt/table/comparison/lab; switch algorithm to each registered algorithm; change quantum; edit a cell to an invalid value and press run (errors shown, cells marked, results stale); fix it and run; load each dataset via the 'codeflow:load-dataset' CustomEvent; generate a random scenario with a fixed seed; step player: play/step/slider; scenario lab: run quantum experiment, save a scenario, reload, delete; exporter: CSV/JSON builders produce non-empty content (call their builder functions or intercept download). Report PASS/FAIL per check into a <pre> you read via --dump-dom. Iterate until all pass.
3. Check the numbers shown in the UI against the engine for Dataset A RR q=2 (avg waiting 8,75; avg turnaround 13,75; avg response 2,00; context switches 9) and FCFS (5,75 / 10,75 / 5,75).
4. Screenshots of the simulator, comparison and lab sections at 1440px and 390px (390px ONLY via the mobile-shot.ps1 iframe helper described above — never via --window-size below 500); fix layout overflow (no horizontal page scroll at 390px — measure scrollWidth <= innerWidth inside a 390px iframe via postMessage, as described above), overlapping elements, unreadable text on the blue backgrounds.
5. Performance: generate 1000 processes (maxBurst 50) with RR q=1 and confirm the page stays responsive (measure run+render time in the harness; caps and notices visible).
Return the report (files changed, the smoke-test results, screenshot paths, remaining issues).`, { label: 'integrate', phase: 'Integrate', schema: REPORT })

phase('Review')
const REVIEW = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
          file: { type: 'string' },
          evidence: { type: 'string', description: 'how you reproduced it (steps, screenshot path, input) and what you saw' },
          fix: { type: 'string' },
        },
        required: ['title', 'severity', 'evidence', 'fix'],
      },
    },
  },
  required: ['summary', 'findings'],
}

const reviews = await parallel([
  () => agent(`${CTX}

YOUR SCRATCH DIR: ${SCRATCH}\\review-ux
ROLE: Visual / UX / accessibility reviewer. READ-ONLY: do not modify project files. The integrator's report: ${JSON.stringify(integration)}
Review the real index.html simulator, comparison and lab sections (and how they sit inside the landing page) with screenshots at 1440, 1024, 768 and 390 widths (crop tall screenshots to inspect at full resolution; 390 only via the mobile-shot.ps1 helper). Compare against the team's original landing page design language (blue gradient panels, white cards, green "best" highlight; screenshot of the original: ${'C:\\Users\\FIRAT\\AppData\\Local\\Temp\\claude\\c--Users-FIRAT-Desktop-Denemne\\e02a6af4-2584-4cfd-a191-4a368c67c334\\scratchpad\\orig-full.png'} — crop it, it is 1440x11000). Check: visual consistency and polish, spacing/alignment, text contrast on blue, overflow/clipping, horizontal page scroll at 390px, readability of the Gantt (labels, axis), clarity of the step player and its Turkish texts for first-time OS students, keyboard access (tab order, focus visibility, labels), empty/error states, consistent Turkish wording and number formatting. Report only concrete, verified problems with the exact fix (CSS/JS change). No vague taste comments.`, { label: 'review:ux', phase: 'Review', schema: REVIEW }),
  () => agent(`${CTX}

YOUR SCRATCH DIR: ${SCRATCH}\\review-code
ROLE: Code / robustness / security reviewer. READ-ONLY: do not modify project files. The integrator's report: ${JSON.stringify(integration)}
Read every UI file (js/ui/*.js except page.js/dom.js/format.js which are reference, js/visualization/*.js, js/app.js, css/simulator.css, css/gantt.css, css/comparison.css). Hunt for: XSS (user-controlled ids / scenario names / localStorage content reaching innerHTML or attribute injection), crashes on edge input (empty table, 1 process, ids like '<img src=x onerror=alert(1)>' or '__proto__', 1000 processes, totalTime 100000, corrupt localStorage JSON, localStorage throwing), timer/listener leaks on re-render, state desync between store and DOM, hardcoded algorithm lists (must iterate CodeFlow.algorithms.list() — test by registering an extra algorithm in a harness BEFORE app.js runs, e.g. a LJF NonPreemptiveAlgorithm, and verify it appears in the selector, comparison table/chart/gantts and lab table), CSV correctness (quoting, BOM, decimal comma, separators), number formatting consistency, duplicated logic that should use the shared helpers, and readability problems an instructor would flag. Reproduce each issue in a headless-Chrome harness before reporting it. Report concrete fixes.`, { label: 'review:code', phase: 'Review', schema: REVIEW }),
])

const allFindings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
const toFix = allFindings.filter((f) => f.severity !== 'minor' || allFindings.length <= 25)
log(`Review findings: ${allFindings.length} (fixing ${toFix.length})`)

phase('Fix')
let fixReport = null
if (toFix.length > 0) {
  fixReport = await agent(`${CTX}

YOUR SCRATCH DIR: ${SCRATCH}\\fix
YOUR FILES: all UI files (js/visualization/gantt-chart.js, js/visualization/performance-chart.js, js/ui/step-player.js, js/ui/store.js, js/ui/settings-panel.js, js/ui/process-table.js, js/ui/results-view.js, js/ui/exporter.js, js/ui/comparison-view.js, js/ui/scenario-lab.js, js/app.js, css/simulator.css, css/gantt.css, css/comparison.css). Not engine/index.html/base.css/landing.css/page.js/dom.js/format.js/palette.js (list needed changes there in requestsForOthers).
ROLE: Fixer. Reviewers reported the findings below. For EACH: first reproduce it (skip with a note if it does not reproduce or the reviewer is wrong), then fix it minimally and consistently with the existing code, then verify the fix (screenshot or harness). After all fixes, re-run the integrator's smoke test harness if it exists in ${SCRATCH}\\integrate (or an equivalent) to make sure nothing regressed, and confirm no console errors and no horizontal scroll at 390px.
FINDINGS:
${JSON.stringify(toFix, null, 1)}
In your report's verification field, list each finding as FIXED / NOT REPRODUCED / WONTFIX with one line of evidence.`, { label: 'fix', phase: 'Fix', schema: REPORT })
}

return { builds: { repA, repB, repC }, integration, reviews, fixReport }

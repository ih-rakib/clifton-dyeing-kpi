/* ==========================================================================
   Clifton Apparels - Dyeing & Finishing Performance Dashboard
   Application layer

   Author : Ikramul Hasan Rakib
            Executive, Central IE Department, Clifton Group
   (c) 2026 Ikramul Hasan Rakib. All rights reserved.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.DASHBOARD_DATA;
  if (!D) {
    document.getElementById("boot").innerHTML =
      '<div class="boot-inner"><p style="max-width:380px">No data bundle found.<br><br>' +
      'Run <b>python scripts/build.py</b> to generate <b>dashboard/data/data.js</b>, then reload.</p></div>';
    return;
  }

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var NF0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  var NF1 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var NF2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function kg(v) { return v == null ? "—" : NF0.format(v); }
  function n1(v) { return v == null ? "—" : NF1.format(v); }
  function n2(v) { return v == null ? "—" : NF2.format(v); }
  function pc(v, d) { return v == null ? "—" : (d === 2 ? NF2.format(v) : NF1.format(v)) + "%"; }
  function compact(v) {
    if (v == null) return "—";
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + "k";
    return NF0.format(v);
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function sum(arr, f) { return arr.reduce(function (a, b) { return a + (f ? f(b) : b); }, 0); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function shortMonth(key) {
    var p = key.split("-");
    return MONTH_NAMES[parseInt(p[1], 10) - 1] + " '" + p[0].slice(2);
  }

  /* Author attribution - the name always links to the author's portfolio. */
  var PORTFOLIO_URL = (D.meta && D.meta.portfolio) || "https://rakib-orion.vercel.app/";
  var AUTHOR_NAME = (D.meta && D.meta.author) || "Ikramul Hasan Rakib";
  function authorLink() {
    return '<a class="author-link" href="' + esc(PORTFOLIO_URL) +
      '" target="_blank" rel="noopener noreferrer" title="' + esc(AUTHOR_NAME) +
      ' — portfolio">' + esc(AUTHOR_NAME) + "</a>";
  }

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  var stored = null;
  try { stored = localStorage.getItem("clifton-theme"); } catch (e) { /* ignore */ }

  var state = {
    month: D.meta.latestCompleteMonth || D.meta.latestMonth,
    method: "weighted",
    theme: stored === "light" ? "light" : "dark",
    tab: "overview"
  };

  var months = D.dyeing.months;
  var monthMap = {};
  months.forEach(function (m) { monthMap[m.key] = m; });

  function cur() { return monthMap[state.month] || months[months.length - 1]; }
  function prevOf(m) {
    var i = months.indexOf(m);
    return i > 0 ? months[i - 1] : null;
  }

  /* Method-aware accessor for plant KPI */
  function km(m, f) {
    if (!m) return null;
    if (state.method === "report") {
      if (f === "oee" && m.oeeReport != null) return m.oeeReport;
      if (f === "performance" && m.performanceReport != null) return m.performanceReport;
      if (f === "availability" && m.availabilityReport != null) return m.availabilityReport;
      if (f === "quality" && m.qualityReport != null) return m.qualityReport;
    }
    return m[f];
  }

  function statusOf(value, target, higherBetter) {
    if (value == null || target == null) return "neutral";
    if (higherBetter === false) {
      if (value <= target) return "good";
      if (value <= target * 1.25) return "warn";
      return "bad";
    }
    if (value >= target) return "good";
    if (value >= target * 0.95) return "warn";
    return "bad";
  }
  var STATUS_LABEL = { good: "On target", warn: "Near target", bad: "Below target", neutral: "—" };

  function deltaBadge(curV, prevV, higherBetter, unit) {
    if (curV == null || prevV == null) return "";
    var d = curV - prevV;
    if (Math.abs(d) < 0.05) return '<span style="color:var(--text-3)">flat vs prev.</span>';
    var good = higherBetter === false ? d < 0 : d > 0;
    return '<b class="' + (good ? "up" : "down") + '">' + (d > 0 ? "+" : "") + NF1.format(d) +
      (unit || " pp") + "</b> vs prev.";
  }

  /* ------------------------------------------------------------------ */
  /* Theme                                                               */
  /* ------------------------------------------------------------------ */
  function T() {
    var dark = state.theme === "dark";
    return dark
      ? { text: "#e9eff9", text2: "#9db0cb", text3: "#667d9c", axis: "#26364f", grid: "#18253c",
          tipBg: "#0d1626", tipBorder: "#24354f", panel: "#0d1626" }
      : { text: "#0b1220", text2: "#4c5e77", text3: "#7d8da6", axis: "#d3dfec", grid: "#e9eff7",
          tipBg: "#ffffff", tipBorder: "#dbe4f0", panel: "#ffffff" };
  }
  function palette() {
    return ["#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#fb923c", "#22d3ee", "#f87171", "#4ade80", "#e879f9"];
  }
  var C = {
    good: "#34d399", warn: "#fbbf24", bad: "#f87171", info: "#38bdf8",
    violet: "#a78bfa", pink: "#f472b6", accent: "#22d3ee", orange: "#fb923c"
  };
  function bandColor(v, target) {
    if (v == null) return C.info;
    if (target == null) target = 85;
    if (v >= target) return C.good;
    if (v >= target - 10) return C.warn;
    return C.bad;
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    try { localStorage.setItem("clifton-theme", state.theme); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ */
  /* Sparklines (inline SVG)                                             */
  /* ------------------------------------------------------------------ */
  var sparkSeq = 0;
  function sparkline(values, color) {
    var vals = (values || []).filter(function (v) { return v != null && isFinite(v); });
    if (vals.length < 2) return "";
    var w = 120, h = 26, pad = 3;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = max - min || 1;
    var step = (w - pad * 2) / (values.length - 1);
    var pts = [];
    values.forEach(function (v, i) {
      if (v == null || !isFinite(v)) { pts.push(null); return; }
      pts.push([pad + i * step, h - pad - ((v - min) / span) * (h - pad * 2)]);
    });
    var segs = [];
    pts.forEach(function (p) {
      if (!p) return;
      segs.push((segs.length ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1));
    });
    if (!segs.length) return "";
    var line = segs.join(" ");
    var area = line + " L " + (w - pad) + " " + (h - pad) + " L " + pad + " " + (h - pad) + " Z";
    var gid = "sg" + (++sparkSeq);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.32"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
      "</linearGradient></defs>" +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' +
      "</svg>";
  }

  /* ------------------------------------------------------------------ */
  /* KPI cards                                                           */
  /* ------------------------------------------------------------------ */
  function kpiCard(o) {
    var cls = o.status || "neutral";
    var bar = "";
    if (o.bar != null) {
      bar = '<div class="kpi-bar ' + cls + '"><span style="width:' + clamp(o.bar * 100, 0, 100).toFixed(1) + '%"></span></div>';
    }
    var spark = o.spark ? '<div class="spark">' + sparkline(o.spark, o.sparkColor || C.info) + "</div>" : "";
    var badge = o.badge
      ? '<span class="kpi-badge ' + (o.badgeStatus || cls) + '">' + esc(o.badge) + "</span>"
      : "";
    return '<div class="kpi ' + cls + '">' +
      '<div class="kpi-top"><span class="kpi-label">' + esc(o.label) + "</span>" + badge + "</div>" +
      '<div class="kpi-value">' + o.value + (o.unit ? '<span class="unit">' + o.unit + "</span>" : "") + "</div>" +
      '<div class="kpi-sub">' + (o.sub || "") + "</div>" +
      bar + spark +
      "</div>";
  }

  function renderKpis(el, items) {
    el.innerHTML = items.map(kpiCard).join("");
  }

  /* ------------------------------------------------------------------ */
  /* ECharts plumbing                                                    */
  /* ------------------------------------------------------------------ */
  var charts = {};

  function draw(id, option) {
    var el = document.getElementById(id);
    if (!el) return null;
    var ch = echarts.getInstanceByDom(el);
    if (!ch) {
      ch = echarts.init(el, null, { renderer: "canvas" });
    }
    ch.setOption(option, true);
    charts[id] = ch;
    return ch;
  }

  function baseOption(extra) {
    var t = T();
    var base = {
      color: palette(),
      animationDuration: 550,
      textStyle: { fontFamily: '"Segoe UI", Inter, sans-serif', color: t.text2, fontSize: 11 },
      tooltip: {
        backgroundColor: t.tipBg,
        borderColor: t.tipBorder,
        borderWidth: 1,
        padding: [9, 12],
        textStyle: { color: t.text, fontSize: 11.5 },
        extraCssText: "border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.28);"
      },
      legend: {
        top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9,
        itemGap: 12, textStyle: { color: t.text2, fontSize: 10.5 }
      },
      grid: { left: 6, right: 10, top: 34, bottom: 6, containLabel: true },
      xAxis: axisX(),
      yAxis: axisY()
    };
    return merge(base, extra || {});
  }

  function merge(a, b) {
    for (var k in b) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) {
        a[k] = merge(a[k], b[k]);
      } else {
        a[k] = b[k];
      }
    }
    return a;
  }

  function axisX(extra) {
    var t = T();
    var o = {
      axisLine: { lineStyle: { color: t.axis } },
      axisTick: { show: false },
      axisLabel: { color: t.text3, fontSize: 10.2 },
      splitLine: { show: false }
    };
    return merge(o, extra || {});
  }
  function axisY(extra) {
    var t = T();
    var o = {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: t.text3, fontSize: 10.2 },
      splitLine: { lineStyle: { color: t.grid, type: [4, 4] } }
    };
    return merge(o, extra || {});
  }

  function pctAxis(min, max) {
    return axisY({
      min: min, max: max,
      axisLabel: { color: T().text3, fontSize: 10.2, formatter: "{value}%" }
    });
  }

  function tooltipAxis(extra) {
    return merge({
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(120,150,190,0.08)" } }
    }, extra || {});
  }

  function resizeAll() {
    Object.keys(charts).forEach(function (k) {
      try { charts[k].resize(); } catch (e) { /* ignore */ }
    });
  }
  var rz;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(resizeAll, 160);
  });

  /* ------------------------------------------------------------------ */
  /* Table helper                                                        */
  /* ------------------------------------------------------------------ */
  function dataTable(container, cfg) {
    var cols = cfg.columns;
    var rows = cfg.rows.slice();
    var sortKey = cfg.sort || null;
    var sortDir = cfg.sortDir || -1;

    function value(r, c) { return c.value ? c.value(r) : r[c.key]; }

    function paint() {
      if (sortKey) {
        var scol = cols.filter(function (c) { return c.key === sortKey; })[0] || cols[0];
        rows.sort(function (a, b) {
          var va = value(a, scol);
          var vb = value(b, scol);
          if (typeof va === "string" || typeof vb === "string") {
            return String(va == null ? "" : va).localeCompare(String(vb == null ? "" : vb)) * (sortDir < 0 ? -1 : 1);
          }
          var na = va == null ? -Infinity : va, nb = vb == null ? -Infinity : vb;
          return (na - nb) * sortDir;
        });
      }

      var html = '<table class="data"><thead><tr>';
      cols.forEach(function (c) {
        html += '<th data-key="' + c.key + '"' + (c.key === sortKey ? ' class="sorted"' : "") + ">" + esc(c.label) + "</th>";
      });
      html += "</tr></thead><tbody>";
      rows.forEach(function (r) {
        html += "<tr>";
        cols.forEach(function (c, i) {
          var v = value(r, c);
          var out = c.format ? c.format(v, r) : (v == null ? "—" : v);
          html += '<td class="' + (i === 0 ? "name" : "") + (c.align === "left" && i !== 0 ? " left" : "") + '">' + out + "</td>";
        });
        html += "</tr>";
      });
      html += "</tbody>";
      if (cfg.total) {
        html += "<tfoot><tr>";
        cols.forEach(function (c, i) {
          var v = c.total ? c.total(rows) : (i === 0 ? (cfg.totalLabel || "Total") : "");
          html += "<td>" + (v == null ? "" : v) + "</td>";
        });
        html += "</tr></tfoot>";
      }
      html += "</table>";
      container.innerHTML = html;

      $$("th", container).forEach(function (th) {
        th.addEventListener("click", function () {
          var k = th.getAttribute("data-key");
          if (k === sortKey) sortDir = -sortDir; else { sortKey = k; sortDir = -1; }
          paint();
        });
      });
    }
    paint();
  }

  /* ------------------------------------------------------------------ */
  /* Shared blocks                                                       */
  /* ------------------------------------------------------------------ */
  function monthRangeText() {
    var m = cur();
    return m.monthName + " " + m.year;
  }

  function fillMonthSelect() {
    var sel = $("#monthSelect");
    sel.innerHTML = months.slice().reverse().map(function (m) {
      var suffix = m.partial ? "  ·  MTD (" + m.workingDays + "d)" : "";
      return '<option value="' + m.key + '">' + shortMonth(m.key) + suffix + "</option>";
    }).join("");
    sel.value = state.month;
  }

  function metaPills(target, extra, opt) {
    opt = opt || {};
    var m = cur();
    var days = opt.days != null ? opt.days : m.workingDays;
    var records = opt.records != null ? opt.records : m.records;
    var machines = opt.machines != null ? opt.machines : m.activeMachines;
    var partial = opt.partial != null ? opt.partial : m.partial;
    var html = "";
    html += '<span class="pill"><span class="dot" style="background:var(--accent)"></span>' +
      days + " production days</span>";
    html += '<span class="pill">' + NF0.format(records) + " records</span>";
    if (machines != null) html += '<span class="pill">' + machines + " machines</span>";
    if (!opt.hideMethod) {
      html += '<span class="pill info">' + (state.method === "weighted" ? "Weighted KPI" : "Report KPI") + "</span>";
    }
    if (partial) html += '<span class="pill warn">Month-to-date</span>';
    if (extra) html += extra;
    $(target).innerHTML = html;
  }

  function setPeriodLines() {
    var m = cur();
    var line = m.monthName + " " + m.year +
      (m.partial ? " · month-to-date (" + m.workingDays + " production days)" : " · " + m.workingDays + " production days");
    ["ov-period-line", "dy-period-line", "mc-period-line", "dt-period-line", "fn-period-line", "mx-period-line"].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.textContent = line;
    });
  }

  /* ==================================================================
     OVERVIEW
     ================================================================== */
  function renderOverview() {
    var m = cur(), p = prevOf(m);
    var dm = months;

    var prodSpark = dm.map(function (x) { return x.production; });
    var oeeSpark = dm.map(function (x) { return km(x, "oee"); });
    var avSpark = dm.map(function (x) { return km(x, "availability"); });
    var pfSpark = dm.map(function (x) { return km(x, "performance"); });
    var quSpark = dm.map(function (x) { return km(x, "quality"); });
    var rftMap = {};
    D.dyeing.rft.monthly.forEach(function (r) { rftMap[r.month] = r; });
    var rftSpark = dm.map(function (x) { return rftMap[x.key] ? rftMap[x.key].rate : null; });
    var finMap = {};
    D.finishing.months.forEach(function (x) { finMap[x.key] = x; });
    var finSpark = dm.map(function (x) { return finMap[x.key] ? finMap[x.key].oee : null; });

    var hit = m.hitRateProrated != null && m.partial ? m.hitRateProrated : m.hitRate;
    var goal = m.partial ? m.proratedGoal : m.goal;

    var items = [
      {
        label: "Dyeing output", value: kg(m.production), unit: "kg",
        status: statusOf(m.partial ? hit : m.hitRate, 95),
        badge: (m.partial ? hit : m.hitRate).toFixed(1) + "% of goal",
        sub: "Goal " + kg(goal) + " kg" + (p && !m.partial ? " · " + deltaBadge(m.production, p.production, true, " kg") : ""),
        bar: (m.partial ? hit : m.hitRate) / 100,
        spark: prodSpark, sparkColor: C.info
      },
      {
        label: "Plant OEE", value: n1(km(m, "oee")), unit: "%",
        status: statusOf(km(m, "oee"), D.targets.oee),
        badge: STATUS_LABEL[statusOf(km(m, "oee"), D.targets.oee)],
        sub: "Target " + D.targets.oee + "% · " + deltaBadge(km(m, "oee"), p ? km(p, "oee") : null, true),
        bar: (km(m, "oee") || 0) / D.targets.oee,
        spark: oeeSpark, sparkColor: C.good
      },
      {
        label: "Availability", value: n1(km(m, "availability")), unit: "%",
        status: statusOf(km(m, "availability"), D.targets.availability),
        badge: STATUS_LABEL[statusOf(km(m, "availability"), D.targets.availability)],
        sub: "Target " + D.targets.availability + "% · " + deltaBadge(km(m, "availability"), p ? km(p, "availability") : null, true),
        bar: (km(m, "availability") || 0) / D.targets.availability,
        spark: avSpark, sparkColor: C.accent
      },
      {
        label: "Performance", value: n1(km(m, "performance")), unit: "%",
        status: statusOf(km(m, "performance"), D.targets.performance),
        badge: STATUS_LABEL[statusOf(km(m, "performance"), D.targets.performance)],
        sub: "Target " + D.targets.performance + "% · " + deltaBadge(km(m, "performance"), p ? km(p, "performance") : null, true),
        bar: (km(m, "performance") || 0) / D.targets.performance,
        spark: pfSpark, sparkColor: C.warn
      },
      {
        label: "Quality", value: n1(km(m, "quality")), unit: "%",
        status: statusOf(km(m, "quality"), D.targets.quality),
        badge: STATUS_LABEL[statusOf(km(m, "quality"), D.targets.quality)],
        sub: "Target " + D.targets.quality + "% · " + deltaBadge(km(m, "quality"), p ? km(p, "quality") : null, true),
        bar: (km(m, "quality") || 0) / D.targets.quality,
        spark: quSpark, sparkColor: C.violet
      },
      {
        label: "Right first time", value: n1(rftMap[m.key] ? rftMap[m.key].rate : null), unit: "%",
        status: statusOf(rftMap[m.key] ? rftMap[m.key].rate : null, D.targets.rft),
        badge: STATUS_LABEL[statusOf(rftMap[m.key] ? rftMap[m.key].rate : null, D.targets.rft)],
        sub: (rftMap[m.key] ? rftMap[m.key].pass + " of " + rftMap[m.key].total + " batches" : "No batch data") +
          " · target " + D.targets.rft + "%",
        bar: rftMap[m.key] ? rftMap[m.key].rate / D.targets.rft : null,
        spark: rftSpark, sparkColor: C.pink
      },
      {
        label: "Topping rate", value: n2(m.toppingPct), unit: "%",
        status: statusOf(m.toppingPct, D.targets.topping_limit, false),
        badge: m.toppingPct == null ? "—" : (m.toppingPct <= D.targets.topping_limit ? "Within limit" : "Over limit"),
        sub: kg(m.topping) + " kg · ceiling " + D.targets.topping_limit + "%",
        bar: m.toppingPct != null ? m.toppingPct / D.targets.topping_limit : null,
        spark: dm.map(function (x) { return x.toppingPct; }), sparkColor: C.orange
      },
      {
        label: "Finishing OEE", value: n1(finMap[m.key] ? finMap[m.key].oee : null), unit: "%",
        status: statusOf(finMap[m.key] ? finMap[m.key].oee : null, D.targets.finishing_oee),
        badge: STATUS_LABEL[statusOf(finMap[m.key] ? finMap[m.key].oee : null, D.targets.finishing_oee)],
        sub: finMap[m.key] ? "Throughput " + compact(finMap[m.key].production) + " kg" : "No finishing data",
        bar: finMap[m.key] ? finMap[m.key].oee / D.targets.finishing_oee : null,
        spark: finSpark, sparkColor: C.good
      }
    ];
    renderKpis($("#ov-kpis"), items);

    // meta
    metaPills("#ov-meta", '<span class="pill">Updated ' + esc(D.meta.generatedAtDisplay) + "</span>");

    // commentary
    $("#ov-summary").innerHTML = commentary(m, p, rftMap[m.key], finMap[m.key]);

    // scorecard
    renderScorecard($("#ov-scorecard"), m, rftMap[m.key], finMap[m.key]);

    // charts
    drawOverviewTrend();
    drawOverviewProduction();

    // monthly table
    dataTable($("#ov-table"), {
      columns: [
        { key: "label", label: "Month" },
        { key: "production", label: "Output (kg)", format: function (v) { return kg(v); }, total: function (r) { return kg(sum(r, function (x) { return x.production || 0; })); } },
        { key: "hitRate", label: "Goal hit", format: function (v) { return pc(v); }, value: function (r) { return r.partial ? r.hitRateProrated : r.hitRate; } },
        { key: "availability", label: "Availability", format: function (v) { return pc(v); } },
        { key: "performance", label: "Performance", format: function (v) { return pc(v); } },
        { key: "quality", label: "Quality", format: function (v) { return pc(v); } },
        { key: "oee", label: "OEE", format: function (v, r) { return '<span class="tag ' + statusOf(km(r, "oee"), D.targets.oee) + '">' + pc(km(r, "oee")) + "</span>"; } },
        { key: "rft", label: "RFT", value: function (r) { return rftMap[r.key] ? rftMap[r.key].rate : null; }, format: function (v) { return pc(v); } },
        { key: "toppingPct", label: "Topping", format: function (v) { return pc(v, 2); } },
        { key: "redyeingPct", label: "Redyeing", format: function (v) { return pc(v, 2); } },
        { key: "lossHours", label: "Loss hrs", format: function (v) { return n1(v); }, total: function (r) { return n1(sum(r, function (x) { return x.lossHours || 0; })); } },
        { key: "workingDays", label: "Days" }
      ],
      rows: months.slice()
    });

    // insights
    var ins = D.insights[m.key] || [];
    $("#ov-insights").innerHTML = ins.map(insightCard).join("");
  }

  function insightIcon(type) {
    var paths = {
      positive: '<polyline points="20 6 9 17 4 12"/>',
      warning: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      critical: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
      info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
    };
    return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + (paths[type] || paths.info) + "</svg>";
  }
  function insightCard(i) {
    return '<div class="insight ' + esc(i.type) + '">' + insightIcon(i.type) +
      '<div><h4>' + esc(i.title) + "</h4><p>" + esc(i.text) + "</p></div></div>";
  }

  function commentary(m, p, rft, fin) {
    var html = "";
    var hit = m.partial ? m.hitRateProrated : m.hitRate;
    var goal = m.partial ? m.proratedGoal : m.goal;
    html += "<p>" + esc(m.monthName + " " + m.year) + (m.partial ? " (month-to-date) " : " ") +
      "closed with <strong>" + kg(m.production) + " kg</strong> of dyeing output — <strong>" + n1(hit) +
      "%</strong> of the " + kg(goal) + " kg " + (m.partial ? "prorated " : "") +
      "goal. Plant OEE reached <strong>" + n1(km(m, "oee")) + "%</strong> against an " + D.targets.oee +
      "% target" + (p && km(p, "oee") != null && km(m, "oee") != null
        ? " (" + (km(m, "oee") >= km(p, "oee") ? "+" : "") + n1(km(m, "oee") - km(p, "oee")) + " pp vs " + shortMonth(p.key) + ")"
        : "") + ".";

    html += " Availability held at <strong>" + n1(km(m, "availability")) + "%</strong>, performance at <strong>" +
      n1(km(m, "performance")) + "%</strong> and quality at <strong>" + n1(km(m, "quality")) + "%</strong>.";
    html += "</p>";

    var second = [];
    if (rft) {
      second.push("Right-first-time was <strong>" + n1(rft.rate) + "%</strong> across " + rft.total +
        " batches (" + rft.b2b.rate.toFixed(1) + "% bulk-to-bulk, " + rft.l2b.rate.toFixed(1) + "% lab-to-bulk)");
    }
    second.push("topping finished at <strong>" + n2(m.toppingPct) + "%</strong> of planned output and redyeing at <strong>" +
      n2(m.redyeingPct) + "%</strong> of actual production");
    html += "<p>" + second.join(", while ") + ".</p>";

    if (fin && fin.oee != null) {
      html += "<p>In finishing, machine OEE was <strong>" + n1(fin.oee) + "%</strong> on " + kg(fin.production) +
        " kg of throughput, with utilisation at " + n1(fin.utilization) + "% and efficiency at " +
        n1(fin.efficiency) + "%. Total finished-goods output for the month was <strong>" +
        kg(D.finishing.finishedByMonth[m.key] || null) + " kg</strong>.</p>";
    }
    return html;
  }

  function scoreRow(name, value, target, unit, higherBetter, digits, statusOverride) {
    var st = statusOverride || statusOf(value, target, higherBetter);
    var scaleMax = target * 1.15;
    var fill = value == null ? 0 : clamp(value / scaleMax, 0, 1) * 100;
    var marker = (1 / 1.15) * 100;
    var disp = value == null ? "—" : (higherBetter === false ? (digits === 2 ? NF2.format(value) : NF1.format(value)) : (digits === 2 ? NF2.format(value) : NF1.format(value))) + unit;
    return '<div class="score-row">' +
      '<div class="score-name">' + esc(name) + "</div>" +
      '<div class="score-track"><div class="fill ' + st + '" style="width:' + fill.toFixed(1) + '%"></div>' +
      '<div class="marker" style="left:' + marker.toFixed(1) + '%"></div></div>' +
      '<div class="score-val"><b>' + disp + "</b> / " + (target == null ? "—" : target + unit) + "</div>" +
      "</div>";
  }

  function renderScorecard(el, m, rft, fin) {
    var hit = m.partial ? m.hitRateProrated : m.hitRate;
    var html = "";
    html += scoreRow("Production goal", hit, 100, "%", true, 1, statusOf(hit, 95));
    html += scoreRow("Plant OEE", km(m, "oee"), D.targets.oee, "%", true, 1);
    html += scoreRow("Availability", km(m, "availability"), D.targets.availability, "%", true, 1);
    html += scoreRow("Performance", km(m, "performance"), D.targets.performance, "%", true, 1);
    html += scoreRow("Quality", km(m, "quality"), D.targets.quality, "%", true, 1);
    if (rft) html += scoreRow("Right first time", rft.rate, D.targets.rft, "%", true, 1);
    html += scoreRow("Topping rate", m.toppingPct, D.targets.topping_limit, "%", false, 2);
    html += scoreRow("Redyeing rate", m.redyeingPct, D.targets.redyeing_limit, "%", false, 2);
    if (fin) html += scoreRow("Finishing OEE", fin.oee, D.targets.finishing_oee, "%", true, 1);
    el.innerHTML = html;
  }

  function drawOverviewTrend() {
    var t = T();
    var keys = months.map(function (m) { return m.label; });
    var series = [
      { name: "Availability", data: months.map(function (m) { return km(m, "availability"); }), color: C.accent },
      { name: "Performance", data: months.map(function (m) { return km(m, "performance"); }), color: C.warn },
      { name: "Quality", data: months.map(function (m) { return km(m, "quality"); }), color: C.violet },
      { name: "OEE", data: months.map(function (m) { return km(m, "oee"); }), color: C.good }
    ];
    draw("ov-trend", baseOption({
      tooltip: tooltipAxis({ valueFormatter: null }),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 14, textStyle: { color: t.text2, fontSize: 10.5, rich: {} } },
      xAxis: axisX({ type: "category", data: keys, boundaryGap: false }),
      yAxis: pctAxis(60, 102),
      series: series.map(function (s) {
        return {
          name: s.name, type: "line", smooth: 0.35, data: s.data,
          symbol: "circle", symbolSize: 5,
          lineStyle: { width: 2, color: s.color },
          itemStyle: { color: s.color },
          areaStyle: s.name === "OEE" ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(52,211,153,.22)" },
              { offset: 1, color: "rgba(52,211,153,0)" }
            ])
          } : undefined,
          markLine: s.name === "OEE" ? {
            silent: true, symbol: "none",
            lineStyle: { color: t.text3, type: "dashed", width: 1 },
            label: { formatter: "target", color: t.text3, fontSize: 9, position: "insideEndTop" },
            data: [{ yAxis: D.targets.oee }]
          } : undefined
        };
      })
    }));
  }

  function drawOverviewProduction() {
    var t = T();
    draw("ov-prod", baseOption({
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 14, textStyle: { color: t.text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: months.map(function (m) { return m.label; }) }),
      yAxis: [
        axisY({ type: "value", axisLabel: { color: t.text3, fontSize: 10.2, formatter: function (v) { return compact(v); } } }),
        axisY({ type: "value", min: 0, max: 110, position: "right", axisLabel: { color: t.text3, fontSize: 10.2, formatter: "{value}%" }, splitLine: { show: false } })
      ],
      series: [
        {
          name: "Production", type: "bar", data: months.map(function (m) { return m.production; }),
          barWidth: "46%",
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#38bdf8" }, { offset: 1, color: "rgba(56,189,248,.28)" }
            ])
          },
          markLine: {
            silent: true, symbol: "none",
            lineStyle: { color: C.good, type: "dashed", width: 1.2 },
            label: { formatter: "Goal " + compact(D.targets.production_monthly_kg), color: C.good, fontSize: 9, position: "insideEndTop" },
            data: [{ yAxis: D.targets.production_monthly_kg }]
          }
        },
        {
          name: "Goal hit", type: "line", yAxisIndex: 1, smooth: 0.3,
          data: months.map(function (m) { return m.partial ? m.hitRateProrated : m.hitRate; }),
          symbol: "circle", symbolSize: 5,
          lineStyle: { width: 2, color: C.warn }, itemStyle: { color: C.warn }
        }
      ]
    }));
  }

  /* ==================================================================
     DYEING
     ================================================================== */
  function renderDyeing() {
    var m = cur(), p = prevOf(m);
    var rftMap = {}; D.dyeing.rft.monthly.forEach(function (r) { rftMap[r.month] = r; });

    renderKpis($("#dy-kpis"), [
      {
        label: "Monthly output", value: kg(m.production), unit: "kg",
        status: statusOf(m.partial ? m.hitRateProrated : m.hitRate, 95),
        badge: n1(m.partial ? m.hitRateProrated : m.hitRate) + "% of goal",
        sub: "Goal " + kg(m.partial ? m.proratedGoal : m.goal) + " kg",
        bar: (m.partial ? m.hitRateProrated : m.hitRate) / 100,
        spark: months.map(function (x) { return x.production; }), sparkColor: C.info
      },
      {
        label: "Avg daily output", value: kg(m.avgDailyOutput), unit: "kg",
        status: "neutral", badge: m.workingDays + " days",
        sub: "Across " + m.activeMachines + " dyeing machines",
        bar: null, spark: months.map(function (x) { return x.avgDailyOutput; }), sparkColor: C.accent
      },
      {
        label: "Operating hours", value: n1(m.operatingHours), unit: "h",
        status: "neutral", badge: n1(m.workingHours) + " h available",
        sub: "Machine utilisation " + n1(m.workingHours ? (m.operatingHours / m.workingHours * 100) : null) + "%",
        bar: m.workingHours ? m.operatingHours / m.workingHours : null,
        spark: months.map(function (x) { return x.operatingHours; }), sparkColor: C.violet
      },
      {
        label: "Downtime", value: n1(m.lossHours), unit: "h",
        status: m.lossHours != null && m.lossHours < 200 ? "good" : "warn",
        badge: n1(m.workingHours ? (m.lossHours / m.workingHours * 100) : null) + "% of available",
        sub: "≈ " + kg(m.avgDailyLossKg) + " kg lost per day",
        bar: m.workingHours ? m.lossHours / m.workingHours : null,
        spark: months.map(function (x) { return x.lossHours; }), sparkColor: C.bad
      }
    ]);

    metaPills("#dy-meta");

    // OEE decomposition (horizontal bars + target markers)
    var metrics = [
      { name: "Availability", v: km(m, "availability"), t: D.targets.availability },
      { name: "Performance", v: km(m, "performance"), t: D.targets.performance },
      { name: "Quality", v: km(m, "quality"), t: D.targets.quality },
      { name: "OEE", v: km(m, "oee"), t: D.targets.oee }
    ];
    draw("dy-oee-waterfall", baseOption({
      grid: { left: 6, right: 46, top: 30, bottom: 6, containLabel: true },
      tooltip: { trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder, textStyle: { color: T().text, fontSize: 11.5 } },
      legend: { show: false },
      xAxis: pctAxis(0, 105),
      yAxis: axisY({
        type: "category", data: metrics.map(function (x) { return x.name; }).reverse(),
        axisLabel: { color: T().text2, fontSize: 11, fontWeight: 600 }, splitLine: { show: false }
      }),
      series: [
        {
          type: "bar", barWidth: 20,
          data: metrics.slice().reverse().map(function (x) {
            return {
              value: x.v,
              itemStyle: {
                borderRadius: [0, 5, 5, 0],
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: bandColor(x.v, x.t) + "55" },
                  { offset: 1, color: bandColor(x.v, x.t) }
                ])
              }
            };
          }),
          label: { show: true, position: "right", color: T().text, fontSize: 11, fontWeight: 700, formatter: function (o2) { return pc(o2.value); } },
          showBackground: true,
          backgroundStyle: { color: T().grid, borderRadius: [0, 5, 5, 0] }
        },
        {
          type: "scatter", symbol: "rect", symbolSize: [3, 26],
          data: metrics.slice().reverse().map(function (x) { return [x.t, x.name]; }),
          itemStyle: { color: T().text },
          tooltip: { formatter: function (o2) { return "Target " + pc(o2.value[0]); } },
          silent: false, z: 9
        }
      ]
    }));

    // output vs capacity
    draw("dy-output", baseOption({
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 12, textStyle: { color: T().text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: months.map(function (x) { return x.label; }) }),
      yAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2, formatter: function (v) { return compact(v); } } }),
      series: [
        { name: "Loading capacity", type: "bar", data: months.map(function (x) { return x.loadingCapacity; }), barGap: "-100%", barWidth: "58%", itemStyle: { color: "rgba(120,150,190,.18)", borderRadius: [4, 4, 0, 0] }, z: 1 },
        { name: "Actual output", type: "bar", data: months.map(function (x) { return x.production; }), barWidth: "34%", itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "#38bdf8" }, { offset: 1, color: "rgba(56,189,248,.35)" }]), borderRadius: [4, 4, 0, 0] }, z: 3 }
      ]
    }));

    // hours
    draw("dy-hours", baseOption({
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 12, textStyle: { color: T().text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: months.map(function (x) { return x.label; }) }),
      yAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2, formatter: function (v) { return compact(v); } } }),
      series: [
        { name: "Operating", type: "bar", stack: "h", data: months.map(function (x) { return x.operatingHours; }), itemStyle: { color: "#34d399" }, barWidth: "52%" },
        { name: "Loss time", type: "bar", stack: "h", data: months.map(function (x) { return x.lossHours; }), itemStyle: { color: "#f87171", borderRadius: [4, 4, 0, 0] } }
      ]
    }));

    // quality
    var qSeries = [
      { name: "Quality %", data: months.map(function (x) { return km(x, "quality"); }), color: C.violet },
      { name: "RFT %", data: months.map(function (x) { return rftMap[x.key] ? rftMap[x.key].rate : null; }), color: C.pink }
    ];
    draw("dy-quality", baseOption({
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 12, textStyle: { color: T().text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: months.map(function (x) { return x.label; }) }),
      yAxis: [
        pctAxis(80, 101),
        axisY({ type: "value", min: 0, max: 8, position: "right", axisLabel: { color: T().text3, fontSize: 10.2, formatter: "{value}%" }, splitLine: { show: false } })
      ],
      series: qSeries.map(function (s) {
        return {
          name: s.name, type: "line", smooth: 0.3, data: s.data, symbol: "circle", symbolSize: 5,
          lineStyle: { width: 2, color: s.color }, itemStyle: { color: s.color },
          markLine: s.name === "Quality %" ? { silent: true, symbol: "none", lineStyle: { color: C.violet, type: "dashed", opacity: .5 }, data: [{ yAxis: D.targets.quality }] } : undefined
        };
      })
    }));

    // daily output
    var days = D.dyeing.daily.filter(function (d) { return d.month === m.key; });
    var labels = days.map(function (d) { return d.date.slice(8); });
    var vals = days.map(function (d) { return d.production; });
    var roll = vals.map(function (_, i) {
      var a = Math.max(0, i - 6);
      var s = vals.slice(a, i + 1).filter(function (v) { return v != null; });
      return s.length ? sum(s) / s.length : null;
    });
    $("#dy-daily-pill").textContent = days.length + " days · avg " + kg(days.length ? sum(vals) / days.length : null) + " kg";
    draw("dy-daily", baseOption({
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 12, textStyle: { color: T().text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: labels, boundaryGap: false }),
      yAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2, formatter: function (v) { return compact(v); } } }),
      series: [
        {
          name: "Daily output", type: "line", data: vals, smooth: 0.25, symbol: "none",
          lineStyle: { width: 1.6, color: "#38bdf8" },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(56,189,248,.28)" }, { offset: 1, color: "rgba(56,189,248,0)" }]) }
        },
        {
          name: "7-day average", type: "line", data: roll, smooth: 0.3, symbol: "none",
          lineStyle: { width: 2.2, color: C.good }
        }
      ]
    }));

    // shift
    var sh = D.dyeing.shifts[m.key] || {};
    var shiftKeys = Object.keys(sh);
    var shiftCats = ["Availability", "Performance", "Quality", "OEE"];
    draw("dy-shift", baseOption({
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 12, textStyle: { color: T().text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: shiftCats }),
      yAxis: pctAxis(60, 102),
      series: shiftKeys.map(function (k) {
        var c = k === "A" ? "#38bdf8" : "#a78bfa";
        return {
          name: "Shift " + k, type: "bar", barWidth: "30%",
          data: shiftCats.map(function (cat) { return sh[k][cat.toLowerCase()]; }),
          itemStyle: { color: c, borderRadius: [5, 5, 0, 0] },
          label: { show: true, position: "top", color: T().text3, fontSize: 9.5, formatter: function (o2) { return n1(o2.value); } }
        };
      })
    }));

    // RFT
    draw("dy-rft", baseOption({
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 12, textStyle: { color: T().text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: months.map(function (x) { return x.label; }) }),
      yAxis: pctAxis(75, 101),
      series: [
        { name: "Overall RFT", type: "line", smooth: .3, data: months.map(function (x) { return rftMap[x.key] ? rftMap[x.key].rate : null; }), symbol: "circle", symbolSize: 5, lineStyle: { width: 2.6, color: C.good }, itemStyle: { color: C.good },
          markLine: { silent: true, symbol: "none", lineStyle: { color: C.good, type: "dashed", opacity: .55 }, label: { formatter: "target", color: T().text3, fontSize: 9 }, data: [{ yAxis: D.targets.rft }] } },
        { name: "Bulk to bulk", type: "line", smooth: .3, data: months.map(function (x) { return rftMap[x.key] ? rftMap[x.key].b2b.rate : null; }), symbol: "none", lineStyle: { width: 1.7, color: "#38bdf8" } },
        { name: "Lab to bulk", type: "line", smooth: .3, data: months.map(function (x) { return rftMap[x.key] ? rftMap[x.key].l2b.rate : null; }), symbol: "none", lineStyle: { width: 1.7, color: C.warn } }
      ]
    }));

    // rework
    draw("dy-rework", baseOption({
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 12, textStyle: { color: T().text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: months.map(function (x) { return x.label; }) }),
      yAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2, formatter: "{value}%" } }),
      series: [
        { name: "Topping %", type: "bar", data: months.map(function (x) { return x.toppingPct; }), barWidth: "38%", itemStyle: { color: C.orange, borderRadius: [4, 4, 0, 0] },
          markLine: { silent: true, symbol: "none", lineStyle: { color: C.orange, type: "dashed", opacity: .7 }, label: { formatter: "ceiling " + D.targets.topping_limit + "%", color: T().text3, fontSize: 9 }, data: [{ yAxis: D.targets.topping_limit }] } },
        { name: "Redyeing %", type: "bar", data: months.map(function (x) { return x.redyeingPct; }), barWidth: "38%", itemStyle: { color: "#f87171", borderRadius: [4, 4, 0, 0] },
          markLine: { silent: true, symbol: "none", lineStyle: { color: "#f87171", type: "dashed", opacity: .7 }, label: { formatter: "limit " + D.targets.redyeing_limit + "%", color: T().text3, fontSize: 9 }, data: [{ yAxis: D.targets.redyeing_limit }] } }
      ]
    }));

    // monthly table
    dataTable($("#dy-table"), {
      columns: [
        { key: "label", label: "Month" },
        { key: "production", label: "Output (kg)", format: function (v) { return kg(v); } },
        { key: "plannedOutput", label: "Planned (kg)", format: function (v) { return kg(v); } },
        { key: "loadingCapacity", label: "Capacity (kg)", format: function (v) { return kg(v); } },
        { key: "hitRate", label: "Goal hit", value: function (r) { return r.partial ? r.hitRateProrated : r.hitRate; }, format: function (v) { return pc(v); } },
        { key: "availability", label: "Availability", value: function (r) { return km(r, "availability"); }, format: function (v) { return pc(v); } },
        { key: "performance", label: "Performance", value: function (r) { return km(r, "performance"); }, format: function (v) { return pc(v); } },
        { key: "quality", label: "Quality", value: function (r) { return km(r, "quality"); }, format: function (v) { return pc(v); } },
        { key: "oee", label: "OEE", value: function (r) { return km(r, "oee"); }, format: function (v) { return '<span class="tag ' + statusOf(v, D.targets.oee) + '">' + pc(v) + "</span>"; } },
        { key: "workingHours", label: "Avail. hrs", format: function (v) { return n1(v); } },
        { key: "lossHours", label: "Loss hrs", format: function (v) { return n1(v); } },
        { key: "toppingPct", label: "Topping", format: function (v) { return pc(v, 2); } },
        { key: "redyeingPct", label: "Redyeing", format: function (v) { return pc(v, 2); } },
        { key: "workingDays", label: "Days" }
      ],
      rows: months.slice()
    });
  }

  /* ==================================================================
     MACHINES
     ================================================================== */
  function machineMonth(name, mk) {
    var arr = D.dyeing.machineMonthly[name] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].month === mk) return arr[i];
    return null;
  }

  function renderMachines() {
    var m = cur();
    var bulk = D.dyeing.machines.filter(function (x) { return !x.isSample; });
    var rows = bulk.map(function (mc) {
      var mm = machineMonth(mc.machine, m.key);
      return mm ? merge(merge({}, mc), mm) : null;
    }).filter(Boolean);
    rows.sort(function (a, b) { return (b.oee || 0) - (a.oee || 0); });

    var best = rows[0], worst = rows[rows.length - 1];
    var avg = rows.length ? sum(rows, function (r) { return r.oee || 0; }) / rows.length : null;
    var above = rows.filter(function (r) { return r.oee != null && r.oee >= D.targets.oee; }).length;
    var low = rows.filter(function (r) { return r.oee != null && r.oee < 70; }).length;

    renderKpis($("#mc-kpis"), [
      { label: "Best performer", value: best ? best.machine : "—", unit: "", status: "good", badge: best ? n1(best.oee) + "% OEE" : "", sub: best ? kg(best.production) + " kg produced" : "", bar: best ? best.oee / 100 : null, spark: null },
      { label: "Average machine OEE", value: n1(avg), unit: "%", status: statusOf(avg, D.targets.oee), badge: above + " of " + rows.length + " above target", sub: "Simple average across " + rows.length + " machines", bar: avg ? avg / 100 : null, spark: null },
      { label: "Machines at risk", value: String(low), unit: "", status: low === 0 ? "good" : (low <= 2 ? "warn" : "bad"), badge: "below 70% OEE", sub: low ? "Requires focused improvement" : "No machine below 70%", bar: rows.length ? low / rows.length : null, spark: null },
      { label: "Lowest performer", value: worst ? worst.machine : "—", unit: "", status: "bad", badge: worst ? n1(worst.oee) + "% OEE" : "", sub: worst ? kg(worst.lossHours) + " h lost" : "", bar: worst && worst.oee ? worst.oee / 100 : null, spark: null }
    ]);
    metaPills("#mc-meta", '<span class="pill">' + rows.length + " bulk machines ranked</span>");

    // ranking
    var sorted = rows.slice().sort(function (a, b) { return (a.oee || 0) - (b.oee || 0); });
    draw("mc-rank", baseOption({
      grid: { left: 6, right: 60, top: 10, bottom: 6, containLabel: true },
      tooltip: {
        trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder,
        textStyle: { color: T().text, fontSize: 11.5 },
        formatter: function (o) {
          var r = sorted[o.dataIndex];
          return "<b>" + esc(r.machine) + "</b><br/>OEE " + pc(r.oee) +
            "<br/>A " + pc(r.availability) + " · P " + pc(r.performance) + " · Q " + pc(r.quality) +
            "<br/>Output " + kg(r.production) + " kg";
        }
      },
      legend: { show: false },
      xAxis: pctAxis(0, 105),
      yAxis: axisY({ type: "category", data: sorted.map(function (r) { return r.machine; }), axisLabel: { color: T().text2, fontSize: 10.5, fontWeight: 600 }, splitLine: { show: false } }),
      series: [
        {
          type: "bar", barWidth: 15,
          data: sorted.map(function (r) {
            return {
              value: r.oee,
              itemStyle: {
                borderRadius: [0, 5, 5, 0],
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: bandColor(r.oee, D.targets.oee) + "44" },
                  { offset: 1, color: bandColor(r.oee, D.targets.oee) }
                ])
              }
            };
          }),
          label: { show: true, position: "right", color: T().text, fontSize: 10, fontWeight: 700, formatter: function (o) { return n1(o.value); } },
          markLine: { silent: true, symbol: "none", lineStyle: { color: T().text, type: "dashed", width: 1, opacity: .5 }, data: [{ xAxis: D.targets.oee }] }
        }
      ]
    }));

    // scatter
    var sc = rows.filter(function (r) { return r.availability != null && r.performance != null && r.oee != null; });
    var maxProd = Math.max.apply(null, sc.map(function (r) { return r.production || 1; }));
    draw("mc-scatter", baseOption({
      grid: { left: 6, right: 20, top: 30, bottom: 6, containLabel: true },
      tooltip: {
        trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder,
        textStyle: { color: T().text, fontSize: 11.5 },
        formatter: function (o) {
          var r = o.data[3];
          return "<b>" + esc(r) + "</b><br/>Availability " + pc(o.data[0]) + "<br/>Performance " + pc(o.data[1]) +
            "<br/>OEE " + pc(o.data[2]) + "<br/>Output " + kg(o.data[4]) + " kg";
        }
      },
      legend: { show: false },
      xAxis: axisX({ type: "value", min: 90, max: 101, name: "Availability %", nameLocation: "middle", nameGap: 24, nameTextStyle: { color: T().text3, fontSize: 10 }, axisLabel: { color: T().text3, fontSize: 10.2, formatter: "{value}%" } }),
      yAxis: axisY({ type: "value", min: 55, max: 105, name: "Performance %", nameLocation: "middle", nameGap: 34, nameTextStyle: { color: T().text3, fontSize: 10 }, axisLabel: { color: T().text3, fontSize: 10.2, formatter: "{value}%" } }),
      series: [{
        type: "scatter",
        data: sc.map(function (r) {
          return [r.availability, r.performance, r.oee, r.machine, r.production || 0];
        }),
        symbolSize: function (d) { return 12 + Math.sqrt((d[4] || 0) / maxProd) * 26; },
        itemStyle: {
          color: function (p) { return bandColor(p.data[2], D.targets.oee); },
          opacity: .78, borderColor: "rgba(255,255,255,.35)", borderWidth: 1
        },
        label: { show: true, formatter: function (p) { return p.data[3]; }, position: "top", color: T().text3, fontSize: 9.5 },
        emphasis: { scale: 1.35 }
      }]
    }));

    // table
    dataTable($("#mc-table"), {
      columns: [
        { key: "machine", label: "Machine" },
        { key: "production", label: "Output (kg)", format: function (v) { return kg(v); } },
        { key: "loadingCapacity", label: "Capacity (kg)", format: function (v) { return kg(v); } },
        { key: "availability", label: "Availability", format: function (v) { return pc(v); } },
        { key: "performance", label: "Performance", format: function (v) { return pc(v); } },
        { key: "quality", label: "Quality", format: function (v) { return pc(v); } },
        { key: "oee", label: "OEE", format: function (v) { return '<span class="tag ' + statusOf(v, D.targets.oee) + '">' + pc(v) + "</span>"; } },
        { key: "hitRate", label: "Target hit", format: function (v) { return pc(v); } },
        { key: "lossHours", label: "Loss hrs", format: function (v) { return n1(v); } },
        { key: "operatingHours", label: "Oper. hrs", format: function (v) { return n1(v); } },
        { key: "days", label: "Days", format: function (v) { return v == null ? "—" : v; } },
        { key: "avgDailyOutput", label: "Avg / day", format: function (v) { return v == null ? "—" : kg(v); } }
      ],
      rows: rows
    });

    // heatmap
    var hm = D.dyeing.heatmap[m.key];
    if (hm && hm.machines.length) {
      var idxs = hm.machines.map(function (n, i) { return { n: n, i: i }; })
        .filter(function (x) { return bulk.some(function (b) { return b.machine === x.n; }); });
      var names = idxs.map(function (x) { return x.n; });
      var heatData = [];
      idxs.forEach(function (x, yi) {
        hm.dates.forEach(function (d, xi) {
          var v = hm.oee[x.i][xi];
          heatData.push([xi, yi, v]);
        });
      });
      var t = T();
      draw("mc-heatmap", {
        backgroundColor: "transparent",
        animation: false,
        tooltip: {
          position: "top", backgroundColor: t.tipBg, borderColor: t.tipBorder,
          textStyle: { color: t.text, fontSize: 11.5 },
          formatter: function (p) {
            return "<b>" + esc(names[p.data[1]]) + "</b><br/>" + hm.dates[p.data[0]] +
              "<br/>OEE " + (p.data[2] == null ? "no data" : pc(p.data[2]));
          }
        },
        grid: { left: 6, right: 12, top: 8, bottom: 60, containLabel: true },
        xAxis: {
          type: "category", data: hm.dates.map(function (d) { return d.slice(8); }),
          splitArea: { show: false }, axisLine: { lineStyle: { color: t.axis } },
          axisTick: { show: false }, axisLabel: { color: t.text3, fontSize: 9, interval: 0, rotate: 0 }
        },
        yAxis: {
          type: "category", data: names,
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: t.text2, fontSize: 9.5 }
        },
        visualMap: {
          min: 50, max: 100, calculable: false, orient: "horizontal",
          left: "center", bottom: 4, itemWidth: 10, itemHeight: 90,
          textStyle: { color: t.text3, fontSize: 9.5 },
          inRange: { color: ["#b91c1c", "#ef4444", "#f59e0b", "#84cc16", "#10b981"] }
        },
        series: [{
          type: "heatmap", data: heatData,
          itemStyle: { borderColor: t.panel, borderWidth: 1 },
          label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,.4)" } }
        }]
      });
    } else {
      var el = document.getElementById("mc-heatmap");
      if (el) el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3);font-size:12px">No data for this month</div>';
    }
  }

  /* ==================================================================
     DOWNTIME
     ================================================================== */
  function renderDowntime() {
    var m = cur();
    var lm = (D.dyeing.loss.monthly || {})[m.key] || { totalHours: 0, categories: [], topReasons: [] };
    var cats = lm.categories || [];
    var top = cats[0];

    renderKpis($("#dt-kpis"), [
      { label: "Total loss time", value: n1(lm.totalHours), unit: "h", status: "neutral", badge: n1(m.workingHours ? lm.totalHours / m.workingHours * 100 : null) + "% of available", sub: "Across " + m.activeMachines + " machines", bar: m.workingHours ? lm.totalHours / m.workingHours : null, spark: months.map(function (x) { return (D.dyeing.loss.monthly[x.key] || {}).totalHours; }), sparkColor: C.bad },
      { label: "Largest driver", value: top ? String(top.share.toFixed(1)) : "—", unit: top ? "%" : "", status: "warn", badge: top ? top.category : "", sub: top ? n1(top.hours) + " hours lost" : "No loss recorded", bar: null, spark: null },
      { label: "Loss production", value: kg(m.lossKg), unit: "kg", status: "neutral", badge: n1(m.avgDailyLossKg) + " kg/day", sub: "Estimated output lost to downtime", bar: null, spark: months.map(function (x) { return x.lossKg; }), sparkColor: C.orange },
      { label: "Categories tracked", value: String(cats.length), unit: "", status: "neutral", badge: (lm.topReasons || []).length + " raw entries", sub: "Classified from free-text remarks", bar: null, spark: null }
    ]);
    metaPills("#dt-meta");

    // pareto
    var total = sum(cats, function (c) { return c.hours; }) || 1;
    var cum = 0;
    var cumData = cats.map(function (c) { cum += c.hours; return +(cum / total * 100).toFixed(1); });
    draw("dt-pareto", baseOption({
      grid: { left: 6, right: 50, top: 34, bottom: 40, containLabel: true },
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 12, textStyle: { color: T().text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: cats.map(function (c) { return c.category; }), axisLabel: { color: T().text3, fontSize: 9.5, interval: 0, rotate: 22, width: 110, overflow: "truncate" } }),
      yAxis: [axisY({ type: "value", name: "hours", nameTextStyle: { color: T().text3, fontSize: 9.5 }, axisLabel: { color: T().text3, fontSize: 10.2 } }),
        axisY({ type: "value", min: 0, max: 100, position: "right", axisLabel: { color: T().text3, fontSize: 10.2, formatter: "{value}%" }, splitLine: { show: false } })],
      series: [
        { name: "Loss hours", type: "bar", data: cats.map(function (c) { return c.hours; }), barWidth: "52%",
          itemStyle: { borderRadius: [5, 5, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "#f87171" }, { offset: 1, color: "rgba(248,113,113,.3)" }]) },
          label: { show: true, position: "top", color: T().text3, fontSize: 9.5, formatter: function (o) { return n1(o.value); } } },
        { name: "Cumulative %", type: "line", yAxisIndex: 1, data: cumData, smooth: .2, symbol: "circle", symbolSize: 5, lineStyle: { color: C.warn, width: 2 }, itemStyle: { color: C.warn },
          markLine: { silent: true, symbol: "none", lineStyle: { color: C.warn, type: "dashed", opacity: .5 }, data: [{ yAxis: 80 }] } }
      ]
    }));

    // donut
    draw("dt-donut", baseOption({
      tooltip: { trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder, textStyle: { color: T().text, fontSize: 11.5 }, formatter: function (p) { return "<b>" + esc(p.name) + "</b><br/>" + n1(p.value) + " h · " + n1(p.percent) + "%"; } },
      legend: { show: false },
      series: [{
        type: "pie", radius: ["46%", "72%"], center: ["50%", "52%"], avoidLabelOverlap: true,
        itemStyle: { borderColor: T().panel, borderWidth: 2, borderRadius: 4 },
        label: { color: T().text2, fontSize: 10, formatter: function (p) { return p.name.length > 22 ? p.name.slice(0, 21) + "…" : p.name; } },
        labelLine: { length: 8, length2: 8, lineStyle: { color: T().axis } },
        data: cats.map(function (c) { return { name: c.category, value: c.hours }; })
      }]
    }));

    // by machine
    var byM = D.dyeing.loss.byMachine || [];
    draw("dt-machine", baseOption({
      grid: { left: 6, right: 30, top: 10, bottom: 6, containLabel: true },
      tooltip: { trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder, textStyle: { color: T().text, fontSize: 11.5 } },
      legend: { show: false },
      xAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2 } }),
      yAxis: axisY({ type: "category", data: byM.map(function (x) { return x.machine; }).reverse(), axisLabel: { color: T().text2, fontSize: 10 }, splitLine: { show: false } }),
      series: [{
        type: "bar", data: byM.map(function (x) { return x.lossHours; }).reverse(), barWidth: 12,
        itemStyle: { color: "#f87171", borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", color: T().text3, fontSize: 9.5, formatter: function (o) { return n1(o.value) + "h"; } }
      }]
    }));

    // monthly stacked by category
    var allCats = {};
    months.forEach(function (x) {
      var l = (D.dyeing.loss.monthly[x.key] || {}).categories || [];
      l.forEach(function (c) { allCats[c.category] = 1; });
    });
    var catNames = Object.keys(allCats);
    draw("dt-trend", baseOption({
      grid: { left: 6, right: 10, top: 34, bottom: 6, containLabel: true },
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 10, textStyle: { color: T().text2, fontSize: 9.5 } },
      xAxis: axisX({ type: "category", data: months.map(function (x) { return x.label; }) }),
      yAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2 } }),
      series: catNames.map(function (c, i) {
        return {
          name: c, type: "bar", stack: "loss", barWidth: "48%",
          data: months.map(function (x) {
            var l = (D.dyeing.loss.monthly[x.key] || {}).categories || [];
            var f = l.filter(function (y) { return y.category === c; })[0];
            return f ? f.hours : 0;
          }),
          itemStyle: { color: palette()[i % palette().length] }
        };
      })
    }));

    // reasons table
    dataTable($("#dt-reasons"), {
      columns: [
        { key: "reason", label: "Recorded reason", format: function (v) { return esc(v); } },
        { key: "category", label: "Category", format: function (v) { return '<span class="tag neutral">' + esc(v) + "</span>"; } },
        { key: "hours", label: "Loss hours", format: function (v) { return n2(v); } },
        { key: "share", label: "% of total", value: function (r) { return lm.totalHours ? r.hours / lm.totalHours * 100 : 0; }, format: function (v) { return n1(v) + "%"; } },
        { key: "count", label: "Occurrences" }
      ],
      rows: lm.topReasons || [],
      sort: "hours",
      sortDir: -1
    });
  }

  /* ==================================================================
     FINISHING
     ================================================================== */
  function renderFinishing() {
    var m = cur();
    var fmap = {}; D.finishing.months.forEach(function (x) { fmap[x.key] = x; });
    var f = fmap[m.key] || {};

    var finish = D.finishing.finishedByMonth[m.key];
    renderKpis($("#fn-kpis"), [
      { label: "Finished goods output", value: kg(finish), unit: "kg", status: "neutral", badge: "net finished", sub: "From the daily finishing summary", bar: null, spark: months.map(function (x) { return D.finishing.finishedByMonth[x.key]; }), sparkColor: C.info },
      { label: "Machine throughput", value: compact(f.production), unit: "kg", status: "neutral", badge: "all process passes", sub: "Sum of actual production across machines", bar: null, spark: D.finishing.months.map(function (x) { return x.production; }), sparkColor: C.violet },
      { label: "Utilisation", value: n1(f.utilization), unit: "%", status: statusOf(f.utilization, D.targets.finishing_utilization), badge: n1(f.runningTime) + " h running", sub: "Target " + D.targets.finishing_utilization + "%", bar: f.utilization ? f.utilization / D.targets.finishing_utilization : null, spark: D.finishing.months.map(function (x) { return x.utilization; }), sparkColor: C.accent },
      { label: "Efficiency", value: n1(f.efficiency), unit: "%", status: statusOf(f.efficiency, D.targets.finishing_efficiency), badge: n1(f.capacity ? f.production / f.capacity * 100 : null) + "% of capacity", sub: "Target " + D.targets.finishing_efficiency + "%", bar: f.efficiency ? f.efficiency / D.targets.finishing_efficiency : null, spark: D.finishing.months.map(function (x) { return x.efficiency; }), sparkColor: C.warn },
      { label: "Quality", value: D.finishing.reworkTracked ? n1(f.quality) : "—", unit: D.finishing.reworkTracked ? "%" : "", status: D.finishing.reworkTracked ? statusOf(f.quality, D.targets.finishing_quality) : "neutral", badge: D.finishing.reworkTracked ? "" : "not tracked", sub: D.finishing.reworkTracked ? "Target " + D.targets.finishing_quality + "%" : "Rework not recorded in source", bar: D.finishing.reworkTracked && f.quality ? f.quality / 100 : null, spark: D.finishing.reworkTracked ? D.finishing.months.map(function (x) { return x.quality; }) : null, sparkColor: C.pink },
      { label: "Finishing OEE", value: n1(f.oee), unit: "%", status: statusOf(f.oee, D.targets.finishing_oee), badge: STATUS_LABEL[statusOf(f.oee, D.targets.finishing_oee)], sub: "Target " + D.targets.finishing_oee + "%", bar: f.oee ? f.oee / D.targets.finishing_oee : null, spark: D.finishing.months.map(function (x) { return x.oee; }), sparkColor: C.good }
    ]);
    metaPills("#fn-meta", D.finishing.reworkTracked ? "" : '<span class="pill warn">Rework not tracked</span>',
      { days: f.workingDays, records: f.records, machines: f.machines, partial: false, hideMethod: true });

    // machine ranking
    var machines = D.finishing.machines.map(function (mc) {
      var mm = (D.finishing.machineMonthly[mc.machine] || {})[m.key];
      return mm ? merge(merge({}, mc), mm) : null;
    }).filter(Boolean).filter(function (x) { return x.oee != null || (x.production || 0) > 0; });
    machines.sort(function (a, b) { return (a.oee || -1) - (b.oee || -1); });

    draw("fn-rank", baseOption({
      grid: { left: 6, right: 55, top: 10, bottom: 6, containLabel: true },
      tooltip: {
        trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder,
        textStyle: { color: T().text, fontSize: 11.5 },
        formatter: function (o) {
          var r = machines[o.dataIndex];
          return "<b>" + esc(r.machine) + "</b><br/>OEE " + pc(r.oee) +
            "<br/>Utilisation " + pc(r.utilization) + "<br/>Efficiency " + pc(r.efficiency) +
            "<br/>Output " + kg(r.production) + " kg";
        }
      },
      legend: { show: false },
      xAxis: pctAxis(0, 105),
      yAxis: axisY({ type: "category", data: machines.map(function (r) { return r.machine; }), axisLabel: { color: T().text2, fontSize: 10, width: 150, overflow: "truncate" }, splitLine: { show: false } }),
      series: [{
        type: "bar", barWidth: 14,
        data: machines.map(function (r) {
          var c = r.oee == null ? C.info : bandColor(r.oee, D.targets.finishing_oee);
          return { value: r.oee, itemStyle: { borderRadius: [0, 5, 5, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: c + "44" }, { offset: 1, color: c }]) } };
        }),
        label: { show: true, position: "right", color: T().text, fontSize: 9.5, fontWeight: 700, formatter: function (o) { return o.value == null ? "n/a" : n1(o.value); } },
        markLine: { silent: true, symbol: "none", lineStyle: { color: T().text, type: "dashed", width: 1, opacity: .5 }, data: [{ xAxis: D.targets.finishing_oee }] }
      }]
    }));

    // fabric split
    var fab = (D.finishing.fabric[m.key]) || {};
    var fabData = Object.keys(fab).map(function (k) { return { name: k, value: fab[k].production, item: fab[k] }; });
    draw("fn-fabric", baseOption({
      tooltip: {
        trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder,
        textStyle: { color: T().text, fontSize: 11.5 },
        formatter: function (p) {
          var it = p.data.item || {};
          return "<b>" + esc(p.name) + "</b><br/>Throughput " + kg(p.value) + " kg<br/>OEE " +
            (it.oee == null ? "—" : pc(it.oee)) + "<br/>Utilisation " + pc(it.utilization);
        }
      },
      legend: { show: false },
      series: [{
        type: "pie", radius: ["48%", "74%"], center: ["50%", "52%"],
        itemStyle: { borderColor: T().panel, borderWidth: 2, borderRadius: 5 },
        label: { color: T().text2, fontSize: 11, formatter: function (p) { return p.name + "\n" + kg(p.value) + " kg"; }, lineHeight: 16 },
        labelLine: { length: 10, length2: 12, lineStyle: { color: T().axis } },
        data: fabData
      }]
    }));

    // daily finished
    var sd = D.finishing.summaryDaily.filter(function (x) { return x.month === m.key; });
    var fd = D.finishing.daily.filter(function (x) { return x.month === m.key; });
    var labels = sd.map(function (x) { return x.date.slice(8); });
    draw("fn-daily", baseOption({
      tooltip: tooltipAxis(),
      legend: { top: 0, right: 6, icon: "roundRect", itemWidth: 9, itemHeight: 9, itemGap: 12, textStyle: { color: T().text2, fontSize: 10.5 } },
      xAxis: axisX({ type: "category", data: labels, boundaryGap: false }),
      yAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2, formatter: function (v) { return compact(v); } } }),
      series: [
        { name: "Finished goods", type: "line", data: sd.map(function (x) { return x.finished; }), smooth: .25, symbol: "none", lineStyle: { width: 2.2, color: "#38bdf8" },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(56,189,248,.28)" }, { offset: 1, color: "rgba(56,189,248,0)" }]) } },
        { name: "Dyeing unload", type: "line", data: sd.map(function (x) { return x.dyeingUnload || null; }), smooth: .25, symbol: "none", lineStyle: { width: 1.6, color: C.violet, type: "dashed" } }
      ]
    }));

    // downtime by machine
    var dtm = (D.finishing.downtimeByMachine[m.key] || []).slice().sort(function (a, b) { return a.downtime - b.downtime; });
    draw("fn-downtime", baseOption({
      grid: { left: 6, right: 40, top: 10, bottom: 6, containLabel: true },
      tooltip: { trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder, textStyle: { color: T().text, fontSize: 11.5 } },
      legend: { show: false },
      xAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2 } }),
      yAxis: axisY({ type: "category", data: dtm.map(function (x) { return x.machine; }), axisLabel: { color: T().text2, fontSize: 9.5, width: 130, overflow: "truncate" }, splitLine: { show: false } }),
      series: [{
        type: "bar", data: dtm.map(function (x) { return x.downtime; }), barWidth: 11,
        itemStyle: { color: "#fb923c", borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", color: T().text3, fontSize: 9, formatter: function (o) { return n1(o.value) + "h"; } }
      }]
    }));

    // table
    dataTable($("#fn-table"), {
      columns: [
        { key: "machine", label: "Machine" },
        { key: "production", label: "Throughput (kg)", format: function (v) { return kg(v); } },
        { key: "capacity", label: "Capacity (kg)", format: function (v) { return kg(v); } },
        { key: "utilization", label: "Utilisation", format: function (v) { return pc(v); } },
        { key: "efficiency", label: "Efficiency", format: function (v) { return pc(v); } },
        { key: "quality", label: "Quality", format: function (v) { return D.finishing.reworkTracked ? pc(v) : "—"; } },
        { key: "oee", label: "OEE", format: function (v) { return v == null ? "—" : '<span class="tag ' + statusOf(v, D.targets.finishing_oee) + '">' + pc(v) + "</span>"; } },
        { key: "downtime", label: "Downtime (h)", format: function (v) { return n1(v); } },
        { key: "runningTime", label: "Running (h)", format: function (v) { return n1(v); } },
        { key: "daysActive", label: "Days" }
      ],
      rows: machines.slice().reverse()
    });
  }

  /* ==================================================================
     MIX
     ================================================================== */
  function renderMix() {
    var m = cur();
    var mix = D.dyeing.mix[m.key] || {};
    var buyer = (mix.buyer || { items: [] });
    var fabric = (mix.fabric || { items: [] });
    var color = (mix.color || { items: [] });
    var gsm = (mix.gsm || { items: [] });
    var dia = (mix.dia || { items: [] });

    metaPills("#mx-meta", '<span class="pill">' + kg(buyer.total) + " kg classified</span>");

    // buyers
    var bItems = buyer.items.slice(0, 16);
    draw("mx-buyer", baseOption({
      grid: { left: 6, right: 55, top: 8, bottom: 6, containLabel: true },
      tooltip: {
        trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder,
        textStyle: { color: T().text, fontSize: 11.5 },
        formatter: function (p) { return "<b>" + esc(p.name) + "</b><br/>" + kg(p.value) + " kg · " + n1(p.value / buyer.total * 100) + "%"; }
      },
      legend: { show: false },
      xAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2, formatter: function (v) { return compact(v); } } }),
      yAxis: axisY({ type: "category", data: bItems.map(function (x) { return x[0]; }).reverse(), axisLabel: { color: T().text2, fontSize: 9.5, width: 130, overflow: "truncate" }, splitLine: { show: false } }),
      series: [{
        type: "bar", data: bItems.map(function (x) { return x[1]; }).reverse(), barWidth: 11,
        itemStyle: { borderRadius: [0, 4, 4, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: "rgba(56,189,248,.35)" }, { offset: 1, color: "#38bdf8" }]) },
        label: { show: true, position: "right", color: T().text3, fontSize: 9, formatter: function (o) { return compact(o.value); } }
      }]
    }));

    // fabric donut
    draw("mx-fabric", baseOption({
      tooltip: { trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder, textStyle: { color: T().text, fontSize: 11.5 }, formatter: function (p) { return "<b>" + esc(p.name) + "</b><br/>" + kg(p.value) + " kg · " + n1(p.percent) + "%"; } },
      legend: { type: "scroll", orient: "vertical", right: 6, top: "middle", itemWidth: 9, itemHeight: 9, textStyle: { color: T().text2, fontSize: 9.5 }, formatter: function (n) { return n.length > 14 ? n.slice(0, 13) + "…" : n; } },
      series: [{
        type: "pie", radius: ["42%", "68%"], center: ["38%", "50%"],
        itemStyle: { borderColor: T().panel, borderWidth: 2, borderRadius: 4 },
        label: { show: false }, labelLine: { show: false },
        data: fabric.items.slice(0, 10).map(function (x) { return { name: x[0], value: x[1] }; })
      }]
    }));

    // colour
    draw("mx-color", baseOption({
      tooltip: { trigger: "item", backgroundColor: T().tipBg, borderColor: T().tipBorder, textStyle: { color: T().text, fontSize: 11.5 }, formatter: function (p) { return "<b>" + esc(p.name) + "</b><br/>" + kg(p.value) + " kg · " + n1(p.percent) + "%"; } },
      legend: { show: false },
      series: [{
        type: "pie", roseType: "radius", radius: ["28%", "72%"], center: ["50%", "52%"],
        itemStyle: { borderColor: T().panel, borderWidth: 2, borderRadius: 4 },
        label: { color: T().text2, fontSize: 9.5, formatter: function (p) { return p.name + "\n" + n1(p.percent) + "%"; }, lineHeight: 13 },
        labelLine: { length: 6, length2: 8, lineStyle: { color: T().axis } },
        data: color.items.map(function (x) { return { name: x[0], value: x[1] }; })
      }]
    }));

    // gsm + dia
    var gHigh = (gsm.items.filter(function (x) { return /high/i.test(x[0]); })[0] || [0, 0])[1];
    var gLow = (gsm.items.filter(function (x) { return /low/i.test(x[0]); })[0] || [0, 0])[1];
    var dOpen = (dia.items.filter(function (x) { return /open/i.test(x[0]); })[0] || [0, 0])[1];
    var dDia = (dia.items.filter(function (x) { return /dia/i.test(x[0]); })[0] || [0, 0])[1];
    draw("mx-gsm", baseOption({
      grid: { left: 6, right: 10, top: 34, bottom: 6, containLabel: true },
      tooltip: tooltipAxis(),
      legend: { show: false },
      xAxis: axisX({ type: "category", data: ["GSM ≥ 175", "GSM < 175", "Open width", "Tubular"] }),
      yAxis: axisY({ type: "value", axisLabel: { color: T().text3, fontSize: 10.2, formatter: function (v) { return compact(v); } } }),
      series: [{
        type: "bar", barWidth: "44%",
        data: [gHigh, gLow, dOpen, dDia],
        itemStyle: {
          borderRadius: [5, 5, 0, 0],
          color: function (p) {
            return [C.violet, C.info, C.good, C.warn][p.dataIndex];
          }
        },
        label: { show: true, position: "top", color: T().text3, fontSize: 10, formatter: function (o) { return compact(o.value) + " kg"; } }
      }]
    }));

    // table
    var total = buyer.total || 1;
    dataTable($("#mx-table"), {
      columns: [
        { key: "buyer", label: "Buyer" },
        { key: "kg", label: "Volume (kg)", format: function (v) { return kg(v); } },
        { key: "share", label: "Share", format: function (v) { return n1(v) + "%"; } }
      ],
      rows: buyer.items.map(function (x) {
        return { buyer: x[0], kg: x[1], share: x[1] / total * 100 };
      }),
      sort: "kg", sortDir: -1
    });
  }

  /* ==================================================================
     DATA & METHOD
     ================================================================== */
  function renderData() {
    var q = D.dataQuality;
    renderKpis($("#dq-kpis"), [
      { label: "Dyeing records", value: NF0.format(q.dyeingRecords), unit: "", status: "neutral", badge: q.dyeingDays + " days", sub: q.dateMin + " → " + q.dateMax, bar: null, spark: null },
      { label: "Dyeing machines", value: String(q.dyeingMachines), unit: "", status: "neutral", badge: q.sampleMachines + " sample", sub: "Bulk machines included in KPI", bar: null, spark: null },
      { label: "Finishing records", value: NF0.format(q.finishingRecords), unit: "", status: "neutral", badge: q.finishingDays + " days", sub: q.finishingMachines + " machines", bar: null, spark: null }
    ]);
    metaPills("#dq-meta", '<span class="pill">Built ' + esc(D.meta.generatedAtDisplay) + "</span>");

    $("#dq-defs").innerHTML = [
      ["Availability %", "Σ operating hours ÷ Σ available (working) hours"],
      ["Performance %", "Σ actual output ÷ Σ loading capacity"],
      ["Quality %", "Σ quality-pass kg ÷ Σ planned output"],
      ["OEE %", "Availability × Performance × Quality"],
      ["Right first time", "RFT-pass batches ÷ total batches (lab-to-bulk + bulk-to-bulk)"],
      ["Topping %", "Topping kg ÷ planned output"],
      ["Redyeing %", "Redyeing kg ÷ actual production"],
      ["Target hit rate", "Actual output ÷ monthly goal (468,000 kg)"],
      ["Finishing OEE", "Utilisation × Efficiency × Quality"],
      ["Finishing utilisation", "Running time ÷ target time"]
    ].map(function (r) {
      return '<div class="def-row"><div class="k">' + esc(r[0]) + '</div><div class="v"><code>' + esc(r[1]) + "</code></div></div>";
    }).join("");

    $("#dq-targets").innerHTML = [
      ["Monthly production goal", kg(D.targets.production_monthly_kg) + " kg"],
      ["OEE", D.targets.oee + "%"],
      ["Availability", D.targets.availability + "%"],
      ["Performance", D.targets.performance + "%"],
      ["Quality", D.targets.quality + "%"],
      ["Right first time", D.targets.rft + "%"],
      ["Bulk-to-bulk RFT", D.targets.rft_bulk_to_bulk + "%"],
      ["Lab-to-bulk RFT", D.targets.rft_lab_to_bulk + "%"],
      ["Topping ceiling", D.targets.topping_limit + "%"],
      ["Redyeing limit", D.targets.redyeing_limit + "%"],
      ["Finishing OEE", D.targets.finishing_oee + "%"]
    ].map(function (r) {
      return '<div class="def-row"><div class="k">' + esc(r[0]) + '</div><div class="v"><b>' + esc(r[1]) + "</b></div></div>";
    }).join("");

    dataTable($("#dq-dyeing-coverage"), {
      columns: [
        { key: "month", label: "Month" },
        { key: "records", label: "Records", format: function (v) { return NF0.format(v); } },
        { key: "days", label: "Production days" }
      ],
      rows: q.dyeingCoverage
    });
    dataTable($("#dq-finishing-coverage"), {
      columns: [
        { key: "month", label: "Month" },
        { key: "records", label: "Records", format: function (v) { return NF0.format(v); } },
        { key: "days", label: "Production days" }
      ],
      rows: q.finishingCoverage
    });

    $("#dq-refresh").innerHTML =
      '<div class="def-list" style="padding:0">' +
      '<div class="def-row"><div class="k">Author</div><div class="v"><b>' + authorLink() +
        "</b> — Executive, Central IE Department, Clifton Group</div></div>" +
      '<div class="def-row"><div class="k">Portfolio</div><div class="v"><a class="author-link" href="' +
        esc(PORTFOLIO_URL) + '" target="_blank" rel="noopener noreferrer">' +
        esc(PORTFOLIO_URL.replace(/^https?:\/\//, "")) + "</a></div></div>" +
      '<div class="def-row"><div class="k">Copyright</div><div class="v">&copy; 2026 ' + authorLink() + ". All rights reserved.</div></div>" +
      '<div class="def-row"><div class="k">License</div><div class="v">Proprietary &mdash; All rights reserved (see <code>LICENSE</code> / <code>NOTICE</code>)</div></div>' +
      '<div class="def-row"><div class="k">Source workbooks</div><div class="v">' + D.meta.sourceFiles.map(esc).join(" · ") + "</div></div>" +
      '<div class="def-row"><div class="k">Last build</div><div class="v">' + esc(D.meta.generatedAt) + "</div></div>" +
      '<div class="def-row"><div class="k">Rebuild</div><div class="v"><code>python scripts/build.py</code> — re-reads both workbooks and rewrites <code>dashboard/data/data.js</code></div></div>' +
      '<div class="def-row"><div class="k">Automatic refresh</div><div class="v">Run <code>python scripts/watch.py</code> (or <code>start_dashboard.bat</code>) to rebuild whenever an Excel file is saved</div></div>' +
      '<div class="def-row"><div class="k">KPI method</div><div class="v">Toggle between <b>Weighted</b> (plant totals) and <b>Report</b> (row-average, matches the monthly deck) in the header</div></div>' +
      "</div>";
  }

  /* ==================================================================
     ROUTER
     ================================================================== */
  var RENDERERS = {
    overview: renderOverview,
    dyeing: renderDyeing,
    machines: renderMachines,
    downtime: renderDowntime,
    finishing: renderFinishing,
    mix: renderMix,
    data: renderData
  };

  var rendered = false;
  function renderActive() {
    setPeriodLines();
    var fn = RENDERERS[state.tab];
    if (fn) fn();
    rendered = true;
    requestAnimationFrame(resizeAll);
  }

  function switchTab(tab) {
    state.tab = tab;
    if (history.replaceState) history.replaceState(null, "", "#" + tab);
    $$(".tab").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === tab); });
    $$(".tab-panel").forEach(function (p) { p.classList.toggle("active", p.id === "panel-" + tab); });
    window.scrollTo({ top: 0, behavior: "smooth" });
    renderActive();
  }

  /* ==================================================================
     WIRING
     ================================================================== */
  function init() {
    applyTheme();
    fillMonthSelect();
    var f = document.getElementById("foot-meta");
    if (f) {
      f.innerHTML = "Data through <b>" + D.meta.dateMax + "</b> · Built <b>" + esc(D.meta.generatedAtDisplay) +
        "</b> · " + NF0.format(D.dataQuality.dyeingRecords) + " dyeing records &amp; " +
        NF0.format(D.dataQuality.finishingRecords) + " finishing records" +
        " · by <b>" + authorLink() + "</b>";
    }

    $("#monthSelect").addEventListener("change", function (e) {
      state.month = e.target.value;
      renderActive();
    });

    $$("#methodToggle button").forEach(function (b) {
      b.addEventListener("click", function () {
        state.method = b.getAttribute("data-method");
        $$("#methodToggle button").forEach(function (x) { x.classList.toggle("active", x === b); });
        renderActive();
      });
    });

    $("#themeToggle").addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyTheme();
      renderActive();
    });

    $("#printBtn").addEventListener("click", function () { window.print(); });
    $("#refreshBtn").addEventListener("click", function () { location.reload(); });

    $$(".tab").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-tab")); });
    });

    // keyboard shortcuts
    document.addEventListener("keydown", function (e) {
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        var order = Object.keys(RENDERERS);
        var i = order.indexOf(state.tab);
        var next = e.key === "ArrowRight" ? (i + 1) % order.length : (i - 1 + order.length) % order.length;
        switchTab(order[next]);
      }
    });

    // deep links: index.html#machines
    var hash = (location.hash || "").replace("#", "");
    if (hash && RENDERERS[hash]) {
      state.tab = hash;
      $$(".tab").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === hash); });
      $$(".tab-panel").forEach(function (p) { p.classList.toggle("active", p.id === "panel-" + hash); });
    }

    renderActive();
    var boot = document.getElementById("boot");
    if (boot) { boot.classList.add("hidden"); setTimeout(function () { boot.remove(); }, 400); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

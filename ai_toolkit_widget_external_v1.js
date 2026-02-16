(function(){
  var ROOT = document.getElementById("ai-toolkit");
  function $(sel, root){ return (root||ROOT||document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root||ROOT||document).querySelectorAll(sel)); }

  function escapeHtml(str){
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  

  // Smooth scroll anchoring: ensure element is visible without jumping
  function scrollIntoViewIfNeeded(el, opts){
    if (!el) return;
    opts = opts || {};
    var behavior = opts.behavior || "smooth";
    var block = opts.block || "nearest";
    var margin = (typeof opts.margin === "number") ? opts.margin : 14;

    try {
      var rect = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;

      // Only scroll if the element is not comfortably visible
      if (rect.top < margin || rect.bottom > (vh - margin)) {
        el.scrollIntoView({ behavior: behavior, block: block });
      }

  function focusKind(){
    // A/B/C/D: A=Teaching, B=Research, C=Teaching+Research, D=Program/Assessment
    if (state.focus === "A") return "teaching";
    if (state.focus === "B") return "research";
    if (state.focus === "C") return "both";
    if (state.focus === "D") return "program";
    return "both";
  }

  function selectionLabel(k, fallback){
    return selections[k] ? selections[k].label : (fallback || "—");
  }

  function getTopicText(){
    try{
      var t = getTopic();
      return t ? String(t).trim() : "";
    }catch(e){ return ""; }
  }

  function buildWorkflowPlanText(){
    var kind = focusKind();
    var topic = getTopicText();
    var mode = modeFlavor();
    var aud = audienceFlavor();

    var lines = [];
    lines.push("Faculty AI Toolkit Plan");
    lines.push("");
    lines.push("Focus: " + (kind==="teaching"?"Teaching":kind==="research"?"Research":kind==="program"?"Program/Assessment":"Teaching + Research"));
    lines.push("Mode: " + (state.mode || "quick"));
    if (topic) lines.push("Topic: " + topic);
    lines.push("Audience: " + aud);
    lines.push("Output emphasis: " + mode.output);
    lines.push("");
    lines.push("Selected Tools:");
    lines.push("- Productivity: " + selectionLabel("productivity"));
    lines.push("- Discovery: " + selectionLabel("discovery"));
    lines.push("- Literature Review: " + selectionLabel("litreview"));
    lines.push("- Data/Visualization: " + selectionLabel("data"));
    // Optional GenAI
    var gi = selectionLabel("genai_images", "");
    var ga = selectionLabel("genai_audio", "");
    var gv = selectionLabel("genai_video", "");
    if (gi || ga || gv){
      lines.push("- Generative AI (optional): " + [gi, ga, gv].filter(Boolean).join(" • "));
    }

    lines.push("");
    lines.push("Proposed Workflow:");
    if (kind === "teaching" || kind === "both"){
      lines.push("1. Define learning outcome(s) and the non-negotiable evidence students must show (process, citations, reflection).");
      lines.push("2. Draft an AI use/disclosure stance for the activity (allowed/limited/not permitted) and align it to your course policy.");
      lines.push("3. Build an AI-resilient structure: checkpoints (proposal → sources → draft → reflection) + rubric language for transparency.");
      lines.push("4. Create support materials: model annotations, example feedback comments, and a verification checklist for claims and citations.");
    }
    if (kind === "research" || kind === "both"){
      lines.push("1. Create a search plan: key terms, databases, inclusion/exclusion criteria, and a documentation log for reproducibility.");
      lines.push("2. Run discovery + citation chaining; build a reading set; track sources and decisions (why included/excluded).");
      lines.push("3. Extract evidence into a table (methods, sample, findings, limitations) and cluster themes for synthesis.");
      lines.push("4. Validate: spot-check quotes/claims against full texts; confirm citations; record uncertainty or conflicts.");
    }
    if (kind === "program"){
      lines.push("1. Identify program goals and assessment questions; define evidence sources and success criteria.");
      lines.push("2. Map workflows (instruction, advising, research support) and identify where AI tools might assist or introduce risk.");
      lines.push("3. Draft policy-aligned guidance + disclosure norms; establish review checkpoints for accuracy and equity.");
      lines.push("4. Build an implementation plan: pilot scope, evaluation metrics, and documentation requirements.");
    }

    lines.push("");
    lines.push("Quality & Policy Checks:");
    lines.push("- Avoid student PII and sensitive data unless approved and compliant with policy/FERPA.");
    lines.push("- Verify any generated claims with primary sources; document what was checked and by whom.");
    lines.push("- Maintain authorship transparency: disclose tool use and human contributions.");
    lines.push("- Check IP/copyright and ensure citations are correct and complete.");

    return lines.join("\n");
  }

  function buildReflectionPrompts(){
    var kind = focusKind();
    var prompts = [];
    prompts.push("Does this workflow involve student data, grades, accommodations, or other FERPA-covered information? If yes, what is your compliant alternative?");
    prompts.push("What steps will you use to verify factual claims, quotations, and citations before materials are shared or submitted?");
    prompts.push("How will you communicate authorship transparency (tool disclosure, attribution, and what work was done by humans)?");
    prompts.push("What risks of bias or uneven impact exist for your students/participants, and what mitigation steps will you add?");
    prompts.push("Which institutional/department policy statements apply here (AI guidance, IP, research integrity, data handling)?");

    if (kind === "teaching" || kind === "both"){
      prompts.push("How will you design the assessment so that learning evidence is observable without requiring AI use?");
      prompts.push("What is your plan if student AI use conflicts with the assignment’s expectations (support, remediation, documentation)?");
    }

  /********************************************************************
   * Rules-driven suggestions (LibGuides-safe: embedded JSON ruleset)
   *
   * Maintain these rules in GitHub if you like (as JSON), then paste the
   * updated JSON into this RULES array when you publish updates.
   *
   * Schema (per rule):
   * {
   *   id: "T-001",
   *   priority: 50, // higher runs earlier
   *   when: {
   *     focus: ["teaching","research","both","program"],   // optional
   *     mode: ["quick","assign","capstone"],              // optional
   *     anyTools: ["Elicit","Scite"],                     // optional (OR)
   *     allTools: ["Semantic Scholar"],                   // optional (AND)
   *     categoryTools: { discovery:["Perplexity"], litreview:["Elicit"] }, // optional (AND per category list)
   *     genai: { enabled:true, images:["DALL-E"], audio:["Suno"], video:["Sora"] } // optional
   *   },
   *   addIdeas: [
   *     { title:"...", deliverable:"...", steps:[...], notes:[...], tags:["Teaching"] }
   *   ],
   *   addReflection: ["...","..."] // optional (appends to reflection prompts)
   * }
   ********************************************************************/

  var RULES_VERSION = "remote (GitHub/LibGuides asset)";
  var RULES = [];

  // ===== OPTIONAL: load RULES from a hosted JSON file (recommended for LibGuides size limits) =====
  // Put your rules JSON somewhere web-accessible. Best options:
  // 1) LibGuides "Assets" / File Manager upload, then paste its public URL here
  // 2) GitHub + jsDelivr CDN: https://cdn.jsdelivr.net/gh/<user>/<repo>@<branch-or-commit>/<path>/rules.json
  // 3) Any library web server URL that serves JSON with CORS allowed
  //
  // IMPORTANT: The JSON must be an ARRAY of rule objects (same schema as RULES).
  var RULES_URL = "https://cdn.jsdelivr.net/gh/saintjakeowitz/Faculty-AI-Toolkit@main/faculty_ai_toolkit_rules_megapack_v0_base_plus_v1_v2.json";

  function loadRulesFromUrl(cb){
    cb = cb || function(){};
    if (!RULES_URL || RULES_URL.indexOf("PASTE_PUBLIC_JSON_URL_HERE") !== -1){
      return cb(false);
    }
    var statusEl = document.getElementById("aiTK-rulesStatus");
    if (statusEl) statusEl.innerHTML = "Loading suggestion rules…";
    try{
      fetch(RULES_URL, { cache: "no-store" })
        .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
        .then(function(data){
          if (!Array.isArray(data)) throw new Error("Rules JSON must be an array");
          RULES = data;
          RULES_VERSION = "remote (" + (new Date()).toISOString().slice(0,10) + ")";
          if (statusEl) statusEl.innerHTML = "Rules loaded ✓";
          cb(true);
        })
        .catch(function(){
          if (statusEl) statusEl.innerHTML = "Rules failed to load (using built-in defaults).";
          cb(false);
        });
    }catch(e){
      if (statusEl) statusEl.innerHTML = "Rules failed to load (using built-in defaults).";
      cb(false);
    }
  }


  function normalizeLabel(x){
    return String(x||"").toLowerCase().trim();
  }

  function selectedToolLabels(){
    var out = [];
    Object.keys(selections).forEach(function(k){
      if (selections[k] && selections[k].label) out.push(String(selections[k].label));
    });
    return out;
  }

  function hasToolLabel(label){
    var want = normalizeLabel(label);
    return selectedToolLabels().some(function(x){ return normalizeLabel(x) === want; });
  }

  function hasAny(labels){
    if (!labels || !labels.length) return true;
    return labels.some(function(l){ return hasToolLabel(l); });
  }

  function hasAll(labels){
    if (!labels || !labels.length) return true;
    return labels.every(function(l){ return hasToolLabel(l); });
  }

  function hasCategoryTools(catMap){
    if (!catMap) return true;
    var ok = true;
    Object.keys(catMap).forEach(function(cat){
      var labels = catMap[cat];
      if (!labels || !labels.length) return;
      var sel = selections[cat];
      if (!sel || !sel.label) { ok = false; return; }
      labels.forEach(function(l){
        if (normalizeLabel(sel.label) !== normalizeLabel(l)) ok = false;
      });
    });
    return ok;
  }

  function matchGenAI(gen){
    if (!gen) return true;
    if (typeof gen.enabled === "boolean"){
      if (!!state.genaiEnabled !== gen.enabled) return false;
    }
    function matchSlot(slotKey, arr){
      if (!arr || !arr.length) return true;
      var sel = selections[slotKey];
      if (!sel || !sel.label) return false;
      return arr.some(function(l){ return normalizeLabel(sel.label) === normalizeLabel(l); });
    }
    if (!matchSlot("genai_images", gen.images)) return false;
    if (!matchSlot("genai_audio", gen.audio)) return false;
    if (!matchSlot("genai_video", gen.video)) return false;
    return true;
  }

  function matchRule(rule){
    if (!rule || !rule.when) return true;
    var w = rule.when;
    if (w.focus && w.focus.length){
      if (w.focus.indexOf(focusKind()) === -1) return false;
    }
    if (w.mode && w.mode.length){
      if (w.mode.indexOf(state.mode) === -1) return false;
    }
    if (!hasAny(w.anyTools)) return false;
    if (!hasAll(w.allTools)) return false;
    if (!hasCategoryTools(w.categoryTools)) return false;
    if (!matchGenAI(w.genai)) return false;
    return true;
  }

  function sortRules(rules){
    return (rules||[]).slice().sort(function(a,b){
      return (b.priority||0) - (a.priority||0);
    });
  }

  function buildIdeasFromRules(){
    var ideas = [];
    sortRules(RULES).forEach(function(rule){
      if (matchRule(rule)){
        (rule.addIdeas || []).forEach(function(idea){
          ideas.push(idea);
        });
      }
    });
    return ideas;
  }

  function buildExtraReflectionFromRules(){
    var extra = [];
    sortRules(RULES).forEach(function(rule){
      if (matchRule(rule)){
        (rule.addReflection || []).forEach(function(x){ extra.push(x); });
      }
    });
    return extra;
  }

    if (kind === "research" || kind === "both"){
      prompts.push("Are you using AI tools in a way that could affect IRB considerations, confidentiality, or data governance?");
      prompts.push("How will you preserve reproducibility (search logs, prompts used, versioning, and decision trail)?");
    }
    if (kind === "program"){
      prompts.push("What evaluation metrics will you use to measure effectiveness and unintended consequences across cohorts or departments?");
    }
    return prompts;
  }

    } catch(e){}
  }
function toast(msg){
    var t = $("#aiTK-toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function(){ t.style.display = "none"; }, 1700);
  }

  // Tooltips
  function applyTooltips(){
    $all(".aiTK-card").forEach(function(card){
      var desc = card.getAttribute("data-desc") || "";
      if (!desc) return;

      var nameLink = card.querySelector(".aiTK-cardTitle a");
      if (!nameLink) return;

      if (nameLink.parentElement && nameLink.parentElement.classList.contains("aiTK-tipWrap")) return;

      var wrap = document.createElement("span");
      wrap.className = "aiTK-tipWrap";
      nameLink.parentNode.insertBefore(wrap, nameLink);
      wrap.appendChild(nameLink);

      var tip = document.createElement("span");
      tip.className = "aiTK-tooltip";
      tip.innerHTML = escapeHtml(desc) + ' <a href="#" class="aiTK-tipMore" data-action="openInlineDetails">More…</a>';
      wrap.appendChild(tip);

      nameLink.setAttribute("tabindex", "0");
      nameLink.setAttribute("aria-label", (nameLink.textContent || "Tool") + ". " + desc);
    });
  }

  // State
  var selections = {
    productivity: null,
    discovery: null,
    litreview: null,
    data: null,
    genai_images: null,
    genai_audio: null,
    genai_video: null
  };

  var state = {
    focus: "A",     // A/B/C/D
    mode: "quick",  // quick/assign/capstone
    ethicsOpen: false,
    urlSync: false, // only update URL when user explicitly enables sharing
    openPanels: {},   // one open per scope key
    compare: {}       // scope key -> array of labels
  };

  // Task options by focus
  var TASKS = {
    A: { label: "Teaching task", options: [
      {v:"auto", t:"Auto (suggest a mix)"},
      {v:"course", t:"Course design / redesign"},
      {v:"activity", t:"Lesson plan / in-class activity"},
      {v:"discussion", t:"Discussion prompts / facilitation"},
      {v:"assignment", t:"Assignment creation / AI-resilient redesign"},
      {v:"rubric", t:"Rubrics + exemplars"},
      {v:"feedback", t:"Feedback workflows (formative)"},
      {v:"oer", t:"OER / instructional materials"},
      {v:"access", t:"Accessibility / UDL improvements"}
    ]},
    B: { label: "Research task", options: [
      {v:"auto", t:"Auto (suggest a mix)"},
      {v:"lit", t:"Literature review / scoping"},
      {v:"outline", t:"Article / chapter outline"},
      {v:"grant", t:"Grant proposal framing"},
      {v:"methods", t:"Methods memo / study design"},
      {v:"revise", t:"Revision plan / peer review response"},
      {v:"abstract", t:"Conference abstract / CFP response"},
      {v:"collab", t:"Interdisciplinary collaboration mapping"}
    ]},
    C: { label: "Primary goal", options: [
      {v:"auto", t:"Auto (balanced)"},
      {v:"teachfromresearch", t:"Turn research into teachable module"},
      {v:"sotl", t:"SOTL study idea + classroom intervention"},
      {v:"scaffold", t:"Scaffolded assignment that builds research notes"},
      {v:"materials", t:"Teaching materials + publishable writing pipeline"},
      {v:"assessmentlite", t:"Lightweight assessment + course improvement loop"}
    ]},
    D: { label: "Admin / assessment task", options: [
      {v:"auto", t:"Auto (suggest a mix)"},
      {v:"outcomes", t:"Learning outcomes mapping"},
      {v:"assessment", t:"Program assessment plan"},
      {v:"accred", t:"Accreditation narrative support"},
      {v:"survey", t:"Survey / instrument drafting"},
      {v:"report", t:"Reporting templates / executive summary"},
      {v:"comms", t:"Department communications / outreach"},
      {v:"process", t:"Workflow standardization / documentation"}
    ]}
  };

  function setTaskUI(){
    var focus = state.focus;
    var cfg = TASKS[focus] || TASKS.A;
    $("#aiTK-taskLabel").textContent = cfg.label;
    var sel = $("#aiTK-task");
    sel.innerHTML = "";
    cfg.options.forEach(function(o){
      var opt = document.createElement("option");
      opt.value = o.v;
      opt.textContent = o.t;
      sel.appendChild(opt);
    });
    sel.value = "auto";
  }

  

  // Scope key (section/subsection) helpers
  function scopeKeyForCard(card){
    var cat = (card.getAttribute("data-category") || "").toLowerCase();
    if (cat !== "genai") return cat;
    var sub = (card.getAttribute("data-subcategory") || "").toLowerCase();
    return "genai_" + sub;
  }

  function ensureCompareStateForScope(scopeKey){
    if (!state.compare[scopeKey]) state.compare[scopeKey] = [];
  }

  // Create compare containers under each section (and each GenAI subsection) dynamically
  function createCompareContainers(){
    // Non-genai sections: productivity/discovery/litreview/data
    ["productivity","discovery","litreview","data"].forEach(function(scopeKey){
      var section = document.getElementById("aiTK-" + (scopeKey === "litreview" ? "lit" : scopeKey === "productivity" ? "prod" : scopeKey));
      // map: productivity->aiTK-prod, discovery->aiTK-disc, data->aiTK-data
      if (scopeKey === "productivity") section = document.getElementById("aiTK-prod");
      if (scopeKey === "discovery") section = document.getElementById("aiTK-disc");
      if (scopeKey === "litreview") section = document.getElementById("aiTK-lit");
      if (scopeKey === "data") section = document.getElementById("aiTK-data");
      if (!section) return;

      var existing = section.querySelector('.aiTK-compareWrap[data-scope="'+scopeKey+'"]');
      if (existing) return;

      var wrap = document.createElement("div");
      wrap.className = "aiTK-compareWrap";
      wrap.setAttribute("data-scope", scopeKey);
      wrap.style.display = "none";
      wrap.innerHTML =
        '<div class="aiTK-compareHeader">' +
          '<div>' +
            '<p class="aiTK-compareTitle">Compare tools</p>' +
            '<div class="aiTK-compareHint">Add up to 3 tools in this section to compare “Best for,” prompts, cost/access, and privacy notes.</div>' +
          '</div>' +
          '<button type="button" class="aiTK-btn" data-action="clearCompare" data-scope="'+scopeKey+'">Clear</button>' +
        '</div>' +
        '<div class="aiTK-compareGrid"></div>';

      // Insert after section header
      var head = section.querySelector(".aiTK-sectionHead");
      if (head && head.parentNode) head.parentNode.insertBefore(wrap, head.nextSibling);
    });

    // GenAI subsections
    ["genai_images","genai_audio","genai_video"].forEach(function(scopeKey){
      var section = document.getElementById("aiTK-genai");
      if (!section) return;

      // Find subsection title by text
      var sub = scopeKey.replace("genai_","");
      var titleText = sub.charAt(0).toUpperCase() + sub.slice(1);
      var titles = Array.prototype.slice.call(section.querySelectorAll(".aiTK-subsectionTitle"));
      var titleEl = titles.find(function(el){ return (el.textContent || "").trim().toLowerCase() === titleText.toLowerCase(); });
      if (!titleEl) return;

      var existing = section.querySelector('.aiTK-compareWrap[data-scope="'+scopeKey+'"]');
      if (existing) return;

      var wrap = document.createElement("div");
      wrap.className = "aiTK-compareWrap";
      wrap.setAttribute("data-scope", scopeKey);
      wrap.style.display = "none";
      wrap.innerHTML =
        '<div class="aiTK-compareHeader">' +
          '<div>' +
            '<p class="aiTK-compareTitle">Compare '+ titleText +' tools</p>' +
            '<div class="aiTK-compareHint">Add up to 3 tools in this subsection to compare quickly.</div>' +
          '</div>' +
          '<button type="button" class="aiTK-btn" data-action="clearCompare" data-scope="'+scopeKey+'">Clear</button>' +
        '</div>' +
        '<div class="aiTK-compareGrid"></div>';

      // Insert right after subsection title
      if (titleEl.parentNode) titleEl.parentNode.insertBefore(wrap, titleEl.nextSibling);
    });
  }

  function renderCompare(scopeKey){
    var section = $("#ai-toolkit");
    var wrap = $all('.aiTK-compareWrap[data-scope="'+scopeKey+'"]', section)[0];
    if (!wrap) return;

    ensureCompareStateForScope(scopeKey);
    var list = state.compare[scopeKey].slice(0,3);

    if (!list.length){
      wrap.style.display = "none";
      wrap.querySelector(".aiTK-compareGrid").innerHTML = "";
      return;
    }

    var wasHidden = (wrap.style.display === "none");
    wrap.style.display = "block";
    if (wasHidden) { scrollIntoViewIfNeeded(wrap, {behavior:"smooth", block:"nearest", margin:14}); }

    // Find cards for labels
    var cards = [];
    $all(".aiTK-card").forEach(function(card){
      if (scopeKeyForCard(card) !== scopeKey) return;
      var label = card.getAttribute("data-label") || "";
      if (list.indexOf(label) >= 0) cards.push(card);
    });

    var grid = wrap.querySelector(".aiTK-compareGrid");
    grid.innerHTML = cards.map(function(card){
      var label = card.getAttribute("data-label") || "Tool";
      var url = card.getAttribute("data-url") || "";
      var best = card.getAttribute("data-best") || "—";
      var prompts = card.getAttribute("data-prompts") || "—";
      var cost = card.getAttribute("data-cost") || "—";
      var privacy = card.getAttribute("data-privacy") || "—";

      return (
        '<div class="aiTK-compareCol">' +
          '<p class="aiTK-compareTool">' +
            (url ? ('<a href="'+escapeHtml(url)+'" target="_blank" rel="noopener">'+escapeHtml(label)+'</a>') : escapeHtml(label)) +
          '</p>' +
          '<div class="aiTK-compareRow"><div class="aiTK-compareLabel">What it’s good for</div><div class="aiTK-compareText">'+escapeHtml(best)+'</div></div>' +
          '<div class="aiTK-compareRow"><div class="aiTK-compareLabel">Quick prompts</div><div class="aiTK-compareText">'+escapeHtml(prompts)+'</div></div>' +
          '<div class="aiTK-compareRow"><div class="aiTK-compareLabel">Cost / Access</div><div class="aiTK-compareText">'+escapeHtml(cost)+'</div></div>' +
          '<div class="aiTK-compareRow"><div class="aiTK-compareLabel">Privacy note</div><div class="aiTK-compareText">'+escapeHtml(privacy)+'</div></div>' +
          '<button type="button" class="aiTK-compareRemove" data-action="removeCompare" data-scope="'+escapeHtml(scopeKey)+'" data-label="'+escapeHtml(label)+'">Remove</button>' +
        '</div>'
      );
    }).join("");

    writeHashFromState();
  }

  
  function updateCompareCardVisuals(scopeKey){
    $all(".aiTK-card").forEach(function(card){
      if (scopeKeyForCard(card) !== scopeKey) return;

      var label = card.getAttribute("data-label") || "";
      ensureCompareStateForScope(scopeKey);

      var inCompare = (state.compare[scopeKey] || []).indexOf(label) >= 0;

      var badge = card.querySelector(".aiTK-compareBadge");

      if (inCompare) {
        card.classList.add("aiTK-inCompare");
        if (!badge){
          badge = document.createElement("div");
          badge.className = "aiTK-compareBadge";
          badge.textContent = "COMPARE";
          card.appendChild(badge);
        }
      } else {
        card.classList.remove("aiTK-inCompare");
        if (badge) badge.remove();
      }
    });
  }

function toggleCompare(card){
    var scopeKey = scopeKeyForCard(card);
    ensureCompareStateForScope(scopeKey);

    var label = card.getAttribute("data-label") || "";
    if (!label) return;

    var list = state.compare[scopeKey];
    var idx = list.indexOf(label);
    if (idx >= 0) {
      list.splice(idx, 1);
      toast("Removed from compare.");
    } else {
      if (list.length >= 3) {
        toast("Compare supports up to 3 tools.");
        return;
      }
      list.push(label);
      toast("Added to compare.");
    }
    renderCompare(scopeKey);
    updateCompareCardVisuals(scopeKey);
  }

function pickedCount(){
    var n = 0;
    Object.keys(selections).forEach(function(k){ if (selections[k]) n++; });
    return n;
  }

  function requiredPickedCount(){
    var req = ["productivity","discovery","litreview","data"];
    var n = 0;
    req.forEach(function(k){ if (selections[k]) n++; });
    return n;
  }

  function optionalGenAICount(){
    var opt = ["genai_images","genai_audio","genai_video"];
    var n = 0;
    opt.forEach(function(k){ if (selections[k]) n++; });
    return n;
  }

  function updatePickedCount(){
    var reqEl = $("#aiTK-pickedReq");
    if (reqEl) reqEl.textContent = String(requiredPickedCount());
    var optN = optionalGenAICount();
    var optWrap = $("#aiTK-pickedOptWrap");
    var optEl = $("#aiTK-pickedOpt");
    if (optEl) optEl.textContent = String(optN);
    if (optWrap) optWrap.style.display = optN ? "inline" : "none";
  }

  function linkify(sel){
    return '<a href="'+ escapeHtml(sel.url) +'" target="_blank" rel="noopener">' + escapeHtml(sel.label) + '</a>';
  }

  function renderSelection(cat){
    var target = $("#aiTK-sel-" + cat);
    if (!target) return;
    var sel = selections[cat];
    if (!sel){ target.textContent = "Not selected"; return; }
    target.innerHTML = linkify(sel);
  }

  function renderGenAISelection(){
    var target = $("#aiTK-sel-genai");
    if (!target) return;

    var img = selections.genai_images;
    var aud = selections.genai_audio;
    var vid = selections.genai_video;

    target.innerHTML =
      '<div><strong>Images:</strong> ' + (img ? linkify(img) : 'Not selected') + '</div>' +
      '<div><strong>Audio:</strong> ' + (aud ? linkify(aud) : 'Not selected') + '</div>' +
      '<div><strong>Video:</strong> ' + (vid ? linkify(vid) : 'Not selected') + '</div>';
  }

  function renderAllSelections(){
    renderSelection("productivity");
    renderSelection("discovery");
    renderSelection("litreview");
    renderSelection("data");
    renderGenAISelection();
    updatePickedCount();
  
    // Hide GenAI rows in My Toolkit unless enabled or selected
    try{
      var showGen = !!state.genaiEnabled || optionalGenAICount() > 0;
      ["genai_images","genai_audio","genai_video"].forEach(function(k){
        var row = $("#aiTK-row-" + k);
        if (row) row.style.display = showGen ? "" : "none";
      });
    }catch(e){}

  }

  // Drawer
  function openDrawerFromCard(card){
    var drawer = $("#aiTK-drawer");
    if (!drawer) return;

    var label = card.getAttribute("data-label") || "Tool";
    var url = card.getAttribute("data-url") || "";
    var desc = card.getAttribute("data-desc") || "";
    var best = card.getAttribute("data-best") || "";
    var prompts = card.getAttribute("data-prompts") || "";
    var cost = card.getAttribute("data-cost") || "";
    var privacy = card.getAttribute("data-privacy") || "";

    $("#aiTK-drawerTitle").textContent = label;
    $("#aiTK-drawerMeta").innerHTML = (url ? ('<a href="'+escapeHtml(url)+'" target="_blank" rel="noopener">'+escapeHtml(url)+'</a>') : '') +
      (desc ? ('<div style="margin-top:6px;">'+escapeHtml(desc)+'</div>') : '');

    $("#aiTK-drawerBest").textContent = best || "—";
    $("#aiTK-drawerPrompts").textContent = prompts || "—";
    $("#aiTK-drawerCost").textContent = cost || "—";
    $("#aiTK-drawerPrivacy").textContent = privacy || "—";

    drawer.style.display = "block";
  }

  function closeDrawer(){
    var drawer = $("#aiTK-drawer");
    if (drawer) drawer.style.display = "none";
  }

  

  // Inline details (under a card)
  function closeInlineDetailsInScope(scopeEl){
    // Clear open panel for this scope (if a scope element provided)

    var scope = scopeEl || ROOT || document;
    // If we can infer scope key, clear it
    try {
      var openCard = scope.querySelector && scope.querySelector(".aiTK-inlineDetails[style*=\"display: block\"]");
      if (openCard) {
        var ccard = openCard.closest && openCard.closest(".aiTK-card");
        if (ccard) state.openPanels[scopeKeyForCard(ccard)] = "";
      }
    } catch(e){}
    $all(".aiTK-inlineDetails", scope).forEach(function(p){ 
      
      p.style.display = "none";
      var c = p.closest(".aiTK-card");
      if(c){ c.classList.remove("aiTK-detailsOpen"); state.openPanels[scopeKeyForCard(c)] = ""; }

      var card = p.closest(".aiTK-card");
      if(card){
        var ind = card.querySelector(".aiTK-details .aiTK-detailsIndicator");
        if(ind) ind.textContent = "▼";
      }
     });
  }

function openInlineDetailsFromCard(card, opts){
    opts = opts || {};

    if (!card) return;

    // If this card is already open, close it and stop (so the toggle works)
    if (panel && panel.style.display === "block") {
      panel.style.display = "none";
      card.classList.remove("aiTK-detailsOpen");

      var detailsLink0 = card.querySelector(".aiTK-details .aiTK-detailsIndicator");
      if (detailsLink0) detailsLink0.textContent = "▼";

      var scopeKey0 = scopeKeyForCard(card);
      state.openPanels[scopeKey0] = "";
      writeHashFromState();
      return;
    }

    // Close other inline panels in this SECTION only

    var section = card.closest ? card.closest(".aiTK-section") : null;
    closeInlineDetailsInScope(section);

    var panel = card.querySelector(".aiTK-inlineDetails");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "aiTK-inlineDetails";

      var best = card.getAttribute("data-best") || "—";
      var prompts = card.getAttribute("data-prompts") || "—";
      var cost = card.getAttribute("data-cost") || "—";
      var privacy = card.getAttribute("data-privacy") || "—";

      panel.innerHTML =
        '<div class="aiTK-inlineRow"><div class="aiTK-inlineLabel">What it’s good for</div><div class="aiTK-inlineText"></div></div>' +
        '<div class="aiTK-inlineRow"><div class="aiTK-inlineLabel">Quick prompts</div><div class="aiTK-inlineText"></div></div>' +
        '<div class="aiTK-inlineRow"><div class="aiTK-inlineLabel">Cost / Access</div><div class="aiTK-inlineText"></div></div>' +
        '<div class="aiTK-inlineRow"><div class="aiTK-inlineLabel">Privacy note</div><div class="aiTK-inlineText"></div></div>' +
        '<div class="aiTK-inlineRow" style="margin-top:10px;"><button type="button" class="aiTK-btn" data-action="closeInlineDetails">Close details</button></div>';

      var rows = panel.querySelectorAll(".aiTK-inlineText");
      rows[0].textContent = best;
      rows[1].textContent = prompts;
      rows[2].textContent = cost;
      rows[3].textContent = privacy;

      card.appendChild(panel);
    }

    // Toggle
    
    var isOpen = panel.style.display === "block";
    
    panel.style.display = isOpen ? "none" : "block";

    // Toggle glow class
    if (!isOpen) {
      card.classList.add("aiTK-detailsOpen");
    } else {
      card.classList.remove("aiTK-detailsOpen");
    }


    // Toggle indicator arrow

    // Remember open panel in URL state (one per scope key)
    var scopeKey = scopeKeyForCard(card);
    if (!isOpen) {
      state.openPanels[scopeKey] = card.getAttribute("data-label") || "";
    } else {
      state.openPanels[scopeKey] = "";
    }


    var detailsLink = card.querySelector(".aiTK-details .aiTK-detailsIndicator");
    if(detailsLink){
      detailsLink.textContent = isOpen ? "▼" : "▲";
    }
    
    if (panel.style.display === "block") {
      if (!opts.noScroll) { scrollIntoViewIfNeeded(panel, {behavior:"smooth", block:"nearest", margin: 14}); }
    }
  }
// Mode/focus/ethics setters
  function setMode(mode){
    state.mode = mode;
    $all(".aiTK-modeBtn").forEach(function(btn){
      btn.classList.toggle("aiTK-modeActive", btn.getAttribute("data-mode") === mode);
    });
    updateProjects();
    writeHashFromState();
  }

  function setFocus(f){
    state.focus = f;
    $all(".aiTK-focusBtn").forEach(function(btn){
      btn.classList.toggle("aiTK-focusActive", btn.getAttribute("data-focus") === f);
    });
    setTaskUI();
    updateProjects();
    writeHashFromState();
  }

  function setEthicsOpen(open){
    state.ethicsOpen = !!open;
    var wrap = $("#aiTK-ethics");
    var header = wrap ? wrap.querySelector(".aiTK-ethicsHeader") : null;
    if (!wrap || !header) return;
    wrap.className = state.ethicsOpen ? "aiTK-ethicsOpen" : "";
    header.setAttribute("aria-expanded", state.ethicsOpen ? "true" : "false");
    writeHashFromState();
  }

  // Card selection
  function selectCard(card){
    var category = (card.getAttribute("data-category") || "").toLowerCase();
    var label = card.getAttribute("data-label");
    var url = card.getAttribute("data-url");
    if (!category || !label || !url) return;

    if (category !== "genai"){
      $all('.aiTK-card[data-category="'+category+'"]').forEach(function(c){ c.classList.remove("aiTK-selected"); });
      card.classList.add("aiTK-selected");
      selections[category] = { label: label, url: url };
      renderSelection(category);
      updatePickedCount();
      updateProjects();
      writeHashFromState();
      return;
    

    // Auto-update suggestions as the user makes changes
    renderProjects(false);
    renderReflection();
  }

    var sub = (card.getAttribute("data-subcategory") || "").toLowerCase();
    if (!sub) return;
    var key = "genai_" + sub;

    $all('.aiTK-card[data-category="genai"][data-subcategory="'+sub+'"]').forEach(function(c){ c.classList.remove("aiTK-selected"); });
    card.classList.add("aiTK-selected");
    selections[key] = { label: label, url: url };

    renderGenAISelection();
    updatePickedCount();
    updateProjects();
    writeHashFromState();
  }

  // Scrollspy
  function setActiveBubbleBySectionId(sectionId){
    var hash = "#" + sectionId;
    $all(".aiTK-bubble").forEach(function(a){
      var tgt = a.getAttribute("data-target") || a.getAttribute("href");
      if (tgt === hash) a.classList.add("aiTK-bubbleActive");
      else a.classList.remove("aiTK-bubbleActive");
    });
  }

  function initScrollSpy(){
    var sections = ["aiTK-prod","aiTK-disc","aiTK-lit","aiTK-data","aiTK-genai"]
      .map(function(id){ return document.getElementById(id); })
      .filter(Boolean);
    if (!sections.length) return;
    setActiveBubbleBySectionId(sections[0].id);

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function(entries){
        var visible = entries
          .filter(function(e){ return e.isIntersecting; })
          .sort(function(a,b){ return (b.intersectionRatio||0) - (a.intersectionRatio||0); });
        if (visible.length) setActiveBubbleBySectionId(visible[0].target.id);
      }, { threshold:[0.25,0.4,0.55,0.7], rootMargin:"-10% 0px -65% 0px" });
      sections.forEach(function(sec){ io.observe(sec); });
    }
  }

  // Projects generator (faculty)
  function toolCaps(label){
    var t = (label || "").toLowerCase();
    if (t.includes("chatgpt")) return ["drafting","revision","prompting","coding-lite"];
    if (t.includes("claude")) return ["drafting","revision","longform-synthesis"];
    if (t.includes("copilot")) return ["drafting","office-workflow"];
    if (t.includes("gemini")) return ["drafting","google-workflow"];

    if (t.includes("perplexity")) return ["web-discovery","question-framing","source-triage"];
    if (t.includes("semantic scholar")) return ["scholarly-search","citation-chaining"];
    if (t.includes("scopus")) return ["indexed-search","bibliometrics"];
    if (t.includes("researchrabbit")) return ["citation-mapping","reading-list"];

    if (t.includes("elicit")) return ["evidence-extraction","study-comparison"];
    if (t.includes("scite")) return ["citation-context","claim-checking"];
    if (t.includes("consensus")) return ["evidence-lookup","claim-synthesis"];
    if (t.includes("notebooklm")) return ["source-grounding","note-synthesis"];

    if (t.includes("quadratic")) return ["data-analysis","visualization"];
    if (t.includes("julius")) return ["data-analysis","visualization"];

    if (t.includes("midjourney") || t.includes("dall") || t.includes("stable diffusion")) return ["image-generation"];
    if (t.includes("elevenlabs")) return ["voice-narration"];
    if (t.includes("suno") || t.includes("audo")) return ["audio-production"];
    if (t.includes("runway") || t.includes("pika") || t.includes("sora")) return ["video-generation"];

    return ["general"];
  }

  function gatherCapabilities(){
    var caps = [];
    ["productivity","discovery","litreview","data","genai_images","genai_audio","genai_video"].forEach(function(k){
      if (selections[k]) caps = caps.concat(toolCaps(selections[k].label));
    });
    var seen = {};
    return caps.filter(function(c){
      if (seen[c]) return false;
      seen[c] = true;
      return true;
    });
  }

  function getTopic(){ return ($("#aiTK-topic") && $("#aiTK-topic").value || "").trim(); }
  function getAudience(){ return ($("#aiTK-audience") && $("#aiTK-audience").value) || "auto"; }
  function getTask(){ return ($("#aiTK-task") && $("#aiTK-task").value) || "auto"; }

  function modeFlavor(){
    if (state.mode === "quick") return { label:"Quick Start", sources:"3–6", output:"minimum viable", hours:"~15 min" };
    if (state.mode === "assign") return { label:"Work Session", sources:"8–15", output:"polished", hours:"2–4 hours" };
    return { label:"Big Build", sources:"18–35", output:"robust", hours:"multi-week" };
  }

  function audienceFlavor(){
    var a = getAudience();
    if (a==="fy") return "first-year / intro students";
    if (a==="ud") return "upper-division undergrads";
    if (a==="grad") return "graduate students";
    if (a==="mixed") return "mixed skill levels";
    if (a==="online") return "online/asynchronous";
    if (a==="hybrid") return "hybrid";
    if (a==="hiload") return "high-enrollment";
    if (a==="seminar") return "seminar / small class";
    return "general";
  }

  function fmtTitle(base){
    var t = getTopic();
    return t ? (base + ": " + t) : base;
  }

  function renderProjects(forceEmpty){
    var box = $("#aiTK-projects");
    if (!box) return;

    if (forceEmpty){
      var selSummary = ["Productivity: "+selectionLabel("productivity"), "Discovery: "+selectionLabel("discovery"), "Lit Review: "+selectionLabel("litreview"), "Data/Viz: "+selectionLabel("data")].join(" • ");
      var rulesNote = '<div class="aiTK-muted" style="margin-bottom:8px;">Suggestions update automatically. Ruleset v '+ escapeHtml(RULES_VERSION) +'</div>';
      box.innerHTML = rulesNote + '<div class="aiTK-muted">Select tools + add a topic (optional) to see suggestions.</div>';
      return;
    }


  function renderReflection(){
    var body = $("#aiTK-reflectBody");
    if (!body) return;
    var prompts = buildReflectionPrompts();
    var extra = buildExtraReflectionFromRules();
    extra.forEach(function(x){ prompts.push(x); });
    var html = '<ul class="aiTK-reflectList">';
    prompts.forEach(function(p){ html += '<li>' + escapeHtml(p) + '</li>'; });
    html += '</ul>';
    body.innerHTML = html;
  }

    if (pickedCount() === 0 && !getTopic()){
      // No selections yet: still offer starter ideas so "Generate Ideas" always produces something.
      var M0 = modeFlavor();
      var aud0 = audienceFlavor();
      var focus0 = state.focus;
      box.innerHTML = '<div class="aiTK-muted" style="margin-bottom:8px;">No tools selected yet — here are a few starter ideas. (Add tools and/or a topic to make these more specific.)</div>' +
        '<div class="aiTK-idea"><div class="aiTK-ideaTitle">' + escapeHtml((focus0==='D'?'Program/Assessment':'Course/Research') + ' Planning Prompt Pack') + '</div>' +
        '<div class="aiTK-muted">Deliverable: copy-ready prompts/checklists • ' + escapeHtml(M0.output) + '</div>' +
        '<ul class="aiTK-ideaSteps">' +
          '<li>Pick a single goal (lesson plan, lit review plan, assessment report, grant narrative).</li>' +
          '<li>Write 3 constraints: audience (' + escapeHtml(aud0) + '), length, and required sources/data.</li>' +
          '<li>Generate: outline → draft → revision checklist → transparency/ethics note.</li>' +
        '</ul></div>' +
        '<div class="aiTK-idea"><div class="aiTK-ideaTitle">AI-Resilient Activity Template</div>' +
        '<div class="aiTK-muted">Deliverable: reusable activity structure + rubric language • ' + escapeHtml(M0.output) + '</div>' +
        '<ul class="aiTK-ideaSteps">' +
          '<li>Define what students must show (process evidence, citations, reflection).</li>' +
          '<li>Add checkpoints (proposal, annotated sources, draft, reflection).</li>' +
          '<li>Draft an AI disclosure/usage statement aligned to your policy stance.</li>' +
        '</ul></div>' +
        '<div class="aiTK-idea"><div class="aiTK-ideaTitle">Research Workflow Map</div>' +
        '<div class="aiTK-muted">Deliverable: step-by-step workflow + tool-neutral guidance • ' + escapeHtml(M0.output) + '</div>' +
        '<ul class="aiTK-ideaSteps">' +
          '<li>Draft a search strategy (keywords, databases, inclusion/exclusion criteria).</li>' +
          '<li>Plan synthesis: annotate → cluster themes → evidence table → narrative.</li>' +
          '<li>Add a quality check: bias/accuracy review + citation verification.</li>' +
        '</ul></div>';
      return;
    }

    var caps = gatherCapabilities();
    var M = modeFlavor();
    var aud = audienceFlavor();
    var task = getTask();
    var focus = state.focus;

    function has(x){ return caps.indexOf(x) >= 0; }

    var note = '<div class="aiTK-muted" style="margin-bottom:8px;">' +
      (getTopic() ? ('Topic: <strong>' + escapeHtml(getTopic()) + '</strong> • ') : '') +
      'Focus: <strong>' + escapeHtml(focus) + '</strong> • ' +
      'Mode: <strong>' + escapeHtml(M.label) + '</strong> • ' +
      'Audience: <strong>' + escapeHtml(aud) + '</strong> • ' +
      'Task: <strong>' + escapeHtml(task) + '</strong>' +
    '</div>';

    // Build focus-specific idea templates
    var ideas = [];

    function pushIdea(title, meta, steps){
      ideas.push({title:title, meta:meta, steps:steps});
    }

    // A Teaching
    if (focus === "A" || focus === "C") {
      pushIdea(
        fmtTitle("AI-Resilient Assignment Redesign"),
        "Deliverable: prompt-resistant assignment + rubric + student guidance • " + M.output,
        [
          "Define the learning outcomes and what students must produce (artifact + process evidence).",
          "Add process checkpoints: proposal, annotated sources, draft with revision log, reflection.",
          "Write “allowed vs. not allowed AI use” and a disclosure requirement (if desired).",
          "Create a rubric with criteria for evidence use, reasoning, and reflection.",
          (has("image-generation") ? "Optional: generate a simple diagram showing the workflow and checkpoints." : "Optional: add a one-page workflow diagram using basic shapes."),
          "Pilot with one prompt test: what would AI output look like vs. what you require?"
        ]
      );

      pushIdea(
        fmtTitle("Lesson Plan + Active Learning Activity"),
        "Deliverable: 50–75 min plan, materials, and facilitation notes • " + M.output,
        [
          "Write a 1-sentence learning objective and 3 success indicators.",
          "Create a short pre-class reading guide or micro-lecture outline.",
          "Design an in-class activity (think-pair-share, case study, jigsaw, debate).",
          "Draft a 5-question formative check (exit ticket).",
          (has("voice-narration") ? "Optional: create an audio summary for accessibility + transcript." : "Optional: write a text-based accessibility summary.")
        ]
      );
    }

    // B Research
    if (focus === "B" || focus === "C") {
      pushIdea(
        fmtTitle("Literature Landscape + Argument Map"),
        "Deliverable: themed outline + key citations + gap statement • Sources: " + M.sources,
        [
          "Identify 4 themes/subfields and 2 anchor papers per theme.",
          "Extract key methods/findings into a comparison table.",
          (has("citation-context") ? "Use citation contexts to verify whether key claims are supported or contested." : "Spot-check contentious claims by reading abstracts and key sections."),
          "Draft a gap statement and 3 research questions (or hypotheses).",
          "Produce a 1–2 page argument map outlining your contribution."
        ]
      );

      pushIdea(
        fmtTitle("Grant/Proposal Framing"),
        "Deliverable: aims + significance + approach sketch • " + M.output,
        [
          "Draft problem statement, stakes, and beneficiaries.",
          "Write 2–3 specific aims with measurable outcomes.",
          "Outline approach (methods, sample/data, analysis, feasibility).",
          "Add risks + mitigations; ethics considerations; timeline.",
          "Generate a reviewer-friendly abstract (plain language version optional)."
        ]
      );
    }

    // D Admin/Assessment
    if (focus === "D" || focus === "C") {
      pushIdea(
        fmtTitle("Assessment Matrix (Outcomes → Measures → Evidence)"),
        "Deliverable: outcomes map + measurement plan + reporting template • " + M.output,
        [
          "List program/course outcomes and map each to 1–2 measures (direct/indirect).",
          "Draft a data collection schedule and responsible roles.",
          (has("data-analysis") ? "Plan analysis: descriptive stats + trend comparisons + 2–3 charts." : "Plan analysis: summary stats and clear visual reporting."),
          "Create a 1-page executive summary template for reporting results.",
          "Add an improvement loop: what decisions will data inform?"
        ]
      );

      pushIdea(
        fmtTitle("Accreditation Narrative Builder"),
        "Deliverable: evidence checklist + narrative outline + claims-to-evidence table",
        [
          "List required standards and map existing evidence documents to each.",
          "Write a claims-to-evidence table (claim, evidence, where stored, gaps).",
          "Draft narrative: context → actions → evidence → results → improvements.",
          "Create a gap-fix plan (what data to collect next cycle)."
        ]
      );
    }

    // Make sure we show at most 5
    ideas = ideas.slice(0,5);

    box.innerHTML = note + ideas.map(function(p){
      var steps = (p.steps || []).map(function(s){ return "<li>"+ escapeHtml(s) +"</li>"; }).join("");
      return (
        '<div class="aiTK-proj">' +
          '<div class="aiTK-projTitle">' + escapeHtml(p.title) + '</div>' +
          '<div class="aiTK-projMeta">' + escapeHtml(p.meta) + '</div>' +
          '<ul>' + steps + '</ul>' +
        '</div>'
      );
    }).join("");
  }

  // Wrapper used by buttons and selection changes
  function updateProjects(){
    // Always re-render based on current selections/topic/settings
    renderProjects(false);
    renderReflection();
  }


  function updateProjects(forceEmpty){
    renderProjects(!!forceEmpty);
  }

  // Exports
  function buildToolkitText(){
    var lines = [];
    var topic = getTopic();
    lines.push("My Faculty AI Toolkit");
    if (topic) lines.push("TOPIC/CONTEXT: " + topic);
    lines.push("FOCUS: " + state.focus);
    lines.push("MODE: " + state.mode);
    lines.push("AUDIENCE: " + getAudience());
    lines.push("TASK: " + getTask());
    lines.push("-------------------------");

    ["productivity","discovery","litreview","data","genai_images","genai_audio","genai_video"].forEach(function(cat){
      var sel = selections[cat];
      lines.push(cat.toUpperCase() + ": " + (sel ? (sel.label + " — " + sel.url) : "(not selected)"));
    });
    return lines.join("\\n");
  }

  function buildChecklistText(){
    var M = modeFlavor();
    var lines = [];
    lines.push("Faculty AI Workflow Checklist");
    lines.push("Focus: " + state.focus + " | Mode: " + M.label + " | Audience: " + audienceFlavor());
    if (getTopic()) lines.push("Topic: " + getTopic());
    lines.push("");
    lines.push("☐ Define goal (teaching/research/assessment) + success criteria");
    lines.push("☐ Draft or refine policy boundaries (FERPA, grading transparency, disclosure)");
    lines.push("☐ Build an outline/template for the deliverable");
    lines.push("☐ Gather sources/evidence (" + M.sources + " as a starting point if applicable)");
    lines.push("☐ Create the artifact (assignment/rubric/narrative/analysis)");
    lines.push("☐ Verify factual claims + align with institutional policy");
    lines.push("☐ Finalize: accessibility (captions/transcripts/alt text) + formatting");
    return lines.join("\\n");
  }

  function buildEmailBlurb(){
    var lines = [];
    lines.push("Subject: Faculty AI Toolkit selections" + (getTopic() ? (" — " + getTopic()) : ""));
    lines.push("");
    lines.push("Hi,");
    lines.push("");
    lines.push("Here are my Faculty AI Toolkit selections" + (getTopic() ? (" for: " + getTopic()) : "") + ".");
    lines.push("Focus: " + state.focus + " | Mode: " + state.mode + " | Audience: " + audienceFlavor() + " | Task: " + getTask());
    lines.push("");
    ["productivity","discovery","litreview","data","genai_images","genai_audio","genai_video"].forEach(function(cat){
      var sel = selections[cat];
      lines.push(cat + ": " + (sel ? (sel.label + " (" + sel.url + ")") : "Not selected"));
    });
    lines.push("");
    lines.push("Note: I’ll avoid FERPA-protected data, verify claims with sources, and document AI use where appropriate.");
    lines.push("");
    lines.push("Thanks!");
    return lines.join("\\n");
  }

  function buildPromptPack(){
    var topic = getTopic() || "[your course/research topic]";
    var aud = audienceFlavor();
    var task = getTask();
    var focus = state.focus;
    var M = modeFlavor();

    function toolLabel(cat){ return selections[cat] ? selections[cat].label : "(not selected)"; }

    var lines = [];
    lines.push("Faculty Prompt Pack");
    lines.push("Topic: " + topic);
    lines.push("Focus: " + focus + " | Mode: " + M.label + " | Audience: " + aud + " | Task: " + task);
    lines.push("------------------------------------------------------------");
    lines.push("");

    lines.push("A) Course/teaching prompts (use when Focus includes A/C)");
    lines.push("- “Design a lesson plan for " + aud + " on " + topic + ". Include objectives, activity, materials, and an exit ticket.”");
    lines.push("- “Create an AI-resilient assignment on " + topic + " with process checkpoints and a disclosure statement option.”");
    lines.push("- “Draft an analytic rubric for [assignment] with 4 criteria and 4 performance levels.”");
    lines.push("");

    lines.push("B) Research prompts (use when Focus includes B/C)");
    lines.push("- “Create a literature mapping plan for " + topic + " with 4 themes and keywords for each.”");
    lines.push("- “Draft a structured outline (IMRaD or humanities equivalent) for a paper on " + topic + " and identify needed evidence.”");
    lines.push("- “Write a revision plan responding to 3 reviewer critiques (clarity, method, contribution).”");
    lines.push("");

    lines.push("D) Admin/assessment prompts (use when Focus includes D/C)");
    lines.push("- “Create an outcomes → measures → evidence matrix for [program/course]. Include timeline and responsible roles.”");
    lines.push("- “Draft an executive summary template for assessment results with charts and decision points.”");
    lines.push("- “Build a claims-to-evidence table for accreditation: claim, evidence, location, gaps.”");
    lines.push("");

    lines.push("Tool-specific nudge:");
    lines.push("- Productivity (" + toolLabel("productivity") + "): “Rewrite for clarity, supportive tone, and enforceable policy language.”");
    lines.push("- Discovery (" + toolLabel("discovery") + "): “Give 10 keywords + 5 seminal authors + 5 key journals for " + topic + ".”");
    lines.push("- Lit Review (" + toolLabel("litreview") + "): “Extract methods, measures, findings, limitations into a comparison table.”");
    lines.push("- Data (" + toolLabel("data") + "): “Propose 3 visuals + a reporting narrative for assessment data (anonymized).”");
    lines.push("- GenAI (optional): “Create non-photoreal visuals; include accessibility (alt text/captions).”");
    lines.push("");

    lines.push("Responsible use:");
    lines.push("- “List all factual claims in my draft and what evidence I need to verify each.”");
    lines.push("- “Generate a short disclosure statement appropriate for my syllabus/assignment.”");

    return lines.join("\\n");
  }

  function buildPolicyPack(){
    // Syllabus + policy templates (3 strictness levels) + disclosure + FERPA
    var topic = getTopic() || "[course/topic]";
    var aud = audienceFlavor();
    var focus = state.focus;

    var lines = [];
    lines.push("Syllabus + AI Policy Pack (Template)");
    lines.push("Course/topic: " + topic + " | Audience/modality: " + aud + " | Focus: " + focus);
    lines.push("------------------------------------------------------------");
    lines.push("");

    lines.push("1) Short syllabus statement (choose one)");
    lines.push("Option A — Restrictive:");
    lines.push("“Use of generative AI tools is not permitted for graded work unless explicitly authorized for a specific task. If you are unsure, ask first. Unauthorized use may be treated as academic misconduct.”");
    lines.push("");
    lines.push("Option B — Guided:");
    lines.push("“Generative AI tools may be used for brainstorming, outlining, and revision support, but you are responsible for the content, accuracy, and citations. You must disclose AI use as described below.”");
    lines.push("");
    lines.push("Option C — Open with accountability:");
    lines.push("“You may use generative AI tools to support your learning and workflow. However, you must (1) disclose use, (2) verify factual claims, and (3) cite sources. The final work must reflect your own reasoning.”");
    lines.push("");

    lines.push("2) Disclosure language (paste into assignments)");
    lines.push("“AI Use Disclosure: Describe what tool(s) you used, what you used them for, and what you changed or verified. Example: ‘I used an AI tool to generate an outline and revise phrasing. I verified factual claims using peer-reviewed sources and wrote the final analysis.’”");
    lines.push("");

    lines.push("3) FERPA / privacy note (faculty reminder)");
    lines.push("“Do not input identifiable student information (names, IDs, grades, emails) into third-party AI tools unless institutionally approved.”");
    lines.push("");

    lines.push("4) Example ‘allowed vs. not allowed’ (editable)");
    lines.push("Allowed: brainstorming topics; generating practice questions; grammar/style suggestions; outlining; converting notes into study guides.");
    lines.push("Not allowed (unless stated): generating final answers/analyses wholesale; submitting AI text as your own without disclosure; fabricating citations; using AI to impersonate others.");
    lines.push("");

    lines.push("5) Feedback & grading transparency (optional)");
    lines.push("“If AI-assisted feedback tools are used for formative comments, the instructor remains responsible for final evaluation and fairness.”");

    return lines.join("\\n");
  }

  function copyToClipboard(text){
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){ toast("Copied to clipboard!"); })
        .catch(function(){ fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text){
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast("Copied to clipboard!"); }
    catch(e){ toast("Copy failed. Please copy manually."); }
    document.body.removeChild(ta);
  }

  // URL hash
  function enc(s){ return encodeURIComponent(String(s || "")); }
  function dec(s){ try { return decodeURIComponent(String(s||"")); } catch(e){ return String(s||""); } }

  function currentHashObject(){
    var obj = {
      focus: state.focus,
      mode: state.mode,
      topic: getTopic(),
      audience: getAudience(),
      task: getTask(),
      ethics: state.ethicsOpen ? "1" : "0"
    };

    // Remember open inline details per scope
    Object.keys(state.openPanels || {}).forEach(function(k){
      if (state.openPanels[k]) obj["open_"+k] = state.openPanels[k];
    });

    // Remember compare selections per scope
    Object.keys(state.compare || {}).forEach(function(k){
      var arr = state.compare[k] || [];
      if (arr.length) obj["cmp_"+k] = arr.join("|");
    });
    Object.keys(selections).forEach(function(k){
      if (selections[k]) obj["sel_"+k] = selections[k].label;
    });
    return obj;
  }

  function writeHashFromState(){
    if (!state.urlSync) return; // URL updates are opt-in
    var obj = currentHashObject();
    var parts = [];
    Object.keys(obj).forEach(function(k){
      if (obj[k] === "" || obj[k] == null) return;
      parts.push(k + "=" + enc(obj[k]));
    });
    var newHash = parts.length ? ("#" + parts.join("&")) : "";
    if (window.location.hash !== newHash) {
      try { history.replaceState(null, "", window.location.pathname + window.location.search + newHash); }
      catch(e) { window.location.hash = newHash; }
    }
  }

  function parseHash(){
    var h = (window.location.hash || "").replace(/^#/, "").trim();
    if (!h) return {};
    var obj = {};
    h.split("&").forEach(function(pair){
      var idx = pair.indexOf("=");
      if (idx < 0) return;
      var k = pair.slice(0, idx);
      var v = pair.slice(idx+1);
      obj[k] = dec(v);
    });
    return obj;
  }

  function restoreFromHash(){
    var obj = parseHash();
    // If hash contains GenAI selections or compare/open state, auto-enable GenAI section
    try{
      var hasGen = false;
      ["genai_images","genai_audio","genai_video"].forEach(function(k){
        if (obj[k]) hasGen = true;
      
    try{
      if (window.location.hash && window.location.hash.length > 1){
        // Viewing a shared link: keep hash as-is but do not auto-update unless user clicks "Copy shareable link"
        var stopBtn = document.getElementById("aiTK-stopShareBtn");
        if (stopBtn) stopBtn.style.display = "";
      }
    }catch(e){}

  });
      Object.keys(obj).forEach(function(k){
        if (k.indexOf("cmp_genai_") === 0 || k.indexOf("open_genai_") === 0) hasGen = true;
      });
      if (hasGen){
        state.genaiEnabled = true;
        var gen = document.getElementById("aiTK-genai");
        if (gen) gen.classList.remove("aiTK-genaiSectionHidden");
        var btn = (ROOT||document).querySelector('[data-action="toggleGenAI"]');
        if (btn){ btn.setAttribute("aria-expanded","true"); btn.textContent="Hide Generative AI ▲"; }
      }
    }catch(e){}

    if (!obj || !Object.keys(obj).length) return;

    // focus/mode
    if (obj.focus && TASKS[obj.focus]) { state.focus = obj.focus; }
    if (obj.mode === "quick" || obj.mode === "assign" || obj.mode === "capstone") { state.mode = obj.mode; }

    // reflect UI focus/mode
    $all(".aiTK-focusBtn").forEach(function(btn){
      btn.classList.toggle("aiTK-focusActive", btn.getAttribute("data-focus") === state.focus);
    });
    $all(".aiTK-modeBtn").forEach(function(btn){
      btn.classList.toggle("aiTK-modeActive", btn.getAttribute("data-mode") === state.mode);
    });

    // inputs
    if (typeof obj.topic === "string") $("#aiTK-topic").value = obj.topic;
    if (obj.audience) $("#aiTK-audience").value = obj.audience;

    // tasks UI depends on focus
    setTaskUI();
    if (obj.task) {
      var tsel = $("#aiTK-task");
      // only set if exists
      var ok = Array.prototype.some.call(tsel.options, function(o){ return o.value === obj.task; });
      if (ok) tsel.value = obj.task;
    }

    // ethics
    setEthicsOpen(obj.ethics === "1");

    // selections
    Object.keys(selections).forEach(function(k){ selections[k] = null; });
    $all(".aiTK-card").forEach(function(c){ c.classList.remove("aiTK-selected"); });

    Object.keys(obj).forEach(function(key){
      if (key.indexOf("sel_") !== 0) return;
      var cat = key.replace("sel_", "");
      var label = obj[key];

      var card = null;
      if (cat.indexOf("genai_") === 0) {
        var sub = cat.replace("genai_", "");
        card = $all('.aiTK-card[data-category="genai"][data-subcategory="'+sub+'"]').find(function(c){
          return (c.getAttribute("data-label") || "") === label;
        });
        if (card) {
          card.classList.add("aiTK-selected");
          selections[cat] = { label: label, url: card.getAttribute("data-url") || "" };
        }
      } else {
        card = $all('.aiTK-card[data-category="'+cat+'"]').find(function(c){
          return (c.getAttribute("data-label") || "") === label;
        });
        if (card) {
          card.classList.add("aiTK-selected");
          selections[cat] = { label: label, url: card.getAttribute("data-url") || "" };
        }
      }
    });

    renderAllSelections();
    updateProjects();

    // Restore compare state from hash
    Object.keys(obj).forEach(function(key){
      if (key.indexOf("cmp_") !== 0) return;
      var scopeKey = key.replace("cmp_","");
      var raw = obj[key] || "";
      var arr = raw ? raw.split("|").map(function(s){ return s.trim(); }).filter(Boolean) : [];
      state.compare[scopeKey] = arr.slice(0,3);
      renderCompare(scopeKey);
    updateCompareCardVisuals(scopeKey);
    });

    // Restore open inline details panels (no scroll)
    Object.keys(obj).forEach(function(key){
      if (key.indexOf("open_") !== 0) return;
      var scopeKey = key.replace("open_","");
      var label = obj[key] || "";
      if (!label) return;

      // Find matching card
      var card = $all(".aiTK-card").find(function(c){
        return scopeKeyForCard(c) === scopeKey && (c.getAttribute("data-label") || "") === label;
      });
      if (card) {
        // ensure per-section close happens properly without scrolling
        openInlineDetailsFromCard(card, { noScroll: true });
      }
    });

  }

  // Reset
  function resetAll(){
    Object.keys(selections).forEach(function(k){ selections[k] = null; });
    $all(".aiTK-card").forEach(function(c){ c.classList.remove("aiTK-selected"); });

    $("#aiTK-topic").value = "";
    $("#aiTK-audience").value = "auto";

    setFocus("A");
    setMode("quick");
    setEthicsOpen(false);
    closeDrawer();
    state.openPanels = {};
    state.compare = {};
    $all(".aiTK-compareWrap").forEach(function(w){ w.style.display = "none"; var g=w.querySelector(".aiTK-compareGrid"); if(g) g.innerHTML=""; });
    renderAllSelections();
    updateProjects(true);

    try { history.replaceState(null, "", window.location.pathname + window.location.search); }
    catch(e) { window.location.hash = ""; }

    toast("Reset complete.");
  }

  // Events
  ((ROOT||document)).addEventListener("click", function(e){
    // Normalize target (LibGuides sometimes yields text nodes)
    var T = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;

    // Copy workflow plan
    if (T && (T.id === "aiTK-copyPlanBtn" || (T.closest && T.closest("#aiTK-copyPlanBtn")))) {
      e.preventDefault();
      var txt = buildWorkflowPlanText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).catch(function(){
          window.prompt("Copy your workflow plan:", txt);
        });
      } else {
        window.prompt("Copy your workflow plan:", txt);
      }
      return;
    }

    // Toggle reflection panel
    if (T && (T.id === "aiTK-reflectToggle" || (T.closest && T.closest("#aiTK-reflectToggle")))) {
      e.preventDefault();
      var panel = document.getElementById("aiTK-reflectPanel");
      var btn = document.getElementById("aiTK-reflectToggle");
      if (!panel || !btn) return;
      var open = (panel.style.display === "block");
      panel.style.display = open ? "none" : "block";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      btn.innerHTML = open ? "⚖️ Ethical &amp; Policy Reflection Prompts ▼" : "⚖️ Ethical &amp; Policy Reflection Prompts ▲";
      if (!open) {
        renderReflection();
        scrollIntoViewIfNeeded(btn, {behavior:"smooth", block:"nearest", margin:14});
      }
      return;
    }


    // Shareable link controls (opt-in URL state)
    if (T && (T.id === "aiTK-shareLinkBtn" || (T.closest && T.closest("#aiTK-shareLinkBtn")))) {
      e.preventDefault();
      state.urlSync = true;
      writeHashFromState();
      var stopBtn = document.getElementById("aiTK-stopShareBtn");
      if (stopBtn) stopBtn.style.display = "";
      // Copy URL (clipboard if available, else prompt)
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).catch(function(){
          window.prompt("Copy this link:", url);
        });
      } else {
        window.prompt("Copy this link:", url);
      }
      return;
    }

    if (T && (T.id === "aiTK-stopShareBtn" || (T.closest && T.closest("#aiTK-stopShareBtn")))) {
      e.preventDefault();
      state.urlSync = false;
      // Remove hash from URL without reloading
      try {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } catch(e){}
      var stopBtn2 = document.getElementById("aiTK-stopShareBtn");
      if (stopBtn2) stopBtn2.style.display = "none";
      return;
    }


    // Allow open links
    var a = T && T.closest("a");
    if (a && a.classList.contains("aiTK-open")) return;

    

    // Optional Generative AI: show/hide subsection
    var togGen = T && T.closest('[data-action="toggleGenAI"]');
    if (togGen) {
      e.preventDefault();
      e.stopPropagation();
      var gen = document.getElementById("aiTK-genai");
      if (!gen) return;

      state.genaiEnabled = !state.genaiEnabled;

      if (state.genaiEnabled) {
        gen.classList.remove("aiTK-genaiSectionHidden");
        togGen.setAttribute("aria-expanded", "true");
        togGen.textContent = "Hide Generative AI ▲";
        // anchor to GenAI section on open
        scrollIntoViewIfNeeded(gen, {behavior:"smooth", block:"start", margin:14});
      } else {
        // Clear GenAI selections + close any open panels/compare in those scopes
        ["genai_images","genai_audio","genai_video"].forEach(function(k){ selections[k] = null; });
        ["genai_images","genai_audio","genai_video"].forEach(function(k){
          // Clear open panels + compare state
          state.openPanels["genai_"+k.replace("genai_","")] = "";
          state.compare["genai_"+k.replace("genai_","")] = [];
        });

        gen.classList.add("aiTK-genaiSectionHidden");
        togGen.setAttribute("aria-expanded", "false");
        togGen.textContent = "Show Generative AI ▼";

        // Rerender + recount
        renderAllSelections();
        updatePickedCount();
        updateProjects();
        writeHashFromState();
      }
      return;
    }
// Collapse/expand tool picker (Choose Your Tools)
    var togPick = T && T.closest('[data-action="toggleToolPicker"]');
    if (togPick) {
      e.preventDefault();
      e.stopPropagation();
      var wrap = document.getElementById("aiTK-toolPickerWrap");
      if (!wrap) return;

      var isHidden = wrap.style.display === "none";
      wrap.style.display = isHidden ? "block" : "none";

      togPick.setAttribute("aria-expanded", isHidden ? "true" : "false");
      togPick.textContent = isHidden ? "Hide tool picker ▲" : "Show tool picker ▼";

      // When collapsing, anchor to the My Toolkit area to reduce scrolling
      if (!isHidden) {
        var side = (ROOT||document).querySelector(".aiTK-sideTitle") || (ROOT||document).querySelector(".aiTK-panel") || (ROOT||document).querySelector(".aiTK-sidebar");
        if (side) scrollIntoViewIfNeeded(side, {behavior:"smooth", block:"start", margin: 14});
      }
      return;
    }


    // Tooltip "More…" link opens inline details (and should NOT select the card)
    var tipMore = T && T.closest('[data-action="openInlineDetails"]');
    if (tipMore) {
      e.preventDefault();
      e.stopPropagation();
      var cardForTip = tipMore.closest(".aiTK-card");
      if (cardForTip) openInlineDetailsFromCard(cardForTip);
      return;
    }

    // Close inline details button
    var closeInline = T && T.closest('[data-action="closeInlineDetails"]');
    if (closeInline) {
      e.preventDefault();
      e.stopPropagation();
      var p = closeInline.closest(".aiTK-inlineDetails");
      
      
      if (p){
        var card = p.closest(".aiTK-card");
        if(card){
          card.classList.remove("aiTK-detailsOpen");
          state.openPanels[scopeKeyForCard(card)] = "";
        }

        
      
      p.style.display = "none";
      var c = p.closest(".aiTK-card");
      if(c){ c.classList.remove("aiTK-detailsOpen"); state.openPanels[scopeKeyForCard(c)] = ""; }

      var card = p.closest(".aiTK-card");
      if(card){
        var ind = card.querySelector(".aiTK-details .aiTK-detailsIndicator");
        if(ind) ind.textContent = "▼";
      }
    
        var card = p.closest(".aiTK-card");
        if(card){
          var ind = card.querySelector(".aiTK-details .aiTK-detailsIndicator");
          if(ind) ind.textContent = "▼";
        }
      }
    
      return;
    }


    // Compare button on card (side-by-side panel in the same section)
    var cmp = T && T.closest('[data-action="compare"]');
    if (cmp) {
      e.preventDefault();
      e.stopPropagation();
      var cardForCmp = cmp.closest(".aiTK-card");
      if (cardForCmp) toggleCompare(cardForCmp);
      return;
    }

    // Remove from compare (inside compare panel)
    var rm = T && T.closest('[data-action="removeCompare"]');
    if (rm) {
      e.preventDefault();
      var scope = rm.getAttribute("data-scope");
      var label = rm.getAttribute("data-label");
      ensureCompareStateForScope(scope);
      state.compare[scope] = (state.compare[scope] || []).filter(function(x){ return x !== label; });
      renderCompare(scope);
      updateCompareCardVisuals(scope);
      return;
    }

    // Clear compare in a scope
    var clr = T && T.closest('[data-action="clearCompare"]');
    if (clr) {
      e.preventDefault();
      var scope2 = clr.getAttribute("data-scope");
      state.compare[scope2] = [];
      updateCompareCardVisuals(scope2);
      renderCompare(scope2);
      toast("Compare cleared.");
      return;
    }


    // Details link
    var details = T && T.closest('a.aiTK-details');
    if (details) {
      e.preventDefault();
      e.stopPropagation();
      var cardForDetails = details.closest(".aiTK-card");
      if (cardForDetails) openInlineDetailsFromCard(cardForDetails);
      return;
    }

    // Drawer close
    if (T && T.id === "aiTK-drawerClose") { closeDrawer(); return; }

    // Ethics toggle
    var eth = T && T.closest('[data-action="toggleEthics"]');
    if (eth) { setEthicsOpen(!state.ethicsOpen); return; }

    // Mode
    var modeBtn = T && T.closest(".aiTK-modeBtn");
    if (modeBtn) { setMode(modeBtn.getAttribute("data-mode")); return; }

    // Focus
    var focusBtn = T && T.closest(".aiTK-focusBtn");
    if (focusBtn) { setFocus(focusBtn.getAttribute("data-focus")); return; }

    // Card selection
    var card = T && T.closest(".aiTK-card");
    if (card) { selectCard(card); return; }

    // Exports
    if (T && T.id === "aiTK-copyToolkit") { copyToClipboard(buildToolkitText()); return; }
    if (T && T.id === "aiTK-copyChecklist") { copyToClipboard(buildChecklistText()); return; }
    if (T && T.id === "aiTK-copyEmail") { copyToClipboard(buildEmailBlurb()); return; }
    if (T && T.id === "aiTK-copyPromptPack") { copyToClipboard(buildPromptPack()); return; }
    if (T && T.id === "aiTK-copyPolicyPack") { copyToClipboard(buildPolicyPack()); return; }

    // Reset
    if (T && T.id === "aiTK-reset") { resetAll(); return; }
  });

  // Keyboard card selection
  ((ROOT||document)).addEventListener("keydown", function(e){
    if (e.key !== "Enter" && e.key !== " ") return;
    var card = T && T.closest(".aiTK-card");
    if (!card) return;
    e.preventDefault();
    selectCard(card);
  });

  // Input changes update projects + hash
  var inputsTimer = null;
  ((ROOT||document)).addEventListener("input", function(e){
    if (!e.target) return;
    if (e.target.id === "aiTK-topic") {
      window.clearTimeout(inputsTimer);
      inputsTimer = window.setTimeout(function(){
        updateProjects();
        writeHashFromState();
      }, 250);
    }
  });

  ((ROOT||document)).addEventListener("change", function(e){
    if (!e.target) return;
    if (e.target.id === "aiTK-audience" || e.target.id === "aiTK-task") {
      updateProjects();
      writeHashFromState();
    }
  });

  // Init
  applyTooltips();
  createCompareContainers();
  initScrollSpy();
  setTaskUI();
  renderAllSelections();
  updateProjects(true);
  restoreFromHash();

    // Load external rules (if configured), then refresh suggestions/reflection
    loadRulesFromUrl(function(){
      renderProjects(false);
      renderReflection();
    });
  var topic = $("#aiTK-topic");
  if (topic) topic.addEventListener("input", function(){ renderProjects(false);
    renderReflection(); });

  writeHashFromState();
})();
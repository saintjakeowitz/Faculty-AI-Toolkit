(function(){
  "use strict";

  // ==== CONFIG ====
  // Put this JSON next to index.html in your GitHub Pages repo (or change path).
  var RULES_URL = "./faculty_ai_toolkit_rules_megapack_v2_huge_ux.json";
  var LS_KEY = "faculty_ai_toolkit_state_v2";

  // Tool catalog (same as v1, plus short hover tips)
  var TOOLS = {
    productivity: [
      { key:"Microsoft Copilot", url:"https://copilot.microsoft.com/", meta:"Free (varies)", tip:"Microsoft’s AI assistant for drafting, summarizing, and quick productivity tasks." },
      { key:"ChatGPT", url:"https://chat.openai.com/", meta:"Free + paid", tip:"Conversational AI for brainstorming, outlining, drafting, and revising; verify factual claims." },
      { key:"Claude", url:"https://claude.ai/", meta:"Free + paid", tip:"Strong at long-form synthesis and rewriting; still requires source checking." },
      { key:"Google Gemini", url:"https://gemini.google.com/", meta:"Free + paid", tip:"Google’s assistant for drafting and multimodal prompts; cite sources and verify." },
      { key:"Perplexity", url:"https://www.perplexity.ai/", meta:"Free + paid", tip:"Search-centric assistant with citations; good for quick landscape scans." }
    ],
    discovery: [
      { key:"Semantic Scholar", url:"https://www.semanticscholar.org/", meta:"Free", tip:"Scholarly search engine with citation graphs; helpful for discovery and citation chaining." },
      { key:"ResearchRabbit", url:"https://www.researchrabbit.ai/", meta:"Free + paid", tip:"Citation-network exploration tool to map a field quickly." },
      { key:"Elicit", url:"https://elicit.org/", meta:"Free + paid", tip:"Find papers and extract key information into evidence tables; verify against originals." }
    ],
    litreview: [
      { key:"Scite", url:"https://scite.ai/", meta:"Free + paid", tip:"Shows how papers are cited (supporting/contrasting/mentioning) to evaluate claim strength." },
      { key:"Consensus", url:"https://consensus.app/", meta:"Free + paid", tip:"Summarizes research consensus; treat as a pointer, not a final authority." },
      { key:"NotebookLM", url:"https://notebooklm.google/", meta:"Free", tip:"Work with uploaded sources to summarize, connect themes, and generate study guides." }
    ],
    writing: [
      { key:"ChatGPT", url:"https://chat.openai.com/", meta:"Free + paid", tip:"Drafting, revision, and structure guidance; use as collaborator, not authority." },
      { key:"Claude", url:"https://claude.ai/", meta:"Free + paid", tip:"Long-form drafting and synthesis; good for constraints and rewriting." },
      { key:"Google Gemini", url:"https://gemini.google.com/", meta:"Free + paid", tip:"Drafting and multimodal prompts; best paired with citations and verification." }
    ],
    data: [
      { key:"Julius", url:"https://julius.ai/", meta:"Free + paid", tip:"Assist with interpreting datasets and creating analyses; validate methods and outputs." },
      { key:"Quadratic", url:"https://quadratic.ai/", meta:"Free + paid", tip:"Spreadsheet-like environment with code + analysis; supports reproducible workflows." },
      { key:"NotebookLM", url:"https://notebooklm.google/", meta:"Free", tip:"Organize notes and sources to support analysis and reporting." }
    ],
    gen_images: [
      { key:"Midjourney", url:"https://www.midjourney.com/home", meta:"Paid", tip:"High-quality image generation with strong style control; requires prompt iteration." },
      { key:"DALL-E", url:"https://openai.com/index/dall-e-3/", meta:"Paid/credits", tip:"Image generation for illustrations and diagrams; useful for concept art and non-photo visuals." },
      { key:"Stable Diffusion", url:"https://stablediffusionweb.com/", meta:"Free (varies)", tip:"Open ecosystem for image generation; capabilities depend on host/model." }
    ],
    gen_audio: [
      { key:"ElevenLabs (AI Voice Generator)", url:"https://elevenlabs.io/", meta:"Free + paid", tip:"Voice generation; be cautious with voice likeness and permissions." },
      { key:"Suno (AI Music Generator)", url:"https://www.suno.com/", meta:"Free + paid", tip:"Generates music from prompts; check licensing and intended use." },
      { key:"Audio AI (An AI Music Cleaner)", url:"https://www.audo.ai/", meta:"Free + paid", tip:"Audio cleanup and enhancement; good for noise reduction and clarity." }
    ],
    gen_video: [
      { key:"Runway", url:"https://runwayml.com/", meta:"Free + paid", tip:"Creative video generation and editing tools; good for short clips and experiments." },
      { key:"Pika Labs", url:"https://www.pikartai.com/labs/", meta:"Free + paid", tip:"Text/image-to-video generator; good for short stylized clips." },
      { key:"Sora", url:"https://openai.com/index/sora/", meta:"Paid/limited", tip:"Advanced video generation; availability and capabilities depend on access and policy." }
    ]
  };

  // ==== STATE ====
  var state = {
    focus: "both",
    mode: "quick",
    audience: "any",
    modality: "any",
    assessment: "any",
    bloom: "any",
    discipline: "any",
    topic: "",
    genaiEnabled: false,
    compareMode: false,
    pickerCollapsed: false,
    selections: {
      productivity:null, discovery:null, litreview:null, writing:null, data:null,
      gen_images:null, gen_audio:null, gen_video:null
    }
  };

  var RULES = [];
  var lastMatch = { ids: [], scored: [] };

  // ==== DOM ====
  var el = {
    focus: byId("focus"),
    goal: byId("goal"),
    audience: byId("audience"),
    modality: byId("modality"),
    assessment: byId("assessment"),
    bloom: byId("bloom"),
    discipline: byId("discipline"),
    topic: byId("topic"),
    genaiEnabled: byId("genaiEnabled"),
    resetBtn: byId("resetBtn"),
    copyLinkBtn: byId("copyLinkBtn"),
    collapsePickerBtn: byId("collapsePickerBtn"),
    compareToggleBtn: byId("compareToggleBtn"),
    toolSections: byId("toolSections"),
    toolPicker: byId("toolPicker"),
    summaryList: byId("summaryList"),
    suggestions: byId("suggestions"),
    rulesStatus: byId("rulesStatus"),
    matchNote: byId("matchNote"),
    scoreNote: byId("scoreNote"),
    chipRow: byId("chipRow"),
    savePill: byId("savePill"),
    toast: byId("toast"),
    kitStart: byId("kitStart")
  };

  function byId(id){ return document.getElementById(id); }

  // ==== UTIL ====
  function norm(s){ return (s||"").toString().trim().toLowerCase(); }
  function esc(s){
    return (s||"").toString()
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function uniq(arr){
    var out=[], seen={};
    for (var i=0;i<arr.length;i++){
      var k=arr[i];
      if (!k) continue;
      if (!seen[k]){ seen[k]=1; out.push(k); }
    }
    return out;
  }
  function toast(msg){
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ el.toast.classList.remove("show"); }, 1200);
  }

  function selectedToolLabels(){
    var out=[];
    Object.keys(state.selections).forEach(function(k){
      var t=state.selections[k];
      if (t && t.key) out.push(t.key);
    });
    return out;
  }
  function hasAny(list){
    var sel = selectedToolLabels().map(norm);
    return (list||[]).some(function(x){ return sel.indexOf(norm(x)) !== -1; });
  }
  function hasAll(list){
    var sel = selectedToolLabels().map(norm);
    return (list||[]).every(function(x){ return sel.indexOf(norm(x)) !== -1; });
  }

  function topicHasAny(arr){
    if (!arr || !arr.length) return false;
    var t = norm(state.topic);
    if (!t) return false;
    return arr.some(function(k){ return t.indexOf(norm(k)) !== -1; });
  }
  function topicHasAll(arr){
    if (!arr || !arr.length) return false;
    var t = norm(state.topic);
    if (!t) return false;
    return arr.every(function(k){ return t.indexOf(norm(k)) !== -1; });
  }

  // ==== MATCHING: hard constraints + soft scoring ====
  function hardPass(when){
    // If a field is present in "when", it is HARD.
    if (when.focus && when.focus.length && when.focus.indexOf(state.focus) === -1) return false;
    if (when.mode && when.mode.length && when.mode.indexOf(state.mode) === -1) return false;
    if (when.audience && when.audience.length && when.audience.indexOf(state.audience) === -1) return false;
    if (when.modality && when.modality.length && when.modality.indexOf(state.modality) === -1) return false;
    if (when.assessment && when.assessment.length && when.assessment.indexOf(state.assessment) === -1 && when.assessment.indexOf("any") === -1) return false;
    if (when.bloom && when.bloom.length && when.bloom.indexOf(state.bloom) === -1 && when.bloom.indexOf("any") === -1) return false;
    if (when.discipline && when.discipline.length && when.discipline.indexOf(state.discipline) === -1 && when.discipline.indexOf("any") === -1) return false;

    if (when.genai && typeof when.genai.enabled === "boolean"){
      if (state.genaiEnabled !== when.genai.enabled) return false;
    }

    if (when.anyTools && when.anyTools.length && !hasAny(when.anyTools)) return false;
    if (when.allTools && when.allTools.length && !hasAll(when.allTools)) return false;
    if (when.anyTools2 && when.anyTools2.length && !hasAny(when.anyTools2)) return false;
    if (when.allTools2 && when.allTools2.length && !hasAll(when.allTools2)) return false;

    // Topic in when is HARD (if specified)
    if (when.topicAny && when.topicAny.length && !topicHasAny(when.topicAny)) return false;
    if (when.topicAll && when.topicAll.length && !topicHasAll(when.topicAll)) return false;

    return true;
  }

  function scoreSoft(soft){
    if (!soft) return 0;
    var score = 0;

    // fields in soft are boosts, not requirements
    if (soft.topicAny && soft.topicAny.length && topicHasAny(soft.topicAny)) score += 12;
    if (soft.topicAll && soft.topicAll.length && topicHasAll(soft.topicAll)) score += 14;

    if (soft.anyTools && soft.anyTools.length && hasAny(soft.anyTools)) score += 10;
    if (soft.allTools && soft.allTools.length && hasAll(soft.allTools)) score += 12;

    if (soft.focus && soft.focus.length && soft.focus.indexOf(state.focus) !== -1) score += 3;
    if (soft.mode && soft.mode.length && soft.mode.indexOf(state.mode) !== -1) score += 3;
    if (soft.audience && soft.audience.length && soft.audience.indexOf(state.audience) !== -1) score += 3;
    if (soft.modality && soft.modality.length && soft.modality.indexOf(state.modality) !== -1) score += 3;
    if (soft.assessment && soft.assessment.length && soft.assessment.indexOf(state.assessment) !== -1) score += 3;
    if (soft.bloom && soft.bloom.length && soft.bloom.indexOf(state.bloom) !== -1) score += 3;
    if (soft.discipline && soft.discipline.length && soft.discipline.indexOf(state.discipline) !== -1) score += 3;

    return score;
  }

  function rankRules(){
    var scored = [];
    for (var i=0;i<RULES.length;i++){
      var r = RULES[i];
      var when = (r && r.when) ? r.when : {};
      if (!hardPass(when)) continue;
      var base = (r.priority || 0);
      // extra context boosts (even if not specified)
      var ctxBoost = 0;
      if (state.topic && state.topic.trim().length >= 8) ctxBoost += 2;
      if (state.discipline !== "any") ctxBoost += 1;
      if (state.bloom !== "any") ctxBoost += 1;
      if (state.assessment !== "any") ctxBoost += 1;
      if (state.genaiEnabled) ctxBoost += 1;

      var soft = scoreSoft(r.soft);
      var score = base + ctxBoost + soft;
      scored.push({ rule: r, score: score });
    }
    scored.sort(function(a,b){ return b.score - a.score; });
    return scored;
  }

  function buildSuggestions(){
    var ranked = rankRules();
    lastMatch.scored = ranked.slice(0, 18);
    lastMatch.ids = ranked.slice(0, 12).map(function(x){ return x.rule.id; });

    // Blend ideas from top N rules (dedupe by title)
    var ideas = [];
    var seenTitle = {};
    for (var i=0; i<ranked.length && ideas.length < 8; i++){
      var r = ranked[i].rule;
      var add = r.addIdeas || [];
      for (var j=0; j<add.length && ideas.length < 8; j++){
        var it = add[j];
        var t = norm(it.title || "");
        if (!t) continue;
        if (seenTitle[t]) continue;
        seenTitle[t] = 1;
        ideas.push({ idea: it, from: r.id, score: ranked[i].score });
      }
    }

    if (!ideas.length){
      ideas.push({ idea: fallbackIdea(), from: "fallback", score: 0 });
    }
    return ideas.slice(0, state.compareMode ? 8 : 6);
  }

  function fallbackIdea(){
    var modeLabel = state.mode==="quick" ? "15–20 minute activity" : (state.mode==="assign" ? "assignment deliverable" : "capstone project");
    var t = state.topic ? (' on “'+state.topic+'”') : "";
    return {
      title: "Evidence-first workflow (starter template)",
      deliverable: modeLabel + t,
      steps: [
        "Use Discovery tools to find 5–10 credible sources and save citations.",
        "Use Lit Review tools to extract key claims/methods into an evidence table.",
        "Draft a synthesis using Writing tools with explicit citations.",
        "Verify claims against originals; document what changed and what remains uncertain."
      ],
      tags: uniq(["Fallback", state.focus, state.mode, state.discipline].filter(Boolean))
    };
  }

  // ==== RENDER ====
  function renderChips(){
    var chips = [
      "Focus: " + labelFocus(state.focus),
      "Goal: " + labelMode(state.mode),
      "Audience: " + labelAudience(state.audience),
      "Modality: " + labelModality(state.modality),
      "Assessment: " + labelAssessment(state.assessment),
      "Bloom: " + labelBloom(state.bloom),
      "Discipline: " + labelDiscipline(state.discipline)
    ];
    if (state.genaiEnabled) chips.push("GenAI: enabled");
    el.chipRow.innerHTML = chips.map(function(c){ return '<span class="chip">'+esc(c)+'</span>'; }).join("");
  }

  function renderToolSections(){
    var sections=[
      {id:"productivity", title:"General Productivity", badge:"1"},
      {id:"discovery", title:"Discovery", badge:"2"},
      {id:"litreview", title:"Literature Review", badge:"3"},
      {id:"writing", title:"Writing", badge:"4"},
      {id:"data", title:"Data / Visualization", badge:"5"},
      {id:"gen_images", title:"Generative AI — Images", badge:"GenAI"},
      {id:"gen_audio", title:"Generative AI — Audio", badge:"GenAI"},
      {id:"gen_video", title:"Generative AI — Video", badge:"GenAI"}
    ];
    el.toolSections.innerHTML="";

    sections.forEach(function(sec){
      var isGen = sec.id.indexOf("gen_")===0;
      if (isGen && !state.genaiEnabled) return;

      var wrap=document.createElement("div");
      wrap.className="section";

      var head=document.createElement("div");
      head.className="section__head";
      head.innerHTML='<h3 class="section__title">'+esc(sec.title)+'</h3><span class="badge">'+esc(sec.badge)+'</span>';
      wrap.appendChild(head);

      var opts=document.createElement("div");
      opts.className="options";

      (TOOLS[sec.id]||[]).slice(0,3).forEach(function(tool){
        var row=document.createElement("label");
        row.className="option";
        row.innerHTML =
          '<input type="radio" name="pick-'+esc(sec.id)+'" '+
          (state.selections[sec.id] && state.selections[sec.id].key===tool.key ? "checked" : "") +
          ' />' +
          '<div class="option__text">' +
            '<div class="tooltip" data-tip="'+esc(tool.tip||"")+'">' +
              '<a class="option__name" href="'+tool.url+'" target="_blank" rel="noopener">'+esc(tool.key)+'</a>' +
            '</div>' +
            '<div class="option__meta">'+esc(tool.meta||"")+'</div>' +
          '</div>';
        row.addEventListener("change", function(){
          state.selections[sec.id]=tool;
          saveState();
          renderAll({ scrollToKit: true });
        });
        opts.appendChild(row);
      });

      wrap.appendChild(opts);
      el.toolSections.appendChild(wrap);
    });
  }

  function renderSummary(){
    function li(label, tool){
      if (!tool) return "";
      return '<li><div class="muted">'+esc(label)+'</div><div><a href="'+tool.url+'" target="_blank" rel="noopener">'+esc(tool.key)+'</a></div></li>';
    }
    var html = "";
    html += li("Productivity", state.selections.productivity);
    html += li("Discovery", state.selections.discovery);
    html += li("Literature Review", state.selections.litreview);
    html += li("Writing", state.selections.writing);
    html += li("Data / Visualization", state.selections.data);
    if (state.genaiEnabled){
      html += li("GenAI — Images", state.selections.gen_images);
      html += li("GenAI — Audio", state.selections.gen_audio);
      html += li("GenAI — Video", state.selections.gen_video);
    }
    el.summaryList.innerHTML = html || '<li class="muted">Pick tools above to build your toolkit.</li>';
  }

  function renderSuggestions(){
    var hits = buildSuggestions();

    // why panel info
    el.matchNote.textContent = lastMatch.ids.length ? ("Matched rules: " + lastMatch.ids.slice(0,10).join(", ") + (lastMatch.ids.length>10 ? "…" : "")) : "Matched rules: (none)";
    if (lastMatch.scored.length){
      var top = lastMatch.scored.slice(0,5).map(function(x){ return x.rule.id + " (" + x.score + ")"; }).join(" • ");
      el.scoreNote.textContent = "Top scores: " + top;
    } else {
      el.scoreNote.textContent = "";
    }

    el.suggestions.classList.toggle("compare", !!state.compareMode);

    el.suggestions.innerHTML = hits.map(function(h){
      var idea = h.idea || {};
      var steps = (idea.steps || []).map(function(s){ return "<li>"+esc(s)+"</li>"; }).join("");
      var tags = (idea.tags || []).map(function(t){ return '<span class="tag">'+esc(t)+'</span>'; }).join("");
      var meta = idea.deliverable ? ("Deliverable: " + idea.deliverable) : "";
      var note = idea.note ? ('<div class="callout">'+esc(idea.note)+'</div>') : "";
      return ''+
        '<article class="idea">'+
          '<h4 class="idea__title">'+esc(idea.title || "Suggested activity")+'</h4>'+
          (meta ? '<p class="idea__meta">'+esc(meta)+'</p>' : '')+
          (steps ? '<ol class="idea__steps">'+steps+'</ol>' : '')+
          (tags ? '<div class="idea__tags">'+tags+'</div>' : '')+
          note +
          '<div class="muted" style="margin-top:8px;">Matched via: <code>'+esc(h.from)+'</code></div>'+
        '</article>';
    }).join("");
  }

  function renderPickerCollapsed(){
    if (!el.toolPicker) return;
    el.toolPicker.classList.toggle("is-collapsed", !!state.pickerCollapsed);
    if (el.collapsePickerBtn){
      el.collapsePickerBtn.textContent = state.pickerCollapsed ? "Show" : "Hide";
      el.collapsePickerBtn.setAttribute("aria-expanded", state.pickerCollapsed ? "false" : "true");
    }
  }

  function renderCompare(){
    if (!el.compareToggleBtn) return;
    el.compareToggleBtn.setAttribute("aria-pressed", state.compareMode ? "true" : "false");
  }

  function renderAll(opts){
    opts = opts || {};
    hydrateControls();
    renderChips();
    renderPickerCollapsed();
    renderCompare();
    renderToolSections();
    renderSummary();
    renderSuggestions();

    if (opts.scrollToKit){
      // gentle scroll to kit start to reduce hunting
      try{
        el.kitStart.scrollIntoView({ behavior:"smooth", block:"start" });
      }catch(e){}
    }
  }

  // ==== LABELS ====
  function labelFocus(v){
    return ({both:"Teaching+Research", teaching:"Teaching", research:"Research", program:"Program/Admin"}[v] || v);
  }
  function labelMode(v){
    return ({quick:"Quick", assign:"Assignment", capstone:"Capstone"}[v] || v);
  }
  function labelAudience(v){
    return ({any:"Any", "first-year":"First-year", upper:"Upper-level", grad:"Graduate", faculty:"Faculty", staff:"Staff"}[v] || v);
  }
  function labelModality(v){
    return ({any:"Any", f2f:"F2F", online:"Online", hybrid:"Hybrid", hyflex:"HyFlex"}[v] || v);
  }
  function labelAssessment(v){
    return ({any:"Any", rubric:"Rubric", peer:"Peer review", reflection:"Reflection", presentation:"Presentation", portfolio:"Portfolio", policy:"Policy"}[v] || v);
  }
  function labelBloom(v){
    return ({any:"Any", remember:"Remember", apply:"Apply", analyze:"Analyze", evaluate:"Evaluate", create:"Create"}[v] || v);
  }
  function labelDiscipline(v){
    return ({any:"Interdisciplinary", health:"Health/Nursing", stem:"STEM", social:"Social Sciences", humanities:"Humanities", business:"Business", education:"Education", library:"Library/Info", arts:"Arts/Media"}[v] || v);
  }

  // ==== RULES LOADER ====
  function loadRules(){
    el.rulesStatus.textContent = "Loading suggestion rules…";
    return fetch(RULES_URL, { cache:"no-store" })
      .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
      .then(function(data){
        if (!Array.isArray(data)) throw new Error("Rules JSON must be an array");
        RULES=data;
        el.rulesStatus.textContent = "Rules loaded ✓ ("+RULES.length+" rules)";
        renderSuggestions();
      })
      .catch(function(err){
        RULES=[];
        el.rulesStatus.textContent = "Rules failed to load (using built-in defaults).";
        // eslint-disable-next-line no-console
        console.warn("[AI Toolkit] Rules load failed:", err);
      });
  }

  // ==== SAVE/RESTORE ====
  function saveState(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      if (el.savePill){
        el.savePill.textContent = "Saved";
        clearTimeout(saveState._t);
        saveState._t = setTimeout(function(){ el.savePill.textContent = "Saved"; }, 200);
      }
    }catch(e){}
  }

  function loadState(){
    try{
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (!s || typeof s !== "object") return;
      // merge shallowly
      Object.keys(state).forEach(function(k){
        if (typeof s[k] === "undefined") return;
        if (k === "selections"){
          Object.keys(state.selections).forEach(function(cat){
            var key = s.selections && s.selections[cat] ? s.selections[cat].key : null;
            if (!key){ state.selections[cat]=null; return; }
            var tool = (TOOLS[cat]||[]).find(function(t){ return t.key === key; });
            state.selections[cat]=tool||null;
          });
        } else {
          state[k] = s[k];
        }
      });
    }catch(e){}
  }

  // Shareable URL (hash)
  function encodeStateToHash(){
    var p = JSON.parse(JSON.stringify(state));
    // strip hover text etc.
    try{
      Object.keys(p.selections||{}).forEach(function(cat){
        var obj = p.selections[cat];
        p.selections[cat] = obj ? { key: obj.key } : null;
      });
    }catch(e){}
    try{ return btoa(unescape(encodeURIComponent(JSON.stringify(p)))); }catch(e){ return ""; }
  }
  function decodeHash(h){
    try{ return JSON.parse(decodeURIComponent(escape(atob(h)))); }catch(e){ return null; }
  }
  function applyPayload(p){
    if (!p) return;
    // primitives
    ["focus","mode","audience","modality","assessment","bloom","discipline","topic","genaiEnabled","compareMode","pickerCollapsed"].forEach(function(k){
      if (typeof p[k] !== "undefined") state[k] = p[k];
    });
    // selections
    if (p.selections){
      Object.keys(state.selections).forEach(function(cat){
        var key = p.selections[cat] && p.selections[cat].key ? p.selections[cat].key : null;
        if (!key){ state.selections[cat]=null; return; }
        var tool = (TOOLS[cat]||[]).find(function(t){ return t.key === key; });
        state.selections[cat]=tool||null;
      });
    }
  }
  function readFromUrl(){
    var h=(location.hash||"").replace(/^#/,"");
    if (!h) return false;
    var p = decodeHash(h);
    if (!p) return false;
    applyPayload(p);
    return true;
  }
  function writeToUrl(){
    var h = encodeStateToHash();
    if (!h) return;
    history.replaceState(null,"","#"+h);
  }

  function hydrateControls(){
    el.focus.value = state.focus;
    el.goal.value = state.mode;
    el.audience.value = state.audience;
    el.modality.value = state.modality;
    el.assessment.value = state.assessment;
    el.bloom.value = state.bloom;
    el.discipline.value = state.discipline;
    el.topic.value = state.topic || "";
    el.genaiEnabled.checked = !!state.genaiEnabled;
  }

  // ==== EVENTS ====
  function wire(){
    el.focus.addEventListener("change", function(){ state.focus=el.focus.value; saveState(); renderAll({scrollToKit:true}); writeToUrl(); });
    el.goal.addEventListener("change", function(){ state.mode=el.goal.value; saveState(); renderAll({scrollToKit:true}); writeToUrl(); });
    el.audience.addEventListener("change", function(){ state.audience=el.audience.value; saveState(); renderAll({scrollToKit:true}); writeToUrl(); });
    el.modality.addEventListener("change", function(){ state.modality=el.modality.value; saveState(); renderAll({scrollToKit:true}); writeToUrl(); });
    el.assessment.addEventListener("change", function(){ state.assessment=el.assessment.value; saveState(); renderAll({scrollToKit:true}); writeToUrl(); });
    el.bloom.addEventListener("change", function(){ state.bloom=el.bloom.value; saveState(); renderAll({scrollToKit:true}); writeToUrl(); });
    el.discipline.addEventListener("change", function(){ state.discipline=el.discipline.value; saveState(); renderAll({scrollToKit:true}); writeToUrl(); });

    el.topic.addEventListener("input", function(){
      state.topic = el.topic.value || "";
      saveState();
      renderSuggestions();
      writeToUrl();
    });

    el.genaiEnabled.addEventListener("change", function(){
      state.genaiEnabled = !!el.genaiEnabled.checked;
      if (!state.genaiEnabled){
        state.selections.gen_images=null;
        state.selections.gen_audio=null;
        state.selections.gen_video=null;
      }
      saveState();
      renderAll({scrollToKit:true});
      writeToUrl();
    });

    el.resetBtn.addEventListener("click", function(){
      state.focus="both"; state.mode="quick"; state.audience="any"; state.modality="any";
      state.assessment="any"; state.bloom="any"; state.discipline="any";
      state.topic=""; state.genaiEnabled=false; state.compareMode=false; state.pickerCollapsed=false;
      Object.keys(state.selections).forEach(function(k){ state.selections[k]=null; });
      saveState();
      location.hash="";
      renderAll();
      toast("Reset.");
    });

    el.copyLinkBtn.addEventListener("click", function(){
      writeToUrl();
      var link = location.href;
      copyText(link);
      toast("Share link copied.");
    });

    el.collapsePickerBtn.addEventListener("click", function(){
      state.pickerCollapsed = !state.pickerCollapsed;
      saveState();
      renderPickerCollapsed();
      toast(state.pickerCollapsed ? "Tool picker hidden." : "Tool picker shown.");
      writeToUrl();
    });

    el.compareToggleBtn.addEventListener("click", function(){
      state.compareMode = !state.compareMode;
      saveState();
      renderAll();
      toast(state.compareMode ? "Compare mode on." : "Compare mode off.");
      writeToUrl();
    });

    window.addEventListener("hashchange", function(){
      if (readFromUrl()){
        saveState();
        renderAll();
      }
    });
  }

  function copyText(t){
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).catch(function(){});
      return;
    }
    var ta=document.createElement("textarea");
    ta.value=t;
    ta.style.position="fixed";
    ta.style.left="-9999px";
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand("copy"); }catch(e){}
    document.body.removeChild(ta);
  }

  // ==== DEBUG ====
  window.aiTKDebug = {
    getState: function(){ return JSON.parse(JSON.stringify(state)); },
    rulesCount: function(){ return Array.isArray(RULES)?RULES.length:0; },
    topRules: function(n){ n=n||10; return lastMatch.scored.slice(0,n).map(function(x){ return {id:x.rule.id, score:x.score}; }); }
  };

  // ==== INIT ====
  function init(){
    // priority: URL hash > localStorage
    var usedUrl = readFromUrl();
    if (!usedUrl){
      loadState();
    }

    hydrateControls();
    renderAll();
    wire();
    loadRules();

    // initial save (normalizes)
    saveState();
  }

  init();
})();
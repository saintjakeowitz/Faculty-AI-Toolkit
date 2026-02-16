(function(){
  var ROOT = document.getElementById("ai-toolkit");
  function $(sel, root){ return (root||ROOT||document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root||ROOT||document).querySelectorAll(sel)); }

  function escapeHtml(str){
    return String(str)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function scrollIntoViewIfNeeded(el, opts){
    if (!el) return;
    opts = opts || {};
    var behavior = opts.behavior || "smooth";
    var block    = opts.block    || "nearest";
    var margin   = (typeof opts.margin === "number") ? opts.margin : 14;
    try {
      var rect = el.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < margin || rect.bottom > (vh - margin)){
        el.scrollIntoView({ behavior: behavior, block: block });
      }
    } catch(e){}
  }

  // ─── State ───────────────────────────────────────────────────────────────────
  var selections = {
    productivity: null, discovery: null, litreview: null, data: null,
    genai_images: null, genai_audio: null, genai_video: null
  };

  var state = {
    focus: "A", mode: "quick",
    ethicsOpen: false, urlSync: false, genaiEnabled: false,
    openPanels: {}, compare: {}
  };

  // ─── Task options by focus ────────────────────────────────────────────────────
  var TASKS = {
    A: { label:"Teaching task", options:[
      {v:"auto",       t:"Auto (suggest a mix)"},
      {v:"course",     t:"Course design / redesign"},
      {v:"activity",   t:"Lesson plan / in-class activity"},
      {v:"discussion", t:"Discussion prompts / facilitation"},
      {v:"assignment", t:"Assignment creation / AI-resilient redesign"},
      {v:"rubric",     t:"Rubrics + exemplars"},
      {v:"feedback",   t:"Feedback workflows (formative)"},
      {v:"oer",        t:"OER / instructional materials"},
      {v:"access",     t:"Accessibility / UDL improvements"}
    ]},
    B: { label:"Research task", options:[
      {v:"auto",     t:"Auto (suggest a mix)"},
      {v:"lit",      t:"Literature review / scoping"},
      {v:"outline",  t:"Article / chapter outline"},
      {v:"grant",    t:"Grant proposal framing"},
      {v:"methods",  t:"Methods memo / study design"},
      {v:"revise",   t:"Revision plan / peer review response"},
      {v:"abstract", t:"Conference abstract / CFP response"},
      {v:"collab",   t:"Interdisciplinary collaboration mapping"}
    ]},
    C: { label:"Primary goal", options:[
      {v:"auto",           t:"Auto (balanced)"},
      {v:"teachfromresearch",t:"Turn research into teachable module"},
      {v:"sotl",           t:"SOTL study idea + classroom intervention"},
      {v:"scaffold",       t:"Scaffolded assignment that builds research notes"},
      {v:"materials",      t:"Teaching materials + publishable writing pipeline"},
      {v:"assessmentlite", t:"Lightweight assessment + course improvement loop"}
    ]},
    D: { label:"Admin / assessment task", options:[
      {v:"auto",      t:"Auto (suggest a mix)"},
      {v:"outcomes",  t:"Learning outcomes mapping"},
      {v:"assessment",t:"Program assessment plan"},
      {v:"accred",    t:"Accreditation narrative support"},
      {v:"survey",    t:"Survey / instrument drafting"},
      {v:"report",    t:"Reporting templates / executive summary"},
      {v:"comms",     t:"Department communications / outreach"},
      {v:"process",   t:"Workflow standardization / documentation"}
    ]}
  };

  function setTaskUI(){
    var cfg = TASKS[state.focus] || TASKS.A;
    var lbl = $("#aiTK-taskLabel"); if (lbl) lbl.textContent = cfg.label;
    var sel = $("#aiTK-task"); if (!sel) return;
    sel.innerHTML = "";
    cfg.options.forEach(function(o){
      var opt = document.createElement("option");
      opt.value = o.v; opt.textContent = o.t;
      sel.appendChild(opt);
    });
    sel.value = "auto";
  }

  // ─── Rules (loaded from GitHub/CDN) ─────────────────────────────────────────
  var RULES_VERSION = "remote (GitHub/LibGuides asset)";
  var RULES = [];
  var RULES_URL = "https://cdn.jsdelivr.net/gh/saintjakeowitz/Faculty-AI-Toolkit@main/faculty_ai_toolkit_rules_megapack_v0_base_plus_v1_v2.json";

  function loadRulesFromUrl(cb){
    cb = cb || function(){};
    if (!RULES_URL || RULES_URL.indexOf("PASTE_PUBLIC_JSON_URL_HERE") !== -1){ return cb(false); }
    try {
      fetch(RULES_URL, { cache:"no-store" })
        .then(function(r){ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); })
        .then(function(data){
          if (!Array.isArray(data)) throw new Error("Rules JSON must be an array");
          RULES = data;
          RULES_VERSION = "remote (" + (new Date()).toISOString().slice(0,10) + ")";
          cb(true);
        })
        .catch(function(){ cb(false); });
    } catch(e){ cb(false); }
  }

  // ─── Rules helpers ────────────────────────────────────────────────────────────
  function focusKind(){
    if (state.focus==="A") return "teaching";
    if (state.focus==="B") return "research";
    if (state.focus==="C") return "both";
    if (state.focus==="D") return "program";
    return "both";
  }

  function normalizeLabel(x){ return String(x||"").toLowerCase().trim(); }

  function selectedToolLabels(){
    var out = [];
    Object.keys(selections).forEach(function(k){ if(selections[k]&&selections[k].label) out.push(String(selections[k].label)); });
    return out;
  }

  function hasToolLabel(label){
    var want = normalizeLabel(label);
    return selectedToolLabels().some(function(x){ return normalizeLabel(x)===want; });
  }
  function hasAny(labels){ if(!labels||!labels.length) return true; return labels.some(function(l){ return hasToolLabel(l); }); }
  function hasAll(labels){ if(!labels||!labels.length) return true; return labels.every(function(l){ return hasToolLabel(l); }); }

  function hasCategoryTools(catMap){
    if (!catMap) return true;
    var ok = true;
    Object.keys(catMap).forEach(function(cat){
      var labels = catMap[cat]; if(!labels||!labels.length) return;
      var sel = selections[cat]; if(!sel||!sel.label){ ok=false; return; }
      labels.forEach(function(l){ if(normalizeLabel(sel.label)!==normalizeLabel(l)) ok=false; });
    });
    return ok;
  }

  function matchGenAI(gen){
    if (!gen) return true;
    if (typeof gen.enabled==="boolean"){ if(!!state.genaiEnabled!==gen.enabled) return false; }
    function matchSlot(slotKey, arr){
      if(!arr||!arr.length) return true;
      var sel = selections[slotKey];
      if(!sel||!sel.label) return false;
      return arr.some(function(l){ return normalizeLabel(sel.label)===normalizeLabel(l); });
    }
    if(!matchSlot("genai_images",gen.images)) return false;
    if(!matchSlot("genai_audio", gen.audio))  return false;
    if(!matchSlot("genai_video", gen.video))  return false;
    return true;
  }

  function matchRule(rule){
    if(!rule||!rule.when) return true;
    var w = rule.when;
    if(w.focus&&w.focus.length){ if(w.focus.indexOf(focusKind())===-1) return false; }
    if(w.mode&&w.mode.length){  if(w.mode.indexOf(state.mode)===-1)    return false; }
    
    // Check audience matching
    if(w.audience&&w.audience.length){ 
      var currentAudience = getAudience();
      if(currentAudience !== "auto" && w.audience.indexOf(currentAudience)===-1) return false; 
    }
    
    // Check task matching
    if(w.task&&w.task.length){ 
      var currentTask = getTask();
      if(currentTask !== "auto" && w.task.indexOf(currentTask)===-1) return false; 
    }
    
    if(!hasAny(w.anyTools))          return false;
    if(!hasAll(w.allTools))          return false;
    if(!hasCategoryTools(w.categoryTools)) return false;
    if(!matchGenAI(w.genai))         return false;
    return true;
  }

  function sortRules(rules){ return (rules||[]).slice().sort(function(a,b){ return (b.priority||0)-(a.priority||0); }); }

  function buildIdeasFromRules(){
    var ideas = [];
    sortRules(RULES).forEach(function(rule){ if(matchRule(rule)){ (rule.addIdeas||[]).forEach(function(idea){ ideas.push(idea); }); } });
    return ideas;
  }

  function buildExtraReflectionFromRules(){
    var extra = [];
    sortRules(RULES).forEach(function(rule){ if(matchRule(rule)){ (rule.addReflection||[]).forEach(function(x){ extra.push(x); }); } });
    return extra;
  }

  // ─── Reflection prompts ───────────────────────────────────────────────────────
  function buildReflectionPrompts(){
    var kind = focusKind();
    var prompts = [];
    prompts.push("Does this workflow involve student data, grades, accommodations, or other FERPA-covered information? If yes, what is your compliant alternative?");
    prompts.push("What steps will you use to verify factual claims, quotations, and citations before materials are shared or submitted?");
    prompts.push("How will you communicate authorship transparency (tool disclosure, attribution, and what work was done by humans)?");
    prompts.push("What risks of bias or uneven impact exist for your students/participants, and what mitigation steps will you add?");
    prompts.push("Which institutional/department policy statements apply here (AI guidance, IP, research integrity, data handling)?");
    if (kind==="teaching"||kind==="both"){
      prompts.push("How will you design the assessment so that learning evidence is observable without requiring AI use?");
      prompts.push("What is your plan if student AI use conflicts with the assignment's expectations (support, remediation, documentation)?");
    }
    if (kind==="research"||kind==="both"){
      prompts.push("Are you using AI tools in a way that could affect IRB considerations, confidentiality, or data governance?");
      prompts.push("How will you preserve reproducibility (search logs, prompts used, versioning, and decision trail)?");
    }
    if (kind==="program"){
      prompts.push("What evaluation metrics will you use to measure effectiveness and unintended consequences across cohorts or departments?");
    }
    return prompts;
  }

  function renderReflection(){
    var body = $("#aiTK-reflectBody"); if(!body) return;
    var prompts = buildReflectionPrompts();
    buildExtraReflectionFromRules().forEach(function(x){ prompts.push(x); });
    var html = '<ul class="aiTK-reflectList">';
    prompts.forEach(function(p){ html += '<li>' + escapeHtml(p) + '</li>'; });
    html += '</ul>';
    body.innerHTML = html;
  }

  // ─── Toast ────────────────────────────────────────────────────────────────────
  function toast(msg){
    var t = $("#aiTK-toast"); if(!t) return;
    t.textContent = msg; t.style.display = "block";
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function(){ t.style.display="none"; }, 1700);
  }

  // ─── Tooltips ─────────────────────────────────────────────────────────────────
  function applyTooltips(){
    $all(".aiTK-card").forEach(function(card){
      var desc = card.getAttribute("data-desc")||""; if(!desc) return;
      var nameLink = card.querySelector(".aiTK-cardTitle a"); if(!nameLink) return;
      if(nameLink.parentElement&&nameLink.parentElement.classList.contains("aiTK-tipWrap")) return;
      var wrap = document.createElement("span"); wrap.className = "aiTK-tipWrap";
      nameLink.parentNode.insertBefore(wrap, nameLink); wrap.appendChild(nameLink);
      var tip = document.createElement("span"); tip.className = "aiTK-tooltip";
      tip.innerHTML = escapeHtml(desc) + ' <a href="#" class="aiTK-tipMore" data-action="openInlineDetails">More\u2026</a>';
      wrap.appendChild(tip);
      nameLink.setAttribute("tabindex","0");
      nameLink.setAttribute("aria-label",(nameLink.textContent||"Tool")+". "+desc);
    });
  }

  // ─── Scope key helpers ────────────────────────────────────────────────────────
  function scopeKeyForCard(card){
    var cat = (card.getAttribute("data-category")||"").toLowerCase();
    if(cat!=="genai") return cat;
    var sub = (card.getAttribute("data-subcategory")||"").toLowerCase();
    return "genai_"+sub;
  }

  function ensureCompareStateForScope(scopeKey){ if(!state.compare[scopeKey]) state.compare[scopeKey]=[]; }

  // ─── Compare containers ───────────────────────────────────────────────────────
  function createCompareContainers(){
    [["productivity","aiTK-prod"],["discovery","aiTK-disc"],["litreview","aiTK-lit"],["data","aiTK-data"]].forEach(function(pair){
      var scopeKey=pair[0], sectionId=pair[1];
      var section=document.getElementById(sectionId); if(!section) return;
      if(section.querySelector('.aiTK-compareWrap[data-scope="'+scopeKey+'"]')) return;
      var wrap=document.createElement("div"); wrap.className="aiTK-compareWrap"; wrap.setAttribute("data-scope",scopeKey); wrap.style.display="none";
      wrap.innerHTML='<div class="aiTK-compareHeader"><div><p class="aiTK-compareTitle">Compare tools</p><div class="aiTK-compareHint">Add up to 3 tools to compare side-by-side.</div></div><button type="button" class="aiTK-btn" data-action="clearCompare" data-scope="'+scopeKey+'">Clear</button></div><div class="aiTK-compareGrid"></div>';
      var head=section.querySelector(".aiTK-sectionHead");
      if(head&&head.parentNode) head.parentNode.insertBefore(wrap,head.nextSibling);
    });

    ["images","audio","video"].forEach(function(sub){
      var scopeKey="genai_"+sub;
      var section=document.getElementById("aiTK-genai"); if(!section) return;
      if(section.querySelector('.aiTK-compareWrap[data-scope="'+scopeKey+'"]')) return;
      var titleText=sub.charAt(0).toUpperCase()+sub.slice(1);
      var titles=$all(".aiTK-subsectionTitle",section);
      var titleEl=null;
      for(var i=0;i<titles.length;i++){ if((titles[i].textContent||"").trim().toLowerCase()===titleText.toLowerCase()){ titleEl=titles[i]; break; } }
      if(!titleEl) return;
      var wrap=document.createElement("div"); wrap.className="aiTK-compareWrap"; wrap.setAttribute("data-scope",scopeKey); wrap.style.display="none";
      wrap.innerHTML='<div class="aiTK-compareHeader"><div><p class="aiTK-compareTitle">Compare '+escapeHtml(titleText)+' tools</p><div class="aiTK-compareHint">Add up to 3 tools to compare quickly.</div></div><button type="button" class="aiTK-btn" data-action="clearCompare" data-scope="'+scopeKey+'">Clear</button></div><div class="aiTK-compareGrid"></div>';
      if(titleEl.parentNode) titleEl.parentNode.insertBefore(wrap,titleEl.nextSibling);
    });
  }

  function renderCompare(scopeKey){
    var wrap=$all('.aiTK-compareWrap[data-scope="'+scopeKey+'"]',ROOT||document)[0]; if(!wrap) return;
    ensureCompareStateForScope(scopeKey);
    var list=state.compare[scopeKey].slice(0,3);
    if(!list.length){ wrap.style.display="none"; wrap.querySelector(".aiTK-compareGrid").innerHTML=""; return; }
    var wasHidden=(wrap.style.display==="none");
    wrap.style.display="block";
    if(wasHidden) scrollIntoViewIfNeeded(wrap,{behavior:"smooth",block:"nearest",margin:14});
    var cards=[];
    $all(".aiTK-card").forEach(function(c){ if(scopeKeyForCard(c)!==scopeKey) return; if(list.indexOf(c.getAttribute("data-label")||"")>=0) cards.push(c); });
    var grid=wrap.querySelector(".aiTK-compareGrid");
    grid.innerHTML=cards.map(function(card){
      var label=card.getAttribute("data-label")||"Tool", url=card.getAttribute("data-url")||"";
      var best=card.getAttribute("data-best")||"—", prompts=card.getAttribute("data-prompts")||"—";
      var cost=card.getAttribute("data-cost")||"—", privacy=card.getAttribute("data-privacy")||"—";
      return '<div class="aiTK-compareCol">'+
        '<p class="aiTK-compareTool">'+(url?('<a href="'+escapeHtml(url)+'" target="_blank" rel="noopener">'+escapeHtml(label)+'</a>'):escapeHtml(label))+'</p>'+
        '<div class="aiTK-compareRow"><div class="aiTK-compareLabel">What it\'s good for</div><div class="aiTK-compareText">'+escapeHtml(best)+'</div></div>'+
        '<div class="aiTK-compareRow"><div class="aiTK-compareLabel">Quick prompts</div><div class="aiTK-compareText">'+escapeHtml(prompts)+'</div></div>'+
        '<div class="aiTK-compareRow"><div class="aiTK-compareLabel">Cost / Access</div><div class="aiTK-compareText">'+escapeHtml(cost)+'</div></div>'+
        '<div class="aiTK-compareRow"><div class="aiTK-compareLabel">Privacy note</div><div class="aiTK-compareText">'+escapeHtml(privacy)+'</div></div>'+
        '<button type="button" class="aiTK-compareRemove" data-action="removeCompare" data-scope="'+escapeHtml(scopeKey)+'" data-label="'+escapeHtml(label)+'">Remove</button>'+
        '</div>';
    }).join("");
    writeHashFromState();
  }

  function updateCompareCardVisuals(scopeKey){
    $all(".aiTK-card").forEach(function(card){
      if(scopeKeyForCard(card)!==scopeKey) return;
      var label=card.getAttribute("data-label")||"";
      ensureCompareStateForScope(scopeKey);
      var inCompare=(state.compare[scopeKey]||[]).indexOf(label)>=0;
      var badge=card.querySelector(".aiTK-compareBadge");
      if(inCompare){ card.classList.add("aiTK-inCompare"); if(!badge){ badge=document.createElement("div"); badge.className="aiTK-compareBadge"; badge.textContent="COMPARE"; card.appendChild(badge); } }
      else { card.classList.remove("aiTK-inCompare"); if(badge) badge.remove(); }
    });
  }

  function toggleCompare(card){
    var scopeKey=scopeKeyForCard(card); ensureCompareStateForScope(scopeKey);
    var label=card.getAttribute("data-label")||""; if(!label) return;
    var list=state.compare[scopeKey];
    var idx=list.indexOf(label);
    if(idx>=0){ list.splice(idx,1); toast("Removed from compare."); }
    else { if(list.length>=3){ toast("Compare supports up to 3 tools."); return; } list.push(label); toast("Added to compare."); }
    renderCompare(scopeKey); updateCompareCardVisuals(scopeKey);
  }

  // ─── Pick counts ──────────────────────────────────────────────────────────────
  function pickedCount(){ var n=0; Object.keys(selections).forEach(function(k){ if(selections[k]) n++; }); return n; }
  function requiredPickedCount(){ var n=0; ["productivity","discovery","litreview","data"].forEach(function(k){ if(selections[k]) n++; }); return n; }
  function optionalGenAICount(){ var n=0; ["genai_images","genai_audio","genai_video"].forEach(function(k){ if(selections[k]) n++; }); return n; }

  function updatePickedCount(){
    var reqEl=$("#aiTK-pickedReq"); if(reqEl) reqEl.textContent=String(requiredPickedCount());
    var optN=optionalGenAICount();
    var optWrap=$("#aiTK-pickedOptWrap"), optEl=$("#aiTK-pickedOpt");
    if(optEl) optEl.textContent=String(optN);
    if(optWrap) optWrap.style.display=optN?"inline":"none";
  }

  function linkify(sel){ return '<a href="'+escapeHtml(sel.url)+'" target="_blank" rel="noopener">'+escapeHtml(sel.label)+'</a>'; }

  function selectionLabel(k, fallback){ return selections[k] ? selections[k].label : (fallback||"—"); }

  function renderSelection(cat){
    var target=$("#aiTK-sel-"+cat); if(!target) return;
    var sel=selections[cat];
    if(!sel){ target.textContent="Not selected"; return; }
    target.innerHTML=linkify(sel);
  }

  function renderGenAISelection(){
    var target=$("#aiTK-sel-genai"); if(!target) return;
    var img=selections.genai_images, aud=selections.genai_audio, vid=selections.genai_video;
    target.innerHTML=
      '<div><strong>Images:</strong> '+(img?linkify(img):'Not selected')+'</div>'+
      '<div><strong>Audio:</strong> '+(aud?linkify(aud):'Not selected')+'</div>'+
      '<div><strong>Video:</strong> '+(vid?linkify(vid):'Not selected')+'</div>';
  }

  function renderAllSelections(){
    renderSelection("productivity"); renderSelection("discovery");
    renderSelection("litreview"); renderSelection("data"); renderGenAISelection();
    updatePickedCount();
  }

  // ─── Drawer (sidebar) ─────────────────────────────────────────────────────────
  function openDrawerFromCard(card){
    var drawer=$("#aiTK-drawer"); if(!drawer) return;
    var label=card.getAttribute("data-label")||"Tool", url=card.getAttribute("data-url")||"";
    var desc=card.getAttribute("data-desc")||"", best=card.getAttribute("data-best")||"";
    var prompts=card.getAttribute("data-prompts")||"", cost=card.getAttribute("data-cost")||"", privacy=card.getAttribute("data-privacy")||"";
    $("#aiTK-drawerTitle").textContent=label;
    $("#aiTK-drawerMeta").innerHTML=(url?('<a href="'+escapeHtml(url)+'" target="_blank" rel="noopener">'+escapeHtml(url)+'</a>'):'')+
      (desc?('<div style="margin-top:6px;">'+escapeHtml(desc)+'</div>'):'');
    $("#aiTK-drawerBest").textContent=best||"—";
    $("#aiTK-drawerPrompts").textContent=prompts||"—";
    $("#aiTK-drawerCost").textContent=cost||"—";
    $("#aiTK-drawerPrivacy").textContent=privacy||"—";
    drawer.style.display="block";
  }

  function closeDrawer(){ var d=$("#aiTK-drawer"); if(d) d.style.display="none"; }

  // ─── Inline details (under card) ─────────────────────────────────────────────
  function closeInlineDetailsInScope(scopeEl){
    var scope=scopeEl||ROOT||document;
    $all(".aiTK-inlineDetails",scope).forEach(function(p){
      p.style.display="none";
      var c=p.closest&&p.closest(".aiTK-card");
      if(c){
        c.classList.remove("aiTK-detailsOpen");
        state.openPanels[scopeKeyForCard(c)]="";
        var ind=c.querySelector(".aiTK-details .aiTK-detailsIndicator");
        if(ind) ind.textContent="▼";
      }
    });
  }

  function openInlineDetailsFromCard(card, opts){
    opts=opts||{}; if(!card) return;

    // Find or create panel
    var panel=card.querySelector(".aiTK-inlineDetails");
    var isOpen = panel && panel.style.display==="block";

    // If already open: close (toggle)
    if(isOpen){
      panel.style.display="none";
      card.classList.remove("aiTK-detailsOpen");
      state.openPanels[scopeKeyForCard(card)]="";
      var ind0=card.querySelector(".aiTK-details .aiTK-detailsIndicator"); if(ind0) ind0.textContent="▼";
      writeHashFromState();
      return;
    }

    // Close others in same section first
    var section=card.closest&&card.closest(".aiTK-section");
    closeInlineDetailsInScope(section);

    if(!panel){
      panel=document.createElement("div"); panel.className="aiTK-inlineDetails";
      var best=card.getAttribute("data-best")||"—", promptsTxt=card.getAttribute("data-prompts")||"—";
      var cost=card.getAttribute("data-cost")||"—", privacy=card.getAttribute("data-privacy")||"—";
      panel.innerHTML=
        '<div class="aiTK-inlineRow"><div class="aiTK-inlineLabel">What it\'s good for</div><div class="aiTK-inlineText"></div></div>'+
        '<div class="aiTK-inlineRow"><div class="aiTK-inlineLabel">Quick prompts</div><div class="aiTK-inlineText"></div></div>'+
        '<div class="aiTK-inlineRow"><div class="aiTK-inlineLabel">Cost / Access</div><div class="aiTK-inlineText"></div></div>'+
        '<div class="aiTK-inlineRow"><div class="aiTK-inlineLabel">Privacy note</div><div class="aiTK-inlineText"></div></div>'+
        '<div class="aiTK-inlineRow" style="margin-top:10px;"><button type="button" class="aiTK-btn" data-action="closeInlineDetails">Close details</button></div>';
      var rows=panel.querySelectorAll(".aiTK-inlineText");
      rows[0].textContent=best; rows[1].textContent=promptsTxt; rows[2].textContent=cost; rows[3].textContent=privacy;
      card.appendChild(panel);
    }

    panel.style.display="block";
    card.classList.add("aiTK-detailsOpen");
    state.openPanels[scopeKeyForCard(card)]=card.getAttribute("data-label")||"";
    var ind=card.querySelector(".aiTK-details .aiTK-detailsIndicator"); if(ind) ind.textContent="▲";

    if(!opts.noScroll) scrollIntoViewIfNeeded(panel,{behavior:"smooth",block:"nearest",margin:14});
    writeHashFromState();
  }

  // ─── Mode / focus / ethics ────────────────────────────────────────────────────
  function setMode(mode){
    state.mode=mode;
    $all(".aiTK-modeBtn").forEach(function(btn){ btn.classList.toggle("aiTK-modeActive",btn.getAttribute("data-mode")===mode); });
    updateProjects(); writeHashFromState();
  }

  function setFocus(f){
    state.focus=f;
    $all(".aiTK-focusBtn").forEach(function(btn){ btn.classList.toggle("aiTK-focusActive",btn.getAttribute("data-focus")===f); });
    setTaskUI(); updateProjects(); writeHashFromState();
  }

  function setEthicsOpen(open){
    state.ethicsOpen=!!open;
    var wrap=$("#aiTK-ethics"), header=wrap&&wrap.querySelector(".aiTK-ethicsHeader");
    if(!wrap||!header) return;
    wrap.className=state.ethicsOpen?"aiTK-ethicsOpen":"";
    header.setAttribute("aria-expanded",state.ethicsOpen?"true":"false");
    writeHashFromState();
  }

  // ─── Card selection ───────────────────────────────────────────────────────────
  function selectCard(card){
    var category=(card.getAttribute("data-category")||"").toLowerCase();
    var label=card.getAttribute("data-label"), url=card.getAttribute("data-url");
    if(!category||!label||!url) return;

    if(category!=="genai"){
      $all('.aiTK-card[data-category="'+category+'"]').forEach(function(c){ c.classList.remove("aiTK-selected"); });
      card.classList.add("aiTK-selected");
      selections[category]={label:label,url:url};
      renderSelection(category); updatePickedCount(); updateProjects(); writeHashFromState();
      return;
    }

    var sub=(card.getAttribute("data-subcategory")||"").toLowerCase(); if(!sub) return;
    var key="genai_"+sub;
    $all('.aiTK-card[data-category="genai"][data-subcategory="'+sub+'"]').forEach(function(c){ c.classList.remove("aiTK-selected"); });
    card.classList.add("aiTK-selected");
    selections[key]={label:label,url:url};
    renderGenAISelection(); updatePickedCount(); updateProjects(); writeHashFromState();
  }

  // ─── Scrollspy ────────────────────────────────────────────────────────────────
  function setActiveBubbleBySectionId(sectionId){
    var hash="#"+sectionId;
    $all(".aiTK-bubble").forEach(function(a){
      var tgt=a.getAttribute("data-target")||a.getAttribute("href");
      a.classList.toggle("aiTK-bubbleActive",tgt===hash);
    });
  }

  function initScrollSpy(){
    var sections=["aiTK-prod","aiTK-disc","aiTK-lit","aiTK-data","aiTK-genai"].map(function(id){ return document.getElementById(id); }).filter(Boolean);
    if(!sections.length) return;
    setActiveBubbleBySectionId(sections[0].id);
    if("IntersectionObserver" in window){
      var io=new IntersectionObserver(function(entries){
        var visible=entries.filter(function(e){ return e.isIntersecting; }).sort(function(a,b){ return (b.intersectionRatio||0)-(a.intersectionRatio||0); });
        if(visible.length) setActiveBubbleBySectionId(visible[0].target.id);
      },{threshold:[0.25,0.4,0.55,0.7],rootMargin:"-10% 0px -65% 0px"});
      sections.forEach(function(sec){ io.observe(sec); });
    }
  }

  // ─── Tool capabilities ────────────────────────────────────────────────────────
  function toolCaps(label){
    var t=(label||"").toLowerCase();
    if(t.indexOf("chatgpt")>=0)           return ["drafting","revision","prompting","coding-lite"];
    if(t.indexOf("claude")>=0)            return ["drafting","revision","longform-synthesis"];
    if(t.indexOf("copilot")>=0)           return ["drafting","office-workflow"];
    if(t.indexOf("gemini")>=0)            return ["drafting","google-workflow"];
    if(t.indexOf("perplexity")>=0)        return ["web-discovery","question-framing","source-triage"];
    if(t.indexOf("semantic scholar")>=0)  return ["scholarly-search","citation-chaining"];
    if(t.indexOf("researchrabbit")>=0)    return ["citation-mapping","reading-list"];
    if(t.indexOf("elicit")>=0)            return ["evidence-extraction","study-comparison"];
    if(t.indexOf("scite")>=0)             return ["citation-context","claim-checking"];
    if(t.indexOf("consensus")>=0)         return ["evidence-lookup","claim-synthesis"];
    if(t.indexOf("notebooklm")>=0)        return ["source-grounding","note-synthesis"];
    if(t.indexOf("quadratic")>=0)         return ["data-analysis","visualization"];
    if(t.indexOf("julius")>=0)            return ["data-analysis","visualization"];
    if(t.indexOf("midjourney")>=0||t.indexOf("dall")>=0||t.indexOf("stable diffusion")>=0) return ["image-generation"];
    if(t.indexOf("elevenlabs")>=0)        return ["voice-narration"];
    if(t.indexOf("suno")>=0||t.indexOf("audo")>=0) return ["audio-production"];
    if(t.indexOf("runway")>=0||t.indexOf("pika")>=0||t.indexOf("sora")>=0) return ["video-generation"];
    return ["general"];
  }

  function gatherCapabilities(){
    var caps=[];
    ["productivity","discovery","litreview","data","genai_images","genai_audio","genai_video"].forEach(function(k){ if(selections[k]) caps=caps.concat(toolCaps(selections[k].label)); });
    var seen={};
    return caps.filter(function(c){ if(seen[c]) return false; seen[c]=true; return true; });
  }

  function getTopic(){    return ($("#aiTK-topic")&&$("#aiTK-topic").value||"").trim(); }
  function getAudience(){ return ($("#aiTK-audience")&&$("#aiTK-audience").value)||"auto"; }
  function getTask(){     return ($("#aiTK-task")&&$("#aiTK-task").value)||"auto"; }

  function modeFlavor(){
    if(state.mode==="quick")  return {label:"Quick Start",  sources:"3–6",  output:"minimum viable",hours:"~15 min"};
    if(state.mode==="assign") return {label:"Work Session", sources:"8–15", output:"polished",       hours:"2–4 hours"};
    return                           {label:"Big Build",    sources:"18–35",output:"robust",          hours:"multi-week"};
  }

  function audienceFlavor(){
    var a=getAudience();
    if(a==="fy")     return "first-year / intro students";
    if(a==="ud")     return "upper-division undergrads";
    if(a==="grad")   return "graduate students";
    if(a==="mixed")  return "mixed skill levels";
    if(a==="online") return "online/asynchronous";
    if(a==="hybrid") return "hybrid";
    if(a==="hiload") return "high-enrollment";
    if(a==="seminar")return "seminar / small class";
    return "general";
  }

  function fmtTitle(base){ var t=getTopic(); return t?(base+": "+t):base; }

  // ─── Projects (suggestions) ───────────────────────────────────────────────────
  function renderProjects(forceEmpty){
    var box=$("#aiTK-projects"); if(!box) return;

    if(forceEmpty){
      box.innerHTML='<div class="aiTK-muted">Select tools + add a topic (optional) to see suggestions.</div>';
      return;
    }

    if(pickedCount()===0&&!getTopic()){
      var M0=modeFlavor(), aud0=audienceFlavor();
      box.innerHTML='<div class="aiTK-muted" style="margin-bottom:8px;">No tools selected yet — here are a few starter ideas.</div>'+
        '<div class="aiTK-proj"><div class="aiTK-projTitle">Course/Research Planning Prompt Pack</div>'+
        '<div class="aiTK-projMeta">Deliverable: copy-ready prompts/checklists &bull; '+escapeHtml(M0.output)+'</div>'+
        '<ul><li>Pick a single goal (lesson plan, lit review, assessment report, grant narrative).</li>'+
        '<li>Write 3 constraints: audience ('+escapeHtml(aud0)+'), length, and required sources/data.</li>'+
        '<li>Generate: outline → draft → revision checklist → ethics note.</li></ul></div>'+
        '<div class="aiTK-proj"><div class="aiTK-projTitle">AI-Resilient Activity Template</div>'+
        '<div class="aiTK-projMeta">Deliverable: reusable activity structure + rubric language &bull; '+escapeHtml(M0.output)+'</div>'+
        '<ul><li>Define what students must show (process evidence, citations, reflection).</li>'+
        '<li>Add checkpoints (proposal, annotated sources, draft, reflection).</li>'+
        '<li>Draft an AI disclosure/usage statement aligned to your policy stance.</li></ul></div>';
      return;
    }

    var caps=gatherCapabilities(), M=modeFlavor(), aud=audienceFlavor(), task=getTask(), focus=state.focus;
    function has(x){ return caps.indexOf(x)>=0; }

    var note='<div class="aiTK-muted" style="margin-bottom:8px;">'+
      (getTopic()?('Topic: <strong>'+escapeHtml(getTopic())+'</strong> &bull; '):'')+'Focus: <strong>'+escapeHtml(focus)+'</strong> &bull; Mode: <strong>'+escapeHtml(M.label)+'</strong> &bull; Audience: <strong>'+escapeHtml(aud)+'</strong></div>';

    var ideas=[];

    // Inject rule-based ideas first
    buildIdeasFromRules().forEach(function(idea){ ideas.push({title:idea.title||"",meta:idea.deliverable||"",steps:idea.steps||[]}); });

    // Built-in ideas
    if(focus==="A"||focus==="C"){
      ideas.push({
        title:fmtTitle("AI-Resilient Assignment Redesign"),
        meta:"Deliverable: prompt-resistant assignment + rubric + student guidance &bull; "+M.output,
        steps:[
          "Define the learning outcomes and what students must produce (artifact + process evidence).",
          "Add process checkpoints: proposal, annotated sources, draft with revision log, reflection.",
          "Write 'allowed vs. not allowed AI use' and a disclosure requirement.",
          "Create a rubric with criteria for evidence use, reasoning, and reflection.",
          has("image-generation")?"Optional: generate a simple diagram showing the workflow and checkpoints.":"Optional: add a one-page workflow diagram using basic shapes.",
          "Pilot with one prompt test: what would AI output look like vs. what you require?"
        ]
      });
      ideas.push({
        title:fmtTitle("Lesson Plan + Active Learning Activity"),
        meta:"Deliverable: 50–75 min plan, materials, and facilitation notes &bull; "+M.output,
        steps:[
          "Write a 1-sentence learning objective and 3 success indicators.",
          "Create a short pre-class reading guide or micro-lecture outline.",
          "Design an in-class activity (think-pair-share, case study, jigsaw, debate).",
          "Draft a 5-question formative check (exit ticket).",
          has("voice-narration")?"Optional: create an audio summary for accessibility + transcript.":"Optional: write a text-based accessibility summary."
        ]
      });
    }

    if(focus==="B"||focus==="C"){
      ideas.push({
        title:fmtTitle("Literature Landscape + Argument Map"),
        meta:"Deliverable: themed outline + key citations + gap statement &bull; Sources: "+M.sources,
        steps:[
          "Identify 4 themes/subfields and 2 anchor papers per theme.",
          "Extract key methods/findings into a comparison table.",
          has("citation-context")?"Use citation contexts to verify whether key claims are supported or contested.":"Spot-check contentious claims by reading abstracts and key sections.",
          "Draft a gap statement and 3 research questions (or hypotheses).",
          "Produce a 1–2 page argument map outlining your contribution."
        ]
      });
      ideas.push({
        title:fmtTitle("Grant/Proposal Framing"),
        meta:"Deliverable: aims + significance + approach sketch &bull; "+M.output,
        steps:[
          "Draft problem statement, stakes, and beneficiaries.",
          "Write 2–3 specific aims with measurable outcomes.",
          "Outline approach (methods, sample/data, analysis, feasibility).",
          "Add risks + mitigations; ethics considerations; timeline.",
          "Generate a reviewer-friendly abstract (plain language version optional)."
        ]
      });
    }

    if(focus==="D"||focus==="C"){
      ideas.push({
        title:fmtTitle("Assessment Matrix (Outcomes → Measures → Evidence)"),
        meta:"Deliverable: outcomes map + measurement plan + reporting template &bull; "+M.output,
        steps:[
          "List program/course outcomes and map each to 1–2 measures (direct/indirect).",
          "Draft a data collection schedule and responsible roles.",
          has("data-analysis")?"Plan analysis: descriptive stats + trend comparisons + 2–3 charts.":"Plan analysis: summary stats and clear visual reporting.",
          "Create a 1-page executive summary template for reporting results.",
          "Add an improvement loop: what decisions will data inform?"
        ]
      });
    }

    ideas=ideas.slice(0,5);

    box.innerHTML=note+ideas.map(function(p){
      var steps=(p.steps||[]).map(function(s){ return "<li>"+escapeHtml(s)+"</li>"; }).join("");
      return '<div class="aiTK-proj"><div class="aiTK-projTitle">'+escapeHtml(p.title)+'</div><div class="aiTK-projMeta">'+p.meta+'</div><ul>'+steps+'</ul></div>';
    }).join("");
  }

  function updateProjects(){
    renderProjects(false);
    renderReflection();
  }

  // ─── Workflow plan text ───────────────────────────────────────────────────────
  function buildWorkflowPlanText(){
    var kind=focusKind(), topic=getTopic(), M=modeFlavor(), aud=audienceFlavor();
    var lines=["Faculty AI Toolkit Plan","","Focus: "+kind,"Mode: "+(state.mode||"quick")];
    if(topic) lines.push("Topic: "+topic);
    lines.push("Audience: "+aud,"Output emphasis: "+M.output,"","Selected Tools:");
    lines.push("- Productivity: "+selectionLabel("productivity"));
    lines.push("- Discovery: "+selectionLabel("discovery"));
    lines.push("- Literature Review: "+selectionLabel("litreview"));
    lines.push("- Data/Visualization: "+selectionLabel("data"));
    var gi=selectionLabel("genai_images",""), ga=selectionLabel("genai_audio",""), gv=selectionLabel("genai_video","");
    if(gi||ga||gv) lines.push("- Generative AI (optional): "+[gi,ga,gv].filter(Boolean).join(" \u2022 "));
    lines.push("","Proposed Workflow:");
    if(kind==="teaching"||kind==="both"){
      lines.push("1. Define learning outcome(s) and the non-negotiable evidence students must show.");
      lines.push("2. Draft an AI use/disclosure stance for the activity.");
      lines.push("3. Build an AI-resilient structure: checkpoints + rubric language.");
      lines.push("4. Create support materials: model annotations, feedback comments, verification checklist.");
    }
    if(kind==="research"||kind==="both"){
      lines.push("1. Create a search plan: key terms, databases, inclusion/exclusion criteria.");
      lines.push("2. Run discovery + citation chaining; build a reading set.");
      lines.push("3. Extract evidence into a table and cluster themes for synthesis.");
      lines.push("4. Validate: spot-check quotes/claims; confirm citations; record conflicts.");
    }
    if(kind==="program"){
      lines.push("1. Identify program goals and assessment questions; define evidence sources.");
      lines.push("2. Map workflows and identify where AI tools might assist or introduce risk.");
      lines.push("3. Draft policy-aligned guidance + disclosure norms; establish review checkpoints.");
      lines.push("4. Build an implementation plan: pilot scope, evaluation metrics, documentation.");
    }
    lines.push("","Quality & Policy Checks:");
    lines.push("- Avoid student PII unless approved and FERPA-compliant.");
    lines.push("- Verify generated claims with primary sources.");
    lines.push("- Maintain authorship transparency: disclose tool use.");
    lines.push("- Check IP/copyright; ensure citations are correct.");
    return lines.join("\n");
  }

  // ─── Export builders ──────────────────────────────────────────────────────────
  function buildToolkitText(){
    var lines=["My Faculty AI Toolkit"];
    var topic=getTopic(); if(topic) lines.push("TOPIC/CONTEXT: "+topic);
    lines.push("FOCUS: "+state.focus,"MODE: "+state.mode,"AUDIENCE: "+getAudience(),"TASK: "+getTask(),"-------------------------");
    ["productivity","discovery","litreview","data","genai_images","genai_audio","genai_video"].forEach(function(cat){
      var sel=selections[cat];
      lines.push(cat.toUpperCase()+": "+(sel?(sel.label+" \u2014 "+sel.url):"(not selected)"));
    });
    return lines.join("\n");
  }

  function buildChecklistText(){
    var M=modeFlavor();
    var lines=["Faculty AI Workflow Checklist","Focus: "+state.focus+" | Mode: "+M.label+" | Audience: "+audienceFlavor()];
    if(getTopic()) lines.push("Topic: "+getTopic());
    lines.push("",
      "\u2610 Define goal (teaching/research/assessment) + success criteria",
      "\u2610 Draft or refine policy boundaries (FERPA, grading transparency, disclosure)",
      "\u2610 Build an outline/template for the deliverable",
      "\u2610 Gather sources/evidence ("+M.sources+" as a starting point if applicable)",
      "\u2610 Create the artifact (assignment/rubric/narrative/analysis)",
      "\u2610 Verify factual claims + align with institutional policy",
      "\u2610 Finalize: accessibility (captions/transcripts/alt text) + formatting");
    return lines.join("\n");
  }

  function buildEmailBlurb(){
    var topic=getTopic();
    var lines=["Subject: Faculty AI Toolkit selections"+(topic?" \u2014 "+topic:""),"","Hi,","",
      "Here are my Faculty AI Toolkit selections"+(topic?" for: "+topic:"")+".",
      "Focus: "+state.focus+" | Mode: "+state.mode+" | Audience: "+audienceFlavor()+" | Task: "+getTask(),""];
    ["productivity","discovery","litreview","data","genai_images","genai_audio","genai_video"].forEach(function(cat){
      var sel=selections[cat]; lines.push(cat+": "+(sel?(sel.label+" ("+sel.url+")"):"Not selected"));
    });
    lines.push("","Note: I'll avoid FERPA-protected data, verify claims with sources, and document AI use where appropriate.","","Thanks!");
    return lines.join("\n");
  }

  function buildPromptPack(){
    var topic=getTopic()||"[your course/research topic]", aud=audienceFlavor(), task=getTask(), focus=state.focus, M=modeFlavor();
    function tl(cat){ return selections[cat]?selections[cat].label:"(not selected)"; }
    var lines=["Faculty Prompt Pack","Topic: "+topic,"Focus: "+focus+" | Mode: "+M.label+" | Audience: "+aud+" | Task: "+task,
      "------------------------------------------------------------","",
      "A) Course/teaching prompts (use when Focus includes A/C)",
      '- "Design a lesson plan for '+aud+' on '+topic+'. Include objectives, activity, materials, and an exit ticket."',
      '- "Create an AI-resilient assignment on '+topic+' with process checkpoints and a disclosure statement option."',
      '- "Draft an analytic rubric for [assignment] with 4 criteria and 4 performance levels."',"",
      "B) Research prompts (use when Focus includes B/C)",
      '- "Create a literature mapping plan for '+topic+' with 4 themes and keywords for each."',
      '- "Draft a structured outline for a paper on '+topic+' and identify needed evidence."',
      '- "Write a revision plan responding to 3 reviewer critiques (clarity, method, contribution)."',"",
      "D) Admin/assessment prompts (use when Focus includes D/C)",
      '- "Create an outcomes \u2192 measures \u2192 evidence matrix for [program/course]. Include timeline and responsible roles."',
      '- "Draft an executive summary template for assessment results with charts and decision points."',
      '- "Build a claims-to-evidence table for accreditation: claim, evidence, location, gaps."',"",
      "Tool-specific nudge:",
      '- Productivity ('+tl("productivity")+'): "Rewrite for clarity, supportive tone, and enforceable policy language."',
      '- Discovery ('+tl("discovery")+'): "Give 10 keywords + 5 seminal authors + 5 key journals for '+topic+'."',
      '- Lit Review ('+tl("litreview")+'): "Extract methods, measures, findings, limitations into a comparison table."',
      '- Data ('+tl("data")+'): "Propose 3 visuals + a reporting narrative for assessment data (anonymized)."',
      '- GenAI (optional): "Create non-photoreal visuals; include accessibility (alt text/captions)."',"",
      "Responsible use:",
      '- "List all factual claims in my draft and what evidence I need to verify each."',
      '- "Generate a short disclosure statement appropriate for my syllabus/assignment."'];
    return lines.join("\n");
  }

  function buildPolicyPack(){
    var topic=getTopic()||"[course/topic]", aud=audienceFlavor(), focus=state.focus;
    var lines=["Syllabus + AI Policy Pack (Template)",
      "Course/topic: "+topic+" | Audience/modality: "+aud+" | Focus: "+focus,
      "------------------------------------------------------------","",
      '1) Short syllabus statement (choose one)',
      'Option A \u2014 Restrictive:',
      '"Use of generative AI tools is not permitted for graded work unless explicitly authorized for a specific task."',"",
      'Option B \u2014 Guided:',
      '"Generative AI tools may be used for brainstorming, outlining, and revision support, but you are responsible for the content, accuracy, and citations. You must disclose AI use as described below."',"",
      'Option C \u2014 Open with accountability:',
      '"You may use generative AI tools to support your learning and workflow. However, you must (1) disclose use, (2) verify factual claims, and (3) cite sources."',"",
      '2) Disclosure language (paste into assignments)',
      '"AI Use Disclosure: Describe what tool(s) you used, what you used them for, and what you changed or verified."',"",
      '3) FERPA / privacy note (faculty reminder)',
      '"Do not input identifiable student information into third-party AI tools unless institutionally approved."',"",
      '4) Example \'allowed vs. not allowed\'',
      'Allowed: brainstorming topics; generating practice questions; grammar/style suggestions; outlining.',
      'Not allowed (unless stated): generating final answers/analyses wholesale; submitting AI text without disclosure; fabricating citations.',"",
      '5) Feedback & grading transparency (optional)',
      '"If AI-assisted feedback tools are used for formative comments, the instructor remains responsible for final evaluation and fairness."'];
    return lines.join("\n");
  }

  // ─── Clipboard ────────────────────────────────────────────────────────────────
  function copyToClipboard(text){
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ toast("Copied to clipboard!"); }).catch(function(){ fallbackCopy(text); });
    } else { fallbackCopy(text); }
  }

  function fallbackCopy(text){
    var ta=document.createElement("textarea"); ta.value=text;
    ta.style.position="fixed"; ta.style.left="-9999px"; ta.style.top="-9999px";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); toast("Copied to clipboard!"); }
    catch(e){ toast("Copy failed. Please copy manually."); }
    document.body.removeChild(ta);
  }

  // ─── URL hash ─────────────────────────────────────────────────────────────────
  function enc(s){ return encodeURIComponent(String(s||"")); }
  function dec(s){ try{ return decodeURIComponent(String(s||"")); }catch(e){ return String(s||""); } }

  function currentHashObject(){
    var obj={focus:state.focus,mode:state.mode,topic:getTopic(),audience:getAudience(),task:getTask(),ethics:state.ethicsOpen?"1":"0"};
    Object.keys(state.openPanels||{}).forEach(function(k){ if(state.openPanels[k]) obj["open_"+k]=state.openPanels[k]; });
    Object.keys(state.compare||{}).forEach(function(k){ var arr=state.compare[k]||[]; if(arr.length) obj["cmp_"+k]=arr.join("|"); });
    Object.keys(selections).forEach(function(k){ if(selections[k]) obj["sel_"+k]=selections[k].label; });
    return obj;
  }

  function writeHashFromState(){
    if(!state.urlSync) return;
    var obj=currentHashObject(), parts=[];
    Object.keys(obj).forEach(function(k){ if(obj[k]===""||obj[k]==null) return; parts.push(k+"="+enc(obj[k])); });
    var newHash=parts.length?("#"+parts.join("&")):"";
    if(window.location.hash!==newHash){
      try{ history.replaceState(null,"",window.location.pathname+window.location.search+newHash); }
      catch(e){ window.location.hash=newHash; }
    }
  }

  function parseHash(){
    var h=(window.location.hash||"").replace(/^#/,"").trim(); if(!h) return {};
    var obj={};
    h.split("&").forEach(function(pair){
      var idx=pair.indexOf("="); if(idx<0) return;
      obj[pair.slice(0,idx)]=dec(pair.slice(idx+1));
    });
    return obj;
  }

  function restoreFromHash(){
    var obj=parseHash(); if(!obj||!Object.keys(obj).length) return;

    // Auto-enable GenAI section if hash contains GenAI selections or state
    try{
      var hasGen=false;
      ["genai_images","genai_audio","genai_video"].forEach(function(k){ if(obj["sel_"+k]) hasGen=true; });
      Object.keys(obj).forEach(function(k){ if(k.indexOf("cmp_genai_")===0||k.indexOf("open_genai_")===0) hasGen=true; });
      if(hasGen){
        state.genaiEnabled=true;
        var gen=document.getElementById("aiTK-genai");
        if(gen) gen.classList.remove("aiTK-genaiSectionHidden");
        var btn=(ROOT||document).querySelector('[data-action="toggleGenAI"]');
        if(btn){ btn.setAttribute("aria-expanded","true"); btn.textContent="Hide Generative AI \u25b2"; }
      }
    }catch(e){}

    // Show stop-sharing button if we have a hash
    if(window.location.hash&&window.location.hash.length>1){
      var stopBtn=document.getElementById("aiTK-stopShareBtn"); if(stopBtn) stopBtn.style.display="";
    }

    if(obj.focus&&TASKS[obj.focus]) state.focus=obj.focus;
    if(obj.mode==="quick"||obj.mode==="assign"||obj.mode==="capstone") state.mode=obj.mode;

    $all(".aiTK-focusBtn").forEach(function(btn){ btn.classList.toggle("aiTK-focusActive",btn.getAttribute("data-focus")===state.focus); });
    $all(".aiTK-modeBtn").forEach(function(btn){ btn.classList.toggle("aiTK-modeActive",btn.getAttribute("data-mode")===state.mode); });

    var topicEl=$("#aiTK-topic"); if(topicEl&&typeof obj.topic==="string") topicEl.value=obj.topic;
    var audEl=$("#aiTK-audience"); if(audEl&&obj.audience) audEl.value=obj.audience;

    setTaskUI();
    if(obj.task){
      var tsel=$("#aiTK-task");
      if(tsel&&Array.prototype.some.call(tsel.options,function(o){ return o.value===obj.task; })) tsel.value=obj.task;
    }

    setEthicsOpen(obj.ethics==="1");

    // Clear + restore selections
    Object.keys(selections).forEach(function(k){ selections[k]=null; });
    $all(".aiTK-card").forEach(function(c){ c.classList.remove("aiTK-selected"); });

    Object.keys(obj).forEach(function(key){
      if(key.indexOf("sel_")!==0) return;
      var cat=key.replace("sel_",""), label=obj[key], card=null;
      if(cat.indexOf("genai_")===0){
        var sub=cat.replace("genai_","");
        var found=$all('.aiTK-card[data-category="genai"][data-subcategory="'+sub+'"]');
        for(var i=0;i<found.length;i++){ if((found[i].getAttribute("data-label")||"")===label){ card=found[i]; break; } }
        if(card){ card.classList.add("aiTK-selected"); selections[cat]={label:label,url:card.getAttribute("data-url")||""}; }
      } else {
        var found2=$all('.aiTK-card[data-category="'+cat+'"]');
        for(var j=0;j<found2.length;j++){ if((found2[j].getAttribute("data-label")||"")===label){ card=found2[j]; break; } }
        if(card){ card.classList.add("aiTK-selected"); selections[cat]={label:label,url:card.getAttribute("data-url")||""}; }
      }
    });

    renderAllSelections(); updateProjects();

    // Restore compare state
    Object.keys(obj).forEach(function(key){
      if(key.indexOf("cmp_")!==0) return;
      var scopeKey=key.replace("cmp_","");
      var arr=(obj[key]||"").split("|").map(function(s){ return s.trim(); }).filter(Boolean).slice(0,3);
      state.compare[scopeKey]=arr;
      renderCompare(scopeKey); updateCompareCardVisuals(scopeKey);
    });

    // Restore open inline details (without scroll)
    Object.keys(obj).forEach(function(key){
      if(key.indexOf("open_")!==0) return;
      var scopeKey=key.replace("open_",""), label=obj[key]; if(!label) return;
      var allCards=$all(".aiTK-card");
      for(var i=0;i<allCards.length;i++){
        if(scopeKeyForCard(allCards[i])===scopeKey&&(allCards[i].getAttribute("data-label")||"")===label){
          openInlineDetailsFromCard(allCards[i],{noScroll:true}); break;
        }
      }
    });
  }

  // ─── Reset ────────────────────────────────────────────────────────────────────
  function resetAll(){
    Object.keys(selections).forEach(function(k){ selections[k]=null; });
    $all(".aiTK-card").forEach(function(c){ c.classList.remove("aiTK-selected"); });
    var ti=$("#aiTK-topic"); if(ti) ti.value="";
    var au=$("#aiTK-audience"); if(au) au.value="auto";
    setFocus("A"); setMode("quick"); setEthicsOpen(false); closeDrawer();
    state.openPanels={}; state.compare={};
    $all(".aiTK-compareWrap").forEach(function(w){ w.style.display="none"; var g=w.querySelector(".aiTK-compareGrid"); if(g) g.innerHTML=""; });
    renderAllSelections(); renderProjects(true); renderReflection();
    try{ history.replaceState(null,"",window.location.pathname+window.location.search); }catch(e){ window.location.hash=""; }
    toast("Reset complete.");
  }

  // ─── Event delegation ─────────────────────────────────────────────────────────
  (ROOT||document).addEventListener("click", function(e){
    var T=(e.target&&e.target.nodeType===3)?e.target.parentElement:e.target;
    if(!T) return;

    // Copy workflow plan
    if(T.id==="aiTK-copyPlanBtn"||(T.closest&&T.closest("#aiTK-copyPlanBtn"))){
      e.preventDefault();
      var txt=buildWorkflowPlanText();
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).catch(function(){ window.prompt("Copy your workflow plan:",txt); }); }
      else { window.prompt("Copy your workflow plan:",txt); }
      return;
    }

    // Toggle reflection panel
    if(T.id==="aiTK-reflectToggle"||(T.closest&&T.closest("#aiTK-reflectToggle"))){
      e.preventDefault();
      var rPanel=document.getElementById("aiTK-reflectPanel"), rBtn=document.getElementById("aiTK-reflectToggle");
      if(!rPanel||!rBtn) return;
      var rOpen=(rPanel.style.display==="block");
      rPanel.style.display=rOpen?"none":"block";
      rBtn.setAttribute("aria-expanded",rOpen?"false":"true");
      rBtn.innerHTML=rOpen?"\u2696\uFE0F Ethical &amp; Policy Reflection Prompts \u25bc":"\u2696\uFE0F Ethical &amp; Policy Reflection Prompts \u25b2";
      if(!rOpen){ renderReflection(); scrollIntoViewIfNeeded(rBtn,{behavior:"smooth",block:"nearest",margin:14}); }
      return;
    }

    // Shareable link
    if(T.id==="aiTK-shareLinkBtn"||(T.closest&&T.closest("#aiTK-shareLinkBtn"))){
      e.preventDefault();
      state.urlSync=true; writeHashFromState();
      var sBtn=document.getElementById("aiTK-stopShareBtn"); if(sBtn) sBtn.style.display="";
      var url=window.location.href;
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(function(){ toast("Link copied!"); }).catch(function(){ window.prompt("Copy this link:",url); }); }
      else { window.prompt("Copy this link:",url); }
      return;
    }

    // Stop sharing
    if(T.id==="aiTK-stopShareBtn"||(T.closest&&T.closest("#aiTK-stopShareBtn"))){
      e.preventDefault(); state.urlSync=false;
      try{ history.replaceState(null,document.title,window.location.pathname+window.location.search); }catch(e2){}
      var sBtn2=document.getElementById("aiTK-stopShareBtn"); if(sBtn2) sBtn2.style.display="none";
      return;
    }

    // Allow open/external links to pass through
    var aEl=T.closest&&T.closest("a");
    if(aEl&&aEl.classList.contains("aiTK-open")) return;

    // Toggle GenAI section
    var togGen=T.closest&&T.closest('[data-action="toggleGenAI"]');
    if(togGen){
      e.preventDefault(); e.stopPropagation();
      var genSec=document.getElementById("aiTK-genai"); if(!genSec) return;
      state.genaiEnabled=!state.genaiEnabled;
      if(state.genaiEnabled){
        genSec.classList.remove("aiTK-genaiSectionHidden");
        togGen.setAttribute("aria-expanded","true"); togGen.textContent="Hide Generative AI \u25b2";
        scrollIntoViewIfNeeded(genSec,{behavior:"smooth",block:"start",margin:14});
      } else {
        ["genai_images","genai_audio","genai_video"].forEach(function(k){ selections[k]=null; state.openPanels[k]=""; state.compare[k]=[]; });
        genSec.classList.add("aiTK-genaiSectionHidden");
        togGen.setAttribute("aria-expanded","false"); togGen.textContent="Show Generative AI \u25bc";
        renderAllSelections(); updatePickedCount(); updateProjects(); writeHashFromState();
      }
      return;
    }

    // Toggle tool picker
    var togPick=T.closest&&T.closest('[data-action="toggleToolPicker"]');
    if(togPick){
      e.preventDefault(); e.stopPropagation();
      var pickWrap=document.getElementById("aiTK-toolPickerWrap"); if(!pickWrap) return;
      var pickHidden=(pickWrap.style.display==="none");
      pickWrap.style.display=pickHidden?"block":"none";
      togPick.setAttribute("aria-expanded",pickHidden?"true":"false");
      togPick.textContent=pickHidden?"Hide tool picker \u25b2":"Show tool picker \u25bc";
      if(!pickHidden){
        var side=(ROOT||document).querySelector(".aiTK-sideTitle")||(ROOT||document).querySelector(".aiTK-panel");
        if(side) scrollIntoViewIfNeeded(side,{behavior:"smooth",block:"start",margin:14});
      }
      return;
    }

    // Tooltip "More…" → open inline details (no card select)
    var tipMore=T.closest&&T.closest('[data-action="openInlineDetails"]');
    if(tipMore){ e.preventDefault(); e.stopPropagation(); var cardForTip=tipMore.closest&&tipMore.closest(".aiTK-card"); if(cardForTip) openInlineDetailsFromCard(cardForTip); return; }

    // Close inline details button
    var closeInline=T.closest&&T.closest('[data-action="closeInlineDetails"]');
    if(closeInline){
      e.preventDefault(); e.stopPropagation();
      var ip=closeInline.closest&&closeInline.closest(".aiTK-inlineDetails");
      if(ip){
        ip.style.display="none";
        var ic=ip.closest&&ip.closest(".aiTK-card");
        if(ic){ ic.classList.remove("aiTK-detailsOpen"); state.openPanels[scopeKeyForCard(ic)]=""; var iind=ic.querySelector(".aiTK-details .aiTK-detailsIndicator"); if(iind) iind.textContent="▼"; }
      }
      return;
    }

    // Compare button
    var cmp=T.closest&&T.closest('[data-action="compare"]');
    if(cmp){ e.preventDefault(); e.stopPropagation(); var cardForCmp=cmp.closest&&cmp.closest(".aiTK-card"); if(cardForCmp) toggleCompare(cardForCmp); return; }

    // Remove from compare
    var rm=T.closest&&T.closest('[data-action="removeCompare"]');
    if(rm){ e.preventDefault(); var rmScope=rm.getAttribute("data-scope"), rmLabel=rm.getAttribute("data-label"); ensureCompareStateForScope(rmScope); state.compare[rmScope]=(state.compare[rmScope]||[]).filter(function(x){ return x!==rmLabel; }); renderCompare(rmScope); updateCompareCardVisuals(rmScope); return; }

    // Clear compare
    var clr=T.closest&&T.closest('[data-action="clearCompare"]');
    if(clr){ e.preventDefault(); var clrScope=clr.getAttribute("data-scope"); state.compare[clrScope]=[]; updateCompareCardVisuals(clrScope); renderCompare(clrScope); toast("Compare cleared."); return; }

    // Details link (inline)
    var detLink=T.closest&&T.closest('a.aiTK-details');
    if(detLink){ e.preventDefault(); e.stopPropagation(); var cardForDet=detLink.closest&&detLink.closest(".aiTK-card"); if(cardForDet) openInlineDetailsFromCard(cardForDet); return; }

    // Drawer close
    if(T.id==="aiTK-drawerClose"){ closeDrawer(); return; }

    // Ethics toggle
    var eth=T.closest&&T.closest('[data-action="toggleEthics"]');
    if(eth){ setEthicsOpen(!state.ethicsOpen); return; }

    // Mode buttons
    var modeBtn=T.closest&&T.closest(".aiTK-modeBtn");
    if(modeBtn){ setMode(modeBtn.getAttribute("data-mode")); return; }

    // Focus buttons
    var focusBtn=T.closest&&T.closest(".aiTK-focusBtn");
    if(focusBtn){ setFocus(focusBtn.getAttribute("data-focus")); return; }

    // Card selection (only if not clicking a link or button inside)
    if(aEl&&(aEl.classList.contains("aiTK-details")||aEl.classList.contains("aiTK-compareBtn")||aEl.getAttribute("href"))) return;
    var card=T.closest&&T.closest(".aiTK-card");
    if(card){ selectCard(card); return; }

    // Exports
    if(T.id==="aiTK-copyToolkit"){ copyToClipboard(buildToolkitText()); return; }
    if(T.id==="aiTK-copyChecklist"){ copyToClipboard(buildChecklistText()); return; }
    if(T.id==="aiTK-copyEmail"){ copyToClipboard(buildEmailBlurb()); return; }
    if(T.id==="aiTK-copyPromptPack"){ copyToClipboard(buildPromptPack()); return; }
    if(T.id==="aiTK-copyPolicyPack"){ copyToClipboard(buildPolicyPack()); return; }

    // Reset
    if(T.id==="aiTK-reset"){ resetAll(); return; }
  });

  // ─── Keyboard card selection ──────────────────────────────────────────────────
  (ROOT||document).addEventListener("keydown", function(e){
    if(e.key!=="Enter"&&e.key!==" ") return;
    var T=e.target; if(!T) return;
    var card=T.closest&&T.closest(".aiTK-card"); if(!card) return;
    e.preventDefault(); selectCard(card);
  });

  // ─── Input listeners ──────────────────────────────────────────────────────────
  var inputsTimer=null;
  (ROOT||document).addEventListener("input", function(e){
    if(!e.target||e.target.id!=="aiTK-topic") return;
    window.clearTimeout(inputsTimer);
    inputsTimer=window.setTimeout(function(){ updateProjects(); writeHashFromState(); }, 250);
  });

  (ROOT||document).addEventListener("change", function(e){
    if(!e.target) return;
    if(e.target.id==="aiTK-audience"||e.target.id==="aiTK-task"){ updateProjects(); writeHashFromState(); }
  });

  // ─── Init ─────────────────────────────────────────────────────────────────────
  applyTooltips();
  createCompareContainers();
  initScrollSpy();
  setTaskUI();
  renderAllSelections();
  renderProjects(true);
  restoreFromHash();

  loadRulesFromUrl(function(){
    renderProjects(false);
    renderReflection();
  });

  writeHashFromState();

})();

(function(){
  "use strict";

  // ---- CONFIG ----
  var RULES_URL = "./faculty_ai_toolkit_rules_megapack_v0_base_plus_v1_v2.json";

  var TOOLS = {
    productivity: [
      { key:"Microsoft Copilot", url:"https://copilot.microsoft.com/", meta:"Free (varies)", tip:"Microsoft’s AI assistant for drafting, summarizing, and quick productivity tasks." },
      { key:"ChatGPT", url:"https://chat.openai.com/", meta:"Free + paid", tip:"General-purpose conversational AI for brainstorming, outlining, drafting, and revising text; verify factual claims." },
      { key:"Claude", url:"https://claude.ai/", url2:"https://claude.ai/", meta:"Free + paid", tip:"Strong at long-form synthesis and careful rewriting; still requires source checking." },
      { key:"Google Gemini", url:"https://gemini.google.com/", meta:"Free + paid", tip:"Google’s assistant for drafting and multimodal prompts; best paired with verification and sources." },
      { key:"Perplexity", url:"https://www.perplexity.ai/", meta:"Free + paid", tip:"Search-centric assistant with citations; good for fast landscape scans and starting points." }
    ],
    discovery: [
      { key:"Semantic Scholar", url:"https://www.semanticscholar.org/", meta:"Free", tip:"Scholarly search engine with citation graphs; great for discovery and citation chaining." },
      { key:"ResearchRabbit", url:"https://www.researchrabbit.ai/", meta:"Free + paid", tip:"Citation-network exploration to discover related literature and map a field quickly." },
      { key:"Elicit", url:"https://elicit.org/", meta:"Free + paid", tip:"Helps find papers and extract key information into evidence tables; verify against originals." }
    ],
    litreview: [
      { key:"Scite", url:"https://scite.ai/", meta:"Free + paid", tip:"Shows how papers are cited (supporting/contrasting/mentioning) to evaluate claim strength." },
      { key:"Consensus", url:"https://consensus.app/", meta:"Free + paid", tip:"Summarizes research consensus for questions; treat as a pointer, not final authority." },
      { key:"NotebookLM", url:"https://notebooklm.google/", meta:"Free", tip:"Works with uploaded sources to summarize, connect themes, and generate study materials." }
    ],
    writing: [
      { key:"ChatGPT", url:"https://chat.openai.com/", meta:"Free + paid", tip:"Drafting, revision, tone/structure guidance; use as collaborator, not authority." },
      { key:"Claude", url:"https://claude.ai/", meta:"Free + paid", tip:"Long-form drafting and synthesis; good for constraints and rewriting." },
      { key:"Google Gemini", url:"https://gemini.google.com/", meta:"Free + paid", tip:"Drafting and multimodal prompts; cite sources and verify claims." }
    ],
    data: [
      { key:"Julius", url:"https://julius.ai/", meta:"Free + paid", tip:"Helps interpret datasets and create analyses; validate methods and outputs." },
      { key:"Quadratic", url:"https://quadratic.ai/", meta:"Free + paid", tip:"Spreadsheet-like environment with code + analysis; good for reproducible workflows." },
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

  var state = {
    focus: "both",
    mode: "quick",
    audience: "any",
    modality: "any",
    topic: "",
    genaiEnabled: false,
    selections: {
      productivity:null, discovery:null, litreview:null, writing:null, data:null,
      gen_images:null, gen_audio:null, gen_video:null
    }
  };

  var RULES = [];
  var matchedRuleIds = [];

  var el = {
    focus: document.getElementById("focus"),
    goal: document.getElementById("goal"),
    audience: document.getElementById("audience"),
    modality: document.getElementById("modality"),
    topic: document.getElementById("topic"),
    genaiEnabled: document.getElementById("genaiEnabled"),
    resetBtn: document.getElementById("resetBtn"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
    toolSections: document.getElementById("toolSections"),
    summaryList: document.getElementById("summaryList"),
    suggestions: document.getElementById("suggestions"),
    rulesStatus: document.getElementById("rulesStatus"),
    matchNote: document.getElementById("matchNote")
  };

  function norm(s){ return (s||"").toString().trim().toLowerCase(); }

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
  function matchTopicAny(arr){
    if (!arr || !arr.length) return true;
    var t = norm(state.topic);
    if (!t) return false;
    return arr.some(function(k){ return t.indexOf(norm(k)) !== -1; });
  }
  function matchTopicAll(arr){
    if (!arr || !arr.length) return true;
    var t = norm(state.topic);
    if (!t) return false;
    return arr.every(function(k){ return t.indexOf(norm(k)) !== -1; });
  }

  function matchRule(rule){
    var w = (rule && rule.when) ? rule.when : {};
    if (w.focus && w.focus.length && w.focus.indexOf(state.focus) === -1) return false;
    if (w.mode && w.mode.length && w.mode.indexOf(state.mode) === -1) return false;
    if (w.audience && w.audience.length && w.audience.indexOf(state.audience) === -1) return false;
    if (w.modality && w.modality.length && w.modality.indexOf(state.modality) === -1) return false;

    if (w.genai && typeof w.genai.enabled === "boolean"){
      if (state.genaiEnabled !== w.genai.enabled) return false;
    }

    if (!matchTopicAny(w.topicAny)) return false;
    if (!matchTopicAll(w.topicAll)) return false;

    if (w.anyTools && w.anyTools.length && !hasAny(w.anyTools)) return false;
    if (w.allTools && w.allTools.length && !hasAll(w.allTools)) return false;
    if (w.anyTools2 && w.anyTools2.length && !hasAny(w.anyTools2)) return false;
    if (w.allTools2 && w.allTools2.length && !hasAll(w.allTools2)) return false;

    return true;
  }

  function sortRules(arr){
    return (arr||[]).slice().sort(function(a,b){ return (b.priority||0)-(a.priority||0); });
  }

  function fallbackIdea(){
    var modeLabel = state.mode==="quick" ? "15–20 minute activity" : (state.mode==="assign" ? "assignment deliverable" : "capstone project");
    var t = state.topic ? (' on “'+state.topic+'”') : "";
    return {
      title: "Evidence-first workflow (starter template)",
      deliverable: modeLabel + t,
      steps: [
        "Use your Discovery tool to find 5–10 scholarly sources; save citations.",
        "Use your Literature Review tool to extract key claims into an evidence table.",
        "Draft a short synthesis using your Writing tool with explicit citations.",
        "Verify claims against originals; document changes and limitations."
      ],
      tags: ["Fallback", state.focus, state.mode].filter(Boolean)
    };
  }

  function buildSuggestions(){
    var hits=[];
    matchedRuleIds=[];
    var sorted = sortRules(RULES);
    for (var i=0;i<sorted.length;i++){
      var r=sorted[i];
      if (!matchRule(r)) continue;
      matchedRuleIds.push(r.id || ("r"+i));
      var ideas=r.addIdeas||[];
      for (var j=0;j<ideas.length;j++){
        hits.push(ideas[j]);
      }
      if (hits.length>=6) break;
    }
    if (!hits.length) hits=[fallbackIdea()];
    return hits.slice(0,6);
  }

  function esc(s){
    return (s||"").toString()
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
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
          sync();
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
    var ideas = buildSuggestions();
    el.matchNote.textContent = matchedRuleIds.length ? ("Matched rules: "+matchedRuleIds.slice(0,10).join(", ") + (matchedRuleIds.length>10?"…":"")) : "";
    el.suggestions.innerHTML = ideas.map(function(idea){
      var steps = (idea.steps||[]).map(function(s){ return "<li>"+esc(s)+"</li>"; }).join("");
      var tags = (idea.tags||[]).map(function(t){ return '<span class="tag">'+esc(t)+'</span>'; }).join("");
      return ''+
        '<article class="idea">'+
          '<h4 class="idea__title">'+esc(idea.title||"Suggested activity")+'</h4>'+
          (idea.deliverable ? '<p class="idea__meta">Deliverable: '+esc(idea.deliverable)+'</p>' : '')+
          (steps ? '<ol class="idea__steps">'+steps+'</ol>' : '')+
          (tags ? '<div class="idea__tags">'+tags+'</div>' : '')+
        '</article>';
    }).join("");
  }

  function sync(){
    renderToolSections();
    renderSummary();
    renderSuggestions();
    writeToUrl();
  }

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
        console.warn("[AI Toolkit] Rules load failed:", err);
      });
  }

  // URL share state
  function encodeState(){
    var p={focus:state.focus,mode:state.mode,audience:state.audience,modality:state.modality,topic:state.topic,genaiEnabled:!!state.genaiEnabled,sel:{}};
    Object.keys(state.selections).forEach(function(k){ p.sel[k]=state.selections[k]?state.selections[k].key:""; });
    try{ return btoa(unescape(encodeURIComponent(JSON.stringify(p)))); }catch(e){ return ""; }
  }
  function decodeState(hash){
    try{ return JSON.parse(decodeURIComponent(escape(atob(hash)))); }catch(e){ return null; }
  }
  function applyPayload(p){
    if(!p) return;
    state.focus=p.focus||state.focus;
    state.mode=p.mode||state.mode;
    state.audience=p.audience||state.audience;
    state.modality=p.modality||state.modality;
    state.topic=(typeof p.topic==="string")?p.topic:state.topic;
    state.genaiEnabled=!!p.genaiEnabled;
    if (p.sel){
      Object.keys(p.sel).forEach(function(cat){
        var key=p.sel[cat];
        if(!key){ state.selections[cat]=null; return; }
        var tool=(TOOLS[cat]||[]).find(function(t){ return t.key===key; });
        state.selections[cat]=tool||null;
      });
    }
  }
  function readFromUrl(){
    var h=(location.hash||"").replace(/^#/,"");
    if(!h) return;
    applyPayload(decodeState(h));
  }
  function writeToUrl(){
    var h=encodeState();
    if (!h) return;
    history.replaceState(null,"","#"+h);
  }

  function hydrateControls(){
    el.focus.value=state.focus;
    el.goal.value=state.mode;
    el.audience.value=state.audience;
    el.modality.value=state.modality;
    el.topic.value=state.topic;
    el.genaiEnabled.checked=!!state.genaiEnabled;
  }

  function wire(){
    el.focus.addEventListener("change", function(){ state.focus=el.focus.value; sync(); });
    el.goal.addEventListener("change", function(){ state.mode=el.goal.value; sync(); });
    el.audience.addEventListener("change", function(){ state.audience=el.audience.value; sync(); });
    el.modality.addEventListener("change", function(){ state.modality=el.modality.value; sync(); });
    el.topic.addEventListener("input", function(){ state.topic=el.topic.value||""; renderSuggestions(); writeToUrl(); });
    el.genaiEnabled.addEventListener("change", function(){
      state.genaiEnabled=!!el.genaiEnabled.checked;
      if(!state.genaiEnabled){ state.selections.gen_images=null; state.selections.gen_audio=null; state.selections.gen_video=null; }
      sync();
    });

    el.resetBtn.addEventListener("click", function(){
      state.focus="both"; state.mode="quick"; state.audience="any"; state.modality="any"; state.topic=""; state.genaiEnabled=false;
      Object.keys(state.selections).forEach(function(k){ state.selections[k]=null; });
      location.hash="";
      hydrateControls();
      sync();
    });

    el.copyLinkBtn.addEventListener("click", function(){
      writeToUrl();
      var link=location.href;
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(link).catch(function(){});
      }
      el.rulesStatus.textContent="Share link copied.";
      setTimeout(function(){ el.rulesStatus.textContent = RULES.length ? ("Rules loaded ✓ ("+RULES.length+" rules)") : ""; }, 1200);
    });

    window.addEventListener("hashchange", function(){ readFromUrl(); hydrateControls(); sync(); });
  }

  // Debug
  window.aiTKDebug = {
    getState: function(){ return JSON.parse(JSON.stringify(state)); },
    rulesCount: function(){ return Array.isArray(RULES)?RULES.length:0; },
    matchedRules: function(){ return matchedRuleIds.slice(); }
  };

  function init(){
    readFromUrl();
    hydrateControls();
    renderToolSections();
    renderSummary();
    renderSuggestions();
    wire();
    loadRules();
  }

  init();
})();
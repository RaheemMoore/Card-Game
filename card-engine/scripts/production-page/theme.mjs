/**
 * The page's look and its behaviour. No markdown knowledge lives here.
 *
 * THE READING MODEL, because it is the thing to understand before changing
 * anything below: the guide is not one long scroll. A part is a tab; a section
 * is a PAGE; you are either at a part's contents index or inside exactly one
 * page. Raheem asked for this directly — "when I click on a table of contents
 * item, I wanna feel like I'm in that page" — because at 15 sections and
 * growing, a scroll position is not a location. You look away, scroll a little,
 * and you are silently in someone else's section with nothing telling you so.
 *
 * THE COST, and why the search box is not optional: hiding every other section
 * breaks the browser's own Cmd+F, and that regression compounds exactly as the
 * document grows. Search is what keeps the page model honest at 40 sections.
 *
 * PROGRESSIVE ENHANCEMENT IS LOAD-BEARING. Every part and every page renders in
 * document order. Hiding only begins once the script sets `data-pages="on"`, so
 * a reader with no JS gets the whole document, and the print rules put it all
 * back for print-to-PDF.
 */

export const CSS = `
/* Single-theme by choice, not omission. This is a document about a dark fantasy
   game and it uses that game's own player palette from card-engine/src/index.css.
   A light variant would read as an ops report, which is precisely what this is
   not. Heading face matches the app's --font-fantasy stack exactly: Cinzel is
   not bundled anywhere in the project, so the app already renders Palatino in
   practice and this page renders identically to the game. */
:root{
  --void:#0a0a0f;--obsidian:#1a1a2e;--slate:#2a2a3e;
  --ash:#8a8a9a;--bone:#c4c4d4;--ivory:#e8e8f0;
  --gold:#fbbf24;--bronze:#cd7f32;
  --serif:'Cinzel','Palatino Linotype','Book Antiqua',serif;
  --sans:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  --mono:ui-monospace,'SF Mono',Menlo,monospace;
  --measure:68ch;
}
*{box-sizing:border-box}
body{margin:0;background:var(--void);color:var(--bone);font-family:var(--sans);font-size:16px;line-height:1.7;-webkit-text-size-adjust:100%}
:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:3px}
/* Prose holds a readable measure; tables, code and art break out to full width. */
.wrap{max-width:960px;margin:0 auto;padding:2rem 1.25rem 6rem}
p,ul,ol,blockquote,h3{max-width:var(--measure)}
h1{font-family:var(--serif);font-size:clamp(1.9rem,5vw,2.6rem);color:var(--ivory);letter-spacing:.02em;margin:0 0 .5rem;line-height:1.15;text-wrap:balance}
h2{display:flex;align-items:baseline;gap:.8rem;font-family:var(--serif);font-size:clamp(1.7rem,4.6vw,2.3rem);color:var(--gold);letter-spacing:.02em;margin:0 0 1.25rem;padding-bottom:.7rem;border-bottom:1px solid rgba(251,191,36,.28);line-height:1.2;scroll-margin-top:5rem;text-wrap:balance}
h2 .mark{font-size:.6em;color:var(--bronze);font-variant-numeric:tabular-nums;flex:none}
h3{font-family:var(--serif);font-size:1.12rem;color:var(--ivory);letter-spacing:.02em;margin:2rem 0 .6rem;line-height:1.35;scroll-margin-top:5rem;text-wrap:balance}

/* Disclosure rows. Collapsed is the default so a page reads as a short list of
   things you could open, not a wall. Raheem kept these closed when pages
   landed — do not flip them without asking. */
details{border:1px solid var(--slate);border-radius:10px;margin:0 0 .5rem;background:rgba(26,26,46,.45);scroll-margin-top:5rem}
details[open]{background:var(--obsidian);border-color:rgba(251,191,36,.22)}
summary{display:flex;align-items:center;gap:.7rem;cursor:pointer;list-style:none;padding:.85rem 1rem;font-family:var(--serif);font-size:1.05rem;color:var(--ivory);letter-spacing:.01em;line-height:1.35}
summary::-webkit-details-marker{display:none}
summary:hover{color:var(--gold)}
details[open]>summary{color:var(--gold);border-bottom:1px solid var(--slate)}
.sx{flex:none;width:9px;height:9px;border-right:1.5px solid var(--bronze);border-bottom:1.5px solid var(--bronze);transform:rotate(-45deg);transition:transform .18s ease;margin-left:.15rem}
details[open] .sx{transform:rotate(45deg);border-color:var(--gold)}
.st{flex:1;min-width:0}
.cnt{flex:none;font-family:var(--sans);font-size:.72rem;color:var(--bronze);border:1px solid var(--slate);border-radius:20px;padding:.1rem .55rem;font-variant-numeric:tabular-nums}
details>*:not(summary){margin-left:1rem;margin-right:1rem}
details>*:not(summary):first-of-type{margin-top:1rem}
details>*:last-child{margin-bottom:1rem}
details .tw{margin-bottom:1rem}
@media(prefers-reduced-motion:reduce){.sx{transition:none}}

.shot{margin:0 0 1.25rem;border:1px solid var(--slate);border-radius:8px;overflow:hidden;background:var(--void);max-width:none}
.shot img{display:block;width:100%;height:auto}
.shot figcaption{padding:.6rem .85rem;font-size:.82rem;color:var(--ash);border-top:1px solid var(--slate);background:var(--obsidian)}
.start{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;margin:0 0 1.25rem;padding:.7rem .9rem;border:1px solid rgba(251,191,36,.3);border-radius:8px;background:rgba(251,191,36,.05)}
.sl{flex:none;font-family:var(--serif);font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--bronze)}
.sp{flex:1;min-width:12ch;background:none;color:var(--ivory);padding:0;font-size:.9rem}
.cp{flex:none;font-family:var(--sans);font-size:.76rem;background:transparent;color:var(--gold);border:1px solid rgba(251,191,36,.45);border-radius:6px;padding:.3rem .75rem;cursor:pointer}
.cp:hover{background:rgba(251,191,36,.12)}
p{margin:0 0 1rem}
a{color:var(--gold);text-decoration:none;border-bottom:1px solid rgba(251,191,36,.3)}
a:hover{border-bottom-color:var(--gold)}
strong{color:var(--ivory);font-weight:600}
code{font-family:var(--mono);font-size:.85em;background:var(--obsidian);color:var(--gold);padding:.14em .42em;border-radius:4px;overflow-wrap:anywhere}
pre{background:var(--obsidian);border:1px solid var(--slate);border-radius:8px;padding:1rem;overflow-x:auto;margin:0 0 1.5rem}
pre code{background:none;color:var(--bone);padding:0;font-size:.8rem;line-height:1.55}
blockquote{margin:0 0 1.5rem;padding:1rem 1.25rem;background:var(--obsidian);border-left:3px solid var(--gold);border-radius:0 8px 8px 0}
blockquote p:last-child{margin:0}
hr{border:0;border-top:1px solid var(--slate);margin:2.5rem 0}
ul,ol{margin:0 0 1.25rem;padding-left:1.3rem}
li{margin:.35rem 0}
.tw{overflow-x:auto;margin:0 0 1.75rem;border:1px solid var(--slate);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:.92rem;font-variant-numeric:tabular-nums}
th{background:var(--obsidian);color:var(--gold);font-family:var(--serif);font-weight:600;font-size:.78rem;letter-spacing:.07em;text-transform:uppercase;text-align:left;padding:.7rem .85rem;white-space:nowrap}
td{padding:.7rem .85rem;border-top:1px solid var(--slate);vertical-align:top}
tbody tr:hover{background:rgba(42,42,62,.4)}
.strip{margin:0 0 1.5rem;height:104px;overflow:hidden;border-radius:8px;position:relative;border:1px solid var(--slate)}
.strip img{width:100%;height:100%;object-fit:cover;opacity:.38;display:block}
.strip::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,10,15,.2),var(--void))}
.bar{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;justify-content:space-between;background:var(--obsidian);border:1px solid var(--slate);border-radius:10px;padding:.7rem 1rem;margin:0 0 2rem;font-size:.82rem;color:var(--ash)}
.bar .acts{display:flex;gap:.5rem;flex:none;align-items:center}
.bar button{font-family:inherit;font-size:.82rem;background:transparent;color:var(--gold);border:1px solid rgba(251,191,36,.4);border-radius:6px;padding:.4rem .9rem;cursor:pointer;white-space:nowrap}
.bar button:hover{background:rgba(251,191,36,.12)}
.toc{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.5rem;margin:0 0 3.5rem;max-width:none}
.toc a{display:flex;gap:.7rem;align-items:baseline;padding:.9rem 1rem;background:var(--obsidian);border:1px solid var(--slate);border-radius:8px;color:var(--bone);font-size:.88rem}
.toc a:hover{border-color:rgba(251,191,36,.45);color:var(--ivory)}
.toc .m{color:var(--bronze);font-variant-numeric:tabular-nums;font-family:var(--serif);flex:none}

/* Tabs = parts. */
.tabs{display:flex;gap:.5rem;margin:0 0 2rem;flex-wrap:wrap}
.tab{font-family:var(--serif);font-size:1rem;letter-spacing:.02em;background:var(--obsidian);color:var(--bone);border:1px solid var(--slate);border-radius:8px;padding:.6rem 1.1rem;cursor:pointer}
.tab:hover{color:var(--ivory);border-color:rgba(251,191,36,.45)}
.tab[aria-selected="true"]{background:rgba(251,191,36,.1);color:var(--gold);border-color:rgba(251,191,36,.55)}

/* ── The page model ───────────────────────────────────────────────────────
   Everything renders until the script says otherwise. Each rule below is
   scoped to [data-pages="on"], so no-JS and print get the whole document. */
:root[data-pages="on"] .part[data-active="false"]{display:none}
:root[data-pages="on"][data-view="index"] .pg{display:none}
:root[data-pages="on"][data-view="page"] .toc,
:root[data-pages="on"][data-view="page"] .tabs,
:root[data-pages="on"][data-view="page"] .intro{display:none}
:root[data-pages="on"][data-view="page"] .pg[data-active="false"]{display:none}
:root[data-pages="on"][data-view="search"] .part{display:none}
#results{display:none}
:root[data-pages="on"][data-view="search"] #results{display:block}

/* The bar that tells you where you are. It exists because "I looked away and
   lost my place" was the actual complaint — an exit alone would not have
   fixed it, so this names the part and the section at all times. */
#topbar{display:none;position:fixed;top:0;left:0;right:0;z-index:20;background:rgba(10,10,15,.94);border-bottom:1px solid var(--slate);backdrop-filter:blur(8px)}
:root[data-pages="on"][data-view="page"] #topbar{display:block}
:root[data-pages="on"][data-view="page"] .wrap{padding-top:5rem}
.tbin{max-width:960px;margin:0 auto;padding:.6rem 1.25rem;display:flex;align-items:center;gap:.75rem}
#tbback{flex:none;font-family:var(--sans);font-size:.8rem;background:transparent;color:var(--gold);border:1px solid rgba(251,191,36,.4);border-radius:6px;padding:.35rem .8rem;cursor:pointer;white-space:nowrap}
#tbback:hover{background:rgba(251,191,36,.12)}
#tbtitle{flex:1;min-width:0;font-family:var(--serif);font-size:.95rem;color:var(--ivory);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tbtitle .cr{color:var(--ash);font-family:var(--sans);font-size:.78rem}
.pn{flex:none;display:flex;gap:.35rem}
.pn button{font-family:var(--sans);font-size:.8rem;background:transparent;color:var(--bone);border:1px solid var(--slate);border-radius:6px;padding:.35rem .7rem;cursor:pointer}
.pn button:hover:not(:disabled){color:var(--gold);border-color:rgba(251,191,36,.45)}
.pn button:disabled{opacity:.3;cursor:default}

/* Foot nav. Without it, finishing a page is a dead end that forces a trip back
   to the index — the read-straight-through path a long scroll gives for free. */
.foot{display:flex;justify-content:space-between;gap:.75rem;margin:3rem 0 0;padding-top:1.5rem;border-top:1px solid var(--slate)}
.foot a{flex:1;max-width:47%;padding:.8rem 1rem;background:var(--obsidian);border:1px solid var(--slate);border-radius:8px;color:var(--bone);font-size:.85rem;border-bottom:1px solid var(--slate)}
.foot a:hover{border-color:rgba(251,191,36,.45);color:var(--ivory)}
.foot .nx{text-align:right;margin-left:auto}
.foot .lb{display:block;font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--bronze);margin-bottom:.15rem}

/* Search. */
#q{flex:none;width:min(30ch,42vw);font-family:var(--sans);font-size:.82rem;background:var(--void);color:var(--ivory);border:1px solid var(--slate);border-radius:6px;padding:.4rem .7rem}
#q:focus{border-color:rgba(251,191,36,.5);outline:none}
#results h2{margin-bottom:1.5rem}
.hit{display:block;padding:.9rem 1rem;margin:0 0 .5rem;background:var(--obsidian);border:1px solid var(--slate);border-radius:8px;color:var(--bone);font-size:.88rem}
.hit:hover{border-color:rgba(251,191,36,.45)}
.hit .hp{display:block;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--bronze);margin-bottom:.2rem}
.hit .hs{display:block;color:var(--ash);font-size:.82rem;margin-top:.25rem}
.hit mark{background:rgba(251,191,36,.25);color:var(--ivory);border-radius:2px}

/* Wide plates. Arenas are 16:9 and the lesson is in the composition — dark
   corners, open lower third — so they are never cropped square. */
.wgal{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:.75rem;margin:0 0 2rem;max-width:none}
.wc{margin:0;border:1px solid var(--slate);border-radius:8px;overflow:hidden;background:var(--obsidian)}
.wc img{display:block;width:100%;height:auto}
.wc figcaption{padding:.45rem .6rem;font-size:.75rem;color:var(--ash);text-align:center;border-top:1px solid var(--slate)}

/* Sprite strips. Shown whole, at their own aspect, on a checkerboard so
   transparency is visible — a cut-out on a flat dark panel looks like a black
   box, which is the exact thing the strip is meant to prove it is not. */
.strips{margin:0 0 2rem;max-width:none}
.strips h4{font-family:var(--serif);font-size:.95rem;color:var(--gold);letter-spacing:.02em;margin:1.25rem 0 .5rem}
.strip-row{margin:0 0 .5rem;border:1px solid var(--slate);border-radius:8px;overflow:hidden;
  background-color:#141420;
  background-image:linear-gradient(45deg,#1c1c2c 25%,transparent 25%),linear-gradient(-45deg,#1c1c2c 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1c1c2c 75%),linear-gradient(-45deg,transparent 75%,#1c1c2c 75%);
  background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}
.strip-row img{display:block;width:100%;height:auto;image-rendering:pixelated}
.strip-row figcaption{padding:.35rem .6rem;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--bronze);background:var(--obsidian);border-bottom:1px solid var(--slate)}
/* A single chosen image sits in the prose, so it gets breathing room and a
   sentence-case caption rather than the gallery's shouty label. */
.solo{margin:0 0 1.5rem}
.strip-row.solo figcaption{text-transform:none;letter-spacing:0;font-size:.8rem;color:var(--ash);line-height:1.5;padding:.55rem .8rem}
.wc.solo figcaption{text-align:left;font-size:.8rem;line-height:1.5;padding:.55rem .8rem}
.wc.solo{max-width:none}

.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));gap:.6rem;margin:0 0 2rem;max-width:none}
.gc{margin:0;border:1px solid var(--slate);border-radius:8px;overflow:hidden;background:var(--obsidian)}
.gc img{display:block;width:100%;aspect-ratio:1;object-fit:cover}
.gc figcaption{padding:.4rem .5rem;font-size:.72rem;color:var(--ash);text-align:center;border-top:1px solid var(--slate);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Close row: shut what you just read and land back on its heading. */
.closer{display:flex;justify-content:flex-end;margin:0 1rem 1rem}
.closer button{font-family:var(--sans);font-size:.76rem;background:transparent;color:var(--ash);border:1px solid var(--slate);border-radius:6px;padding:.3rem .8rem;cursor:pointer}
.closer button:hover{color:var(--gold);border-color:rgba(251,191,36,.45)}

@media(max-width:640px){
  .wrap{padding:1.25rem .9rem 4rem}
  :root[data-pages="on"][data-view="page"] .wrap{padding-top:4.5rem}
  table{font-size:.84rem}
  th,td{padding:.55rem .6rem}
  .strip{height:76px}
  .toc{grid-template-columns:1fr 1fr;gap:.4rem;margin-bottom:2.5rem}
  .toc a{padding:.7rem .6rem;font-size:.8rem;gap:.45rem}
  blockquote{padding:.85rem 1rem}
  .tab{font-size:.85rem;padding:.5rem .8rem}
  .tbin{padding:.5rem .9rem;gap:.5rem}
  #tbtitle{font-size:.85rem}
  #tbtitle .cr{display:none}
  /* The search field must stretch, not size itself. A percentage width here
     resolved against a content-sized flex parent and pushed the document 29px
     wider than the phone — the one thing this layout is not allowed to do.
     (Backticks are forbidden anywhere in this file: it is one big template
     literal, and a backtick in a comment ends the stylesheet.) */
  .bar .acts{width:100%}
  #q{flex:1 1 auto;width:auto;min-width:0}
  .bar{gap:.5rem}
  .gal{grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:.4rem}
  .foot a{max-width:48%;font-size:.8rem}
}

/* Print puts the whole document back. A guide you cannot print in full is a
   guide that only exists on one laptop. */
@media print{
  :root[data-pages="on"] .part,
  :root[data-pages="on"] .pg,
  :root[data-pages="on"] .toc,
  :root[data-pages="on"] .intro{display:block !important}
  #topbar,#results,.tabs,.bar,.foot,.closer{display:none !important}
  :root[data-pages="on"][data-view="page"] .wrap{padding-top:0}
}
`;

export const SCRIPT = `
(function(){
  var root=document.documentElement;
  var parts=[].slice.call(document.querySelectorAll('.part'));
  var tabs=[].slice.call(document.querySelectorAll('.tab'));
  var pages=[].slice.call(document.querySelectorAll('.pg'));
  var bar=document.getElementById('topbar');
  var tbTitle=document.getElementById('tbtitle');
  var prevB=document.getElementById('tbprev');
  var nextB=document.getElementById('tbnext');
  var results=document.getElementById('results');
  var q=document.getElementById('q');
  var xall=document.getElementById('xall');

  /* Nothing is hidden until this line. Before it, a no-JS reader has the whole
     document in front of them, and so does print. */
  root.setAttribute('data-pages','on');
  root.setAttribute('data-view','index');

  function motion(){
    return matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
  }
  function activePart(){
    return parts.filter(function(p){return p.dataset.active==='true'})[0]||parts[0];
  }
  function pagesOf(p){ return [].slice.call(p.querySelectorAll('.pg')); }

  function setPart(id){
    parts.forEach(function(p){p.dataset.active=String(p.id===id)});
    tabs.forEach(function(t){t.setAttribute('aria-selected',String(t.dataset.part===id))});
  }

  function showIndex(partId,push){
    if(partId) setPart(partId);
    pages.forEach(function(pg){pg.dataset.active='false'});
    root.setAttribute('data-view','index');
    if(push!==false) pushUrl('');
    window.scrollTo({top:0,behavior:'auto'});
  }

  function showPage(id,push){
    var pg=document.getElementById(id); if(!pg||!pg.classList.contains('pg')) return false;
    var part=pg.closest('.part');
    setPart(part.id);
    pages.forEach(function(x){x.dataset.active=String(x===pg)});
    root.setAttribute('data-view','page');

    /* The bar names both, because knowing the section without the part is how
       you end up reading Infrastructure thinking it is Game Mechanics. */
    tbTitle.innerHTML='<span class="cr">'+esc(part.dataset.title||'')+' · </span>'+esc(pg.dataset.title||'');

    var sibs=pagesOf(part), n=sibs.indexOf(pg);
    wire(prevB,sibs[n-1]); wire(nextB,sibs[n+1]);

    if(push!==false) pushUrl('#'+id);
    window.scrollTo({top:0,behavior:'auto'});
    return true;
  }

  function wire(btn,target){
    btn.disabled=!target;
    btn.onclick=target?function(){showPage(target.id,true)}:null;
    btn.title=target?(target.dataset.title||''):'';
  }

  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  function pushUrl(hash){
    /* Back must return to the contents. In a page model, a Back button that
       leaves the document is the thing that makes it feel broken. */
    try{ history.pushState({},'',hash||location.pathname+location.search); }catch(_){}
  }

  tabs.forEach(function(t){
    t.addEventListener('click',function(){ showIndex(t.dataset.part,true); });
  });
  document.getElementById('tbback').addEventListener('click',function(){
    showIndex(activePart().id,true);
  });
  tbTitle.addEventListener('click',function(){window.scrollTo({top:0,behavior:motion()})});

  /* Contents cards and foot nav are ordinary links; intercept so they switch
     page instead of jumping to an anchor in a hidden section. */
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]'); if(!a) return;
    var id=decodeURIComponent(a.getAttribute('href').slice(1)); if(!id) return;
    var el=document.getElementById(id); if(!el) return;
    e.preventDefault();
    goto(id);
  });

  /* Jump to any id: switch part, open its page, open ancestor details, scroll.
     Used by contents cards, foot nav, search hits and deep links alike. */
  function goto(id){
    var el=document.getElementById(id); if(!el) return;
    var pg=el.classList.contains('pg')?el:el.closest('.pg');
    if(pg){
      showPage(pg.id,true);
      if(el!==pg){
        var n=el; while(n&&n!==pg){ if(n.tagName==='DETAILS') n.open=true; n=n.parentElement; }
        if(el.tagName==='DETAILS') el.open=true;
        el.scrollIntoView({behavior:motion(),block:'start'});
      }
    } else {
      var part=el.closest('.part');
      if(part) showIndex(part.id,true);
    }
  }

  addEventListener('popstate',function(){ route(false); });
  function route(push){
    var h=location.hash.slice(1);
    if(!h){ showIndex(activePart().id,false); return; }
    var el=document.getElementById(decodeURIComponent(h));
    if(!el){ showIndex(activePart().id,false); return; }
    var pg=el.classList.contains('pg')?el:el.closest('.pg');
    if(pg){
      showPage(pg.id,false);
      if(el!==pg){
        var n=el; while(n&&n!==pg){ if(n.tagName==='DETAILS') n.open=true; n=n.parentElement; }
        el.scrollIntoView();
      }
    } else if(el.closest('.part')) showIndex(el.closest('.part').id,false);
  }

  /* Expand all scopes to the page you are actually reading. */
  xall.addEventListener('click',function(){
    var scope=root.getAttribute('data-view')==='page'
      ? document.querySelector('.pg[data-active="true"]')
      : activePart();
    var open=xall.getAttribute('aria-expanded')==='true';
    [].slice.call((scope||document).querySelectorAll('details')).forEach(function(d){d.open=!open});
    xall.setAttribute('aria-expanded',String(!open));
    xall.textContent=open?'Expand all':'Collapse all';
  });

  /* Snapshot each page's text BEFORE the Close buttons are injected below.
     Otherwise every search snippet picks up the word "Close" from whichever
     disclosure row happens to sit near the match. textContent rather than
     innerText because a hidden page has no layout and innerText returns ''. */
  var textOf={};
  pages.forEach(function(pg){
    textOf[pg.id]=(pg.textContent||'').replace(/\\s+/g,' ').trim();
  });

  [].slice.call(document.querySelectorAll('details')).forEach(function(d){
    var row=document.createElement('div'); row.className='closer';
    var b=document.createElement('button'); b.type='button'; b.textContent='Close';
    b.addEventListener('click',function(){
      d.open=false;
      d.scrollIntoView({block:'nearest',behavior:motion()});
    });
    row.appendChild(b); d.appendChild(row);
  });

  /* ── Search ────────────────────────────────────────────────────────────
     Searches the rendered DOM rather than a pre-built index, so it can never
     disagree with what is on the page. It covers BOTH parts — the whole point
     is finding something you did not know which half it was in. */
  var timer;
  q.addEventListener('input',function(){ clearTimeout(timer); timer=setTimeout(runSearch,120); });
  q.addEventListener('keydown',function(e){ if(e.key==='Escape'){ q.value=''; runSearch(); q.blur(); } });

  function runSearch(){
    var term=q.value.trim().toLowerCase();
    if(term.length<2){
      if(root.getAttribute('data-view')==='search') route(false);
      return;
    }
    var hits=[];
    pages.forEach(function(pg){
      var text=textOf[pg.id]||'';
      var hay=text.toLowerCase();
      var at=hay.indexOf(term);
      if(at<0) return;
      var count=hay.split(term).length-1;
      var from=Math.max(0,at-60), to=Math.min(text.length,at+term.length+90);
      hits.push({
        id:pg.id,
        part:(pg.closest('.part').dataset.title)||'',
        title:pg.dataset.title||'',
        count:count,
        snip:(from>0?'…':'')+text.slice(from,at)+'\\u0000'+text.slice(at,at+term.length)+'\\u0001'+text.slice(at+term.length,to)+(to<text.length?'…':'')
      });
    });
    hits.sort(function(a,b){return b.count-a.count});
    results.innerHTML='<h2><span class="mark">'+hits.length+'</span>'+
      (hits.length===1?' match':' matches')+' for &ldquo;'+esc(q.value.trim())+'&rdquo;</h2>'+
      (hits.length?hits.map(function(h){
        return '<a class="hit" href="#'+h.id+'">'+
          '<span class="hp">'+esc(h.part)+(h.count>1?' · '+h.count+' hits':'')+'</span>'+
          esc(h.title)+
          '<span class="hs">'+esc(h.snip).replace('\\u0000','<mark>').replace('\\u0001','</mark>')+'</span></a>';
      }).join(''):'<p>Nothing in either part matches that.</p>');
    root.setAttribute('data-view','search');
    window.scrollTo({top:0,behavior:'auto'});
  }

  document.addEventListener('click',function(e){
    var b=e.target.closest && e.target.closest('.cp'); if(!b) return;
    var t=b.getAttribute('data-copy');
    var done=function(){var o=b.textContent;b.textContent='Copied';setTimeout(function(){b.textContent=o},1400)};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,fallback)}else{fallback()}
    function fallback(){
      var ta=document.createElement('textarea');ta.value=t;ta.style.position='absolute';ta.style.left='-9999px';
      document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(_){}
      document.body.removeChild(ta);
    }
  });

  route(false);
})();
`;

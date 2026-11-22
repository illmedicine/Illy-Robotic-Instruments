(function(){
  // Links into the app: clean addresses (/PlatformManager/overview on the website, /overview on a local server). GitHub Pages cannot serve those, so there they keep the "#" form.
  var gh=/(^|\.)github\.io$/i.test(location.hostname), root=location.pathname.indexOf("/PlatformManager/")===0?"/PlatformManager/":"/";
  [].forEach.call(document.querySelectorAll("a[data-slug]"),function(a){a.setAttribute("href",gh?root+"#"+a.getAttribute("data-id"):root+a.getAttribute("data-slug"))});
  // The chapter links scroll to their chapter without putting a "#" in the address.
  document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest(".chev a");if(!a)return;var t=document.getElementById(a.getAttribute("href").slice(1));if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth"})}});
  // The logo leads back into the app: My overview, with every product menu collapsed for a fresh start.
  var brand=document.getElementById("brand");
  if(brand)brand.addEventListener("click",function(){try{localStorage.setItem("ppm-nav-products","[]")}catch(err){}});
  // Stripped-down topology diagrams. Each one has a few nodes, faint links and a handful of workflows.
  // On load one workflow is chosen at random and animated; nothing here can be selected by the visitor.
  var W=360,H=200;
  var DIAGRAMS={
    core:{caption:"sweep, read, insight",nodes:[["Microsoft 365",46,36],["Power Platform",46,100],["Fabric & Power BI",46,164],["Sweep engine",168,100],["Analytics",292,46],["Insights",292,100],["Admin view",292,154]],
      edges:[[0,3],[1,3],[2,3],[3,4],[3,5],[3,6]],
      flows:[["Daily sweep to insight",[0,3,5]],["Deep read on one tenant",[1,3,4,6]],["Several tenants kept apart",[2,3,6]]]},
    agents:{caption:"ask, check, answer",nodes:[["Request",44,100],["Router",112,100],["Policy & RBAC",186,100],["SharePoint agent",300,40],["Power BI agent",300,100],["Copilot agent",300,160],["Answer",186,176]],
      edges:[[0,1],[1,2],[2,3],[2,4],[2,5],[3,6],[4,6],[5,6]],
      flows:[["Power BI question",[0,1,2,4,6]],["SharePoint site request",[0,1,2,3,6]],["Copilot coaching",[0,1,2,5,6]]]},
    fabric:{caption:"plan, build, report",nodes:[["Workspace",46,40],["Capacity",46,100],["Lakehouse",46,160],["Pipeline",166,100],["Semantic model",290,60],["Report",290,140]],
      edges:[[0,3],[1,3],[2,3],[3,4],[4,5]],
      flows:[["Capacity to report",[1,3,4,5]],["Workspace pipeline plan",[0,3,4]],["Lakehouse refresh",[2,3,4,5]]]},
    contracts:{caption:"calendar, usage, brief",nodes:[["Renewal calendar",50,40],["Usage",50,100],["Spend",50,160],["Contract review",168,100],["Negotiation brief",290,60],["Renewal decision",290,140]],
      edges:[[0,3],[1,3],[2,3],[3,4],[3,5],[4,5]],
      flows:[["Renewal brief",[0,3,4]],["Unused seats cut",[1,3,5]],["Spend against usage",[2,3,4,5]]]},
    builders:{caption:"brief, build, publish",nodes:[["Brief",44,100],["Plan",124,100],["Flow",206,40],["Site",206,100],["App",206,160],["Governance",284,100],["Published",284,164]],
      edges:[[0,1],[1,2],[1,3],[1,4],[2,5],[3,5],[4,5],[5,6]],
      flows:[["Flow from a brief",[0,1,2,5,6]],["SharePoint site",[0,1,3,5,6]],["App for a team",[0,1,4,5,6]]]},
    start:{caption:"sweep, learn, act",nodes:[["Sweep",46,100],["Store",124,100],["Insight",204,100],["Action",290,56],["Learn",290,146]],
      edges:[[0,1],[1,2],[2,3],[2,4],[4,1]],
      flows:[["Sweep to action",[0,1,2,3]],["Learn from a question",[0,1,2,4,1,2]]]}
  };
  var NS="http://www.w3.org/2000/svg", reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag,attrs,parent){var e=document.createElementNS(NS,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}
  function labelW(t){return Math.max(60,t.length*5.6+16)}
  function build(host,key){
    var d=DIAGRAMS[key],svg=el("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"Diagram: "+d.caption});
    var pick=d.flows[Math.floor(Math.random()*d.flows.length)],
        onPath={};
    // keep every label inside the frame; the links use the same (clamped) positions
    var nodes=d.nodes.map(function(n){var w=labelW(n[0]);return [n[0],Math.min(Math.max(n[1],w/2+6),W-w/2-6),n[2]]});
    pick[1].forEach(function(i){onPath[i]=true});
    var pts=pick[1].map(function(i){return nodes[i][1]+","+nodes[i][2]});
    var pathD="M"+pts.join(" L");
    // base links
    d.edges.forEach(function(e){var a=nodes[e[0]],b=nodes[e[1]];el("line",{x1:a[1],y1:a[2],x2:b[1],y2:b[2],class:"edge"},svg)});
    // the chosen workflow
    var fl=el("path",{d:pathD,class:"flow"},svg);
    nodes.forEach(function(n,i){
      var g=el("g",{class:"node"+(onPath[i]?" on":"")},svg);
      var w=labelW(n[0]);
      el("title",{},g).textContent=n[0];
      el("rect",{x:n[1]-w/2,y:n[2]-15,width:w,height:30,rx:8},g);
      var t=el("text",{x:n[1],y:n[2]+4},g);t.textContent=n[0];
      g.addEventListener("pointerenter",function(){g.classList.add("hot")});
      g.addEventListener("pointerleave",function(){g.classList.remove("hot")});
    });
    if(!reduce){
      var dot=el("circle",{r:5,class:"dot"},svg);
      var mo=el("animateMotion",{dur:(2.6+pick[1].length*0.5)+"s",repeatCount:"indefinite",path:pathD},dot);
    }
    host.innerHTML="";
    var head=document.createElement("div");head.className="infra-head";
    head.innerHTML='<b>How it works</b><span>'+d.caption+'</span>';
    host.appendChild(head);
    host.appendChild(svg);
    var cap=document.createElement("div");cap.className="infra-cap";
    cap.innerHTML='Workflow: <b></b>';cap.querySelector("b").textContent=pick[0];
    host.appendChild(cap);
  }
  document.querySelectorAll("[data-diagram]").forEach(function(h){build(h,h.getAttribute("data-diagram"))});

  var slides=[].slice.call(document.querySelectorAll(".slide"));
  var links=[].slice.call(document.querySelectorAll(".chev a"));
  function mark(i){links.forEach(function(a,k){a.classList.toggle("on",k===i);if(k===i)a.setAttribute("aria-current","true");else a.removeAttribute("aria-current")})}
  if(!("IntersectionObserver" in window)){slides.forEach(function(s){s.classList.add("in")});mark(0);return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");mark(slides.indexOf(e.target))}})},{threshold:.5});
  slides.forEach(function(s){io.observe(s)});
  addEventListener("keydown",function(e){
    if(e.target.closest&&e.target.closest("input,textarea"))return;
    var cur=0,y=window.scrollY+window.innerHeight*.5;slides.forEach(function(s,k){if(s.offsetTop<=y)cur=k});
    var d=(e.key==="ArrowDown"||e.key==="PageDown")?1:(e.key==="ArrowUp"||e.key==="PageUp")?-1:0;
    if(d){e.preventDefault();slides[Math.max(0,Math.min(slides.length-1,cur+d))].scrollIntoView()}
  });
  mark(0);
})();

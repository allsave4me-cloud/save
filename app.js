/* 유튜브 주소 그대로 붙여넣으면 됩니다. 줄을 늘리면 영상이 늘어납니다. */
const videos = [
  {url:"https://www.youtube.com/watch?v=ekKnNTpm3Cs", memo:"죽지마"},
  {url:"https://www.youtube.com/watch?v=RohZ89_w93o", memo:"실패라고 생각하지마"},
  {url:"https://www.youtube.com/watch?v=cS-IiArGmcU", memo:"가족을 생각해"},
  {url:"https://www.youtube.com/watch?v=rGRC_Nf8fww", memo:"F.L.Y"},
  {url:"https://www.youtube.com/watch?v=F1vNK4jSYr0", memo:"힘내 쨔샤"},
  {url:"https://www.youtube.com/watch?v=C6st9z_iaao", memo:"나도 이미 알고 있어"},
  {url:"https://www.youtube.com/watch?v=bpPstvQZXWo", memo:"별 보러 가자"},
  {url:"https://www.youtube.com/watch?v=Dic27EnDDls", memo:"걱정 말아요"},
  {url:"https://www.youtube.com/watch?v=SK6Sm2Ki9tI", memo:"천천히 가도 돼"},
  {url:"https://www.youtube.com/watch?v=GOS6C2jXTa8", memo:"도망가자"},
  {url:"https://www.youtube.com/watch?v=BzYnNdJhZQw", memo:"밤편지"},
  {url:"https://www.youtube.com/watch?v=Yg8B0z76qHE", memo:"혼자가 아니야"},
  {url:"https://www.youtube.com/watch?v=2-P-NIiLiQc", memo:"개화"},
  {url:"https://www.youtube.com/watch?v=vnS_jn2uibs", memo:"한 페이지"},
  {url:"https://www.youtube.com/watch?v=k4V3Mo61fJM", memo:"집으로"},
  {url:"https://www.youtube.com/watch?v=W4SXOQ7xFoo", memo:"안아줘"}
];

const DAYS_KEY = "svae-days";
const GUEST_KEY = "svae-guest-notes";
const BOOK_START = "2026-02-06";
const BOOK_DAYS = 21;
const YT_HOSTS = new Set([
  "youtube.com","www.youtube.com","m.youtube.com","music.youtube.com",
  "youtu.be","www.youtu.be",
  "youtube-nocookie.com","www.youtube-nocookie.com"
]);
const YT_ID = /^[a-zA-Z0-9_-]{11}$/;
const YT_LIST = /^[a-zA-Z0-9_-]+$/;

let WORDS = ["살기 좋다. 오늘은 특히.", "오늘 하루만 더.", "또 보자, 내일."];
let currentIndex = -1;
let starStyle;
let commentTimer = null;
let commentIdx = 0;

function parseWords(text){
  return String(text).split(/\n/).map(s => s.trim()).filter(s => s && !s.startsWith("#"));
}

function setWords(list){
  if(!list.length) return;
  WORDS = list;
  commentIdx = Math.floor(Math.random() * WORDS.length);
}

fetch("words.txt").then(r => {
  if(!r.ok) throw new Error(r.status);
  return r.text();
}).then(t => setWords(parseWords(t))).catch(() => {});

function todayKey(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function stayToday(){
  let days = [];
  try{ days = JSON.parse(localStorage.getItem(DAYS_KEY) || "[]"); }
  catch(e){ days = []; }
  if(!Array.isArray(days)) days = [];
  const t = todayKey();
  if(!days.includes(t)) days.push(t);
  days.sort();
  try{ localStorage.setItem(DAYS_KEY, JSON.stringify(days)); }
  catch(e){}
  return days;
}

function renderDays(days){
  const n = days.length;
  const mark = document.getElementById("dayMark");
  const dots = document.getElementById("dayDots");
  if(n <= 1){
    mark.textContent = "";
    dots.hidden = true;
    return;
  }
  mark.textContent = `이게 ${n}번째 하루입니다.`;
  dots.hidden = false;
  dots.replaceChildren();
  const show = Math.min(n, 24);
  for(let i=0;i<show;i++){
    const dot = document.createElement("span");
    dot.setAttribute("aria-hidden", "true");
    dots.appendChild(dot);
  }
}

function hashStr(s){
  let h = 2166136261;
  for(let i=0;i<s.length;i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function notesForDay(key){
  const h = hashStr(key + ":svae-book");
  const count = (h % 2) + 1;
  const seen = new Set();
  const out = [];
  for(let i=0;i<count;i++){
    let idx = (h + i * 97) % WORDS.length;
    if(seen.has(idx)) idx = (idx + 1) % WORDS.length;
    seen.add(idx);
    const mins = 7 * 60 + ((h >>> (i * 7)) % (16 * 60));
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    out.push({
      when: `${key.slice(0,4)}.${key.slice(5,7)}.${key.slice(8,10)}  ${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`,
      text: WORDS[idx],
      today: key === todayKey()
    });
  }
  out.sort((a,b) => a.when < b.when ? 1 : -1);
  return out;
}

function buildBook(){
  const today = todayKey();
  const [ty,tm,td] = today.split("-").map(Number);
  const end = new Date(ty, tm-1, td);
  const [sy,sm,sd] = BOOK_START.split("-").map(Number);
  const start = new Date(sy, sm-1, sd);
  let from = new Date(end);
  from.setDate(from.getDate() - (BOOK_DAYS - 1));
  if(from < start) from = start;
  const items = [];
  for(let d = new Date(end); d >= from; d.setDate(d.getDate()-1)){
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    items.push(...notesForDay(key));
  }
  return items;
}

function renderBook(){
  const box = document.getElementById("guestList");
  box.replaceChildren();
  const add = (n, mine) => {
    const art = document.createElement("article");
    art.className = "guest-item" + (n.today || mine ? " today" : "");
    const time = document.createElement("time");
    time.textContent = n.when;
    const p = document.createElement("p");
    p.textContent = n.text;
    art.appendChild(time);
    art.appendChild(p);
    box.appendChild(art);
  };
  loadGuests().forEach(n => add(n, true));
  buildBook().forEach(n => add(n, false));
}

function loadGuests(){
  try{
    const a = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
    if(!Array.isArray(a)) return [];
    return a.filter(n => n && typeof n.text === "string").map(n => ({
      text: n.text.slice(0, 80),
      day: String(n.day || ""),
      when: String(n.when || "")
    }));
  }catch(e){ return []; }
}

function saveGuests(list){
  try{ localStorage.setItem(GUEST_KEY, JSON.stringify(list.slice(0, 200))); }
  catch(e){}
}

function normBad(s){
  return String(s).toLowerCase().replace(/[\s._*\-·'"“”]/g,"");
}

function isBlocked(text){
  const n = normBad(text);
  const bad = [
    "시발","씨발","씨팔","시팔","ㅆㅂ","ㅅㅂ","tlqkf","tlqkf",
    "병신","븅신","지랄","wlfkf","qudtls","좆","좇","ㅈ같",
    "꺼져","닥쳐","개새","개소리","미친놈","미친년",
    "니애미","느금마","염병","존나","졸라",
    "fuck","shit","bitch","asshole",
    "죽어라","뒤져","자살해","같이죽","함께죽"
  ];
  return bad.some(w => n.includes(normBad(w)));
}

function hasLink(s){
  return /https?:\/\/|www\.|\.com\b|\.kr\b|bit\.ly/i.test(s);
}

function nowStamp(){
  const d = new Date();
  return todayKey().replace(/-/g,".") + "  " +
    String(d.getHours()).padStart(2,"0") + ":" +
    String(d.getMinutes()).padStart(2,"0");
}

function submitGuest(e){
  e.preventDefault();
  const hint = document.getElementById("guestHint");
  const body = document.getElementById("guestBody").value.trim();
  hint.textContent = "";
  if(body.length < 2){ hint.textContent = "조금 더 적어 주세요."; return; }
  if(isBlocked(body)){ hint.textContent = "그런 말은 남길 수 없어요."; return; }
  if(hasLink(body)){ hint.textContent = "주소는 남길 수 없어요."; return; }
  const all = loadGuests();
  const today = todayKey();
  if(all.filter(x => x.day === today).length >= 2){
    hint.textContent = "오늘은 두 줄이면 충분해요.";
    return;
  }
  if(all.some(x => x.text === body)){ hint.textContent = "같은 말이 이미 있어요."; return; }
  all.unshift({text: body.slice(0, 80), day: today, when: nowStamp()});
  saveGuests(all);
  document.getElementById("guestBody").value = "";
  renderBook();
}

function parseYoutube(input){
  const raw = String(input || "").trim();
  const out = {id:"", list:""};
  if(!raw) return out;
  if(YT_ID.test(raw)){
    out.id = raw;
    return out;
  }
  try{
    const u = new URL(raw);
    if(u.protocol !== "https:" && u.protocol !== "http:") return out;
    if(!YT_HOSTS.has(u.hostname.toLowerCase())) return out;
    const list = u.searchParams.get("list") || "";
    if(YT_LIST.test(list)) out.list = list;
    if(YT_ID.test(u.searchParams.get("v") || "")) out.id = u.searchParams.get("v");
    else {
      const parts = u.pathname.split("/").filter(Boolean);
      const host = u.hostname.replace(/^www\./,"").toLowerCase();
      if(host === "youtu.be" && YT_ID.test(parts[0] || "")) out.id = parts[0];
      else if(parts[0]==="embed" && YT_ID.test(parts[1] || "")) out.id = parts[1];
      else if((parts[0]==="shorts" || parts[0]==="live") && YT_ID.test(parts[1] || "")) out.id = parts[1];
    }
  }catch(e){}
  return out;
}

function pickRandom(){
  let i;
  do{
    i = Math.floor(Math.random()*videos.length);
  }while(i === currentIndex && videos.length > 1);
  currentIndex = i;
  return videos[i];
}

function play(v){
  const p = parseYoutube(v.url || v.id);
  const q = new URLSearchParams({autoplay:"1", rel:"0", modestbranding:"1"});
  let path = "";
  if(p.id){
    path = p.id;
    if(p.list) q.set("list", p.list);
  }else if(p.list){
    path = "videoseries";
    q.set("list", p.list);
  }else return;
  const src = new URL("https://www.youtube-nocookie.com/embed/" + encodeURIComponent(path));
  q.forEach((val, key) => src.searchParams.set(key, val));
  document.getElementById("videoPlayer").src = src.toString();
  document.getElementById("videoMemo").textContent = v.memo || "";
}

function syncScreenA11y(){
  const guestOn = document.getElementById("guestScreen").classList.contains("on");
  ["mainScreen","videoScreen","guestScreen"].forEach(id => {
    const el = document.getElementById(id);
    const on = el.classList.contains("on");
    const active = id === "guestScreen" ? on : on && !guestOn;
    el.inert = !active;
    if(active) el.removeAttribute("aria-hidden");
    else el.setAttribute("aria-hidden", "true");
  });
}

function hideScreens(){
  document.getElementById("mainScreen").classList.remove("on");
  document.getElementById("videoScreen").classList.remove("on");
  document.getElementById("guestScreen").classList.remove("on");
  syncScreenA11y();
}

function spawnComment(){
  const box = document.getElementById("floatComments");
  if(!box || !WORDS.length) return;
  const el = document.createElement("p");
  el.className = "float-comment";
  el.textContent = WORDS[commentIdx % WORDS.length];
  if(commentIdx % 2 === 0){
    el.style.left = (2 + Math.random()*14) + "%";
  }else{
    el.style.left = "auto";
    el.style.right = (2 + Math.random()*14) + "%";
    el.style.textAlign = "right";
  }
  el.style.bottom = (2 + Math.random()*22) + "%";
  el.style.fontSize = (0.68 + Math.random()*0.7).toFixed(2) + "rem";
  el.style.letterSpacing = ((Math.random()*0.12) - 0.03).toFixed(3) + "em";
  el.style.fontWeight = Math.random() < 0.25 ? "500" : "400";
  el.style.animationDuration = (10 + Math.random()*4) + "s";
  commentIdx++;
  box.appendChild(el);
  setTimeout(() => el.remove(), 16000);
}

function startSideComments(){
  stopSideComments();
  const mobile = window.innerWidth < 640;
  spawnComment();
  if(!mobile) spawnComment();
  commentTimer = setInterval(() => {
    spawnComment();
    if(!mobile) spawnComment();
  }, mobile ? 1500 : 900);
}

function stopSideComments(){
  clearInterval(commentTimer);
  commentTimer = null;
  const box = document.getElementById("floatComments");
  if(box) box.replaceChildren();
}

function showVideo(){
  hideScreens();
  document.getElementById("videoScreen").classList.add("on");
  syncScreenA11y();
  play(pickRandom());
  startSideComments();
  document.getElementById("videoBack").focus();
}

function nextVideo(){
  play(pickRandom());
}

function showGuest(){
  document.getElementById("guestScreen").classList.add("on");
  syncScreenA11y();
  renderBook();
  document.getElementById("guestBody").focus();
}

function hideGuest(){
  document.getElementById("guestScreen").classList.remove("on");
  syncScreenA11y();
  document.getElementById("moonBtn").focus();
}

function toggleGuest(){
  if(document.getElementById("guestScreen").classList.contains("on")) hideGuest();
  else showGuest();
}

function showMain(){
  stopSideComments();
  hideScreens();
  document.getElementById("mainScreen").classList.add("on");
  syncScreenA11y();
  document.getElementById("videoPlayer").removeAttribute("src");
  document.getElementById("nextBtn").focus();
}

function layerShadows(count, size){
  const w = Math.max(window.innerWidth, 320);
  let s = "";
  for(let i=0;i<count;i++){
    s += `${Math.random()*w}px ${Math.random()*2000}px 0 ${Math.random()*size}px rgba(255,255,255,${0.35+Math.random()*0.65}),`;
  }
  return s.slice(0,-1);
}

function createStars(){
  if(starStyle) starStyle.remove();
  starStyle = document.createElement("style");
  const a = layerShadows(140, 1.2);
  const b = layerShadows(90, 1.8);
  const c = layerShadows(50, 2.4);
  starStyle.textContent =
    `#stars-a,#stars-a:after{box-shadow:${a};}` +
    `#stars-b,#stars-b:after{box-shadow:${b};}` +
    `#stars-c,#stars-c:after{box-shadow:${c};}`;
  document.head.appendChild(starStyle);
}

function shootOnce(){
  const el = document.getElementById("shoot");
  el.classList.remove("go");
  el.style.top = (8 + Math.random()*36) + "%";
  el.style.left = (5 + Math.random()*60) + "%";
  void el.offsetWidth;
  el.classList.add("go");
}

createStars();
window.addEventListener("resize", createStars);

const days = stayToday();
renderDays(days);
syncScreenA11y();

requestAnimationFrame(() => {
  document.getElementById("letter").classList.add("letter-ready");
});

const quiet = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const later = quiet ? 0 : 8200;
setTimeout(() => document.getElementById("nextBtn").classList.add("show"), later);
if(days.length > 1){
  setTimeout(() => document.getElementById("dayMark").classList.add("show"), quiet ? 0 : 9000);
}
setTimeout(() => {
  document.getElementById("sign").classList.add("show");
}, quiet ? 0 : 10400);

if(!quiet){
  setTimeout(shootOnce, 3500);
  setInterval(shootOnce, 14000);
}

document.getElementById("nextBtn").addEventListener("click", showVideo);
document.getElementById("videoBack").addEventListener("click", showMain);
document.getElementById("nextVideoBtn").addEventListener("click", nextVideo);
document.getElementById("guestBack").addEventListener("click", hideGuest);
document.getElementById("moonBtn").addEventListener("click", toggleGuest);
document.getElementById("guestForm").addEventListener("submit", submitGuest);
document.addEventListener("keydown", e => {
  if(e.key === "Escape" && document.getElementById("guestScreen").classList.contains("on")){
    e.preventDefault();
    hideGuest();
  }
});

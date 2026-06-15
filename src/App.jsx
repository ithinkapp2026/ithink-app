import { useState, useMemo, useRef } from "react";

const TAGS = {
  riflessione: {
    color: "#9D8DFF", icon: "◐", label: "Riflessione",
    placeholder: "Hai avuto un pensiero che non riesci a toglierti dalla testa...",
    sub: "Le riflessioni più profonde nascono nel silenzio.",
    cardBg: "linear-gradient(150deg, #16132E 0%, #0E0C1C 55%, #0A0912 100%)",
    fontStyle: "normal", fontSize: 18, fontWeight: 300,
  },
  domanda: {
    color: "#FFD84D", icon: "?", label: "Domanda",
    placeholder: "C'è una domanda che non hai mai osato fare ad alta voce...",
    sub: "Le domande giuste sono più rare delle risposte.",
    cardBg: "linear-gradient(150deg, #2A2410 0%, #1A1708 55%, #12100A 100%)",
    fontStyle: "italic", fontSize: 19, fontWeight: 300,
  },
  sfogo: {
    color: "#FF8A6B", icon: "↯", label: "Sfogo",
    placeholder: "Hai qualcosa che ti pesa. Buttalo fuori, senza filtri...",
    sub: "Qui puoi dire quello che non dici altrove.",
    cardBg: "linear-gradient(150deg, #2A1410 0%, #1C0F0E 55%, #120A0C 100%)",
    fontStyle: "normal", fontSize: 18, fontWeight: 400,
  },
  confessione: {
    color: "#FF7EC8", icon: "✦", label: "Confessione",
    placeholder: "C'è qualcosa che non hai mai detto a nessuno...",
    sub: "Alcune verità pesano meno quando le scrivi.",
    cardBg: "linear-gradient(150deg, #2A1020 0%, #1C0B16 55%, #120A10 100%)",
    fontStyle: "italic", fontSize: 17, fontWeight: 300,
  },
  altro: {
    color: "#5FE8A8", icon: "~", label: "Pensiero",
    placeholder: "Scrivi qualsiasi cosa. Non deve avere senso per forza...",
    sub: "Non tutto ha bisogno di una categoria.",
    cardBg: "linear-gradient(150deg, #0C2A1C 0%, #0A1C14 55%, #081210 100%)",
    fontStyle: "normal", fontSize: 18, fontWeight: 300,
  },
};

const RESONANCES = [
  { key: "anchio", label: "Anche io", emoji: "🫂", color: "#7C6FF7", desc: "Mi rispecchio" },
  { key: "capisco", label: "Ti capisco", emoji: "🫀", color: "#6FD4F7", desc: "Sento la tua" },
  { key: "penso", label: "Ci penso", emoji: "🌀", color: "#F7C96F", desc: "Mi hai fatto riflettere" },
  { key: "diverso", label: "Io invece no", emoji: "🌗", color: "#A0A0C0", desc: "Sono diverso, e va bene" },
];

const ANON_NAMES = ["Pensatore #4821","Mente #0037","Voce #9913","Anima #2204","Spirito #7761","Ombra #3308","Eco #5542","Silenzio #1190"];

const USER_PROFILE = { name: "Tommaso", username: "il_vikingo", avatar: "V", avatarColor: "#6FF7A8", bio: "Sempre grumpy, sempre presente. Penso troppo e parlo poco.", joined: "Giugno 2025" };

/* ═══════════════════════════════════════════
   MODERAZIONE — filtro contenuti d'odio/offensivi
   Normalizza il testo per resistere ai trucchi
   (spazi, simboli, lettere ripetute, leetspeak)
═══════════════════════════════════════════ */
const BLOCKED_TERMS = [
  // slur e insulti gravi (italiano + inglese) — bloccati per tutela
  "negro","negra","negri","frocio","froci","frocia","ricchione","finocchio",
  "checca","terrone","terroni","mongoloide","ritardato","handicappato",
  "puttana","troia","zoccola","baldracca","stronzo","stronza","coglione",
  "vaffanculo","fanculo","bastardo","merda","cazzo","figa","minchia",
  "nigger","nigga","faggot","retard","whore","slut","bitch","cunt",
];

const normalizeForModeration = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // accenti
    .replace(/[1!|]/g,"i").replace(/0/g,"o").replace(/3/g,"e").replace(/4/g,"a").replace(/5/g,"s").replace(/7/g,"t").replace(/@/g,"a").replace(/\$/g,"s") // leetspeak
    .replace(/[^a-z\s]/g," ")        // via simboli
    .replace(/(.)\1{2,}/g,"$1$1")     // lettere ripetute (frooocio -> froocio)
    .replace(/\s+/g," ");
};

// Restituisce true se il testo contiene contenuti bloccati
const containsBlockedContent = (text) => {
  if (!text) return false;
  const norm = normalizeForModeration(text);
  const compact = norm.replace(/\s/g,""); // anche parole spezzate "n e g r o"
  return BLOCKED_TERMS.some(term => {
    const t = term.replace(/\s/g,"");
    // confine di parola sul testo normalizzato, oppure presenza nella versione compatta
    const re = new RegExp(`\\b${t}\\b`);
    return re.test(norm) || compact.includes(t);
  });
};


const INITIAL_POSTS = [
  { id:1, author:"marta_v", avatar:"M", avatarColor:"#7C6FF7", anonymous:false, time:"2 ore fa", tag:"riflessione", text:"Ho realizzato che passo più tempo a pensare di fare le cose che a farle davvero. Forse il pensiero è già l'azione.", image:null, resonances:{anchio:18,capisco:9,penso:14,diverso:3}, myResonance:null, comments:[{id:1,author:"luca_b",avatar:"L",avatarColor:"#F76F6F",anonymous:false,text:"Questa è la mia vita descritta in due righe.",image:null,time:"1 ora fa"}] },
  { id:2, author:"Pensatore #4821", avatar:"?", avatarColor:"#3A3A5C", anonymous:true, time:"3 ore fa", tag:"confessione", text:"Non ho mai detto a nessuno che ho pianto guardando una pubblicità di un cane. Due volte. La stessa pubblicità.", image:null, resonances:{anchio:87,capisco:31,penso:7,diverso:2}, myResonance:null, comments:[] },
  { id:3, author:"Voce #9913", avatar:"?", avatarColor:"#3A3A5C", anonymous:true, time:"4 ore fa", tag:"domanda", text:"Perché ci sentiamo soli anche quando siamo circondati da persone che ci vogliono bene? Qualcuno ha una risposta vera, non quella da libro?", image:null, resonances:{anchio:203,capisco:44,penso:38,diverso:4}, myResonance:null, comments:[{id:1,author:"sofia.p",avatar:"S",avatarColor:"#F7C96F",anonymous:false,text:"Perché mostri una versione di te, non te.",image:null,time:"3 ore fa"},{id:2,author:"il_vikingo",avatar:"V",avatarColor:"#6FF7A8",anonymous:false,text:"Forse perché nessuno vede davvero come stai, solo come sembri.",image:null,time:"2 ore fa"}] },
  { id:4, author:"il_vikingo", avatar:"V", avatarColor:"#6FF7A8", anonymous:false, time:"ieri", tag:"sfogo", text:"Il caffè freddo non è una scelta di stile. È la conseguenza diretta di avere troppi pensieri e dimenticarsi di berlo.", image:null, resonances:{anchio:61,capisco:12,penso:5,diverso:8}, myResonance:null, comments:[] },
  { id:5, author:"il_vikingo", avatar:"V", avatarColor:"#6FF7A8", anonymous:false, time:"3 giorni fa", tag:"riflessione", text:"Ho smesso di cercare di capire le persone. Non perché non mi importi, ma perché mi importa così tanto che fa male.", image:null, resonances:{anchio:134,capisco:47,penso:22,diverso:6}, myResonance:null, comments:[] },
  { id:6, author:"il_vikingo", avatar:"V", avatarColor:"#6FF7A8", anonymous:false, time:"1 settimana fa", tag:"domanda", text:"Qualcuno ha mai avuto la sensazione di essere esattamente nel posto giusto ma nella versione sbagliata di sé stesso?", image:null, resonances:{anchio:89,capisco:33,penso:41,diverso:11}, myResonance:null, comments:[] },
  { id:7, author:"elena_r", avatar:"E", avatarColor:"#F7C96F", anonymous:false, time:"6 ore fa", tag:"sfogo", text:"Sono stanca di dover spiegare come sto. Vorrei che qualcuno lo capisse senza che dovessi dirlo.", image:null, resonances:{anchio:156,capisco:67,penso:12,diverso:5}, myResonance:null, comments:[] },
  { id:8, author:"Anima #2204", avatar:"?", avatarColor:"#3A3A5C", anonymous:true, time:"1 giorno fa", tag:"confessione", text:"A volte faccio finta di stare bene così bene che mi convinco davvero. Poi arriva la notte.", image:null, resonances:{anchio:241,capisco:88,penso:19,diverso:3}, myResonance:null, comments:[] },
  { id:9, author:"marco_t", avatar:"M", avatarColor:"#6FD4F7", anonymous:false, time:"2 giorni fa", tag:"domanda", text:"Esiste un modo per amare qualcuno senza avere paura di perderlo? O la paura è parte dell'amore?", image:null, resonances:{anchio:178,capisco:55,penso:93,diverso:7}, myResonance:null, comments:[] },
  { id:10, author:"chiara_b", avatar:"C", avatarColor:"#F76F6F", anonymous:false, time:"5 giorni fa", tag:"riflessione", text:"Le persone che ci fanno del bene raramente lo sanno. E quelle che ci fanno del male spesso nemmeno.", image:null, resonances:{anchio:312,capisco:104,penso:67,diverso:14}, myResonance:null, comments:[] },
];

const TRENDING_TOPICS = [
  { key:"solitudine", emoji:"🌑", count:48, desc:"Su questo tema le persone si dividono: molti raccontano una solitudine che resta anche in mezzo agli altri, e la collegano al mostrarsi diversi da come ci si sente davvero. Altri la descrivono come paura di essere visti per ciò che si è, più che mancanza di compagnia." },
  { key:"amore", emoji:"💗", count:36, desc:"Le voci più ricorrenti legano l'amore alla paura di perderlo: per molti le due cose sono inseparabili. Una parte della community invece lo vive come una scelta quotidiana, più che come un sentimento che capita e basta." },
  { key:"paura", emoji:"🌫️", count:29, desc:"Qui prevale l'idea che la paura non vada combattuta ma ascoltata. Diversi pensieri la raccontano come segnale di qualcosa che ci sta a cuore, non come debolezza da nascondere." },
  { key:"notte", emoji:"🌙", count:22, desc:"La notte torna spesso come il momento in cui cadono le maschere indossate di giorno. Molti confessano che è quando si sentono più sinceri, anche se più fragili." },
  { key:"persone", emoji:"🫂", count:41, desc:"Il tema più dibattuto: cosa significa capire davvero qualcuno. Alcuni dicono di aver smesso di provarci per autodifesa, altri sostengono che basterebbe essere visti senza doverlo spiegare." },
  { key:"tempo", emoji:"⏳", count:18, desc:"Riflessioni divise tra chi sente di passare più tempo a pensare le cose che a viverle, e chi rivendica il pensare come una forma di azione a tutti gli effetti." },
];

/* ═══════════════════════════════════════════
   IL MOMENTO DEL GIORNO — gancio quotidiano
═══════════════════════════════════════════ */
const DAILY_PROMPTS = [
  { q:"Cosa ti ha dato fastidio oggi?", emoji:"😤", color:"#FF8A6B", hint:"Sfoga quella piccola (o grande) cosa che ti è rimasta sullo stomaco." },
  { q:"Una piccola cosa bella di oggi", emoji:"✨", color:"#FFD84D", hint:"Anche minuscola. Un raggio di sole, un messaggio, un caffè." },
  { q:"Un pensiero che non ti molla", emoji:"🌀", color:"#9D8DFF", hint:"Quello che ti gira in testa da stamattina." },
  { q:"Fotografa qualcosa che ti ha fatto fermare", emoji:"📷", color:"#5FE8A8", hint:"Un'immagine vale più di mille parole. Scatta e racconta." },
];
// prompt "del giorno" scelto in base alla data (stabile per 24h)
const todayPrompt = () => DAILY_PROMPTS[new Date().getDate() % DAILY_PROMPTS.length];

const OTHERS_MOMENTS = [
  { id:1, author:"marta_v", anonymous:false, avatarColor:"#7C6FF7", text:"Il rumore della pioggia mentre lavoravo. Mi sono fermata un attimo solo per ascoltarlo.", image:null, time:"2 ore fa", resonances:23 },
  { id:2, author:"Ombra #3308", anonymous:true, avatarColor:"#3A3A5C", text:"Una persona al bus ha lasciato il posto a un'anziana senza che nessuno glielo chiedesse. Piccole cose.", image:null, time:"4 ore fa", resonances:67 },
  { id:3, author:"luca_b", anonymous:false, avatarColor:"#F76F6F", text:"Mi ha dato fastidio sentirmi invisibile in una stanza piena di gente.", image:null, time:"5 ore fa", resonances:89 },
];

const INITIAL_GROUPS = [
  {
    id:"g1", name:"Chi non dorme la notte", emoji:"🌙", type:"argomento", open:true, joined:true,
    members:1243, color:"#6FD4F7",
    desc:"Per chi alle 3 di notte ha la testa più affollata che mai. Qui i pensieri notturni trovano compagnia.",
    posts:[
      { id:1, author:"Notte #6643", avatar:"?", avatarColor:"#3A3A5C", anonymous:true, tag:"confessione", text:"Sono le 3:47 e sto fissando il soffitto da un'ora. Qualcuno sveglio come me?", time:"2 ore fa", resonances:{anchio:34,capisco:8,penso:2,diverso:0}, myResonance:null, image:null, comments:[] },
      { id:2, author:"elena_r", avatar:"E", avatarColor:"#F7C96F", anonymous:false, tag:"riflessione", text:"Di notte i problemi sembrano montagne. Di giorno tornano colline. Eppure non cambia niente, cambio solo io.", time:"ieri", resonances:{anchio:52,capisco:19,penso:14,diverso:1}, myResonance:null, image:null, comments:[] },
    ],
    chat:[
      { id:1, author:"Notte #6643", anonymous:true, text:"C'è nessuno?", time:"03:48" },
      { id:2, author:"luca_b", anonymous:false, text:"Io. Insonnia anche stanotte 🥲", time:"03:51" },
      { id:3, author:"Notte #6643", anonymous:true, text:"Almeno non siamo soli", time:"03:52" },
    ],
  },
  {
    id:"g2", name:"Anime sensibili", emoji:"🫂", type:"affinità", open:true, joined:false,
    members:3401, color:"#9D8DFF",
    desc:"Per chi sente tutto un po' più forte. Un posto dove l'empatia non è una debolezza.",
    posts:[
      { id:1, author:"chiara_b", avatar:"C", avatarColor:"#F76F6F", anonymous:false, tag:"sfogo", text:"A volte vorrei sentire un po' di meno. Ma poi penso che è proprio questo che mi rende me.", time:"5 ore fa", resonances:{anchio:88,capisco:41,penso:7,diverso:3}, myResonance:null, image:null, comments:[] },
    ],
    chat:[
      { id:1, author:"sofia.p", anonymous:false, text:"Benvenuti a tutti i nuovi 💗", time:"10:20" },
    ],
  },
  {
    id:"g3", name:"Sognatori notturni", emoji:"✦", type:"affinità", open:false, joined:false, pending:false,
    members:567, color:"#FFC861",
    desc:"Gruppo privato. Per chi non smette mai di immaginare come potrebbero essere le cose.",
    posts:[], chat:[],
  },
  {
    id:"g4", name:"Solitudine", emoji:"🌑", type:"argomento", open:true, joined:false,
    members:2118, color:"#7C6FF7",
    desc:"Parlarne è già un modo per sentirsi un po' meno soli. Senza vergogna, senza giudizio.",
    posts:[
      { id:1, author:"Voce #9913", avatar:"?", avatarColor:"#3A3A5C", anonymous:true, tag:"domanda", text:"Si può essere circondati di gente e sentirsi i più soli del mondo?", time:"1 giorno fa", resonances:{anchio:140,capisco:33,penso:20,diverso:2}, myResonance:null, image:null, comments:[] },
    ],
    chat:[],
  },
];

const INITIAL_NOTIFICATIONS = [
  { id:1, type:"anchio", read:false, time:"3 min fa", author:"Voce #9913", anonymous:true, avatarColor:"#3A3A5C", text:"si sente come te", post:"Forse il pensiero è già l'azione.", resonance:"Anche io 🫂" },
  { id:2, type:"commento", read:false, time:"12 min fa", author:"sofia.p", anonymous:false, avatarColor:"#F7C96F", text:"ha risposto al tuo pensiero", post:"Il caffè freddo non è una scelta di stile.", comment:"Io faccio lo stesso con il tè 😅" },
  { id:3, type:"follower", read:false, time:"1 ora fa", author:"marco_t", anonymous:false, avatarColor:"#6FD4F7", text:"ha iniziato a seguirti" },
  { id:4, type:"capisco", read:true, time:"2 ore fa", author:"Anima #2204", anonymous:true, avatarColor:"#3A3A5C", text:"ti capisce", post:"Ho smesso di cercare di capire le persone.", resonance:"Ti capisco 🫀" },
  { id:5, type:"gruppo", read:true, time:"ieri", author:"Chi non dorme la notte", anonymous:false, avatarColor:"#6FD4F7", text:"3 nuovi pensieri nel gruppo", post:"" },
  { id:6, type:"messaggio", read:true, time:"ieri", author:"marta_v", anonymous:false, avatarColor:"#7C6FF7", text:"ti ha scritto un messaggio", post:"Ho letto il tuo pensiero sulla solitudine..." },
];

const NOTIF_META = {
  anchio:    { color:"#7C6FF7", icon:"🫂", label:"Risonanza" },
  capisco:   { color:"#6FD4F7", icon:"🫀", label:"Empatia" },
  penso:     { color:"#F7C96F", icon:"🌀", label:"Riflessione" },
  diverso:   { color:"#A0A0C0", icon:"🌗", label:"Diverso" },
  commento:  { color:"#FF8A6B", icon:"💬", label:"Commento" },
  follower:  { color:"#6FF7A8", icon:"✦", label:"Nuovo follower" },
  gruppo:    { color:"#FFC861", icon:"👥", label:"Gruppo" },
  messaggio: { color:"#9D8DFF", icon:"✉️", label:"Messaggio" },
};

const INITIAL_DM_THREADS = [
  { id:"dm1", peer:{ name:"Marta", username:"marta_v", avatar:"M", color:"#7C6FF7", online:true },
    messages:[
      { id:1, from:"peer", text:"Ho letto il tuo pensiero sulla solitudine. Mi ha colpita davvero.", time:"21:04" },
      { id:2, from:"me", text:"Grazie, a volte scrivere aiuta più che parlare.", time:"21:06" },
      { id:3, from:"peer", text:"Esatto. È per questo che sono su iThink 💜", time:"21:07" },
    ]
  },
  { id:"dm2", peer:{ name:"Marco", username:"marco_t", avatar:"M", color:"#6FD4F7", online:false, lastSeen:"2 ore fa" },
    messages:[
      { id:1, from:"peer", text:"Quella domanda sull'amore e la paura di perderlo — l'hai scritta tu?", time:"ieri" },
    ]
  },
  { id:"dm3", peer:{ name:"Sofia", username:"sofia.p", avatar:"S", color:"#F7C96F", online:true },
    messages:[
      { id:1, from:"peer", text:"Anche io faccio finta di stare bene a volte.", time:"18:30" },
      { id:2, from:"me", text:"Almeno siamo onesti con noi stessi, no?", time:"18:32" },
    ]
  },
];
const AnonMaskGlyph = ({ size=20, color="#9A8CFF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* maschera veneziana stilizzata */}
    <path d="M3 7c2.5-1 6-1.5 9-1.5S18.5 6 21 7c0 4-1.5 7.5-4 9-1.6 1-3.2 1-5 1s-3.4 0-5-1C4.5 14.5 3 11 3 7z"
      fill={color+"22"} stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
    {/* fori occhi */}
    <path d="M7 9.2c1.3-.6 2.7-.6 3.6 0" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    <path d="M13.4 9.2c.9-.6 2.3-.6 3.6 0" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
  </svg>
);

const Avatar = ({ letter, color, size=36, anonymous }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:anonymous?"#241F3A":color+"22", border:`1.5px solid ${anonymous?"#5A4FA0":color+"55"}`, display:"flex", alignItems:"center", justifyContent:"center", color:anonymous?"#9A8CFF":color, fontWeight:700, fontSize:size*0.38, flexShrink:0 }}>
    {anonymous ? <AnonMaskGlyph size={size*0.58} color="#9A8CFF"/> : letter}
  </div>
);

const MaskIcon = ({ active, color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={active?color+"22":"none"} stroke={active?color:"#44445A"} strokeWidth="2">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth="3"/>
    <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth="3"/>
  </svg>
);

const CommentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const BrainLogo = ({ size=30 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="brainGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#8B7DFF"/>
        <stop offset="100%" stopColor="#C5BCFF"/>
      </linearGradient>
    </defs>
    {/* bolla-cervello morbida e arrotondata */}
    <path d="M20 7c-3 0-5.4 1.7-6.4 4.2C10.8 11.5 9 13.6 9 16.2c0 1 .3 2 .8 2.8C8.7 20 8 21.4 8 23c0 2.6 1.9 4.7 4.4 5 .6 2.3 2.7 4 5.1 4 .9 0 1.7-.2 2.5-.6.8.4 1.6.6 2.5.6 2.4 0 4.5-1.7 5.1-4 2.5-.3 4.4-2.4 4.4-5 0-1.6-.7-3-1.8-4 .5-.8.8-1.8.8-2.8 0-2.6-1.8-4.7-4.6-5C25.4 8.7 23 7 20 7z"
      fill="url(#brainGrad)" stroke="url(#brainGrad)" strokeWidth="1.5" strokeLinejoin="round"/>
    {/* linea centrale + due solchi semplici, in negativo */}
    <path d="M20 9.5v22" stroke="#5B4FB0" strokeWidth="1.6" strokeLinecap="round" opacity="0.55"/>
    <path d="M14.5 16c1.8.2 2.8 1.4 2.6 3.2M14 23.5c1.8 0 2.8 1 2.8 2.6" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
    <path d="M25.5 16c-1.8.2-2.8 1.4-2.6 3.2M26 23.5c-1.8 0-2.8 1-2.8 2.6" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const GroupIcon = ({ size=16, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const LockIcon = ({ size=12, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const SendIcon = ({ color="#fff" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const BellIcon = ({ size=18, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const InboxIcon = ({ size=18, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
);

const FingerprintIcon = ({ size=15, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <path d="M12 11c0 4-1 6-1.5 7.5"/>
    <path d="M8.5 7.5A5 5 0 0 1 17 11c0 1.5 0 3-.5 4.5"/>
    <path d="M5 11a7 7 0 0 1 3-5.8"/>
    <path d="M14.5 11c0 3-.5 5-1 6.5"/>
    <path d="M9 11a3 3 0 0 1 6 0c0 2.5-.3 4-.7 5.2"/>
  </svg>
);

const EditIcon = ({ size=14, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ImageIcon = ({ color }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color||"currentColor"} strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M21 15l-5-5L5 21"/>
  </svg>
);

// Reusable image picker hook logic as a small component
const ImageUploadButton = ({ onImageSelected, accent, label="Aggiungi foto" }) => {
  const inputRef = useRef(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onImageSelected(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = ""; // reset so same file can be re-picked
  };
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
      <button onClick={()=>inputRef.current?.click()} style={{
        background:"transparent", border:`1px solid ${accent}33`, borderRadius:8,
        padding:"5px 11px", display:"flex", alignItems:"center", gap:6,
        color:accent, fontSize:11, fontWeight:600, cursor:"pointer", transition:"all 0.2s",
      }}>
        <ImageIcon color={accent}/>{label}
      </button>
    </>
  );
};

// Image preview with remove button (used in composer / comment input)
const ImagePreview = ({ src, onRemove, accent }) => (
  <div style={{ position:"relative", marginTop:12, borderRadius:14, overflow:"hidden", border:`1px solid ${accent}33`, maxWidth:"100%" }}>
    <img src={src} alt="anteprima" style={{ width:"100%", maxHeight:340, objectFit:"cover", display:"block" }} />
    <button onClick={onRemove} style={{
      position:"absolute", top:8, right:8, width:28, height:28, borderRadius:"50%",
      background:"#000000aa", border:"none", cursor:"pointer", color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)",
    }}><XIcon/></button>
  </div>
);

// Displayed image inside a posted thought / comment (with lightbox)
const PostImage = ({ src, onClick, radius=14, maxHeight=420 }) => (
  <div style={{ marginTop:14, borderRadius:radius, overflow:"hidden", cursor:"pointer", border:"1px solid #ffffff0f" }} onClick={onClick}>
    <img src={src} alt="immagine del pensiero" style={{ width:"100%", maxHeight, objectFit:"cover", display:"block" }} />
  </div>
);

const Lightbox = ({ src, onClose }) => (
  <div onClick={onClose} style={{
    position:"fixed", inset:0, zIndex:100, background:"#000000ee",
    display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    backdropFilter:"blur(8px)", animation:"fadeIn 0.15s ease",
  }}>
    <img src={src} alt="immagine ingrandita" style={{ maxWidth:"100%", maxHeight:"100%", borderRadius:12, objectFit:"contain" }} />
    <button onClick={onClose} style={{
      position:"absolute", top:20, right:20, width:40, height:40, borderRadius:"50%",
      background:"#ffffff18", border:"none", cursor:"pointer", color:"#fff",
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
    }}>✕</button>
  </div>
);

const HighlightText = ({ text, query }) => {
  if (!query.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'));
  return <span>{parts.map((part,i)=>part.toLowerCase()===query.toLowerCase()?<mark key={i} style={{background:"#7C6FF733",color:"#B8B0FF",borderRadius:3,padding:"0 2px"}}>{part}</mark>:part)}</span>;
};

const RESONANCE_FEEDBACK = {
  anchio: t => `Siete in ${t}!`,
  capisco: t => `In ${t} a sentirti`,
  penso: t => `In ${t} a pensarci`,
  diverso: t => `In ${t} come te`,
};

const ResonanceBar = ({ resonances, myResonance, onResonate, accent }) => {
  const [phaseKey, setPhaseKey] = useState(null); // quale bottone sta animando
  const [showMsg, setShowMsg] = useState(false);

  const handleTap = (r) => {
    const wasSelected = myResonance===r.key;
    onResonate(r.key);
    if (!wasSelected) {
      setPhaseKey(r.key);
      setShowMsg(true);
      // la parola torna mentre la luce svanisce
      setTimeout(()=>setShowMsg(false), 1100);
      setTimeout(()=>setPhaseKey(prev => prev===r.key ? null : prev), 2000);
    } else {
      setShowMsg(false); setPhaseKey(null);
    }
  };

  return (
    <div style={{marginTop:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {RESONANCES.map(r=>{
          const isSelected = myResonance===r.key;
          const animating = phaseKey===r.key;
          const msgActive = animating && showMsg;
          return (
            <button key={r.key} onClick={()=>handleTap(r)} style={{
              position:"relative",
              display:"flex",alignItems:"center",gap:8,
              background:isSelected?r.color+"24":"#14141F",
              border:`1.5px solid ${isSelected?r.color+"88":"#26263A"}`,
              borderRadius:12,padding:"10px 12px",cursor:"pointer",
              textAlign:"left",width:"100%",overflow:"hidden",height:42,boxSizing:"border-box",
              transition:"background 0.5s ease, border-color 0.5s ease, transform 0.4s ease",
              transform:isSelected?"scale(1.015)":"scale(1)",
              animation: animating ? "resGlow 2s ease-out" : "none",
              ["--rc"]: r.color,
            }}>
              <span style={{fontSize:20,lineHeight:1,flexShrink:0,display:"inline-block",animation: animating ? "resBreathe 2s ease-out" : "none"}}>{r.emoji}</span>
              {/* area testo a altezza fissa: label e messaggio in dissolvenza incrociata, stessa riga */}
              <span style={{position:"relative",flex:1,minWidth:0,height:16,display:"flex",alignItems:"center"}}>
                <span style={{
                  position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",
                  color:isSelected?r.color:"#C8C8DC",fontSize:13,fontWeight:700,whiteSpace:"nowrap",
                  opacity: msgActive ? 0 : 1, transition:"opacity 0.55s ease",
                }}>{r.label}</span>
                <span style={{
                  position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",
                  color:r.color,fontSize:13,fontWeight:700,whiteSpace:"nowrap",
                  opacity: msgActive ? 1 : 0, transition:"opacity 0.55s ease",
                  pointerEvents:"none",
                }}>{RESONANCE_FEEDBACK[r.key]((resonances[r.key]||0)+(isSelected?0:1))}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PostCard = ({ post, onResonate, onComment, searchQuery="", onOpenImage }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAnon, setCommentAnon] = useState(false);
  const [commentImage, setCommentImage] = useState(null);
  const [commentBlocked, setCommentBlocked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reported, setReported] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const tagMeta = TAGS[post.tag];
  const accent = post.anonymous ? "#5A5A7A" : tagMeta.color;

  const handleComment = () => {
    if (!commentText.trim() && !commentImage) return;
    if (containsBlockedContent(commentText)) { setCommentBlocked(true); return; }
    onComment(post.id, commentText.trim(), commentAnon, commentImage);
    setCommentText(""); setCommentImage(null); setCommentBlocked(false);
  };

  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} style={{background:post.anonymous?"#0E0E14":tagMeta.cardBg,borderRadius:20,marginBottom:14,overflow:"hidden",border:`1px solid ${hovered?accent+"66":accent+"33"}`,transition:"all 0.3s ease",boxShadow:hovered?`0 0 44px ${accent}22`:`0 0 18px ${accent}0C`}}>
      <div style={{background:`linear-gradient(90deg, ${accent}26, ${accent}10)`,borderBottom:`1px solid ${accent}33`,padding:"11px 20px",display:"flex",alignItems:"center",gap:9}}>
        <span style={{fontSize:20,lineHeight:1,filter:`drop-shadow(0 0 8px ${accent}aa)`}}>{tagMeta.icon}</span>
        <div style={{color:accent,fontSize:15,fontWeight:800,letterSpacing:"0.04em",textTransform:"uppercase"}}>{tagMeta.label}</div>
      </div>
      <div style={{padding:"14px 20px 0",display:"flex",alignItems:"center",gap:9}}>
        <Avatar letter={post.avatar} color={post.avatarColor} anonymous={post.anonymous} size={30}/>
        <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:0}}>
          <span style={{color:post.anonymous?"#9A8CFF":"#C8C8E0",fontSize:13,fontWeight:600,fontStyle:post.anonymous?"italic":"normal",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{post.anonymous?post.author:`@${post.author}`}</span>
          <span style={{color:"#44445A",fontSize:11}}>{post.time}</span>
        </div>
        {post.anonymous&&<span style={{marginLeft:"auto",background:"#241F3A",color:"#9A8CFF",fontSize:9,fontWeight:700,borderRadius:6,padding:"4px 9px",letterSpacing:"0.06em",display:"inline-flex",alignItems:"center",gap:4,border:"1px solid #5A4FA055"}}><AnonMaskGlyph size={11} color="#9A8CFF"/>ANONIMO</span>}
        <div style={{position:"relative",marginLeft:post.anonymous?"8px":"auto"}}>
          <button onClick={()=>setShowMenu(m=>!m)} title="Opzioni" style={{background:"none",border:"none",cursor:"pointer",color:"#5A5A78",padding:"4px 6px",fontSize:18,lineHeight:0.5,letterSpacing:"1px"}}>⋯</button>
          {showMenu&&(
            <div style={{position:"absolute",top:28,right:0,zIndex:20,background:"#16161F",border:"1px solid #2A2A3E",borderRadius:12,padding:6,minWidth:150,boxShadow:"0 8px 24px #000000aa"}}>
              <button onClick={()=>{setReported(true);setRevealed(false);setShowMenu(false);}} style={{width:"100%",background:"none",border:"none",cursor:"pointer",color:"#FF8A6B",fontSize:13,fontWeight:600,padding:"9px 10px",borderRadius:8,display:"flex",alignItems:"center",gap:8,textAlign:"left"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF8A6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                Segnala
              </button>
              <button onClick={()=>setShowMenu(false)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",color:"#9090B0",fontSize:13,fontWeight:600,padding:"9px 10px",borderRadius:8,textAlign:"left"}}>Annulla</button>
            </div>
          )}
        </div>
      </div>
      {reported && !revealed ? (
        <div style={{padding:"18px 22px"}}>
          <div style={{background:"#1A1410",border:"1px solid #FF8A6B44",borderRadius:14,padding:"16px",display:"flex",gap:11,alignItems:"flex-start"}}>
            <span style={{fontSize:20}}>🚩</span>
            <div style={{flex:1}}>
              <div style={{color:"#FF9B7B",fontSize:13,fontWeight:700,marginBottom:4}}>Hai segnalato questo contenuto</div>
              <div style={{color:"#B09080",fontSize:12.5,lineHeight:1.5,marginBottom:10}}>Grazie per aiutarci a tenere iThink uno spazio sicuro. Il contenuto è stato nascosto e verrà esaminato.</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setRevealed(true)} style={{background:"#13131E",border:"1px solid #2A2A3E",borderRadius:8,padding:"6px 12px",color:"#9090B0",fontSize:12,fontWeight:600,cursor:"pointer"}}>Mostra comunque</button>
                <button onClick={()=>setReported(false)} style={{background:"none",border:"none",color:"#6B6B8A",fontSize:12,fontWeight:600,cursor:"pointer"}}>Annulla segnalazione</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div style={{padding:"14px 22px 18px"}}>
        {post.text && <p style={{color:"#E8E8F8",fontSize:tagMeta.fontSize,lineHeight:1.75,margin:"0 0 4px",fontWeight:tagMeta.fontWeight,fontStyle:tagMeta.fontStyle,letterSpacing:"-0.015em"}}>
          <HighlightText text={post.text} query={searchQuery}/>
        </p>}
        {post.image && <PostImage src={post.image} onClick={()=>onOpenImage(post.image)} />}
        <ResonanceBar resonances={post.resonances} myResonance={post.myResonance} onResonate={(key)=>onResonate(post.id,key)} accent={accent}/>
        <div style={{marginTop:12}}>
          <button onClick={()=>setShowComments(!showComments)} style={{background:showComments?accent+"1A":"#15151F",border:`1px solid ${showComments?accent+"55":"#26263A"}`,borderRadius:20,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7,color:showComments?accent:"#9090B0",fontSize:13,fontWeight:600,padding:"6px 13px",transition:"all 0.2s"}}>
            <CommentIcon/>{post.comments.length>0?`${post.comments.length} commenti`:"Scrivi qualcosa"}
          </button>
        </div>
        {showComments&&(
          <div style={{marginTop:14,borderTop:`1px solid ${accent}22`,paddingTop:14}}>
            {post.comments.map(c=>(
              <div key={c.id} style={{display:"flex",gap:9,marginBottom:12}}>
                <Avatar letter={c.avatar} color={c.avatarColor} size={22} anonymous={c.anonymous}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{color:c.anonymous?"#5A5A7A":"#A0A0C0",fontSize:11,fontWeight:600,fontStyle:c.anonymous?"italic":"normal"}}>{c.anonymous?c.author:`@${c.author}`}</span>
                    <span style={{color:"#2E2E48",fontSize:10}}>{c.time}</span>
                  </div>
                  {c.text && <p style={{color:"#8888A8",fontSize:13,margin:"3px 0 0",lineHeight:1.55}}>{c.text}</p>}
                  {c.image && (
                    <div style={{marginTop:8,borderRadius:10,overflow:"hidden",cursor:"pointer",maxWidth:220,border:"1px solid #ffffff0f"}} onClick={()=>onOpenImage(c.image)}>
                      <img src={c.image} alt="immagine del commento" style={{width:"100%",maxHeight:180,objectFit:"cover",display:"block"}}/>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div style={{display:"flex",gap:9,marginTop:10,alignItems:"flex-start"}}>
              <Avatar letter="V" color="#6FF7A8" size={22} anonymous={commentAnon}/>
              <div style={{flex:1}}>
                <textarea value={commentText} onChange={e=>{setCommentText(e.target.value); if(commentBlocked) setCommentBlocked(false);}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleComment();}}} placeholder="Il tuo pensiero..." style={{width:"100%",background:"#0A0A12",border:`1px solid ${commentBlocked?"#F76F6F66":accent+"33"}`,borderRadius:9,padding:"8px 11px",color:"#E8E8F0",fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5,boxSizing:"border-box"}} rows={1}/>
                {commentBlocked && <div style={{color:"#FF9B9B",fontSize:11,marginTop:5,display:"flex",alignItems:"center",gap:5}}>🛡️ Linguaggio offensivo non permesso. Riscrivi senza parole che feriscono.</div>}
                {commentImage && <ImagePreview src={commentImage} onRemove={()=>setCommentImage(null)} accent={accent} />}
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:6,flexWrap:"wrap"}}>
                  <button onClick={()=>setCommentAnon(!commentAnon)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5,color:commentAnon?"#9A8CFF":"#38384E",fontSize:10,padding:0,fontWeight:500,transition:"color 0.2s"}}>
                    <AnonMaskGlyph size={13} color={commentAnon?"#9A8CFF":"#38384E"}/>{commentAnon?"Risposta anonima":"Rispondi in anonimo"}
                  </button>
                  {!commentImage && <ImageUploadButton onImageSelected={setCommentImage} accent={accent} label="Foto" />}
                </div>
              </div>
              <button onClick={handleComment} disabled={!commentText.trim()&&!commentImage} style={{background:(commentText.trim()||commentImage)?accent:"#1A1A28",border:"none",borderRadius:7,padding:"7px 12px",color:(commentText.trim()||commentImage)?"#fff":"#44445A",fontSize:11,fontWeight:700,cursor:(commentText.trim()||commentImage)?"pointer":"default",transition:"all 0.2s",flexShrink:0}}>Invia</button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

const ComposeBox = ({ onPost }) => {
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [tag, setTag] = useState("riflessione");
  const [focused, setFocused] = useState(false);
  const [image, setImage] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const MAX = 400;
  const meta = TAGS[tag];
  const accent = meta.color;
  const anonName = ANON_NAMES[Math.floor(Math.random()*ANON_NAMES.length)];

  const submit = () => {
    if (!text.trim() && !image) return;
    if (containsBlockedContent(text)) { setBlocked(true); return; }
    onPost(text.trim(), anonymous, tag, image);
    setText(""); setAnonymous(false); setImage(null); setBlocked(false);
  };

  return (
    <div style={{borderRadius:20,overflow:"hidden",marginBottom:24,background:meta.cardBg,border:`1px solid ${focused?accent+"66":accent+"22"}`,transition:"all 0.35s ease",boxShadow:focused?`0 0 40px ${accent}15`:"none"}}>
      <div style={{background:accent+"14",borderBottom:`1px solid ${accent}22`,padding:"8px 4px 0",display:"flex",gap:0,overflowX:"auto"}}>
        {Object.entries(TAGS).map(([key,val])=>(
          <button key={key} onClick={()=>setTag(key)} style={{background:"transparent",border:"none",borderBottom:tag===key?`2px solid ${val.color}`:"2px solid transparent",padding:"8px 14px",fontSize:12,fontWeight:600,color:tag===key?val.color:"#38384E",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
            <span style={{fontSize:14,filter:tag===key?`drop-shadow(0 0 4px ${val.color}88)`:"none"}}>{val.icon}</span>{val.label}
          </button>
        ))}
      </div>
      <div style={{padding:"16px 20px"}}>
        <div style={{color:accent+"88",fontSize:11,fontStyle:"italic",marginBottom:12}}>{meta.sub}</div>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <Avatar letter="V" color="#6FF7A8" anonymous={anonymous} size={32}/>
          <div style={{flex:1}}>
            {anonymous&&<div style={{background:"#241F3A",border:"1px solid #5A4FA055",borderRadius:10,padding:"8px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:9}}>
              <AnonMaskGlyph size={20} color="#9A8CFF"/>
              <div style={{lineHeight:1.3}}>
                <div style={{color:"#9A8CFF",fontSize:11,fontWeight:700,letterSpacing:"0.03em"}}>MODALITÀ ANONIMA</div>
                <div style={{color:"#7A72B0",fontSize:11,fontStyle:"italic"}}>Pubblicherai come {anonName}</div>
              </div>
            </div>}
            <textarea value={text} onChange={e=>{setText(e.target.value.slice(0,MAX)); if(blocked) setBlocked(false);}} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder={meta.placeholder} style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#E8E8F4",fontSize:meta.fontSize,fontStyle:meta.fontStyle,fontWeight:meta.fontWeight,resize:"none",fontFamily:"inherit",lineHeight:1.75,minHeight:80,boxSizing:"border-box",letterSpacing:"-0.01em"}}/>
            {blocked && (
              <div style={{display:"flex",gap:9,alignItems:"flex-start",background:"#2A0F0F",border:"1px solid #F76F6F55",borderRadius:12,padding:"11px 13px",marginTop:10}}>
                <span style={{fontSize:16,lineHeight:1.3}}>🛡️</span>
                <div>
                  <div style={{color:"#FF9B9B",fontSize:12.5,fontWeight:700,marginBottom:3}}>Questo messaggio non può essere pubblicato</div>
                  <div style={{color:"#C89090",fontSize:12,lineHeight:1.5}}>iThink è uno spazio sicuro: linguaggio offensivo o d'odio non è permesso. Prova a riscrivere il tuo pensiero senza parole che possano ferire.</div>
                </div>
              </div>
            )}
            {image && <ImagePreview src={image} onRemove={()=>setImage(null)} accent={accent} />}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,gap:10,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>setAnonymous(!anonymous)} style={{background:anonymous?"#241F3A":"transparent",border:`1px solid ${anonymous?"#5A4FA0":"#2A2A3E"}`,borderRadius:8,padding:"5px 11px",display:"flex",alignItems:"center",gap:6,color:anonymous?"#9A8CFF":"#44445A",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all 0.25s"}}>
                  <AnonMaskGlyph size={14} color={anonymous?"#9A8CFF":"#44445A"}/>{anonymous?"Anonimo attivo":"Anonimo"}
                </button>
                {!image && <ImageUploadButton onImageSelected={setImage} accent={accent} />}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {text.length>0&&<span style={{color:text.length>MAX*0.85?"#F76F6F":"#38384E",fontSize:11}}>{MAX-text.length}</span>}
                <button onClick={submit} disabled={!text.trim()&&!image} style={{background:(text.trim()||image)?`linear-gradient(135deg,${accent},${accent}BB)`:"#1A1A28",border:"none",borderRadius:9,padding:"8px 18px",color:(text.trim()||image)?"#fff":"#44445A",fontSize:13,fontWeight:700,cursor:(text.trim()||image)?"pointer":"default",transition:"all 0.3s",boxShadow:(text.trim()||image)?`0 0 20px ${accent}44`:"none"}}>Pubblica</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniPostCard = ({ post, onOpenImage, onDelete }) => {
  const tagMeta = TAGS[post.tag];
  const accent = post.anonymous ? "#5A5A7A" : tagMeta.color;
  const total = Object.values(post.resonances).reduce((a,b)=>a+b,0);
  return (
    <div style={{background:post.anonymous?"#0E0E14":tagMeta.cardBg,borderRadius:14,marginBottom:10,overflow:"hidden",border:`1px solid ${accent}33`}}>
      <div style={{background:accent+"14",borderBottom:`1px solid ${accent}22`,padding:"7px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14,filter:`drop-shadow(0 0 4px ${accent}88)`}}>{tagMeta.icon}</span>
          <span style={{color:accent,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>{tagMeta.label}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:"#2E2E48",fontSize:10}}>{post.time}</span>
          {onDelete && (
            <button onClick={()=>{ if(window.confirm("Vuoi eliminare questo pensiero? L'azione non si può annullare.")) onDelete(post.id); }} title="Elimina" style={{background:"none",border:"none",cursor:"pointer",color:"#5A5A78",padding:0,display:"flex",alignItems:"center"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {post.text && <p style={{color:"#D8D8F0",fontSize:14,lineHeight:1.6,margin:"0 0 10px",fontWeight:tagMeta.fontWeight,fontStyle:tagMeta.fontStyle}}>{post.text}</p>}
        {post.image && (
          <div style={{marginBottom:10,borderRadius:10,overflow:"hidden",cursor:"pointer",border:"1px solid #ffffff0f"}} onClick={()=>onOpenImage&&onOpenImage(post.image)}>
            <img src={post.image} alt="immagine" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/>
          </div>
        )}
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{display:"flex",gap:3}}>{RESONANCES.map(r=>post.resonances[r.key]>0&&<span key={r.key} style={{fontSize:12,opacity:0.6}}>{r.emoji}</span>)}</div>
          <span style={{color:"#38384E",fontSize:11}}>{total} risonanze</span>
          {post.comments.length>0&&<span style={{color:"#38384E",fontSize:11}}>· {post.comments.length} commenti</span>}
        </div>
      </div>
    </div>
  );
};

const ProfileScreen = ({ posts, onBack, onOpenImage, onMessage, onDeletePost }) => {
  const [activeTab, setActiveTab] = useState("diario");
  const [following, setFollowing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(USER_PROFILE.name);
  const [bio, setBio] = useState(USER_PROFILE.bio);
  const photoInputRef = useRef(null);
  const handlePhoto = (e) => {
    const f = e.target.files?.[0]; if(!f) return;
    const rd = new FileReader(); rd.onload = ev => setProfilePhoto(ev.target.result); rd.readAsDataURL(f); e.target.value="";
  };
  const myOwnPosts = posts.filter(p=>p.author===USER_PROFILE.username);
  const myInteractions = posts.filter(p=>p.author!==USER_PROFILE.username&&p.comments.some(c=>c.author===USER_PROFILE.username));
  const tagCounts = {};
  myOwnPosts.forEach(p=>{tagCounts[p.tag]=(tagCounts[p.tag]||0)+1;});
  const totalResonancesReceived = myOwnPosts.reduce((sum,p)=>sum+Object.values(p.resonances).reduce((a,b)=>a+b,0),0);
  const resonanceReceived = {};
  RESONANCES.forEach(r=>{resonanceReceived[r.key]=myOwnPosts.reduce((sum,p)=>sum+(p.resonances[r.key]||0),0);});
  const topResonance = RESONANCES.reduce((top,r)=>resonanceReceived[r.key]>(resonanceReceived[top?.key]||0)?r:top,RESONANCES[0]);

  // --- Ritratto emotivo: descrive la voce della persona, non la giudica ---
  const sortedTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]);
  const dominantTag = sortedTags[0]?.[0];
  const secondTag = sortedTags[1]?.[0];
  const tagVoice = {
    riflessione: "riflessioni che cercano un senso nelle cose di tutti i giorni",
    domanda: "domande aperte che invitano gli altri a fermarsi a pensare",
    sfogo: "sfoghi sinceri, di chi non ha paura di dire come sta",
    confessione: "confessioni intime, dette a voce bassa",
    altro: "pensieri liberi, che non hanno bisogno di un'etichetta",
  };
  const resonanceVoice = {
    anchio: "chi si rivede nelle sue parole e pensa \"anche io\"",
    capisco: "chi sente empatia e vuole dirle che la capisce",
    penso: "chi si ferma a riflettere dopo averla letta",
    diverso: "chi la pensa diversamente ma rispetta la sua voce",
  };
  const essenceByTag = {
    riflessione: "Una voce che pensa prima di parlare.",
    domanda: "Una voce che preferisce le domande alle certezze.",
    sfogo: "Una voce che dice quello che gli altri tacciono.",
    confessione: "Una voce che non ha paura di mostrarsi.",
    altro: "Una voce che sfugge alle definizioni.",
  };
  let portrait = null;
  if (myOwnPosts.length > 0 && dominantTag) {
    const part1 = `Scrive soprattutto ${tagVoice[dominantTag]}`;
    const part2 = secondTag ? `, con qualche ${TAGS[secondTag].label.toLowerCase()} qua e là.` : ".";
    const part3 = topResonance ? ` Le sue parole risuonano soprattutto con ${resonanceVoice[topResonance.key]}.` : "";
    portrait = { line: essenceByTag[dominantTag], body: part1 + part2 + part3 };
  }
  return (
    <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Inter',system-ui,sans-serif",color:"#E8E8F0"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
          <span style={{fontSize:16,fontWeight:700,color:"#C0C0D8"}}>Profilo</span>
        </div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"0 20px 40px"}}>
        <div style={{background:"linear-gradient(160deg,#0E1A14 0%,#08080F 60%)",border:"1px solid #6FF7A822",borderRadius:20,padding:"28px 24px",marginBottom:16,marginTop:16}}>
          <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
            <div onClick={()=>photoInputRef.current?.click()} style={{position:"relative",width:68,height:68,borderRadius:"50%",flexShrink:0,background:profilePhoto?"transparent":"#6FF7A822",border:"2px solid #6FF7A855",display:"flex",alignItems:"center",justifyContent:"center",color:"#6FF7A8",fontWeight:800,fontSize:26,boxShadow:"0 0 30px #6FF7A820",cursor:"pointer",overflow:"hidden"}}>
              {profilePhoto ? <img src={profilePhoto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : "V"}
              <div style={{position:"absolute",bottom:-2,right:-2,width:24,height:24,borderRadius:"50%",background:"#7C6FF7",border:"2px solid #08080F",display:"flex",alignItems:"center",justifyContent:"center"}}><EditIcon size={11} color="#fff"/></div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
            <div style={{flex:1,minWidth:0}}>
              {editing ? (
                <>
                  <input value={name} onChange={e=>setName(e.target.value)} style={{width:"100%",background:"#0A0A12",border:"1px solid #6FF7A844",borderRadius:8,padding:"6px 10px",color:"#E8E8F4",fontSize:17,fontWeight:800,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  <div style={{color:"#6FF7A8",fontSize:13,marginTop:4}}>@{USER_PROFILE.username}</div>
                  <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={2} placeholder="Scrivi qualcosa su di te..." style={{width:"100%",marginTop:6,background:"#0A0A12",border:"1px solid #2A2A3E",borderRadius:8,padding:"7px 10px",color:"#C0C0D8",fontSize:12,outline:"none",fontFamily:"inherit",resize:"none",lineHeight:1.5,boxSizing:"border-box"}}/>
                </>
              ) : (
                <>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:20,fontWeight:800,color:"#E8E8F4",letterSpacing:"-0.03em"}}>{name}</span>
                    <button onClick={()=>setEditing(true)} title="Modifica profilo" style={{background:"#13131E",border:"1px solid #26263A",borderRadius:8,width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#9090B0",flexShrink:0}}><EditIcon size={12} color="#9090B0"/></button>
                  </div>
                  <div style={{color:"#6FF7A8",fontSize:13,marginTop:2}}>@{USER_PROFILE.username}</div>
                  <div style={{color:"#5A5A7A",fontSize:12,marginTop:6,lineHeight:1.5,fontStyle:"italic"}}>{bio}</div>
                  <div style={{color:"#2E2E48",fontSize:11,marginTop:8}}>Su iThink da {USER_PROFILE.joined}</div>
                </>
              )}
            </div>
          </div>
          {editing && (
            <div style={{display:"flex",gap:8,marginTop:14}}>
              <button onClick={()=>setEditing(false)} style={{flex:1,background:"linear-gradient(135deg,#6FF7A8,#3FD98C)",border:"none",borderRadius:10,padding:"10px",color:"#08120C",fontSize:13,fontWeight:700,cursor:"pointer"}}>Salva profilo</button>
              <button onClick={()=>{setEditing(false);setName(USER_PROFILE.name);setBio(USER_PROFILE.bio);}} style={{background:"#13131E",border:"1px solid #26263A",borderRadius:10,padding:"10px 16px",color:"#9090B0",fontSize:13,fontWeight:600,cursor:"pointer"}}>Annulla</button>
            </div>
          )}
          {!editing && (
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button onClick={()=>onMessage&&onMessage()} style={{flex:1,background:"linear-gradient(135deg,#7C6FF7,#9D8DFF)",border:"none",borderRadius:11,padding:"11px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 4px 14px #7C6FF733"}}>
              <CommentIcon/>Invia messaggio
            </button>
            <button onClick={()=>setFollowing(f=>!f)} style={{
              flex:1,
              background: following ? "#13131E" : "linear-gradient(135deg,#6FF7A8,#3FD98C)",
              border: following ? "1px solid #6FF7A855" : "none",
              borderRadius:11,padding:"11px",
              color: following ? "#6FF7A8" : "#08120C",
              fontSize:13,fontWeight:700,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:7,
              transition:"all 0.25s",
              boxShadow: following ? "none" : "0 4px 14px #6FF7A833",
            }}>
              {following ? <>✓ Segui già</> : <>+ Segui</>}
            </button>
          </div>
          )}
          {portrait && (
            <div style={{marginTop:18,background:"linear-gradient(135deg, #16132E 0%, #0E0C1C 100%)",border:"1px solid #7C6FF733",borderRadius:16,padding:"18px"}}>
              <div className="ithink-display" style={{color:"#E0DCFF",fontSize:17,fontWeight:700,fontStyle:"italic",lineHeight:1.45,marginBottom:9,letterSpacing:"-0.01em"}}>{portrait.line}</div>
              <p style={{color:"#9A93C0",fontSize:13.5,lineHeight:1.7,margin:0}}>{portrait.body}</p>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginTop:18}}>
            {[{label:"Pensieri",value:myOwnPosts.length,color:"#7C6FF7"},{label:"Risonanze",value:totalResonancesReceived,color:"#6FD4F7"},{label:"Risposte",value:myOwnPosts.reduce((s,p)=>s+p.comments.length,0),color:"#F7C96F"},{label:"Interazioni",value:myInteractions.length,color:"#6FF7A8"}].map(s=>(
              <div key={s.label} style={{background:"#0A0A12",borderRadius:12,padding:"10px 8px",textAlign:"center",border:`1px solid ${s.color}22`}}>
                <div style={{color:s.color,fontSize:20,fontWeight:800}}>{s.value}</div>
                <div style={{color:"#38384E",fontSize:10,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:16,background:"linear-gradient(135deg,#12121E,#0A0A12)",borderRadius:16,padding:"16px 18px",border:"1px solid #26263A"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:13}}>
              <div style={{width:30,height:30,borderRadius:9,background:"#7C6FF722",border:"1px solid #7C6FF744",display:"flex",alignItems:"center",justifyContent:"center"}}><FingerprintIcon size={17} color="#9D8DFF"/></div>
              <span className="ithink-display" style={{color:"#D8D2FF",fontSize:15,fontWeight:800,letterSpacing:"-0.01em"}}>Impronta emotiva</span>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).map(([tag,count])=>{
                const meta=TAGS[tag];
                return <div key={tag} style={{background:meta.color+"1E",border:`1px solid ${meta.color}44`,borderRadius:20,padding:"6px 13px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13}}>{meta.icon}</span>
                  <span className="ithink-display" style={{color:meta.color,fontSize:12.5,fontWeight:700}}>{meta.label}</span>
                  <span style={{color:meta.color+"99",fontSize:11,fontWeight:700}}>{count}</span>
                </div>;
              })}
            </div>
            {topResonance&&<div style={{marginTop:13,color:"#7A72A8",fontSize:12.5,lineHeight:1.5}}>Le persone rispondono di più con <span className="ithink-display" style={{color:topResonance.color,fontWeight:700}}>{topResonance.emoji} {topResonance.label}</span></div>}
          </div>
        </div>
        <div style={{display:"flex",borderBottom:"1px solid #14141F",marginBottom:16}}>
          {[{key:"diario",label:"Pensieri"},{key:"foto",label:"Foto"},{key:"interazioni",label:"Interazioni"}].map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{background:"none",border:"none",borderBottom:activeTab===t.key?"2px solid #7C6FF7":"2px solid transparent",padding:"10px 18px",color:activeTab===t.key?"#9B98F7":"#38384E",fontSize:13,fontWeight:activeTab===t.key?700:500,cursor:"pointer",transition:"all 0.2s"}}>{t.label}</button>
          ))}
        </div>
        {activeTab==="diario"&&<div>{myOwnPosts.length>0?myOwnPosts.map(p=><MiniPostCard key={p.id} post={p} onOpenImage={onOpenImage} onDelete={onDeletePost}/>):<div style={{textAlign:"center",padding:"40px",color:"#44445A",fontSize:14}}>Ancora nessun pensiero condiviso.</div>}</div>}
        {activeTab==="foto"&&(()=>{
          const photos = myOwnPosts.filter(p=>p.image);
          return photos.length>0 ? (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
              {photos.map(p=>(
                <div key={p.id} onClick={()=>onOpenImage&&onOpenImage(p.image)} style={{aspectRatio:"1",borderRadius:10,overflow:"hidden",cursor:"pointer",border:"1px solid #1E1E2E"}}>
                  <img src={p.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                </div>
              ))}
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"40px 20px",color:"#44445A",fontSize:14}}>
              <div style={{fontSize:32,marginBottom:12}}>📷</div>
              Nessuna foto condivisa per ora.
            </div>
          );
        })()}
        {activeTab==="interazioni"&&<div>{myInteractions.map(post=>{
          const myComments=post.comments.filter(c=>c.author===USER_PROFILE.username);
          const tagMeta=TAGS[post.tag];
          const accent=post.anonymous?"#5A5A7A":tagMeta.color;
          return <div key={post.id} style={{background:"#0E0E14",borderRadius:14,marginBottom:12,border:`1px solid ${accent}22`,overflow:"hidden"}}>
            <div style={{background:accent+"12",borderBottom:`1px solid ${accent}20`,padding:"8px 14px",display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:12}}>{tagMeta.icon}</span>
              <span style={{color:accent,fontSize:11,fontWeight:600}}>{tagMeta.label}</span>
              <span style={{color:"#2E2E48",fontSize:10,marginLeft:"auto"}}>{post.time}</span>
            </div>
            <div style={{padding:"12px 14px"}}>
              <p style={{color:"#8888A8",fontSize:13,margin:"0 0 10px",fontStyle:post.anonymous?"italic":"normal",lineHeight:1.5}}>{post.anonymous?post.author:`@${post.author}`}: "{post.text}"</p>
              {myComments.map(c=>(
                <div key={c.id} style={{background:"#6FF7A810",border:"1px solid #6FF7A822",borderRadius:10,padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
                  <span style={{color:"#6FF7A8",fontSize:11,marginTop:1}}>↳</span>
                  <div>
                    {c.text && <p style={{color:"#C0C0D8",fontSize:13,margin:0,lineHeight:1.5}}>"{c.text}"</p>}
                    {c.image && <div style={{marginTop:6,borderRadius:8,overflow:"hidden",maxWidth:160,cursor:"pointer"}} onClick={()=>onOpenImage&&onOpenImage(c.image)}><img src={c.image} alt="" style={{width:"100%",display:"block"}}/></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>;
        })}</div>}
      </div>
    </div>
  );
};

const SearchScreen = ({ posts, onBack, onResonate, onComment, onOpenImage }) => {
  const [query, setQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState(null);
  const [activeTopicFilter, setActiveTopicFilter] = useState(null);
  const results = useMemo(() => {
    if (!query.trim() && !activeTagFilter && !activeTopicFilter) return [];
    return posts.filter(p => {
      const matchesQuery = !query.trim() || p.text.toLowerCase().includes(query.toLowerCase()) || p.author.toLowerCase().includes(query.toLowerCase());
      const matchesTag = !activeTagFilter || p.tag === activeTagFilter;
      const matchesTopic = !activeTopicFilter || p.text.toLowerCase().includes(activeTopicFilter.key.toLowerCase());
      return matchesQuery && matchesTag && matchesTopic;
    });
  }, [query, activeTagFilter, activeTopicFilter, posts]);
  const hasFilter = query.trim() || activeTagFilter || activeTopicFilter;
  return (
    <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Inter',system-ui,sans-serif",color:"#E8E8F0"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"14px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:10,background:"#0E0E18",border:"1px solid #7C6FF744",borderRadius:12,padding:"10px 14px"}}>
              <span style={{color:"#7C6FF7",flexShrink:0}}><SearchIcon/></span>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca pensieri, domande, persone..." autoFocus style={{flex:1,background:"none",border:"none",outline:"none",color:"#E8E8F0",fontSize:15,fontFamily:"inherit"}}/>
              {query&&<button onClick={()=>setQuery("")} style={{background:"none",border:"none",cursor:"pointer",color:"#38384E",padding:0}}><XIcon/></button>}
            </div>
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
            {Object.entries(TAGS).map(([key,val])=>(
              <button key={key} onClick={()=>setActiveTagFilter(activeTagFilter===key?null:key)} style={{background:activeTagFilter===key?val.color+"22":"transparent",border:`1px solid ${activeTagFilter===key?val.color+"66":"#1A1A28"}`,borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:600,color:activeTagFilter===key?val.color:"#38384E",cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                <span>{val.icon}</span>{val.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"20px 20px"}}>
        {!hasFilter && (
          <div>
            <div style={{color:"#38384E",fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:14}}>Argomenti del momento</div>
            <div style={{color:"#5A5A7A",fontSize:12,marginBottom:16,fontStyle:"italic",lineHeight:1.5}}>Cosa pensa la community, tema per tema. Tocca un argomento per leggere tutti i pensieri.</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:32}}>
              {TRENDING_TOPICS.map((topic)=>(
                <button key={topic.key} onClick={()=>setActiveTopicFilter(topic)} style={{background:"#0E0E18",border:"1px solid #1E1E2E",borderRadius:14,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all 0.2s",display:"block",width:"100%"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#7C6FF755";e.currentTarget.style.background="#12101F";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#1E1E2E";e.currentTarget.style.background="#0E0E18";}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <span style={{fontSize:20}}>{topic.emoji}</span>
                    <span style={{color:"#C8C8E0",fontSize:16,fontWeight:700}}># {topic.key}</span>
                    <span style={{marginLeft:"auto",color:"#44445A",fontSize:11,fontWeight:600}}>{topic.count} pensieri</span>
                  </div>
                  <p style={{color:"#8888A8",fontSize:13,lineHeight:1.6,margin:0}}>{topic.desc}</p>
                </button>
              ))}
            </div>
            <div style={{color:"#38384E",fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:14}}>Post più risonanti</div>
            {[...posts].sort((a,b)=>Object.values(b.resonances).reduce((x,y)=>x+y,0)-Object.values(a.resonances).reduce((x,y)=>x+y,0)).slice(0,3).map(post=>(
              <PostCard key={post.id} post={post} onResonate={onResonate} onComment={onComment} searchQuery="" onOpenImage={onOpenImage}/>
            ))}
          </div>
        )}
        {activeTopicFilter && !query && (
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <button onClick={()=>setActiveTopicFilter(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",padding:0,fontSize:16}}>←</button>
              <span style={{fontSize:22}}>{activeTopicFilter.emoji}</span>
              <span style={{color:"#E8E8F4",fontSize:20,fontWeight:800}}># {activeTopicFilter.key}</span>
              <span style={{marginLeft:"auto",color:"#44445A",fontSize:12}}>{results.length} pensieri</span>
            </div>
            <div style={{background:"#0E0E18",border:"1px solid #1E1E2E",borderRadius:14,padding:"14px 16px"}}>
              <div style={{color:"#7C6FF7",fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>Cosa pensa la community</div>
              <p style={{color:"#B0B0CC",fontSize:14,lineHeight:1.65,margin:0}}>{activeTopicFilter.desc}</p>
            </div>
          </div>
        )}
        {hasFilter && (
          <div>
            {results.length > 0 ? (
              <div>
                {!activeTopicFilter && query && <div style={{color:"#38384E",fontSize:12,marginBottom:14}}>{results.length} risultati per "<span style={{color:"#9B98F7"}}>{query}</span>"</div>}
                {results.map(post=>(
                  <PostCard key={post.id} post={post} onResonate={onResonate} onComment={onComment} searchQuery={query} onOpenImage={onOpenImage}/>
                ))}
              </div>
            ) : (
              <div style={{textAlign:"center",padding:"60px 20px"}}>
                <div style={{fontSize:36,marginBottom:16}}>🌀</div>
                <div style={{color:"#5A5A7A",fontSize:15,marginBottom:8}}>Nessun pensiero trovato</div>
                <div style={{color:"#38384E",fontSize:13}}>Forse sei il primo ad avere questo pensiero.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const GroupsScreen = ({ groups, onBack, onOpenGroup, onJoinToggle }) => {
  const [filter, setFilter] = useState("tutti");
  const filtered = groups.filter(g => filter==="tutti" || (filter==="iscritti"&&g.joined) || (filter==="argomento"&&g.type==="argomento") || (filter==="affinità"&&g.type==="affinità"));
  return (
    <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Inter',system-ui,sans-serif",color:"#E8E8F0"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"14px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
            <span style={{fontSize:18,fontWeight:800,color:"#E8E8F4"}}>Gruppi</span>
            <span style={{color:"#38384E",fontSize:12,marginLeft:2}}>persone con le tue affinità</span>
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
            {[{k:"tutti",l:"Tutti"},{k:"iscritti",l:"I miei gruppi"},{k:"argomento",l:"Per argomento"},{k:"affinità",l:"Per affinità"}].map(f=>(
              <button key={f.k} onClick={()=>setFilter(f.k)} style={{background:filter===f.k?"#7C6FF722":"transparent",border:`1px solid ${filter===f.k?"#7C6FF766":"#1A1A28"}`,borderRadius:20,padding:"5px 13px",fontSize:11,fontWeight:600,color:filter===f.k?"#9B98F7":"#38384E",cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap",flexShrink:0}}>{f.l}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"20px"}}>
        {filtered.map(g=>(
          <div key={g.id} style={{background:`linear-gradient(150deg, ${g.color}14 0%, #0E0E18 60%)`,border:`1px solid ${g.color}33`,borderRadius:18,padding:"18px 20px",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:48,height:48,borderRadius:14,background:g.color+"22",border:`1px solid ${g.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{g.emoji}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                  <span style={{color:"#E8E8F4",fontSize:16,fontWeight:700}}>{g.name}</span>
                  {!g.open&&<span style={{display:"inline-flex",alignItems:"center",gap:3,color:"#FFC861",fontSize:10,fontWeight:600,background:"#FFC8611A",borderRadius:5,padding:"2px 7px"}}><LockIcon size={10} color="#FFC861"/>Privato</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
                  <span style={{color:g.color,fontSize:11,fontWeight:600}}>{g.type==="argomento"?"# argomento":"✦ affinità"}</span>
                  <span style={{color:"#38384E",fontSize:11}}>· {g.members.toLocaleString("it-IT")} membri</span>
                </div>
              </div>
            </div>
            <p style={{color:"#9090A8",fontSize:13,lineHeight:1.6,margin:"12px 0 14px"}}>{g.desc}</p>
            <div style={{display:"flex",gap:8}}>
              {g.joined ? (
                <>
                  <button onClick={()=>onOpenGroup(g.id)} style={{flex:1,background:g.color,border:"none",borderRadius:9,padding:"9px",color:"#08080F",fontSize:13,fontWeight:700,cursor:"pointer"}}>Apri gruppo</button>
                  <button onClick={()=>onJoinToggle(g.id)} style={{background:"transparent",border:"1px solid #2A2A3E",borderRadius:9,padding:"9px 14px",color:"#6B6B8A",fontSize:12,fontWeight:600,cursor:"pointer"}}>Esci</button>
                </>
              ) : g.open ? (
                <button onClick={()=>onJoinToggle(g.id)} style={{flex:1,background:g.color+"22",border:`1px solid ${g.color}55`,borderRadius:9,padding:"9px",color:g.color,fontSize:13,fontWeight:700,cursor:"pointer"}}>Unisciti</button>
              ) : g.pending ? (
                <button disabled style={{flex:1,background:"#1A1A28",border:"1px solid #2A2A3E",borderRadius:9,padding:"9px",color:"#6B6B8A",fontSize:13,fontWeight:600,cursor:"default"}}>Richiesta inviata ✓</button>
              ) : (
                <button onClick={()=>onJoinToggle(g.id)} style={{flex:1,background:"transparent",border:`1px solid ${g.color}55`,borderRadius:9,padding:"9px",color:g.color,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><LockIcon size={12} color={g.color}/>Chiedi di entrare</button>
              )}
            </div>
          </div>
        ))}
        <div style={{textAlign:"center",padding:"20px 0",color:"#2E2E48",fontSize:12,fontStyle:"italic"}}>Presto potrai creare il tuo gruppo ✦</div>
      </div>
    </div>
  );
};

const GroupDetailScreen = ({ group, onBack, onResonate, onComment, onOpenImage, onGroupPost, onGroupChat }) => {
  const [gtab, setGtab] = useState("pensieri");
  const [chatText, setChatText] = useState("");
  const [postText, setPostText] = useState("");
  const sendChat = () => { if(!chatText.trim()) return; onGroupChat(group.id, chatText.trim()); setChatText(""); };
  const sendPost = () => { if(!postText.trim()) return; onGroupPost(group.id, postText.trim()); setPostText(""); };

  return (
    <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Inter',system-ui,sans-serif",color:"#E8E8F0"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"14px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
            <div style={{width:36,height:36,borderRadius:11,background:group.color+"22",border:`1px solid ${group.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{group.emoji}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:"#E8E8F4",fontSize:15,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{group.name}</div>
              <div style={{color:"#38384E",fontSize:11}}>{group.members.toLocaleString("it-IT")} membri</div>
            </div>
          </div>
          <div style={{display:"flex",gap:2,marginTop:12}}>
            {[{k:"pensieri",l:"Pensieri"},{k:"chat",l:"Chat"}].map(t=>(
              <button key={t.k} onClick={()=>setGtab(t.k)} style={{background:gtab===t.k?group.color+"1E":"none",border:"none",borderRadius:7,padding:"6px 16px",color:gtab===t.k?group.color:"#38384E",fontSize:13,fontWeight:gtab===t.k?700:400,cursor:"pointer",transition:"all 0.2s"}}>{t.l}</button>
            ))}
          </div>
        </div>
      </div>

      {gtab==="pensieri" && (
        <div style={{maxWidth:640,margin:"0 auto",padding:"20px"}}>
          <div style={{background:`linear-gradient(150deg, ${group.color}10 0%, #0E0E18 70%)`,border:`1px solid ${group.color}33`,borderRadius:16,padding:"14px 16px",marginBottom:18,display:"flex",gap:10,alignItems:"flex-end"}}>
            <textarea value={postText} onChange={e=>setPostText(e.target.value)} placeholder={`Condividi un pensiero con "${group.name}"...`} rows={2} style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#E8E8F4",fontSize:14,resize:"none",fontFamily:"inherit",lineHeight:1.6}}/>
            <button onClick={sendPost} disabled={!postText.trim()} style={{background:postText.trim()?group.color:"#1A1A28",border:"none",borderRadius:9,padding:"8px 16px",color:postText.trim()?"#08080F":"#44445A",fontSize:13,fontWeight:700,cursor:postText.trim()?"pointer":"default",flexShrink:0}}>Pubblica</button>
          </div>
          {group.posts.length>0 ? group.posts.map(post=>(
            <PostCard key={post.id} post={post} onResonate={(pid,key)=>onResonate(group.id,pid,key)} onComment={(pid,text,anon,img)=>onComment(group.id,pid,text,anon,img)} onOpenImage={onOpenImage}/>
          )) : (
            <div style={{textAlign:"center",padding:"50px 20px",color:"#5A5A7A",fontSize:14}}>Ancora nessun pensiero qui.<br/><span style={{color:"#38384E",fontSize:13}}>Sii il primo a condividerne uno. ✦</span></div>
          )}
        </div>
      )}

      {gtab==="chat" && (
        <div style={{maxWidth:640,margin:"0 auto",padding:"16px 16px 90px"}}>
          {group.chat.length>0 ? group.chat.map(m=>{
            const mine = m.author===USER_PROFILE.username;
            return (
              <div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",marginBottom:10}}>
                <div style={{maxWidth:"75%"}}>
                  {!mine&&<div style={{color:m.anonymous?"#9A8CFF":"#7888A8",fontSize:11,fontWeight:600,marginBottom:3,marginLeft:4,fontStyle:m.anonymous?"italic":"normal"}}>{m.anonymous?m.author:`@${m.author}`}</div>}
                  <div style={{background:mine?group.color:"#16161F",color:mine?"#08080F":"#D8D8EC",borderRadius:mine?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"9px 13px",fontSize:14,lineHeight:1.45}}>{m.text}</div>
                  <div style={{color:"#2E2E48",fontSize:10,marginTop:3,textAlign:mine?"right":"left",marginRight:mine?4:0,marginLeft:mine?0:4}}>{m.time}</div>
                </div>
              </div>
            );
          }) : (
            <div style={{textAlign:"center",padding:"50px 20px",color:"#5A5A7A",fontSize:14}}>La chat è silenziosa.<br/><span style={{color:"#38384E",fontSize:13}}>Rompi il ghiaccio. 💬</span></div>
          )}
          <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#08080Fee",backdropFilter:"blur(16px)",borderTop:"1px solid #14141F",padding:"12px 16px"}}>
            <div style={{maxWidth:640,margin:"0 auto",display:"flex",gap:10,alignItems:"center"}}>
              <input value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();sendChat();}}} placeholder="Scrivi nel gruppo..." style={{flex:1,background:"#16161F",border:"1px solid #2A2A3E",borderRadius:22,padding:"11px 16px",color:"#E8E8F0",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
              <button onClick={sendChat} disabled={!chatText.trim()} style={{width:42,height:42,borderRadius:"50%",background:chatText.trim()?group.color:"#1A1A28",border:"none",cursor:chatText.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><SendIcon color={chatText.trim()?"#08080F":"#44445A"}/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NotificationsScreen = ({ notifications, onBack, onMarkAllRead }) => {
  const unread = notifications.filter(n=>!n.read).length;
  return (
    <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"#E8E8F0"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
            <span className="ithink-display" style={{fontSize:18,fontWeight:800,color:"#E8E8F4"}}>Notifiche</span>
            {unread>0&&<span style={{background:"linear-gradient(135deg,#7C6FF7,#9D8DFF)",color:"#fff",fontSize:11,fontWeight:800,borderRadius:20,padding:"2px 9px"}}>{unread}</span>}
          </div>
          {unread>0&&<button onClick={onMarkAllRead} style={{background:"none",border:"none",cursor:"pointer",color:"#7C6FF7",fontSize:12,fontWeight:600}}>Segna tutte come lette</button>}
        </div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"12px 20px"}}>
        {notifications.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:40,marginBottom:14}}>🌙</div>
            <div style={{color:"#5A5A7A",fontSize:15,fontWeight:600}}>Tutto tranquillo per ora</div>
            <div style={{color:"#38384E",fontSize:13,marginTop:6}}>Quando qualcuno risuona con te, te lo diciamo qui.</div>
          </div>
        )}
        {notifications.map((n,i)=>{
          const accentMap = {anchio:"#7C6FF7",capisco:"#6FD4F7",penso:"#F7C96F",diverso:"#A0A0C0",comment:"#6FF7A8",message:"#FF7EC8",group:"#FFD84D"};
          const accent = accentMap[n.type]||"#7C6FF7";
          return (
            <div key={n.id} style={{
              background: n.read ? "#0A0A12" : `linear-gradient(135deg, ${accent}12 0%, #0E0E18 60%)`,
              border:`1px solid ${n.read?"#1A1A28":accent+"44"}`,
              borderRadius:16,padding:"14px 16px",marginBottom:10,
              display:"flex",gap:12,alignItems:"flex-start",
              transition:"all 0.3s",
            }}>
              {/* avatar con badge emoji */}
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:n.avatarColor+"22",border:`1.5px solid ${n.avatarColor}55`,display:"flex",alignItems:"center",justifyContent:"center",color:n.avatarColor,fontWeight:700,fontSize:17}}>{n.avatar}</div>
                <div style={{position:"absolute",bottom:-3,right:-3,width:22,height:22,borderRadius:"50%",background:`${accent}22`,border:`2px solid #08080F`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>{n.emoji}</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{color:"#E8E8F4",fontSize:13,fontWeight:700}}>{n.author}</span>
                  {!n.read&&<span style={{width:7,height:7,borderRadius:"50%",background:accent,flexShrink:0,boxShadow:`0 0 6px ${accent}`}}/>}
                </div>
                <div style={{color:accent,fontSize:13,fontWeight:600,marginBottom:4}}>{n.action}</div>
                {n.preview&&<div style={{color:"#7878A0",fontSize:12,lineHeight:1.5,fontStyle:"italic",background:"#13131E",borderRadius:8,padding:"7px 10px",borderLeft:`2px solid ${accent}66"}}>"{n.preview}"</div>}
                <div style={{color:"#38384E",fontSize:11,marginTop:6}}>{n.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MessagesScreen = ({ conversations, onBack, onOpenChat }) => (
  <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"#E8E8F0"}}>
    <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
      <div style={{maxWidth:640,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
        <span className="ithink-display" style={{fontSize:18,fontWeight:800,color:"#E8E8F4"}}>Messaggi</span>
      </div>
    </div>
    <div style={{maxWidth:640,margin:"0 auto",padding:"12px 20px"}}>
      {conversations.map(c=>{
        const unread = c.unread>0;
        return (
          <button key={c.id} onClick={()=>onOpenChat(c.id)} style={{width:"100%",background:unread?"#0E0E1C":"#0A0A12",border:`1px solid ${unread?"#7C6FF733":"#1A1A28"}`,borderRadius:16,padding:"14px 16px",marginBottom:10,display:"flex",gap:12,alignItems:"center",cursor:"pointer",transition:"all 0.2s",textAlign:"left"}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:c.color+"22",border:`1.5px solid ${c.color}55`,display:"flex",alignItems:"center",justifyContent:"center",color:c.color,fontWeight:700,fontSize:19}}>{c.avatar}</div>
              {c.online&&<div style={{position:"absolute",bottom:1,right:1,width:12,height:12,borderRadius:"50%",background:"#6FF7A8",border:"2px solid #08080F"}}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{color:unread?"#E8E8F4":"#C0C0D8",fontSize:14,fontWeight:unread?800:600}}>{c.name}</span>
                <span style={{color:unread?"#9D8DFF":"#38384E",fontSize:11,fontWeight:unread?700:400,flexShrink:0}}>{c.time}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:unread?"#B8B8D8":"#5A5A78",fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{c.lastMsg}</span>
                {unread&&<span style={{background:"linear-gradient(135deg,#7C6FF7,#9D8DFF)",color:"#fff",fontSize:10,fontWeight:800,borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{c.unread}</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

const ChatScreen = ({ conv, onBack, onSend }) => {
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);
  const send = () => { if(!text.trim()) return; onSend(conv.id, text.trim()); setText(""); };
  return (
    <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"#E8E8F0"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"12px 20px",display:"flex",alignItems:"center",gap:11}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:conv.color+"22",border:`1.5px solid ${conv.color}55`,display:"flex",alignItems:"center",justifyContent:"center",color:conv.color,fontWeight:700,fontSize:15}}>{conv.avatar}</div>
            {conv.online&&<div style={{position:"absolute",bottom:0,right:0,width:11,height:11,borderRadius:"50%",background:"#6FF7A8",border:"2px solid #08080F"}}/>}
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#E8E8F4",fontSize:14,fontWeight:700}}>{conv.name}</div>
            <div style={{color:conv.online?"#6FF7A8":"#44445A",fontSize:11}}>{conv.online?"online ora":"@"+conv.username}</div>
          </div>
        </div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"16px 16px 90px"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <span style={{background:"#13131E",border:"1px solid #26263A",borderRadius:20,padding:"6px 14px",color:"#5A5A78",fontSize:11}}>✦ Inizio della conversazione</span>
        </div>
        {conv.messages.map(m=>{
          const mine = m.from==="me";
          return (
            <div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",marginBottom:12,alignItems:"flex-end",gap:8}}>
              {!mine&&<div style={{width:28,height:28,borderRadius:"50%",background:conv.color+"22",border:`1px solid ${conv.color}44`,display:"flex",alignItems:"center",justifyContent:"center",color:conv.color,fontWeight:700,fontSize:11,flexShrink:0}}>{conv.avatar}</div>}
              <div style={{maxWidth:"72%"}}>
                <div style={{
                  background:mine?"linear-gradient(135deg,#7C6FF7,#9D8DFF)":"#1A1A2E",
                  color:mine?"#fff":"#D8D8EC",
                  borderRadius:mine?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  padding:"11px 15px",fontSize:14,lineHeight:1.5,
                  boxShadow:mine?"0 4px 14px #7C6FF744":"none",
                }}>{m.text}</div>
                <div style={{color:"#2E2E48",fontSize:10,marginTop:4,textAlign:mine?"right":"left"}}>{m.time}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}/>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#08080Fee",backdropFilter:"blur(16px)",borderTop:"1px solid #14141F",padding:"12px 16px"}}>
        <div style={{maxWidth:640,margin:"0 auto",display:"flex",gap:10,alignItems:"center"}}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} placeholder={`Scrivi a ${conv.name}...`} style={{flex:1,background:"#16161F",border:"1px solid #2A2A3E",borderRadius:22,padding:"12px 18px",color:"#E8E8F0",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={send} disabled={!text.trim()} style={{width:44,height:44,borderRadius:"50%",background:text.trim()?"linear-gradient(135deg,#7C6FF7,#9D8DFF)":"#1A1A28",border:"none",cursor:text.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:text.trim()?"0 4px 14px #7C6FF755":"none",transition:"all 0.2s"}}><SendIcon color={text.trim()?"#fff":"#44445A"}/></button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   NOTIFICHE
═══════════════════════════════════════════ */
const NotificationsScreen = ({ notifications, onBack, onMarkAllRead, onOpenDM }) => {
  const unread = notifications.filter(n=>!n.read).length;
  return (
    <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"#E8E8F0"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
            <div>
              <span className="ithink-display" style={{fontSize:18,fontWeight:800,color:"#E8E8F4"}}>Notifiche</span>
              {unread>0&&<span style={{marginLeft:8,background:"#7C6FF7",color:"#fff",fontSize:11,fontWeight:700,borderRadius:10,padding:"2px 8px"}}>{unread} nuove</span>}
            </div>
          </div>
          {unread>0&&<button onClick={onMarkAllRead} style={{background:"none",border:"none",cursor:"pointer",color:"#7C6FF7",fontSize:12,fontWeight:600}}>Segna tutte come lette</button>}
        </div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"16px 20px"}}>
        {notifications.map((n,i)=>{
          const meta = NOTIF_META[n.type]||NOTIF_META.commento;
          return (
            <div key={n.id} onClick={n.type==="messaggio"?()=>onOpenDM():undefined} style={{
              display:"flex",gap:13,padding:"14px 16px",marginBottom:8,
              background: n.read ? "#0E0E14" : `linear-gradient(135deg, ${meta.color}0E 0%, #0E0E14 60%)`,
              border:`1px solid ${n.read?"#1A1A28":meta.color+"44"}`,
              borderRadius:16,cursor:n.type==="messaggio"?"pointer":"default",
              transition:"all 0.2s",
            }}>
              {/* avatar */}
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:n.avatarColor+"22",border:`1.5px solid ${n.avatarColor}55`,display:"flex",alignItems:"center",justifyContent:"center",color:n.avatarColor,fontWeight:700,fontSize:17}}>
                  {n.anonymous?"?":n.author[0].toUpperCase()}
                </div>
                <div style={{position:"absolute",bottom:-2,right:-2,width:20,height:20,borderRadius:"50%",background:meta.color,border:"2px solid #08080F",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>{meta.icon}</div>
              </div>
              {/* content */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                  <div style={{minWidth:0}}>
                    <span style={{color:n.read?"#9090B0":"#E0E0F4",fontSize:14,fontWeight:n.read?500:700}}>
                      {n.anonymous?n.author:`@${n.author}`}
                    </span>
                    <span style={{color:n.read?"#6B6B8A":"#B0B0CC",fontSize:14}}> {n.text}</span>
                  </div>
                  <span style={{color:"#44445A",fontSize:11,flexShrink:0,marginTop:2}}>{n.time}</span>
                </div>
                {n.post&&<div style={{color:meta.color,fontSize:12,marginTop:5,fontStyle:"italic",background:meta.color+"12",borderRadius:8,padding:"5px 9px",display:"inline-block"}}>"{n.post.length>60?n.post.slice(0,57)+"...":n.post}"</div>}
                {n.comment&&<div style={{color:"#9090B0",fontSize:12,marginTop:5}}>→ "{n.comment}"</div>}
                {!n.read&&<div style={{display:"flex",alignItems:"center",gap:5,marginTop:8}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:meta.color,boxShadow:`0 0 8px ${meta.color}`}}/>
                  <span style={{color:meta.color,fontSize:11,fontWeight:700}}>Non letta</span>
                </div>}
              </div>
            </div>
          );
        })}
        {notifications.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:"#44445A"}}>
            <div style={{fontSize:40,marginBottom:16}}>🔔</div>
            <div style={{fontSize:15}}>Nessuna notifica ancora.</div>
            <div style={{fontSize:13,marginTop:8,color:"#38384E"}}>Quando qualcuno interagisce con te, lo vedrai qui.</div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   MESSAGGI — INBOX
═══════════════════════════════════════════ */
const MessagesInbox = ({ threads, onBack, onOpen }) => {
  return (
    <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"#E8E8F0"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
          <span className="ithink-display" style={{fontSize:18,fontWeight:800,color:"#E8E8F4"}}>Messaggi</span>
          <div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:"#6FF7A8",boxShadow:"0 0 8px #6FF7A8"}}/>
        </div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"16px 20px"}}>
        {threads.map(t=>{
          const last = t.messages[t.messages.length-1];
          const unread = t.messages.filter(m=>m.from==="peer").length>0 && last.from==="peer";
          return (
            <button key={t.id} onClick={()=>onOpen(t.id)} style={{
              width:"100%",background:"#0E0E18",border:`1px solid ${unread?"#7C6FF755":"#1A1A28"}`,
              borderRadius:16,padding:"14px 16px",marginBottom:10,cursor:"pointer",
              display:"flex",alignItems:"center",gap:13,transition:"all 0.2s",textAlign:"left",
              boxShadow:unread?"0 0 20px #7C6FF710":"none",
            }}>
              <div style={{position:"relative",flexShrink:0}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:t.peer.color+"22",border:`1.5px solid ${t.peer.color}55`,display:"flex",alignItems:"center",justifyContent:"center",color:t.peer.color,fontWeight:700,fontSize:18}}>{t.peer.avatar}</div>
                {t.peer.online&&<div style={{position:"absolute",bottom:1,right:1,width:12,height:12,borderRadius:"50%",background:"#6FF7A8",border:"2px solid #08080F",boxShadow:"0 0 6px #6FF7A8"}}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:"#E0E0F4",fontSize:15,fontWeight:unread?700:600}}>@{t.peer.username}</span>
                  <span style={{color:"#44445A",fontSize:11}}>{last.time}</span>
                </div>
                <div style={{color:unread?"#C0C0DC":"#6B6B8A",fontSize:13,marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {last.from==="me"?"Tu: ":""}{last.text}
                </div>
                <div style={{marginTop:5,fontSize:11,color:t.peer.online?"#6FF7A8":"#44445A"}}>
                  {t.peer.online?"🟢 Online ora":`Visto ${t.peer.lastSeen||"di recente"}`}
                </div>
              </div>
              {unread&&<div style={{width:10,height:10,borderRadius:"50%",background:"#7C6FF7",flexShrink:0,boxShadow:"0 0 8px #7C6FF7"}}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   MESSAGGI — CHAT SINGOLA
═══════════════════════════════════════════ */
const ChatScreen = ({ thread, onBack, onSend }) => {
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const send = () => {
    if(!text.trim()) return;
    onSend(thread.id, text.trim());
    setText("");
    // simula risposta dopo 2s
    setTyping(true);
    setTimeout(()=>setTyping(false), 2000);
  };
  return (
    <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",color:"#E8E8F0"}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
        <div style={{maxWidth:640,margin:"0 auto",padding:"12px 20px",display:"flex",alignItems:"center",gap:11}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6B6B8A",fontSize:18,padding:0}}>←</button>
          <div style={{position:"relative"}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:thread.peer.color+"22",border:`1.5px solid ${thread.peer.color}55`,display:"flex",alignItems:"center",justifyContent:"center",color:thread.peer.color,fontWeight:700,fontSize:15}}>{thread.peer.avatar}</div>
            {thread.peer.online&&<div style={{position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",background:"#6FF7A8",border:"2px solid #08080F",boxShadow:"0 0 6px #6FF7A8"}}/>}
          </div>
          <div>
            <div style={{color:"#E8E8F4",fontSize:15,fontWeight:700}}>@{thread.peer.username}</div>
            <div style={{fontSize:11,color:thread.peer.online?"#6FF7A8":"#44445A"}}>
              {typing?"✍️ sta scrivendo...":thread.peer.online?"Online ora":`Visto ${thread.peer.lastSeen||"di recente"}`}
            </div>
          </div>
        </div>
      </div>
      <div style={{maxWidth:640,margin:"0 auto",padding:"16px 16px 90px"}}>
        <div style={{textAlign:"center",color:"#38384E",fontSize:11,margin:"0 0 20px",fontStyle:"italic"}}>Le voci che si trovano qui, si sentono meno sole. ✦</div>
        {thread.messages.map(m=>{
          const mine = m.from==="me";
          return (
            <div key={m.id} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start",marginBottom:12,alignItems:"flex-end",gap:8}}>
              {!mine&&<div style={{width:28,height:28,borderRadius:"50%",background:thread.peer.color+"22",border:`1px solid ${thread.peer.color}44`,display:"flex",alignItems:"center",justifyContent:"center",color:thread.peer.color,fontWeight:700,fontSize:12,flexShrink:0}}>{thread.peer.avatar}</div>}
              <div style={{maxWidth:"72%"}}>
                <div style={{
                  background:mine?"linear-gradient(135deg,#7C6FF7,#9D8DFF)":"#18182A",
                  color:mine?"#fff":"#D8D8EC",
                  borderRadius:mine?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  padding:"10px 15px",fontSize:14,lineHeight:1.5,
                  boxShadow:mine?"0 4px 14px #7C6FF733":"none",
                }}>{m.text}</div>
                <div style={{color:"#2E2E48",fontSize:10,marginTop:4,textAlign:mine?"right":"left"}}>{m.time}</div>
              </div>
            </div>
          );
        })}
        {typing&&(
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:thread.peer.color+"22",border:`1px solid ${thread.peer.color}44`,display:"flex",alignItems:"center",justifyContent:"center",color:thread.peer.color,fontWeight:700,fontSize:12}}>{thread.peer.avatar}</div>
            <div style={{background:"#18182A",borderRadius:"18px 18px 18px 4px",padding:"10px 16px",display:"flex",gap:5,alignItems:"center"}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#7C6FF7",animation:`typingDot 1.2s ${i*0.2}s infinite`}}/>)}
            </div>
          </div>
        )}
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#08080Fee",backdropFilter:"blur(16px)",borderTop:"1px solid #14141F",padding:"12px 16px"}}>
        <div style={{maxWidth:640,margin:"0 auto",display:"flex",gap:10,alignItems:"center"}}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} placeholder={`Scrivi a @${thread.peer.username}...`} style={{flex:1,background:"#16161F",border:"1px solid #2A2A3E",borderRadius:24,padding:"12px 18px",color:"#E8E8F0",fontSize:14,outline:"none",fontFamily:"inherit",transition:"border-color 0.2s"}}/>
          <button onClick={send} disabled={!text.trim()} style={{width:44,height:44,borderRadius:"50%",background:text.trim()?"linear-gradient(135deg,#7C6FF7,#9D8DFF)":"#1A1A28",border:"none",cursor:text.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:text.trim()?"0 4px 12px #7C6FF755":"none",transition:"all 0.2s"}}><SendIcon color={text.trim()?"#fff":"#44445A"}/></button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   IL MOMENTO DEL GIORNO
═══════════════════════════════════════════ */
const DailyMoment = ({ onOpenImage }) => {
  const p = todayPrompt();
  const [answered, setAnswered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [myMoments, setMyMoments] = useState([]);
  const fileRef = useRef(null);

  // countdown a mezzanotte
  const now = new Date();
  const hoursLeft = 23 - now.getHours();
  const minsLeft = 59 - now.getMinutes();

  const pickImg = (e) => { const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>setImage(ev.target.result); r.readAsDataURL(f); e.target.value=""; };
  const submit = () => {
    if(!text.trim() && !image) return;
    if(text.trim() && containsBlockedContent(text)) return;
    setMyMoments([{ id:Date.now(), text:text.trim(), image }, ...myMoments]);
    setAnswered(true); setExpanded(false); setText(""); setImage(null);
  };

  const allMoments = [...myMoments.map(m=>({...m, author:"il_vikingo", anonymous:false, avatarColor:"#6FF7A8", time:"ora", resonances:0, mine:true})), ...OTHERS_MOMENTS];

  return (
    <div style={{ borderRadius:22, overflow:"hidden", marginBottom:22, border:`1px solid ${p.color}44`, background:`linear-gradient(165deg, ${p.color}1A 0%, #0C0C16 55%)`, boxShadow:`0 0 40px ${p.color}14` }}>
      {/* Intestazione */}
      <div style={{ padding:"16px 20px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13 }}>{now.getHours()<18?"☀️":"🌙"}</span>
            <span className="ithink-display" style={{ color:p.color, fontSize:12, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase" }}>Il momento del giorno</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5, background:p.color+"18", border:`1px solid ${p.color}33`, borderRadius:20, padding:"3px 10px" }}>
            <span style={{ fontSize:10 }}>⏳</span>
            <span style={{ color:p.color, fontSize:11, fontWeight:700 }}>{hoursLeft}h {minsLeft}m</span>
          </div>
        </div>

        {/* Prompt */}
        <div style={{ display:"flex", gap:13, alignItems:"flex-start" }}>
          <div style={{ width:46, height:46, borderRadius:14, background:p.color+"22", border:`1px solid ${p.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{p.emoji}</div>
          <div style={{ flex:1 }}>
            <div className="ithink-display" style={{ color:"#F0EEFF", fontSize:19, fontWeight:800, lineHeight:1.3, letterSpacing:"-0.02em" }}>{p.q}</div>
            <div style={{ color:p.color+"BB", fontSize:12.5, marginTop:4, lineHeight:1.5 }}>{p.hint}</div>
          </div>
        </div>

        {/* Partecipanti */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:14 }}>
          <div style={{ display:"flex" }}>
            {["#7C6FF7","#6FD4F7","#F7C96F","#FF8A6B"].map((c,i)=>(
              <div key={i} style={{ width:22, height:22, borderRadius:"50%", background:c+"33", border:"2px solid #0C0C16", marginLeft:i?-8:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>{["😊","🌧️","✨","💭"][i]}</div>
            ))}
          </div>
          <span style={{ color:"#8888A8", fontSize:12 }}><b style={{color:"#C0C0DC"}}>1.247 persone</b> hanno già condiviso oggi</span>
        </div>
      </div>

      {/* Composer del momento */}
      {!answered && (
        <div style={{ padding:"0 20px 18px" }}>
          {!expanded ? (
            <button onClick={()=>setExpanded(true)} style={{ width:"100%", background:`linear-gradient(135deg, ${p.color}, ${p.color}BB)`, border:"none", borderRadius:13, padding:"13px", color:"#0C0C16", fontSize:14.5, fontWeight:800, cursor:"pointer", boxShadow:`0 4px 16px ${p.color}44`, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              ✍️ Condividi il tuo momento
            </button>
          ) : (
            <div style={{ background:"#0A0A12", border:`1px solid ${p.color}33`, borderRadius:14, padding:"14px" }}>
              <textarea value={text} onChange={e=>setText(e.target.value.slice(0,300))} placeholder="Scrivi qui il tuo momento..." autoFocus rows={3} style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:"#E8E8F4", fontSize:15, resize:"none", fontFamily:"inherit", lineHeight:1.6, boxSizing:"border-box" }}/>
              {image && (
                <div style={{ position:"relative", marginTop:8, borderRadius:12, overflow:"hidden" }}>
                  <img src={image} alt="" style={{ width:"100%", maxHeight:240, objectFit:"cover", display:"block" }}/>
                  <button onClick={()=>setImage(null)} style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:"50%", background:"#000000aa", border:"none", color:"#fff", cursor:"pointer", fontSize:14 }}>✕</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={pickImg} style={{display:"none"}}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
                {!image ? (
                  <button onClick={()=>fileRef.current?.click()} style={{ background:"transparent", border:`1px solid ${p.color}44`, borderRadius:9, padding:"7px 12px", color:p.color, fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>📷 Aggiungi foto</button>
                ) : <span style={{color:p.color,fontSize:11}}>📷 Foto aggiunta</span>}
                <button onClick={submit} disabled={!text.trim()&&!image} style={{ background:(text.trim()||image)?`linear-gradient(135deg,${p.color},${p.color}BB)`:"#1A1A28", border:"none", borderRadius:9, padding:"8px 18px", color:(text.trim()||image)?"#0C0C16":"#44445A", fontSize:13, fontWeight:800, cursor:(text.trim()||image)?"pointer":"default" }}>Condividi</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Momenti degli altri — bloccati finché non rispondi */}
      <div style={{ borderTop:`1px solid ${p.color}22`, padding:"14px 20px 16px", position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <span style={{ color:"#9090B0", fontSize:12, fontWeight:700 }}>I momenti di oggi</span>
          {answered && <span style={{ color:"#6FF7A8", fontSize:11, fontWeight:700 }}>✓ Sbloccati</span>}
        </div>

        <div style={{ position:"relative" }}>
          <div style={{ filter: answered?"none":"blur(7px)", pointerEvents: answered?"auto":"none", transition:"filter 0.4s", display:"flex", flexDirection:"column", gap:10 }}>
            {allMoments.slice(0,answered?undefined:3).map(m=>(
              <div key={m.id} style={{ background:"#0E0E18", border:`1px solid ${m.mine?"#6FF7A844":"#1E1E2E"}`, borderRadius:13, padding:"12px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:m.anonymous?"#241F3A":m.avatarColor+"22", border:`1.5px solid ${m.anonymous?"#5A4FA0":m.avatarColor+"55"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {m.anonymous?<AnonMaskGlyph size={12}/>:<span style={{color:m.avatarColor,fontWeight:700,fontSize:10}}>{m.author[0].toUpperCase()}</span>}
                  </div>
                  <span style={{ color:m.anonymous?"#9A8CFF":"#B0B0CC", fontSize:12, fontWeight:600, fontStyle:m.anonymous?"italic":"normal" }}>{m.anonymous?m.author:`@${m.author}`}</span>
                  {m.mine && <span style={{ background:"#6FF7A822", color:"#6FF7A8", fontSize:9, fontWeight:700, borderRadius:5, padding:"2px 6px" }}>TU</span>}
                  <span style={{ marginLeft:"auto", color:"#44445A", fontSize:10 }}>{m.time}</span>
                </div>
                {m.text && <p style={{ color:"#D0D0E4", fontSize:13.5, lineHeight:1.55, margin:0 }}>{m.text}</p>}
                {m.image && <div style={{marginTop:8,borderRadius:10,overflow:"hidden",cursor:"pointer"}} onClick={()=>onOpenImage&&onOpenImage(m.image)}><img src={m.image} alt="" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/></div>}
                {answered && m.resonances>0 && <div style={{ marginTop:8, color:"#7878A0", fontSize:11 }}>🫂 {m.resonances} persone si sono ritrovate qui</div>}
              </div>
            ))}
          </div>

          {/* Lucchetto overlay */}
          {!answered && (
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, textAlign:"center", padding:"0 20px" }}>
              <div style={{ fontSize:30 }}>🔒</div>
              <div style={{ color:"#E0E0F4", fontSize:14, fontWeight:700 }}>Condividi il tuo momento per sbloccare</div>
              <div style={{ color:"#8888A8", fontSize:12, lineHeight:1.5 }}>Vedrai i momenti degli altri solo dopo aver condiviso il tuo. Sincerità prima di tutto. ✦</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function IThink() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [tab, setTab] = useState("per te");
  const [screen, setScreen] = useState("feed");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [dmThreads, setDmThreads] = useState(INITIAL_DM_THREADS);
  const [activeDmId, setActiveDmId] = useState(null);

  const unreadNotifs = notifications.filter(n=>!n.read).length;
  const unreadDMs = dmThreads.filter(t=>{ const last=t.messages[t.messages.length-1]; return last&&last.from==="peer"; }).length;

  const markAllRead = () => setNotifications(prev=>prev.map(n=>({...n,read:true})));
  const sendDM = (threadId, text) => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    setDmThreads(prev=>prev.map(th=>th.id!==threadId?th:{...th,messages:[...th.messages,{id:Date.now(),from:"me",text,time:t}]}));
  };

  const handleJoinToggle = (groupId) => {
    setGroups(prev=>prev.map(g=>{
      if(g.id!==groupId) return g;
      if(g.open) return {...g, joined:!g.joined, members: g.joined?g.members-1:g.members+1};
      // gruppo privato: invia richiesta
      return {...g, pending:true};
    }));
  };

  const handleGroupPost = (groupId, text) => {
    setGroups(prev=>prev.map(g=>g.id!==groupId?g:{...g, posts:[{id:Date.now(),author:"il_vikingo",avatar:"V",avatarColor:"#6FF7A8",anonymous:false,tag:"riflessione",text,time:"ora",resonances:{anchio:0,capisco:0,penso:0,diverso:0},myResonance:null,image:null,comments:[]},...g.posts]}));
  };

  const handleGroupChat = (groupId, text) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,"0"), mm = String(now.getMinutes()).padStart(2,"0");
    setGroups(prev=>prev.map(g=>g.id!==groupId?g:{...g, chat:[...g.chat,{id:Date.now(),author:"il_vikingo",anonymous:false,text,time:`${hh}:${mm}`}]}));
  };

  const handleGroupResonate = (groupId, postId, key) => {
    setGroups(prev=>prev.map(g=>g.id!==groupId?g:{...g, posts:g.posts.map(p=>{
      if(p.id!==postId) return p;
      const pk=p.myResonance, nr={...p.resonances};
      if(pk) nr[pk]=Math.max(0,nr[pk]-1);
      if(pk!==key) nr[key]=(nr[key]||0)+1;
      return {...p,resonances:nr,myResonance:pk===key?null:key};
    })}));
  };

  const handleGroupComment = (groupId, postId, text, anonymous, image) => {
    const anonName = ANON_NAMES[Math.floor(Math.random()*ANON_NAMES.length)];
    setGroups(prev=>prev.map(g=>g.id!==groupId?g:{...g, posts:g.posts.map(p=>p.id!==postId?p:{...p,comments:[...p.comments,{id:Date.now(),author:anonymous?anonName:"il_vikingo",avatar:anonymous?"?":"V",avatarColor:anonymous?"#3A3A5C":"#6FF7A8",anonymous,text,image:image||null,time:"ora"}]})}));
  };

  const handlePost = (text, anonymous, tag, image) => {
    const anonName = ANON_NAMES[Math.floor(Math.random()*ANON_NAMES.length)];
    setPosts(prev=>[{id:Date.now(),author:anonymous?anonName:"il_vikingo",avatar:anonymous?"?":"V",avatarColor:anonymous?"#3A3A5C":"#6FF7A8",anonymous,time:"ora",tag,text,image:image||null,resonances:{anchio:0,capisco:0,penso:0,diverso:0},myResonance:null,comments:[]},...prev]);
  };

  const handleResonate = (postId, key) => {
    setPosts(prev=>prev.map(p=>{
      if(p.id!==postId) return p;
      const prev_key=p.myResonance;
      const newR={...p.resonances};
      if(prev_key) newR[prev_key]=Math.max(0,newR[prev_key]-1);
      if(prev_key!==key) newR[key]=(newR[key]||0)+1;
      return {...p,resonances:newR,myResonance:prev_key===key?null:key};
    }));
  };

  const handleComment = (postId, text, anonymous, image) => {
    const anonName = ANON_NAMES[Math.floor(Math.random()*ANON_NAMES.length)];
    setPosts(prev=>prev.map(p=>p.id===postId?{...p,comments:[...p.comments,{id:Date.now(),author:anonymous?anonName:"il_vikingo",avatar:anonymous?"?":"V",avatarColor:anonymous?"#3A3A5C":"#6FF7A8",anonymous,text,image:image||null,time:"ora"}]}:p));
  };

  const openImage = (src) => setLightboxImage(src);
  const handleDeletePost = (postId) => setPosts(prev=>prev.filter(p=>p.id!==postId));

  let content;
  if (screen==="profile") content = <ProfileScreen posts={posts} onBack={()=>setScreen("feed")} onOpenImage={openImage} onMessage={()=>{setActiveDmId("dm1");setScreen("chat");}} onDeletePost={handleDeletePost}/>;
  else if (screen==="notifications") content = <NotificationsScreen notifications={notifications} onBack={()=>setScreen("feed")} onMarkAllRead={markAllRead} onOpenDM={()=>{setActiveDmId("dm1");setScreen("chat");}}/>;
  else if (screen==="inbox") content = <MessagesInbox threads={dmThreads} onBack={()=>setScreen("feed")} onOpen={(id)=>{setActiveDmId(id);setScreen("chat");}}/>;
  else if (screen==="chat") { const t=dmThreads.find(x=>x.id===activeDmId); content = t ? <ChatScreen thread={t} onBack={()=>setScreen("inbox")} onSend={sendDM}/> : null; }
  else if (screen==="search") content = <SearchScreen posts={posts} onBack={()=>setScreen("feed")} onResonate={handleResonate} onComment={handleComment} onOpenImage={openImage}/>;
  else if (screen==="groups") content = <GroupsScreen groups={groups} onBack={()=>setScreen("feed")} onOpenGroup={(id)=>{setActiveGroupId(id);setScreen("groupDetail");}} onJoinToggle={handleJoinToggle}/>;
  else if (screen==="groupDetail") {
    const g = groups.find(x=>x.id===activeGroupId);
    content = <GroupDetailScreen group={g} onBack={()=>setScreen("groups")} onResonate={handleGroupResonate} onComment={handleGroupComment} onOpenImage={openImage} onGroupPost={handleGroupPost} onGroupChat={handleGroupChat}/>;
  }
  else {
    const totalRes = p => Object.values(p.resonances).reduce((x,y)=>x+y,0);
    // "per te": mix di risonanze e discussione, per far emergere ciò che coinvolge di più
    const interestScore = p => totalRes(p) + p.comments.length*15;
    let sorted;
    if (tab==="trending") sorted = [...posts].sort((a,b)=>totalRes(b)-totalRes(a));
    else if (tab==="per te") sorted = [...posts].sort((a,b)=>interestScore(b)-interestScore(a));
    else sorted = posts;
    content = (
      <div style={{minHeight:"100vh",background:"#08080F",fontFamily:"'Inter',system-ui,sans-serif",color:"#E8E8F0"}}>
        <div style={{position:"sticky",top:0,zIndex:10,background:"#08080Fee",backdropFilter:"blur(16px)",borderBottom:"1px solid #14141F"}}>
          <div style={{maxWidth:640,margin:"0 auto",padding:"14px 20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0,flexShrink:1}}>
                <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
                  <BrainLogo size={26}/>
                  <span className="ithink-display" style={{fontSize:22,fontWeight:800,letterSpacing:"-0.04em",background:"linear-gradient(135deg,#7C6FF7 20%,#B8B0FF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap"}}>iThink</span>
                </div>
                <span className="ithink-display" style={{color:"#5A5184",fontSize:9.5,fontWeight:600,letterSpacing:"0.02em",whiteSpace:"nowrap",alignSelf:"flex-end",marginBottom:3}}>pensa ad alta voce</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                <button onClick={()=>setScreen("search")} title="Cerca" style={{width:38,height:38,borderRadius:11,background:"#13131E",border:"1px solid #26263A",cursor:"pointer",color:"#9090B0",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                  <SearchIcon/>
                </button>
                <button onClick={()=>setScreen("groups")} title="Gruppi" style={{width:38,height:38,borderRadius:11,background:"#13131E",border:"1px solid #26263A",cursor:"pointer",color:"#9090B0",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                  <GroupIcon size={17} color="#9090B0"/>
                </button>
                {/* Notifiche */}
                <button onClick={()=>setScreen("notifications")} title="Notifiche" style={{position:"relative",width:38,height:38,borderRadius:11,background:unreadNotifs>0?"#7C6FF718":"#13131E",border:`1px solid ${unreadNotifs>0?"#7C6FF755":"#26263A"}`,cursor:"pointer",color:unreadNotifs>0?"#9D8DFF":"#9090B0",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                  <BellIcon size={17} color={unreadNotifs>0?"#9D8DFF":"#9090B0"}/>
                  {unreadNotifs>0&&<span style={{position:"absolute",top:-3,right:-3,background:"#7C6FF7",color:"#fff",fontSize:9,fontWeight:800,borderRadius:8,padding:"1px 5px",border:"2px solid #08080F"}}>{unreadNotifs}</span>}
                </button>
                {/* Messaggi */}
                <button onClick={()=>setScreen("inbox")} title="Messaggi" style={{position:"relative",width:38,height:38,borderRadius:11,background:unreadDMs>0?"#6FF7A818":"#13131E",border:`1px solid ${unreadDMs>0?"#6FF7A855":"#26263A"}`,cursor:"pointer",color:unreadDMs>0?"#6FF7A8":"#9090B0",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                  <InboxIcon size={17} color={unreadDMs>0?"#6FF7A8":"#9090B0"}/>
                  {unreadDMs>0&&<span style={{position:"absolute",top:-3,right:-3,background:"#6FF7A8",color:"#08080F",fontSize:9,fontWeight:800,borderRadius:8,padding:"1px 5px",border:"2px solid #08080F"}}>{unreadDMs}</span>}
                </button>
                <button onClick={()=>setScreen("profile")} title="Profilo" style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:"#6FF7A822",border:"1.5px solid #6FF7A855",display:"flex",alignItems:"center",justifyContent:"center",color:"#6FF7A8",fontWeight:700,fontSize:14}}>V</div>
                </button>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:14}}>
              {[{k:"per te",l:"Per te"},{k:"recenti",l:"Recenti"},{k:"trending",l:"Trending"}].map(t=>(
                <button key={t.k} className="ithink-display" onClick={()=>setTab(t.k)} style={{
                  background: tab===t.k ? "linear-gradient(135deg,#7C6FF7,#9D8DFF)" : "#13131E",
                  border: tab===t.k ? "none" : "1px solid #26263A",
                  borderRadius:20, padding:"7px 16px",
                  color: tab===t.k ? "#fff" : "#7878A0",
                  fontSize:13, fontWeight:700, letterSpacing:"-0.01em",
                  cursor:"pointer", transition:"all 0.2s",
                  boxShadow: tab===t.k ? "0 4px 14px #7C6FF744" : "none",
                }}>{t.l}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{maxWidth:640,margin:"0 auto",padding:"22px 20px"}}>
          <DailyMoment onOpenImage={openImage}/>
          <ComposeBox onPost={handlePost}/>
          {sorted.map(post=>(
            <PostCard key={post.id} post={post} onResonate={handleResonate} onComment={handleComment} onOpenImage={openImage}/>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Sora:wght@600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes resGlow {
          0% { box-shadow: 0 0 0 0 transparent; }
          30% { box-shadow: 0 0 22px 2px var(--rc); }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        @keyframes resBreathe {
          0% { transform: scale(1); }
          30% { transform: scale(1.28); }
          100% { transform: scale(1); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        * { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .ithink-display { font-family: 'Sora', system-ui, sans-serif !important; }
      `}</style>
      {content}
      {lightboxImage && <Lightbox src={lightboxImage} onClose={()=>setLightboxImage(null)} />}
    </>
  );
}

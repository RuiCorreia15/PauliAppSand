import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

/* ── Firebase config ──────────────────────────────────────── */
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};
const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

/* ── Patient identity ─────────────────────────────────────── */
// In production this comes from login. For now fixed to Maria Pauli.
const PATIENT_ID = "maria-pauli";

/* ── Firestore helpers ────────────────────────────────────── */
async function ensurePatientDoc() {
  const ref = doc(db, "patients", PATIENT_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      id: PATIENT_ID,
      name: "Maria Pauli",
      age: 39,
      dob: "12 Mar 1985",
      condition: "Stage 4 Breast Cancer",
      since: "Jan 2024",
      doctor: "Dr. Schulz",
      sos: 0,
      symptoms: 0,
      avgSev: 0,
      adherence: 0,
      lastOpened: null,
      scheduledMeds: [
        { name: "Morphine SR", dose: "30mg", time: "08:00" },
        { name: "Dexamethasone", dose: "4mg", time: "12:00" },
      ],
      sosMed: { name: "Oramorph", dose: "10mg", maxPerDay: 4 },
    });
  }
}

async function writeEvent(type, payload) {
  const today = new Date().toDateString();

  // Step 1 - write the event. This is the only thing we await.
  await addDoc(collection(db, "patients", PATIENT_ID, "events"), {
    type,
    date: today,
    ...payload,
    timestamp: serverTimestamp(),
  });

  // Step 2 - update summary counters fire-and-forget (never blocks UI)
  (async () => {
    try {
      const ref = doc(db, "patients", PATIENT_ID);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const d = snap.data();
      const updates = { lastOpened: 0 };
      if (type === "sos") {
        updates.sos = (d.sos || 0) + 1;
      }
      if (type === "symptom") {
        updates.symptoms = (d.symptoms || 0) + 1;
        const prevAvg = d.avgSev || 0;
        const prevN = d.symptoms || 0;
        updates.avgSev = parseFloat(
          ((prevAvg * prevN + (payload.severity || 0)) / (prevN + 1)).toFixed(1)
        );
      }
      await setDoc(ref, updates, { merge: true });
    } catch (e) {
      console.warn("Counter update failed (non-critical):", e.message);
    }
  })();
}

/* ── Brand tokens ─────────────────────────────────────────── */
const T = {
  blue: "#3A7CC3",
  blueDk: "#2B5F9E",
  blueLt: "#EBF3FC",
  yellow: "#F5C842",
  yellowLt: "#FEF8E0",
  bg: "#F2F6FB",
  white: "#FFFFFF",
  text: "#18263A",
  sub: "#7A8FA6",
  border: "#D6E4F0",
  red: "#E04F4F",
  redLt: "#FDEAEA",
  green: "#34B87A",
  greenLt: "#E5F7EF",
  sans: "'DM Sans', sans-serif",
  serif: "'DM Serif Display', serif",
};

/* inject fonts */
if (!document.getElementById("pc-fonts")) {
  const l = document.createElement("link");
  l.id = "pc-fonts";
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}
/* ══════════════════════════════════════════════════════════
   TRANSLATIONS
   Keys are used throughout the app via the useLang() hook.
   Add more keys here as the app grows.
══════════════════════════════════════════════════════════ */
const TRANSLATIONS = {
  en: {
    // Splash
    tagline: "Your personal health companion,\nalways by your side.",
    signIn: "Sign In",
    confidential: "PauliCare · Confidential health data",
    chooseLanguage: "Choose your language",
    // Home
    hello: "Hello, Maria",
    medsTaken: "Meds taken",
    sosToday: "SOS today",
    symptoms: "Symptoms",
    notEnoughRelief: "NOT ENOUGH RELIEF?",
    takeSOS: "Take SOS Medication",
    todaySchedule: "Today's Schedule",
    logSymptom: "+ Log a Symptom",
    taken: "✓ Taken",
    pending: "Pending",
    // Medication
    medications: "Medications",
    scheduled: "💊  Scheduled",
    sos: "🚨  SOS",
    takenToday: "✓ Taken today",
    markAsTaken: "Mark as Taken",
    recentHistory: "Recent History",
    noMedsTaken: "No medication taken yet.",
    // SOS Tab
    sosHistory: "SOS History (from Firebase)",
    noSOS: "No SOS medication taken yet.",
    // SOS Modal
    sosMedication: "SOS Medication",
    sosInstructions:
      "Before taking Oramorph 10mg, log the symptom that is making it necessary.",
    whatFeeling: "What are you feeling?",
    selectSymptom: "Select a symptom first",
    nextSeverity: "Next: Rate severity →",
    loggedSymptom: "Logged symptom",
    change: "Change",
    severity: "Severity",
    confirmSOS: "Confirm & Take SOS",
    saving: "Saving to Firebase…",
    sosLogged: "✓ SOS & Symptom Logged!",
    back: "← Back",
    cancel: "Cancel",
    // Symptom chips
    severePain: "Severe pain",
    breakthroughPain: "Breakthrough pain",
    nausea: "Nausea",
    vomiting: "Vomiting",
    anxiety: "Anxiety",
    shortnessBreath: "Shortness of breath",
    dizziness: "Dizziness",
    extremeFatigue: "Extreme fatigue",
    fever: "Fever",
    confusion: "Confusion",
    bleeding: "Bleeding",
    other: "Other",
    // Severity labels
    mild: "Mild",
    moderate: "Moderate",
    severe: "Severe",
    // Symptom log
    logASymptom: "Log a Symptom",
    whatFeelingSym: "What are you feeling?",
    fatigue: "Fatigue",
    pain: "Pain",
    headache: "Headache",
    appetiteLoss: "Appetite loss",
    insomnia: "Insomnia",
    savedFirebase: "✓ Saved to Firebase!",
    saveSymptom: "Save Symptom",
    recentSymptoms: "Recent Symptoms (from Firebase)",
    noSymptoms: "No symptoms logged yet.",
    justNow: "Just now",
    // Profile
    myProfile: "My Profile",
    patient: "Patient",
    details: "Details",
    dateOfBirth: "Date of Birth",
    doctor: "Doctor",
    patientSince: "Patient since",
    scheduledMeds: "Scheduled Medications",
    sosMedLabel: "🚨 SOS Medication",
    maxPerDay: "max",
    perDay: "×/day",
    // Onboarding
    getStarted: "Get Started",
    yourProfile: "Your Profile",
    stepAbout: "Step 1 of 3 · About You",
    fullName: "Full Name",
    dateOfBirthLbl: "Date of Birth",
    conditionLbl: "Condition",
    doctorName: "Doctor's Name",
    continueBtn: "Continue →",
    yourMedication: "Your Medication",
    stepMeds: "Step 2 of 3 · Scheduled Medication",
    medsAgreed: "As agreed with Dr. Schulz during your visit.",
    medication: "Medication",
    morning: "Morning",
    midday: "Midday",
    stepSOS: "Step 3 of 3 · SOS Medication",
    sosMed: "SOS Medication",
    sosWarning:
      "Taken only when regular medication isn't enough. Agreed with your doctor.",
    completeSetup: "Complete Setup ✓",
    // Loading
    howSevere1: "How severe is the ",
    howSevere2: "? Rate it so your doctor can track the pattern.",
    sosTabDesc:
      "Take only when regular medication isn't providing sufficient relief. You'll be asked to log your symptom first.",
    takeSosNow: "🚨 Take SOS Now",
    trigger: "Trigger",
    severityLabel: "Severity",
    maxPerDayFull: "Max 4× per day",
    selectSOSMed: "Which SOS medication do you need?",
    loadingMeds: "Loading medications…",
    noSOSMeds: "No SOS medications set up yet. Contact your doctor.",
    sosMedStep: "Step 1 of 3 · SOS Medication",
    linkedSymsCount: "linked symptoms",
    connecting: "Connecting…",
  },
  pt: {
    tagline: "O seu companheiro de saúde pessoal,\nsempre ao seu lado.",
    signIn: "Entrar",
    confidential: "PauliCare · Dados de saúde confidenciais",
    chooseLanguage: "Escolha o seu idioma",
    hello: "Olá, Maria",
    medsTaken: "Medicação tomada",
    sosToday: "SOS hoje",
    symptoms: "Sintomas",
    notEnoughRelief: "ALÍVIO INSUFICIENTE?",
    takeSOS: "Tomar Medicação SOS",
    todaySchedule: "Agenda de Hoje",
    logSymptom: "+ Registar Sintoma",
    taken: "✓ Tomado",
    pending: "Pendente",
    medications: "Medicações",
    scheduled: "💊  Programada",
    sos: "🚨  SOS",
    takenToday: "✓ Tomado hoje",
    markAsTaken: "Marcar como Tomado",
    recentHistory: "Histórico Recente",
    noMedsTaken: "Nenhuma medicação tomada ainda.",
    sosHistory: "Histórico SOS",
    noSOS: "Nenhuma medicação SOS tomada ainda.",
    sosMedication: "Medicação SOS",
    sosInstructions:
      "Antes de tomar Oramorph 10mg, registe o sintoma que torna necessário.",
    whatFeeling: "O que está a sentir?",
    selectSymptom: "Selecione um sintoma primeiro",
    nextSeverity: "Seguinte: Avaliar gravidade →",
    loggedSymptom: "Sintoma registado",
    change: "Alterar",
    severity: "Gravidade",
    confirmSOS: "Confirmar e Tomar SOS",
    saving: "A guardar no Firebase…",
    sosLogged: "✓ SOS e Sintoma Registados!",
    back: "← Voltar",
    cancel: "Cancelar",
    severePain: "Dor intensa",
    breakthroughPain: "Dor irruptiva",
    nausea: "Náusea",
    vomiting: "Vómito",
    anxiety: "Ansiedade",
    shortnessBreath: "Falta de ar",
    dizziness: "Tonturas",
    extremeFatigue: "Fadiga extrema",
    fever: "Febre",
    confusion: "Confusão",
    bleeding: "Hemorragia",
    other: "Outro",
    mild: "Ligeiro",
    moderate: "Moderado",
    severe: "Grave",
    logASymptom: "Registar Sintoma",
    whatFeelingSym: "O que está a sentir?",
    fatigue: "Fadiga",
    pain: "Dor",
    headache: "Dor de cabeça",
    appetiteLoss: "Perda de apetite",
    insomnia: "Insónia",
    savedFirebase: "✓ Guardado no Firebase!",
    saveSymptom: "Guardar Sintoma",
    recentSymptoms: "Sintomas Recentes",
    noSymptoms: "Nenhum sintoma registado ainda.",
    justNow: "Agora mesmo",
    myProfile: "O Meu Perfil",
    patient: "Paciente",
    details: "Detalhes",
    dateOfBirth: "Data de Nascimento",
    doctor: "Médico",
    patientSince: "Paciente desde",
    scheduledMeds: "Medicações Programadas",
    sosMedLabel: "🚨 Medicação SOS",
    maxPerDay: "máx",
    perDay: "×/dia",
    getStarted: "Começar",
    yourProfile: "O Seu Perfil",
    stepAbout: "Passo 1 de 3 · Sobre Si",
    fullName: "Nome Completo",
    dateOfBirthLbl: "Data de Nascimento",
    conditionLbl: "Diagnóstico",
    doctorName: "Nome do Médico",
    continueBtn: "Continuar →",
    yourMedication: "A Sua Medicação",
    stepMeds: "Passo 2 de 3 · Medicação Programada",
    medsAgreed: "Conforme acordado com o Dr. Schulz na sua consulta.",
    medication: "Medicação",
    morning: "Manhã",
    midday: "Meio-dia",
    stepSOS: "Passo 3 de 3 · Medicação SOS",
    sosMed: "Medicação SOS",
    sosWarning:
      "Tomada apenas quando a medicação regular não é suficiente. Acordado com o seu médico.",
    completeSetup: "Concluir Configuração ✓",
    howSevere1: "Qual é a gravidade de ",
    howSevere2: "? Avalie para que o seu médico possa acompanhar.",
    sosTabDesc:
      "Tomar apenas quando a medicação regular não proporciona alívio suficiente. Será pedido para registar o sintoma primeiro.",
    takeSosNow: "🚨 Tomar SOS Agora",
    trigger: "Causa",
    severityLabel: "Gravidade",
    maxPerDayFull: "Máx. 4× por dia",
    selectSOSMed: "Qual medicação SOS precisa?",
    loadingMeds: "A carregar medicamentos…",
    noSOSMeds: "Nenhuma medicação SOS configurada. Contacte o seu médico.",
    sosMedStep: "Passo 1 de 3 · Medicação SOS",
    linkedSymsCount: "sintomas associados",
    connecting: "A ligar…",
  },
  pl: {
    tagline: "Twój osobisty towarzysz zdrowia,\nzawsze przy Tobie.",
    signIn: "Zaloguj się",
    confidential: "PauliCare · Poufne dane zdrowotne",
    chooseLanguage: "Wybierz język",
    hello: "Cześć, Maria",
    medsTaken: "Leki wzięte",
    sosToday: "SOS dziś",
    symptoms: "Objawy",
    notEnoughRelief: "NIEWYSTARCZAJĄCA ULG A?",
    takeSOS: "Weź lek SOS",
    todaySchedule: "Harmonogram na dziś",
    logSymptom: "+ Zapisz objaw",
    taken: "✓ Wzięto",
    pending: "Oczekuje",
    medications: "Leki",
    scheduled: "💊  Zaplanowane",
    sos: "🚨  SOS",
    takenToday: "✓ Wzięto dziś",
    markAsTaken: "Oznacz jako wzięte",
    recentHistory: "Ostatnia historia",
    noMedsTaken: "Nie wzięto jeszcze żadnych leków.",
    sosHistory: "Historia SOS",
    noSOS: "Nie wzięto jeszcze leku SOS.",
    sosMedication: "Lek SOS",
    sosInstructions:
      "Przed wzięciem Oramorph 10mg zapisz objaw, który to powoduje.",
    whatFeeling: "Co czujesz?",
    selectSymptom: "Najpierw wybierz objaw",
    nextSeverity: "Dalej: Oceń nasilenie →",
    loggedSymptom: "Zapisany objaw",
    change: "Zmień",
    severity: "Nasilenie",
    confirmSOS: "Potwierdź i weź SOS",
    saving: "Zapisywanie w Firebase…",
    sosLogged: "✓ SOS i objaw zapisane!",
    back: "← Wstecz",
    cancel: "Anuluj",
    severePain: "Silny ból",
    breakthroughPain: "Ból przebijający",
    nausea: "Nudności",
    vomiting: "Wymioty",
    anxiety: "Lęk",
    shortnessBreath: "Duszność",
    dizziness: "Zawroty głowy",
    extremeFatigue: "Skrajne zmęczenie",
    fever: "Gorączka",
    confusion: "Splątanie",
    bleeding: "Krwawienie",
    other: "Inne",
    mild: "Łagodne",
    moderate: "Umiarkowane",
    severe: "Ciężkie",
    logASymptom: "Zapisz objaw",
    whatFeelingSym: "Co czujesz?",
    fatigue: "Zmęczenie",
    pain: "Ból",
    headache: "Ból głowy",
    appetiteLoss: "Brak apetytu",
    insomnia: "Bezsenność",
    savedFirebase: "✓ Zapisano w Firebase!",
    saveSymptom: "Zapisz objaw",
    recentSymptoms: "Ostatnie objawy",
    noSymptoms: "Nie zapisano jeszcze żadnych objawów.",
    justNow: "Przed chwilą",
    myProfile: "Mój profil",
    patient: "Pacjent",
    details: "Szczegóły",
    dateOfBirth: "Data urodzenia",
    doctor: "Lekarz",
    patientSince: "Pacjent od",
    scheduledMeds: "Zaplanowane leki",
    sosMedLabel: "🚨 Lek SOS",
    maxPerDay: "maks",
    perDay: "×/dzień",
    getStarted: "Rozpocznij",
    yourProfile: "Twój profil",
    stepAbout: "Krok 1 z 3 · O Tobie",
    fullName: "Imię i nazwisko",
    dateOfBirthLbl: "Data urodzenia",
    conditionLbl: "Diagnoza",
    doctorName: "Imię i nazwisko lekarza",
    continueBtn: "Kontynuuj →",
    yourMedication: "Twoje leki",
    stepMeds: "Krok 2 z 3 · Zaplanowane leki",
    medsAgreed: "Zgodnie z ustaleniami z dr Schulzem podczas wizyty.",
    medication: "Lek",
    morning: "Rano",
    midday: "Południe",
    stepSOS: "Krok 3 z 3 · Lek SOS",
    sosMed: "Lek SOS",
    sosWarning:
      "Przyjmowany tylko gdy standardowy lek nie wystarczy. Uzgodnione z lekarzem.",
    completeSetup: "Zakończ konfigurację ✓",
    howSevere1: "Jak poważny jest objaw ",
    howSevere2: "? Oceń, aby lekarz mógł śledzić wzorzec.",
    sosTabDesc:
      "Przyjmować tylko gdy standardowy lek nie przynosi wystarczającej ulgi. Zostaniesz poproszony o zapisanie objawu.",
    takeSosNow: "🚨 Weź SOS Teraz",
    trigger: "Przyczyna",
    severityLabel: "Nasilenie",
    maxPerDayFull: "Maks. 4× dziennie",
    selectSOSMed: "Który lek SOS jest potrzebny?",
    loadingMeds: "Ładowanie leków…",
    noSOSMeds: "Brak skonfigurowanych leków SOS. Skontaktuj się z lekarzem.",
    sosMedStep: "Krok 1 z 3 · Lek SOS",
    linkedSymsCount: "powiązane objawy",
    connecting: "Łączenie…",
  },
};

/* Language context — provides t() translation function to all components */
import { createContext, useContext } from "react";
const LangContext = createContext({
  lang: "en",
  t: (k) => TRANSLATIONS.en[k] || k,
});
const useLang = () => useContext(LangContext);

/* ══════════════════════════════════════════════════════════
   UI ATOMS
══════════════════════════════════════════════════════════ */
function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="38" cy="50" r="32" fill={T.blue} />
      <path d="M50 18 A32 32 0 0 1 50 82 Z" fill={T.yellow} />
    </svg>
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  style = {},
}) {
  const v =
    {
      primary: { background: T.blue, color: T.white, border: "none" },
      danger: { background: T.red, color: T.white, border: "none" },
      ghost: {
        background: "transparent",
        color: T.blue,
        border: `1.5px solid ${T.blue}`,
      },
      soft: { background: T.blueLt, color: T.blue, border: "none" },
      softgray: {
        background: T.bg,
        color: T.sub,
        border: `1px solid ${T.border}`,
      },
    }[variant] || {};
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        ...v,
        borderRadius: 13,
        padding: "12px 18px",
        fontFamily: T.sans,
        fontWeight: 700,
        fontSize: 14,
        width: "100%",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.2s, transform 0.12s",
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.white,
        borderRadius: 18,
        padding: "16px 18px",
        boxShadow: "0 1px 8px rgba(58,124,195,0.08)",
        border: `1px solid ${T.border}`,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Badge({ label, color = T.blue, bg = T.blueLt }) {
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 999,
        fontFamily: T.sans,
      }}
    >
      {label}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <p
      style={{
        fontFamily: T.sans,
        fontSize: 11,
        fontWeight: 700,
        color: T.sub,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        margin: "16px 0 8px",
      }}
    >
      {children}
    </p>
  );
}

function BottomNav({ active, go }) {
  const items = [
    { id: "home", icon: "⊞", label: "Home" },
    { id: "meds", icon: "💊", label: "Meds" },
    { id: "symptoms", icon: "📋", label: "Symptoms" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 420,
        background: T.white,
        borderTop: `1px solid ${T.border}`,
        display: "flex",
        padding: "6px 0 16px",
        zIndex: 100,
        boxShadow: "0 -3px 12px rgba(58,124,195,0.07)",
      }}
    >
      {items.map((i) => (
        <button
          key={i.id}
          onClick={() => go(i.id)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: "none",
            border: "none",
            cursor: "pointer",
            color:
              active === i.id ||
              (i.id === "meds" && ["meds", "sosTab"].includes(active))
                ? T.blue
                : T.sub,
            fontFamily: T.sans,
            fontSize: 9,
            fontWeight:
              active === i.id ||
              (i.id === "meds" && ["meds", "sosTab"].includes(active))
                ? 700
                : 400,
          }}
        >
          <span style={{ fontSize: 20 }}>{i.icon}</span>
          {i.label}
        </button>
      ))}
    </div>
  );
}

/* Saving indicator — appears at top when Firebase write is in flight */
function SavingBanner({ saving, lang }) {
  if (!saving) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 420,
        background: T.blue,
        color: T.white,
        fontFamily: T.sans,
        fontSize: 12,
        fontWeight: 600,
        padding: "8px 0",
        textAlign: "center",
        zIndex: 200,
        zIndex: 999,
      }}
    >
      ⏳ {TRANSLATIONS[lang]?.saving || "Saving…"}
    </div>
  );
}

/* Progress stepper for onboarding */
function Progress({ step, total = 3 }) {
  return (
    <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 999,
            background: i < step ? T.blue : T.border,
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SPLASH / LOGIN SCREEN
   Shows the PauliCare logo, app name, and a Login button.
   No credentials required for now — button goes straight to Home.
══════════════════════════════════════════════════════════ */
function SplashScreen({ onLogin }) {
  const [lang, setLang] = useState("en");
  const [pressed, setPressed] = useState(false);

  // t() uses local lang state here since LangContext isn't set yet
  const t = (k) => TRANSLATIONS[lang]?.[k] || TRANSLATIONS.en[k] || k;

  const LANGUAGES = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "pt", label: "Português", flag: "🇵🇹" },
    { code: "pl", label: "Polski", flag: "🇵🇱" },
  ];

  const handleLogin = () => {
    if (pressed) return;
    setPressed(true);
    setTimeout(() => onLogin(lang), 350);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(160deg, ${T.blueLt} 0%, ${T.white} 50%, ${T.yellowLt} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 28px",
      }}
    >
      {/* Logo card */}
      <div
        style={{
          width: 110,
          height: 110,
          background: T.white,
          borderRadius: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "0 6px 32px rgba(58,124,195,0.18), 0 2px 8px rgba(0,0,0,0.06)",
          marginBottom: 28,
        }}
      >
        <Logo size={72} />
      </div>

      {/* App name */}
      <h1
        style={{
          fontFamily: T.serif,
          fontSize: 40,
          color: T.text,
          margin: "0 0 8px",
          lineHeight: 1.1,
          textAlign: "center",
        }}
      >
        Pauli<span style={{ color: T.blue }}>Care</span>
      </h1>

      {/* Tagline — updates live as language changes */}
      <p
        style={{
          fontFamily: T.sans,
          fontSize: 15,
          color: T.sub,
          lineHeight: 1.6,
          textAlign: "center",
          margin: "0 0 36px",
          maxWidth: 280,
          whiteSpace: "pre-line",
          minHeight: 48,
          transition: "opacity 0.2s",
        }}
      >
        {t("tagline")}
      </p>

      {/* Language selector */}
      <div
        style={{
          width: "100%",
          maxWidth: 320,
          marginBottom: 28,
        }}
      >
        <p
          style={{
            fontFamily: T.sans,
            fontSize: 11,
            fontWeight: 700,
            color: T.sub,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            textAlign: "center",
            margin: "0 0 12px",
          }}
        >
          {t("chooseLanguage")}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "14px 8px",
                borderRadius: 16,
                border: `2px solid ${lang === l.code ? T.blue : T.border}`,
                background: lang === l.code ? T.blueLt : T.white,
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow:
                  lang === l.code
                    ? "0 2px 12px rgba(58,124,195,0.18)"
                    : "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              <span style={{ fontSize: 26 }}>{l.flag}</span>
              <span
                style={{
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: 700,
                  color: lang === l.code ? T.blue : T.sub,
                }}
              >
                {l.label}
              </span>
              {lang === l.code && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: T.blue,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sign In button */}
      <button
        onClick={handleLogin}
        style={{
          width: "100%",
          maxWidth: 320,
          background: pressed ? T.blueDk : T.blue,
          color: T.white,
          border: "none",
          borderRadius: 16,
          padding: "16px 0",
          fontFamily: T.sans,
          fontWeight: 700,
          fontSize: 16,
          cursor: pressed ? "not-allowed" : "pointer",
          letterSpacing: "0.02em",
          transform: pressed ? "scale(0.97)" : "scale(1)",
          transition: "background 0.2s, transform 0.15s",
          boxShadow: "0 4px 20px rgba(58,124,195,0.30)",
        }}
      >
        {t("signIn")}
      </button>

      {/* Bottom note */}
      <p
        style={{
          fontFamily: T.sans,
          fontSize: 11,
          color: T.sub,
          marginTop: 20,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        {t("confidential")}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ONBOARDING (runs once if no patient doc found)
══════════════════════════════════════════════════════════ */
function Onboarding({ onComplete, sosMeds }) {
  const { t } = useLang();
  const [step, setStep] = useState(0);

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    border: `1.5px solid ${T.border}`,
    fontFamily: T.sans,
    fontSize: 14,
    color: T.text,
    background: T.bg,
    boxSizing: "border-box",
    outline: "none",
    marginTop: 6,
  };
  const lbl = {
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    color: T.sub,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "block",
    marginTop: 14,
  };

  const steps = [
    /* Step 0 — welcome */
    <div
      key={0}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 28px",
        textAlign: "center",
        background: `linear-gradient(160deg, ${T.blueLt} 0%, ${T.white} 55%, ${T.yellowLt} 100%)`,
      }}
    >
      <div
        style={{
          width: 90,
          height: 90,
          background: T.white,
          borderRadius: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(58,124,195,0.18)",
          marginBottom: 22,
        }}
      >
        <Logo size={62} />
      </div>
      <h1
        style={{
          fontFamily: T.serif,
          fontSize: 34,
          color: T.text,
          margin: "0 0 6px",
          lineHeight: 1.1,
        }}
      >
        Pauli<span style={{ color: T.blue }}>Care</span>
      </h1>
      <p
        style={{
          fontFamily: T.sans,
          color: T.sub,
          fontSize: 14,
          lineHeight: 1.6,
          margin: "0 0 40px",
        }}
      >
        {t("tagline")}
      </p>
      <Btn onClick={() => setStep(1)} style={{ fontSize: 15, padding: "14px" }}>
        {t("getStarted")}
      </Btn>
    </div>,

    /* Step 1 — personal info */
    <div
      key={1}
      style={{
        padding: "20px 20px 90px",
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <Progress step={1} />
      <SectionLabel>{t("stepAbout")}</SectionLabel>
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 22,
          color: T.text,
          margin: "0 0 18px",
        }}
      >
        {t("yourProfile")}
      </h2>
      <label style={lbl}>{t("fullName")}</label>
      <div style={{ ...inputStyle, color: T.text }}>Maria Pauli</div>
      <label style={lbl}>{t("dateOfBirthLbl")}</label>
      <div style={{ ...inputStyle, color: T.sub }}>12 / 03 / 1985</div>
      <label style={lbl}>{t("conditionLbl")}</label>
      <div style={{ ...inputStyle }}>Stage 4 Breast Cancer</div>
      <label style={lbl}>{t("doctorName")}</label>
      <div style={{ ...inputStyle }}>Dr. Schulz</div>
      <div style={{ position: "sticky", bottom: 18, marginTop: 24 }}>
        <Btn onClick={() => setStep(2)}>{t("continueBtn")}</Btn>
      </div>
    </div>,

    /* Step 2 — scheduled meds */
    <div
      key={2}
      style={{
        padding: "20px 20px 90px",
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <Progress step={2} />
      <SectionLabel>{t("stepMeds")}</SectionLabel>
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 22,
          color: T.text,
          margin: "0 0 6px",
        }}
      >
        {t("yourMedication")}
      </h2>
      <p
        style={{
          fontFamily: T.sans,
          fontSize: 13,
          color: T.sub,
          margin: "0 0 16px",
          lineHeight: 1.5,
        }}
      >
        {t("medsAgreed")}
      </p>
      {[
        { name: "Morphine SR", dose: "30mg", time: "08:00", tag: t("morning") },
        { name: "Dexamethasone", dose: "4mg", time: "12:00", tag: t("midday") },
      ].map((m, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: T.sans,
                fontWeight: 700,
                fontSize: 13,
                color: T.text,
              }}
            >
              {t("medication")} {i + 1}
            </span>
            <Badge label={m.tag} />
          </div>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 14,
              fontWeight: 700,
              color: T.text,
            }}
          >
            {m.name}
          </div>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 12,
              color: T.sub,
              marginTop: 2,
            }}
          >
            {m.dose} · {m.time}
          </div>
        </Card>
      ))}
      <div style={{ marginTop: 16 }}>
        <Btn onClick={() => setStep(3)}>{t("continueBtn")}</Btn>
      </div>
    </div>,

    /* Step 3 — SOS med */
    <div
      key={3}
      style={{
        padding: "20px 20px 90px",
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <Progress step={3} />
      <SectionLabel>{t("stepSOS")}</SectionLabel>
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 22,
          color: T.text,
          margin: "0 0 10px",
        }}
      >
        {t("sosMed")}
      </h2>
      <div
        style={{
          background: T.redLt,
          borderRadius: 14,
          padding: "12px 14px",
          display: "flex",
          gap: 10,
          marginBottom: 18,
          border: `1px solid #F5C0C0`,
        }}
      >
        <span style={{ fontSize: 20 }}>🚨</span>
        <p
          style={{
            fontFamily: T.sans,
            fontSize: 12,
            color: "#B03030",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {t("sosWarning")}
        </p>
      </div>
      {sosMeds && sosMeds.length > 0 ? (
        sosMeds.map((m, i) => (
          <Card key={i} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontFamily: T.sans,
                fontSize: 14,
                fontWeight: 700,
                color: T.text,
                marginBottom: 4,
              }}
            >
              🚨 {m.name}
            </div>
            <div
              style={{
                fontFamily: T.sans,
                fontSize: 12,
                color: T.sub,
                marginBottom: 10,
              }}
            >
              {m.dose} · {t("maxPerDay")} {m.maxPerDay}
              {t("perDay")}
            </div>
            <Badge
              label={`${t("maxPerDay")} ${m.maxPerDay}${t("perDay")}`}
              color={T.red}
              bg={T.redLt}
            />
          </Card>
        ))
      ) : (
        <Card style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 13,
              color: T.sub,
              fontStyle: "italic",
            }}
          >
            {t("noSOSMeds")}
          </div>
        </Card>
      )}
      <Btn onClick={onComplete} style={{ fontSize: 15, padding: "14px" }}>
        {t("completeSetup")}
      </Btn>
    </div>,
  ];

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "0 auto",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        background: T.bg,
      }}
    >
      {steps[step]}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HOME SCREEN
══════════════════════════════════════════════════════════ */
function Home({ go, events, sosMeds }) {
  const { t } = useLang();
  const today = new Date().toDateString();
  const takenToday = events.filter(
    (e) => e.type === "med_taken" && e.date === today
  ).length;
  const sosToday = events.filter(
    (e) => e.type === "sos" && e.date === today
  ).length;
  const symToday = events.filter(
    (e) => e.type === "symptom" && e.date === today
  ).length;

  const MEDS = [
    { name: "Morphine SR", dose: "30mg", time: "08:00" },
    { name: "Dexamethasone", dose: "4mg", time: "12:00" },
  ];

  return (
    <div
      style={{
        padding: "20px 18px 90px",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <p
            style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.sub,
              margin: 0,
              fontWeight: 600,
            }}
          >
            {new Date()
              .toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
              .toUpperCase()}
          </p>
          <h2
            style={{
              fontFamily: T.serif,
              fontSize: 26,
              color: T.text,
              margin: "2px 0 0",
            }}
          >
            {t("hello")} 👋
          </h2>
        </div>
        <div style={{ background: T.blueLt, borderRadius: 14, padding: 8 }}>
          <Logo size={30} />
        </div>
      </div>

      {/* Stats row — each card navigates to its respective screen */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 18,
        }}
      >
        {[
          {
            label: t("medsTaken"),
            val: `${takenToday}/${MEDS.length}`,
            icon: "💊",
            color: takenToday > 0 ? T.green : T.sub,
            bg: takenToday > 0 ? T.greenLt : T.bg,
            dest: "meds",
          },
          {
            label: t("sosToday"),
            val: sosToday,
            icon: "🚨",
            color: sosToday > 0 ? T.red : T.sub,
            bg: sosToday > 0 ? T.redLt : T.bg,
            dest: "sosTab",
          },
          {
            label: t("symptoms"),
            val: symToday,
            icon: "📋",
            color: T.blue,
            bg: T.blueLt,
            dest: "symptoms",
          },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => go(s.dest)}
            style={{
              background: T.white,
              borderRadius: 18,
              padding: "12px 8px",
              boxShadow: "0 1px 8px rgba(58,124,195,0.08)",
              border: `1px solid ${T.border}`,
              textAlign: "center",
              cursor: "pointer",
              transition: "transform 0.12s, box-shadow 0.12s",
              width: "100%",
            }}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.93)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onTouchStart={(e) =>
              (e.currentTarget.style.transform = "scale(0.93)")
            }
            onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div
              style={{
                fontFamily: "'DM Serif Display',serif",
                fontSize: 22,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.val}
            </div>
            <div
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 10,
                color: T.sub,
                marginTop: 3,
              }}
            >
              {s.label}
            </div>
          </button>
        ))}
      </div>

      {/* SOS Banner */}
      <div
        style={{
          background: `linear-gradient(120deg, ${T.red}, #C93A3A)`,
          borderRadius: 18,
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 10,
              color: "rgba(255,255,255,0.75)",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            {t("notEnoughRelief")}
          </div>
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 18,
              color: T.white,
              marginTop: 2,
            }}
          >
            {t("takeSOS")}
          </div>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: "rgba(255,255,255,0.8)",
              marginTop: 3,
            }}
          >
            {sosMeds.length > 0
              ? `${sosMeds.map((m) => m.name).join(" · ")}`
              : "SOS Medication"}
          </div>
        </div>
        <button
          onClick={() => go("sosmodal")}
          style={{
            background: T.white,
            border: "none",
            borderRadius: 12,
            padding: "10px 14px",
            fontFamily: T.sans,
            fontWeight: 700,
            fontSize: 13,
            color: T.red,
            cursor: "pointer",
          }}
        >
          🚨 SOS
        </button>
      </div>

      {/* Today's schedule */}
      <SectionLabel>{t("todaySchedule")}</SectionLabel>
      {MEDS.map((m) => {
        const taken = events.some(
          (e) =>
            e.type === "med_taken" && e.medName === m.name && e.date === today
        );
        return (
          <Card
            key={m.name}
            onClick={() => go("meds")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
              cursor: "pointer",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: taken ? T.greenLt : T.blueLt,
                borderRadius: 10,
                padding: 8,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              💊
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.sans,
                  fontWeight: 700,
                  fontSize: 14,
                  color: T.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.name}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 11, color: T.sub }}>
                {m.dose} · {m.time}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <Badge
                label={taken ? t("taken") : t("pending")}
                color={taken ? T.green : T.blue}
                bg={taken ? T.greenLt : T.blueLt}
              />
            </div>
          </Card>
        );
      })}

      <div style={{ marginTop: 14 }}>
        <Btn variant="ghost" onClick={() => go("symptoms")}>
          {t("logSymptom")}
        </Btn>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MEDICATION SCREEN
══════════════════════════════════════════════════════════ */
function Medication({ go, events, onTakeMed }) {
  const { t } = useLang();
  const today = new Date().toDateString();
  const MEDS = [
    { name: "Morphine SR", dose: "30mg", time: "08:00" },
    { name: "Dexamethasone", dose: "4mg", time: "12:00" },
  ];

  return (
    <div
      style={{
        padding: "20px 18px 90px",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 26,
          color: T.text,
          margin: "0 0 18px",
        }}
      >
        {t("medications")}
      </h2>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          background: T.blueLt,
          borderRadius: 12,
          padding: 3,
          marginBottom: 20,
        }}
      >
        {[
          { id: "scheduled", label: t("scheduled") },
          { id: "sos", label: t("sos") },
        ].map((tab, i) => (
          <button
            key={t.id}
            onClick={() => {
              if (i === 1) go("sosTab");
            }}
            style={{
              flex: 1,
              padding: "9px 0",
              border: "none",
              borderRadius: 10,
              background: i === 0 ? T.white : "transparent",
              color: i === 0 ? T.blue : T.sub,
              fontFamily: T.sans,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: i === 0 ? "0 1px 6px rgba(58,124,195,0.12)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {MEDS.map((m) => {
        const taken = events.some(
          (e) =>
            e.type === "med_taken" && e.medName === m.name && e.date === today
        );
        return (
          <Card key={m.name} style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
                gap: 8,
                overflow: "hidden",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: T.serif,
                    fontSize: 20,
                    color: T.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.name}
                </div>
                <div
                  style={{
                    fontFamily: T.sans,
                    fontSize: 12,
                    color: T.sub,
                    marginTop: 2,
                  }}
                >
                  {m.dose}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <Badge label={`🕐 ${m.time}`} />
              </div>
            </div>
            <Btn
              variant={taken ? "soft" : "primary"}
              disabled={taken}
              onClick={() => onTakeMed(m.name, m.dose)}
            >
              {taken ? t("takenToday") : t("markAsTaken")}
            </Btn>
          </Card>
        );
      })}

      {/* Recent history from Firebase */}
      <SectionLabel>{t("recentHistory")}</SectionLabel>
      {events.filter((e) => e.type === "med_taken").slice(0, 5).length === 0 ? (
        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.sub }}>
          {t("noMedsTaken")}
        </p>
      ) : (
        events
          .filter((e) => e.type === "med_taken")
          .slice(0, 5)
          .map((e, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 0",
                borderBottom: `1px solid ${T.border}`,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontFamily: T.sans,
                  fontWeight: 600,
                  fontSize: 13,
                  color: T.text,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                💊 {e.medName}
              </span>
              <span
                style={{
                  fontFamily: T.sans,
                  fontSize: 11,
                  color: T.sub,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {e.timestamp?.toDate?.().toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }) || t("justNow")}
              </span>
            </div>
          ))
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SOS TAB
══════════════════════════════════════════════════════════ */
function SOSTab({ go, events, sosMeds }) {
  const { t } = useLang();
  const sosEvents = events.filter((e) => e.type === "sos");
  return (
    <div
      style={{
        padding: "20px 18px 90px",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 26,
          color: T.text,
          margin: "0 0 18px",
        }}
      >
        {t("medications")}
      </h2>

      <div
        style={{
          display: "flex",
          background: T.blueLt,
          borderRadius: 12,
          padding: 3,
          marginBottom: 20,
        }}
      >
        {[
          { id: "scheduled", label: t("scheduled") },
          { id: "sos", label: t("sos") },
        ].map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => {
              if (i === 0) go("meds");
            }}
            style={{
              flex: 1,
              padding: "9px 0",
              border: "none",
              borderRadius: 10,
              background: i === 1 ? T.white : "transparent",
              color: i === 1 ? T.red : T.sub,
              fontFamily: T.sans,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: i === 1 ? "0 1px 6px rgba(58,124,195,0.12)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic list of SOS medications from Firebase */}
      {sosMeds.length === 0 ? (
        <Card
          style={{
            background: T.redLt,
            border: `1.5px solid #F5C0C0`,
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontFamily: T.sans,
              fontSize: 13,
              color: "#B03030",
              margin: "0 0 14px",
            }}
          >
            {t("noSOSMeds")}
          </p>
        </Card>
      ) : (
        sosMeds.map((m, i) => (
          <Card
            key={i}
            style={{
              background: T.redLt,
              border: `1.5px solid #F5C0C0`,
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontFamily: T.serif,
                  fontSize: 20,
                  color: T.red,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.name}
              </div>
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: 11,
                  color: "#B03030",
                  flexShrink: 0,
                  background: "rgba(255,255,255,0.5)",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {t("maxPerDay")} {m.maxPerDay}
                {t("perDay")}
              </div>
            </div>
            <div
              style={{
                fontFamily: T.sans,
                fontSize: 12,
                color: "#B03030",
                marginBottom: 12,
              }}
            >
              {m.dose}
            </div>
            {i === 0 && (
              <p
                style={{
                  fontFamily: T.sans,
                  fontSize: 12,
                  color: "#B03030",
                  lineHeight: 1.6,
                  margin: "0 0 14px",
                }}
              >
                {t("sosTabDesc")}
              </p>
            )}
            <Btn variant="danger" onClick={() => go("sosmodal")}>
              {t("takeSosNow")}
            </Btn>
          </Card>
        ))
      )}

      <SectionLabel>{t("sosHistory")}</SectionLabel>
      {sosEvents.length === 0 ? (
        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.sub }}>
          {t("noSOS")}
        </p>
      ) : (
        sosEvents.map((e, i) => (
          <Card
            key={i}
            style={{
              marginBottom: 10,
              padding: "12px 14px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontFamily: T.sans,
                  fontWeight: 700,
                  fontSize: 13,
                  color: T.red,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                🚨 {e.medName} {e.dose || ""}
              </span>
              <span
                style={{
                  fontFamily: T.sans,
                  fontSize: 11,
                  color: T.sub,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {e.timestamp?.toDate?.().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }) || t("today")}
              </span>
            </div>
            {e.symptom && (
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: 12,
                  color: T.sub,
                  marginTop: 6,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {t("trigger")}: {e.symptom}
                {e.severity ? ` · ${t("severityLabel")} ${e.severity}/10` : ""}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SOS MODAL  —  2-step: symptom → severity → confirm
   Both steps are required before the confirm button unlocks.
   The symptom + severity are written as a linked pair to Firebase.
══════════════════════════════════════════════════════════ */
function SOSModal({ go, onConfirmSOS, sosMeds }) {
  const [step, setStep] = useState(sosMeds.length > 1 ? 0 : 1); // 0=med select, 1=symptom, 2=severity
  const [selMed, setSelMed] = useState(
    sosMeds.length === 1 ? sosMeds[0] : null
  );
  const [symptom, setSymptom] = useState(null);
  const [severity, setSeverity] = useState(7);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { t } = useLang();

  // Default full symptom list (fallback)
  const defaultChips = [
    t("severePain"),
    t("breakthroughPain"),
    t("nausea"),
    t("vomiting"),
    t("anxiety"),
    t("shortnessBreath"),
    t("dizziness"),
    t("extremeFatigue"),
    t("fever"),
    t("confusion"),
    t("bleeding"),
    t("other"),
  ];

  // Use linked symptoms from the selected med if available, else full list
  const chips =
    selMed?.linkedSymptoms?.length > 0
      ? selMed.linkedSymptoms // doctor-defined symptoms for this med
      : defaultChips; // fallback to full list

  const sevColor = (s) => (s >= 8 ? T.red : s >= 5 ? "#C49A00" : T.green);
  const sevLabel = (s) =>
    s >= 8 ? t("severe") : s >= 5 ? t("moderate") : t("mild");

  const handleConfirm = async () => {
    if (!symptom || confirming) return;
    setConfirming(true);
    try {
      // Pass both symptom AND severity to the SOS event
      const med = selMed || sosMeds[0] || { name: "SOS Med", dose: "—" };
      await onConfirmSOS(med.name, med.dose, symptom, severity);
    } catch (err) {
      console.warn("SOS confirm error:", err.message);
    } finally {
      setConfirmed(true);
      setTimeout(() => go("sosTab"), 800);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(18,28,42,0.6)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
      }}
    >
      {/* backdrop — tap to dismiss only when not confirming */}
      <div
        onClick={confirming ? undefined : () => go("home")}
        style={{ position: "absolute", inset: 0 }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: T.white,
          borderRadius: "24px 24px 0 0",
          padding: "22px 20px 36px",
          maxWidth: 420,
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            width: 36,
            height: 4,
            background: T.border,
            borderRadius: 999,
            margin: "0 auto 18px",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🚨</span>
            <h3
              style={{
                fontFamily: T.serif,
                fontSize: 22,
                color: T.red,
                margin: 0,
              }}
            >
              {t("sosMedication")}
            </h3>
          </div>
          {/* Step indicator */}
          <div style={{ display: "flex", gap: 5 }}>
            {(sosMeds.length > 1 ? [0, 1, 2] : [1, 2]).map((s) => (
              <div
                key={s}
                style={{
                  width: 24,
                  height: 4,
                  borderRadius: 999,
                  background: s <= step ? T.red : T.border,
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        </div>

        <p
          style={{
            fontFamily: T.sans,
            fontSize: 13,
            color: T.sub,
            margin: "0 0 18px",
            lineHeight: 1.6,
          }}
        >
          {step === 0 ? (
            <>{t("selectSOSMed")}</>
          ) : step === 1 ? (
            <>{t("sosInstructions")}</>
          ) : (
            <>
              {t("howSevere1")}
              <strong>{symptom}</strong>
              {t("howSevere2")}
            </>
          )}
        </p>

        {/* ── STEP 0: SOS Medication selection (only shown when >1 med) ── */}
        {step === 0 && (
          <>
            {sosMeds.length === 0 ? (
              <div
                style={{
                  background: T.bg,
                  borderRadius: 14,
                  padding: "20px 16px",
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 10 }}>💊</div>
                <p
                  style={{
                    fontFamily: T.sans,
                    fontSize: 13,
                    color: T.sub,
                    whiteSpace: "pre-line",
                  }}
                >
                  {t("noSOSMeds")}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {sosMeds.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelMed(m);
                      setStep(1);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "14px 16px",
                      background: T.redLt,
                      border: `1.5px solid ${T.red}`,
                      borderRadius: 14,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: T.sans,
                          fontWeight: 700,
                          fontSize: 15,
                          color: T.red,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        🚨 {m.name}
                      </div>
                      <div
                        style={{
                          fontFamily: T.sans,
                          fontSize: 12,
                          color: "#B03030",
                          marginTop: 3,
                        }}
                      >
                        {m.dose} · max {m.maxPerDay}×/day
                      </div>
                    </div>
                    <span style={{ color: T.red, fontSize: 18, flexShrink: 0 }}>
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}
            <Btn variant="softgray" onClick={() => go("home")}>
              {t("cancel")}
            </Btn>
          </>
        )}

        {/* ── STEP 1: Symptom selection ── */}
        {step === 1 && (
          <>
            {/* Show which med was selected + whether symptoms are linked or generic */}
            {selMed && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: T.redLt,
                  border: `1px solid #F5C0C0`,
                  borderRadius: 10,
                  padding: "8px 12px",
                  marginBottom: 14,
                  overflow: "hidden",
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>💊</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: T.sans,
                      fontWeight: 700,
                      fontSize: 13,
                      color: T.red,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selMed.name} {selMed.dose}
                  </div>
                  {selMed.linkedSymptoms?.length > 0 && (
                    <div
                      style={{
                        fontFamily: T.sans,
                        fontSize: 11,
                        color: "#B03030",
                        marginTop: 1,
                      }}
                    >
                      {selMed.linkedSymptoms.length} linked symptoms
                    </div>
                  )}
                </div>
              </div>
            )}
            <SectionLabel>{t("whatFeeling")}</SectionLabel>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => setSymptom(c)}
                  style={{
                    background: symptom === c ? T.red : T.bg,
                    color: symptom === c ? T.white : T.text,
                    border: `1.5px solid ${symptom === c ? T.red : T.border}`,
                    borderRadius: 999,
                    padding: "7px 12px",
                    fontFamily: T.sans,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <Btn
              variant="danger"
              disabled={!symptom}
              onClick={() => setStep(2)}
              style={{ marginBottom: 10 }}
            >
              {symptom ? t("nextSeverity") : t("selectSymptom")}
            </Btn>
            <Btn variant="softgray" onClick={() => go("home")}>
              {t("cancel")}
            </Btn>
          </>
        )}

        {/* ── STEP 2: Severity + confirm ── */}
        {step === 2 && (
          <>
            {/* Selected symptom pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: T.redLt,
                borderRadius: 12,
                padding: "10px 14px",
                marginBottom: 18,
                border: `1px solid #F5C0C0`,
                overflow: "hidden",
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: T.sans,
                    fontSize: 11,
                    color: "#B03030",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("loggedSymptom")}
                </div>
                <div
                  style={{
                    fontFamily: T.sans,
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.red,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {symptom}
                </div>
                {selMed && (
                  <div
                    style={{
                      fontFamily: T.sans,
                      fontSize: 11,
                      color: "#B03030",
                      marginTop: 2,
                    }}
                  >
                    💊 {selMed.name} {selMed.dose}
                  </div>
                )}
              </div>
              {/* Allow going back to change symptom */}
              <button
                onClick={() => setStep(1)}
                style={{
                  flexShrink: 0,
                  background: "none",
                  border: `1px solid #F5C0C0`,
                  borderRadius: 8,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontFamily: T.sans,
                  fontSize: 11,
                  color: "#B03030",
                  fontWeight: 600,
                }}
              >
                {t("change")}
              </button>
            </div>

            {/* Severity slider */}
            <div
              style={{
                background: T.bg,
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 10,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontFamily: T.sans,
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.text,
                    flexShrink: 0,
                  }}
                >
                  {t("severity")}
                </span>
                <div
                  style={{
                    background: sevColor(severity),
                    color: T.white,
                    borderRadius: 999,
                    padding: "3px 12px",
                    fontFamily: T.sans,
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {severity}/10 · {sevLabel(severity)}
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  display: "block",
                  accentColor: sevColor(severity),
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: T.sans,
                  fontSize: 10,
                  color: T.sub,
                  marginTop: 4,
                }}
              >
                <span>1 · {t("mild")}</span>
                <span>5 · {t("moderate")}</span>
                <span>10 · {t("severe")}</span>
              </div>
            </div>

            <Btn
              variant={confirmed ? "soft" : "danger"}
              disabled={confirming}
              onClick={handleConfirm}
              style={{ marginBottom: 10 }}
            >
              {confirmed
                ? t("sosLogged")
                : confirming
                ? t("saving")
                : t("confirmSOS")}
            </Btn>
            <Btn
              variant="softgray"
              disabled={confirming}
              onClick={() => setStep(sosMeds.length > 1 ? 0 : 1)}
            >
              {t("back")}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SYMPTOM LOG SCREEN
══════════════════════════════════════════════════════════ */
function Symptoms({ go, events, onLogSymptom }) {
  const { t } = useLang();
  const [selected, setSelected] = useState(null);
  const [severity, setSeverity] = useState(5);
  const [saved, setSaved] = useState(false);

  const chips = [
    t("fatigue"),
    t("pain"),
    t("nausea"),
    t("vomiting"),
    t("headache"),
    t("dizziness"),
    t("anxiety"),
    t("shortnessBreath"),
    t("appetiteLoss"),
    t("insomnia"),
    t("other"),
  ];
  const sevColor = (s) => (s >= 8 ? T.red : s >= 5 ? "#C49A00" : T.green);
  const sevBg = (s) => (s >= 8 ? T.redLt : s >= 5 ? "#FEF8E0" : T.greenLt);

  const save = async () => {
    if (!selected) return;
    await onLogSymptom(selected, severity);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSelected(null);
      setSeverity(5);
    }, 1800);
  };

  return (
    <div
      style={{
        padding: "20px 18px 90px",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 26,
          color: T.text,
          margin: "0 0 18px",
        }}
      >
        {t("logASymptom")}
      </h2>

      <Card style={{ marginBottom: 14 }}>
        <SectionLabel>{t("whatFeelingSym")}</SectionLabel>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => setSelected(c)}
              style={{
                background: selected === c ? T.blue : T.bg,
                color: selected === c ? T.white : T.text,
                border: `1.5px solid ${selected === c ? T.blue : T.border}`,
                borderRadius: 999,
                padding: "6px 13px",
                fontFamily: T.sans,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionLabel>
          {t("severity")}:&nbsp;
          <span style={{ color: sevColor(severity), fontWeight: 700 }}>
            {severity}&nbsp;/&nbsp;10
          </span>
        </SectionLabel>
        <input
          type="range"
          min={1}
          max={10}
          value={severity}
          onChange={(e) => setSeverity(Number(e.target.value))}
          style={{
            width: "100%",
            accentColor: sevColor(severity),
            cursor: "pointer",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: T.sans,
            fontSize: 10,
            color: T.sub,
          }}
        >
          <span>{t("mild")}</span>
          <span>{t("moderate")}</span>
          <span>{t("severe")}</span>
        </div>
      </Card>

      <Btn
        variant={saved ? "soft" : "primary"}
        onClick={save}
        disabled={!selected}
        style={{ marginBottom: 20 }}
      >
        {saved ? t("savedFirebase") : t("saveSymptom")}
      </Btn>

      {/* History from Firebase — includes both direct symptoms AND SOS-triggered symptoms */}
      <SectionLabel>{t("recentSymptoms")}</SectionLabel>
      {(() => {
        // Merge symptom events + SOS events (SOS always has a symptom attached)
        const symEvents = events
          .filter(
            (e) => (e.type === "symptom" || e.type === "sos") && e.symptom
          )
          .slice(0, 8);
        if (symEvents.length === 0) {
          return (
            <p style={{ fontFamily: T.sans, fontSize: 13, color: T.sub }}>
              {t("noSymptoms")}
            </p>
          );
        }
        return symEvents.map((e, i) => (
          <Card
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
              padding: "12px 14px",
              overflow: "hidden",
              boxShadow:
                e.type === "sos"
                  ? `inset 3px 0 0 ${T.red}, 0 1px 8px rgba(58,124,195,0.08)`
                  : "0 1px 8px rgba(58,124,195,0.08)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                {e.type === "sos" && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: T.red,
                      background: T.redLt,
                      padding: "2px 7px",
                      borderRadius: 999,
                      fontFamily: T.sans,
                      flexShrink: 0,
                    }}
                  >
                    SOS
                  </span>
                )}
                <div
                  style={{
                    fontFamily: T.sans,
                    fontWeight: 700,
                    fontSize: 14,
                    color: T.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.symptom}
                </div>
              </div>
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: 11,
                  color: T.sub,
                  marginTop: 3,
                }}
              >
                {e.timestamp?.toDate?.().toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }) || t("justNow")}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <Badge
                label={`${e.severity}/10`}
                color={sevColor(e.severity)}
                bg={sevBg(e.severity)}
              />
            </div>
          </Card>
        ));
      })()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROFILE SCREEN
══════════════════════════════════════════════════════════ */
function Profile({ sosMeds }) {
  const { t } = useLang();
  return (
    <div
      style={{
        padding: "20px 18px 90px",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 26,
          color: T.text,
          margin: "0 0 18px",
        }}
      >
        {t("myProfile")}
      </h2>

      <Card
        style={{ textAlign: "center", padding: "28px 18px", marginBottom: 14 }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: T.blueLt,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            fontSize: 28,
          }}
        >
          👤
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 22, color: T.text }}>
          Maria Pauli
        </div>
        <div style={{ marginTop: 10 }}>
          <Badge label={t("patient")} />
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionLabel>{t("details")}</SectionLabel>
        {[
          { l: t("dateOfBirth"), v: "12 Mar 1985" },
          { l: t("doctor"), v: "Dr. Schulz" },
          { l: t("patientSince"), v: "Jan 2024" },
        ].map((r) => (
          <div
            key={r.l}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span style={{ fontFamily: T.sans, fontSize: 12, color: T.sub }}>
              {r.l}
            </span>
            <span
              style={{
                fontFamily: T.sans,
                fontSize: 13,
                color: T.text,
                fontWeight: 600,
              }}
            >
              {r.v}
            </span>
          </div>
        ))}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionLabel>{t("scheduledMeds")}</SectionLabel>
        {[
          { name: "Morphine SR", info: "30mg · 08:00" },
          { name: "Dexamethasone", info: "4mg  · 12:00" },
        ].map((m) => (
          <div
            key={m.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <span
              style={{
                fontFamily: T.sans,
                fontWeight: 600,
                fontSize: 13,
                color: T.text,
              }}
            >
              💊 {m.name}
            </span>
            <span style={{ fontFamily: T.sans, fontSize: 12, color: T.sub }}>
              {m.info}
            </span>
          </div>
        ))}
      </Card>

      <Card style={{ background: T.redLt, border: `1.5px solid #F5C0C0` }}>
        <SectionLabel>{t("sosMedLabel")}</SectionLabel>
        {sosMeds.length === 0 ? (
          <p
            style={{
              fontFamily: T.sans,
              fontSize: 13,
              color: "#B03030",
              fontStyle: "italic",
            }}
          >
            {t("noSOSMeds")}
          </p>
        ) : (
          sosMeds.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom:
                  i < sosMeds.length - 1 ? `1px solid #F5C0C0` : "none",
                gap: 8,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontFamily: T.sans,
                  fontWeight: 700,
                  fontSize: 13,
                  color: T.red,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                🚨 {m.name}
              </span>
              <span
                style={{
                  fontFamily: T.sans,
                  fontSize: 12,
                  color: "#B03030",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {m.dose} · {t("maxPerDay")} {m.maxPerDay}
                {t("perDay")}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [patientExists, setPatientExists] = useState(false);
  const [lang, setLang] = useState("en");
  const [sosMeds, setSosMeds] = useState([]); // live from Firebase

  // t() function passed down via context
  const t = (k) => TRANSLATIONS[lang]?.[k] || TRANSLATIONS.en[k] || k;

  /* On mount: silently check Firebase, then show the splash screen */
  useEffect(() => {
    let unsub;

    const init = async () => {
      // 1. Check patient doc + load SOS medications list
      try {
        const ref = doc(db, "patients", PATIENT_ID);
        const snap = await getDoc(ref);
        setPatientExists(snap.exists());
        if (snap.exists()) {
          const d = snap.data();
          // Support both sosMeds array (new) and sosMed single object (legacy)
          if (d.sosMeds && d.sosMeds.length > 0) {
            setSosMeds(d.sosMeds);
          } else if (d.sosMed) {
            setSosMeds([d.sosMed]);
          }
        }
      } catch (err) {
        console.error("Patient doc check failed:", err.message);
        setPatientExists(true);
      }

      // 2. Show splash screen — user taps Sign In to proceed
      setScreen("splash");

      // 3. Real-time events listener (starts in background regardless)
      try {
        const q = query(
          collection(db, "patients", PATIENT_ID, "events"),
          orderBy("timestamp", "desc")
        );
        unsub = onSnapshot(
          q,
          (snapshot) => {
            setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
          },
          (err) => {
            console.warn("onSnapshot error:", err.message);
          }
        );
      } catch (err) {
        console.error("onSnapshot setup failed:", err.message);
      }
    };

    init();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  /* Wrap Firebase writes with saving indicator + hard 10s timeout */
  const withSave = async (fn) => {
    setSaving(true);
    try {
      // Race the write against a 10-second timeout so the UI
      // never freezes if Firebase is unreachable
      await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firebase timeout")), 10000)
        ),
      ]);
    } catch (err) {
      console.error("Firebase write error:", err.message);
      // Don't rethrow - let the UI recover gracefully
    } finally {
      setSaving(false);
    }
  };

  const handleTakeMed = (name, dose) =>
    withSave(() => writeEvent("med_taken", { medName: name, dose }));
  const handleSOS = (medName, dose, symptom, severity) =>
    withSave(() => writeEvent("sos", { medName, dose, symptom, severity }));
  const handleLogSymptom = (symptom, severity) =>
    withSave(() => writeEvent("symptom", { symptom, severity }));
  const handleOnboarding = () =>
    withSave(async () => {
      await ensurePatientDoc();
      setScreen("home");
    });

  /* Screen map — sosmodal is NOT in here, it renders as a fixed overlay */
  const screens = {
    splash: (
      <SplashScreen
        onLogin={(selectedLang) => {
          setLang(selectedLang);
          setScreen(patientExists ? "home" : "onboarding");
        }}
      />
    ),
    loading: (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          background: `linear-gradient(160deg, ${T.blueLt} 0%, ${T.white} 60%, ${T.yellowLt} 100%)`,
        }}
      >
        <Logo size={56} />
        <p
          style={{
            fontFamily: T.sans,
            color: T.sub,
            fontSize: 14,
            marginTop: 8,
          }}
        >
          {TRANSLATIONS[lang]?.connecting || "Connecting…"}
        </p>
      </div>
    ),
    onboarding: <Onboarding onComplete={handleOnboarding} sosMeds={sosMeds} />,
    home: <Home go={setScreen} events={events} sosMeds={sosMeds} />,
    meds: (
      <Medication go={setScreen} events={events} onTakeMed={handleTakeMed} />
    ),
    sosTab: <SOSTab go={setScreen} events={events} sosMeds={sosMeds} />,
    symptoms: (
      <Symptoms
        go={setScreen}
        events={events}
        onLogSymptom={handleLogSymptom}
      />
    ),
    profile: <Profile sosMeds={sosMeds} />,
  };

  /* Which screens show the bottom nav */
  const showNav = ["home", "meds", "sosTab", "symptoms", "profile"].includes(
    screen
  );

  return (
    <LangContext.Provider value={{ lang, t }}>
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          minHeight: "100vh",
          background: T.bg,
          position: "relative",
          overflowX:
            "hidden" /* prevent ANY child from causing horizontal scroll */,
          boxSizing: "border-box",
        }}
      >
        <SavingBanner saving={saving} lang={lang} />

        {/* Regular screens */}
        {screens[screen] ?? screens.home}

        {/* SOS Modal — fixed overlay, always on top, never clipped */}
        {screen === "sosmodal" && (
          <SOSModal go={setScreen} onConfirmSOS={handleSOS} sosMeds={sosMeds} />
        )}

        {showNav && (
          <BottomNav
            active={
              screen === "sosTab" ? "meds" : screen === "meds" ? "meds" : screen
            }
            go={setScreen}
          />
        )}
      </div>
    </LangContext.Provider>
  );
}

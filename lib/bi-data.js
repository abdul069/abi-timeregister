import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, where, Timestamp } from 'firebase/firestore';

// ==========================================
// KENNISBANK (Company Profile)
// ==========================================

const defaultProfile = {
  bedrijfsnaam: '',
  ondernemingsnummer: '',
  btwNummer: '',
  adres: '',
  postcode: '',
  stad: '',
  land: 'Belgie',
  sector: '',
  naceCode: '',
  aantalWerknemers: '',
  omzet: '',
  contactPersoon: '',
  email: '',
  telefoon: '',
  website: '',
  beschrijving: '',
  kernactiviteiten: [],
  certificaten: [],
  updatedAt: null,
};

export async function getBedrijfsprofiel() {
  if (typeof window === 'undefined') return defaultProfile;
  try {
    const snap = await getDoc(doc(db, 'bi_settings', 'bedrijfsprofiel'));
    return snap.exists() ? { ...defaultProfile, ...snap.data() } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export async function saveBedrijfsprofiel(data) {
  if (typeof window === 'undefined') return;
  await setDoc(doc(db, 'bi_settings', 'bedrijfsprofiel'), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ==========================================
// OPPORTUNITY RADAR
// ==========================================

export async function getOpportunities() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(query(collection(db, 'bi_opportunities'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function saveOpportunity(data) {
  if (typeof window === 'undefined') return;
  const ref = await addDoc(collection(db, 'bi_opportunities'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateOpportunity(id, data) {
  if (typeof window === 'undefined') return;
  await updateDoc(doc(db, 'bi_opportunities', id), data);
}

export async function deleteOpportunity(id) {
  if (typeof window === 'undefined') return;
  await deleteDoc(doc(db, 'bi_opportunities', id));
}

// Demo subsidies data (normally fetched from APIs)
export function getDemoSubsidies() {
  return [
    {
      id: 'vlaio-1',
      titel: 'KMO-groeisubsidie',
      bron: 'VLAIO',
      type: 'subsidie',
      deadline: '2026-06-30',
      bedrag: '25.000 - 50.000 EUR',
      beschrijving: 'Subsidie voor strategische transformatieprojecten bij KMO\'s in Vlaanderen. Ondersteuning voor digitalisering, internationalisering, innovatie of circulaire economie.',
      url: 'https://www.vlaio.be/nl/subsidies-financiering/kmo-groeisubsidie',
      match: 87,
      status: 'open',
    },
    {
      id: 'vlaio-2',
      titel: 'Ontwikkelingsproject',
      bron: 'VLAIO',
      type: 'subsidie',
      deadline: '2026-09-15',
      bedrag: '50.000 - 250.000 EUR',
      beschrijving: 'Steun voor bedrijven die een innovatief idee willen omzetten in een concreet nieuw product, proces of dienst.',
      url: 'https://www.vlaio.be/nl/subsidies-financiering/ontwikkelingsproject',
      match: 72,
      status: 'open',
    },
    {
      id: 'ted-1',
      titel: 'Digital Europe Programme - AI & Data',
      bron: 'EU / TED',
      type: 'aanbesteding',
      deadline: '2026-05-20',
      bedrag: '100.000 - 500.000 EUR',
      beschrijving: 'Europees programma voor de versterking van digitale capaciteiten. Focus op AI, cybersecurity, data-infrastructuur en digitale vaardigheden.',
      url: 'https://ted.europa.eu',
      match: 65,
      status: 'open',
    },
    {
      id: 'epro-1',
      titel: 'Raamovereenkomst ICT-diensten Vlaamse Overheid',
      bron: 'e-Procurement',
      type: 'aanbesteding',
      deadline: '2026-04-30',
      bedrag: 'Op aanvraag',
      beschrijving: 'Raamovereenkomst voor het leveren van ICT-consultancy en softwareontwikkeling aan de Vlaamse overheid.',
      url: 'https://www.publicprocurement.be',
      match: 58,
      status: 'open',
    },
    {
      id: 'vlaio-3',
      titel: 'KMO-portefeuille',
      bron: 'VLAIO',
      type: 'subsidie',
      deadline: 'Doorlopend',
      bedrag: '2.500 - 7.500 EUR',
      beschrijving: 'Subsidie voor opleiding en advies. KMO\'s kunnen tot 30% subsidie krijgen op erkende dienstverleners.',
      url: 'https://www.vlaio.be/nl/subsidies-financiering/kmo-portefeuille',
      match: 92,
      status: 'open',
    },
    {
      id: 'ted-2',
      titel: 'Horizon Europe - Cluster 4 Digital',
      bron: 'EU / TED',
      type: 'subsidie',
      deadline: '2026-11-01',
      bedrag: '500.000 - 3.000.000 EUR',
      beschrijving: 'EU-onderzoeks- en innovatieprogramma. Cluster 4 focust op digitale technologie, industrie en ruimtevaart.',
      url: 'https://ted.europa.eu',
      match: 45,
      status: 'open',
    },
  ];
}

// ==========================================
// COMPANY CHECK
// ==========================================

export async function getCompanyChecks() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(query(collection(db, 'bi_company_checks'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function saveCompanyCheck(data) {
  if (typeof window === 'undefined') return;
  const ref = await addDoc(collection(db, 'bi_company_checks'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function deleteCompanyCheck(id) {
  if (typeof window === 'undefined') return;
  await deleteDoc(doc(db, 'bi_company_checks', id));
}

// Simulated company analysis
export function analyzeCompany(ondernemingsnummer) {
  const scores = {
    samenwerkingsscore: Math.floor(Math.random() * 30) + 65,
    btwStatus: Math.random() > 0.15 ? 'actief' : 'inactief',
    rszStatus: Math.random() > 0.1 ? 'in_orde' : 'achterstal',
    jaarrekeningIngediend: Math.random() > 0.2,
    laatsteJaarrekening: '2025',
    financieleGezondheid: Math.floor(Math.random() * 25) + 60,
    betalingsgedrag: Math.floor(Math.random() * 20) + 70,
    juridischeStatus: Math.random() > 0.05 ? 'normaal' : 'procedure',
    oprichtingsdatum: '2018-03-15',
    rechtsvorm: 'BV (Besloten Vennootschap)',
    naceCode: '62.010 - Ontwerpen en programmeren van computerprogramma\'s',
  };

  const risicos = [];
  if (scores.btwStatus === 'inactief') risicos.push({ type: 'hoog', tekst: 'BTW-nummer is inactief' });
  if (scores.rszStatus === 'achterstal') risicos.push({ type: 'hoog', tekst: 'RSZ-bijdragen niet in orde' });
  if (!scores.jaarrekeningIngediend) risicos.push({ type: 'medium', tekst: 'Laatste jaarrekening niet tijdig ingediend' });
  if (scores.financieleGezondheid < 65) risicos.push({ type: 'medium', tekst: 'Financiele gezondheid onder gemiddelde' });
  if (scores.juridischeStatus !== 'normaal') risicos.push({ type: 'hoog', tekst: 'Lopende juridische procedures' });
  if (risicos.length === 0) risicos.push({ type: 'laag', tekst: 'Geen significante risico\'s gevonden' });

  return { scores, risicos };
}

// ==========================================
// RISK SHIELD (Contract Analysis)
// ==========================================

export async function getContractAnalyses() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(query(collection(db, 'bi_contracts'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function saveContractAnalysis(data) {
  if (typeof window === 'undefined') return;
  const ref = await addDoc(collection(db, 'bi_contracts'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function deleteContractAnalysis(id) {
  if (typeof window === 'undefined') return;
  await deleteDoc(doc(db, 'bi_contracts', id));
}

// Simulated contract clause analysis
export function analyzeContract(contractText) {
  const clausePatterns = [
    { pattern: /aansprakelijkheid|liability|schade/i, naam: 'Aansprakelijkheid', categorie: 'juridisch' },
    { pattern: /betaling|factuur|betalingstermijn|payment/i, naam: 'Betalingsvoorwaarden', categorie: 'financieel' },
    { pattern: /opzeg|beeindig|termination|ontbind/i, naam: 'Opzegclausule', categorie: 'juridisch' },
    { pattern: /geheimhouding|confidential|vertrouwelijk|nda/i, naam: 'Geheimhouding', categorie: 'compliance' },
    { pattern: /intellectueel|eigendom|ip|copyright|patent/i, naam: 'Intellectueel Eigendom', categorie: 'juridisch' },
    { pattern: /boete|penalty|schadevergoeding/i, naam: 'Boeteclausule', categorie: 'financieel' },
    { pattern: /force majeure|overmacht/i, naam: 'Overmacht', categorie: 'juridisch' },
    { pattern: /garantie|warranty|waarborg/i, naam: 'Garantiebepalingen', categorie: 'juridisch' },
    { pattern: /concurrentie|non-compete|exclusiviteit/i, naam: 'Concurrentiebeding', categorie: 'compliance' },
    { pattern: /gdpr|privacy|gegevens|data protection|avg/i, naam: 'Privacy & GDPR', categorie: 'compliance' },
  ];

  const gevondenClausules = [];
  const lines = contractText.split('\n');

  clausePatterns.forEach(cp => {
    const matchingLines = lines.filter(l => cp.pattern.test(l));
    if (matchingLines.length > 0) {
      const risicoNiveau = ['aansprakelijkheid', 'boete', 'opzeg'].some(w => cp.naam.toLowerCase().includes(w))
        ? 'hoog'
        : ['betaling', 'concurrentie'].some(w => cp.naam.toLowerCase().includes(w))
          ? 'medium'
          : 'laag';

      gevondenClausules.push({
        naam: cp.naam,
        categorie: cp.categorie,
        risico: risicoNiveau,
        aantalVermeldingen: matchingLines.length,
        voorbeeld: matchingLines[0].trim().substring(0, 150),
        advies: getClausuleAdvies(cp.naam, risicoNiveau),
      });
    }
  });

  if (gevondenClausules.length === 0) {
    gevondenClausules.push({
      naam: 'Algemeen',
      categorie: 'info',
      risico: 'laag',
      aantalVermeldingen: 0,
      voorbeeld: 'Geen specifieke clausules gedetecteerd in de tekst.',
      advies: 'Voeg de volledige contracttekst toe voor een gedetailleerde analyse.',
    });
  }

  const totaalRisico = gevondenClausules.reduce((sum, c) => {
    return sum + (c.risico === 'hoog' ? 30 : c.risico === 'medium' ? 15 : 5);
  }, 0);

  const risicoScore = Math.min(100, Math.max(0, 100 - totaalRisico));

  return {
    clausules: gevondenClausules,
    risicoScore,
    totaalClausules: gevondenClausules.length,
    samenvatting: risicoScore >= 70
      ? 'Contract lijkt overwegend veilig met beperkte risico\'s.'
      : risicoScore >= 40
        ? 'Contract bevat aandachtspunten die juridisch advies vereisen.'
        : 'Contract bevat significante risico\'s. Juridische review sterk aanbevolen.',
  };
}

function getClausuleAdvies(naam, risico) {
  const adviezen = {
    'Aansprakelijkheid': 'Controleer of aansprakelijkheid begrensd is en of er een cap is opgenomen.',
    'Betalingsvoorwaarden': 'Verifieer betalingstermijnen en eventuele boetes bij laattijdige betaling.',
    'Opzegclausule': 'Let op opzegtermijnen en voorwaarden. Zorg voor redelijke exit-mogelijkheid.',
    'Geheimhouding': 'Controleer de duur en scope van geheimhouding. Is deze proportioneel?',
    'Intellectueel Eigendom': 'Zorg dat IP-rechten duidelijk zijn toegewezen en beschermd.',
    'Boeteclausule': 'Controleer of boetes proportioneel zijn en of er een maximumbedrag is.',
    'Overmacht': 'Verifieer dat overmacht-clausule beide partijen beschermt.',
    'Garantiebepalingen': 'Controleer garantieduur en wat wel/niet gedekt is.',
    'Concurrentiebeding': 'Let op duur en geografische scope. Is dit proportioneel?',
    'Privacy & GDPR': 'Zorg voor een verwerkersovereenkomst als persoonsgegevens worden verwerkt.',
  };
  return adviezen[naam] || 'Raadpleeg een juridisch adviseur voor nadere analyse.';
}

// ==========================================
// DOSSIER FORGE
// ==========================================

export async function getDossiers() {
  if (typeof window === 'undefined') return [];
  try {
    const snap = await getDocs(query(collection(db, 'bi_dossiers'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function saveDossier(data) {
  if (typeof window === 'undefined') return;
  const ref = await addDoc(collection(db, 'bi_dossiers'), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateDossier(id, data) {
  if (typeof window === 'undefined') return;
  await updateDoc(doc(db, 'bi_dossiers', id), data);
}

export async function deleteDossier(id) {
  if (typeof window === 'undefined') return;
  await deleteDoc(doc(db, 'bi_dossiers', id));
}

// Generate concept dossier
export function generateDossier(subsidie, profiel) {
  return {
    titel: `Aanvraag ${subsidie.titel}`,
    subsidie: subsidie.titel,
    bron: subsidie.bron,
    status: 'concept',
    secties: [
      {
        titel: 'Samenvatting Project',
        inhoud: `${profiel.bedrijfsnaam || '[Bedrijfsnaam]'} vraagt steun aan via ${subsidie.titel} (${subsidie.bron}) voor een strategisch project gericht op groei en innovatie binnen de sector ${profiel.sector || '[sector]'}.`,
      },
      {
        titel: 'Bedrijfsprofiel',
        inhoud: `Onderneming: ${profiel.bedrijfsnaam || '[Bedrijfsnaam]'}\nOndernemingsnummer: ${profiel.ondernemingsnummer || '[nummer]'}\nAdres: ${profiel.adres || '[adres]'}, ${profiel.postcode || '[postcode]'} ${profiel.stad || '[stad]'}\nSector: ${profiel.sector || '[sector]'}\nAantal werknemers: ${profiel.aantalWerknemers || '[aantal]'}\nOmzet: ${profiel.omzet || '[omzet]'}`,
      },
      {
        titel: 'Projectbeschrijving',
        inhoud: `Beschrijf hier het project waarvoor u steun aanvraagt.\n\n- Wat is het doel van het project?\n- Welke activiteiten worden ondernomen?\n- Wat is het innovatieve karakter?\n- Hoe draagt dit bij aan de groei van het bedrijf?`,
      },
      {
        titel: 'Planning & Mijlpalen',
        inhoud: `Fase 1: Voorbereiding (maand 1-2)\n- Marktonderzoek en feasibility\n- Teamsamenstelling\n\nFase 2: Uitvoering (maand 3-8)\n- Ontwikkeling en implementatie\n- Tussentijdse evaluatie\n\nFase 3: Afronding (maand 9-12)\n- Testing en validatie\n- Rapportage en evaluatie`,
      },
      {
        titel: 'Budget',
        inhoud: `Personeel: EUR [bedrag]\nExterne diensten: EUR [bedrag]\nMateriaal & uitrusting: EUR [bedrag]\nOverhead: EUR [bedrag]\n\nTotaal projectkost: EUR [totaal]\nGevraagde steun: ${subsidie.bedrag || '[bedrag]'}`,
      },
      {
        titel: 'Verwachte Impact',
        inhoud: `- Verwachte omzetgroei: [percentage]%\n- Nieuwe jobs: [aantal]\n- Innovatie-impact: [beschrijving]\n- Maatschappelijke impact: [beschrijving]`,
      },
    ],
  };
}

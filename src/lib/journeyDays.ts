export interface JourneyDay {
  day: number;
  title: string;
  description: string;
  deepDive: string;
  requiresBoth: boolean;
  ctaLabel: string;
  ctaPath: string;
}

const JOURNEY_DAYS: JourneyDay[] = [
  // VECKA 1 – START & SE VARANDRA
  {
    day: 1,
    title: "Kom igång tillsammans",
    description: "Bjud in din partner, ladda ned appen och aktivera notiser.",
    deepDive: `Under de kommande 90 dagarna\n\nvad skulle hända om ni faktiskt gjorde något för er relation varje dag?\n\nInte när det passar.\nInte när något känns fel.\nUtan konsekvent.\n\nSmå saker.\nTydliga handlingar.\n\nNi kommer inte göra stora förändringar direkt.\nMen ni kommer börja se mönster.\n\nHur ni pratar.\nHur ni lyssnar.\nHur ni tar kontakt.\n\nVad som fungerar.\nOch vad som saknas.\n\nVad skulle förändras\nom ni inte bara lät relationen rulla\nutan faktiskt började bygga den?\n\nDet här är starten.`,
    requiresBoth: true,
    ctaLabel: "Bjud in partner",
    ctaPath: "/pairing",
  },
  {
    day: 2,
    title: "Första frågan",
    description: "Ni pratar varje dag – om saker som ska lösas. Men hur ofta frågar du något du faktiskt inte vet? Ställ en fråga du inte ställt förut.",
    deepDive: `Ni pratar varje dag.\n\nMen vad pratar ni om?\n\nÄr det mest det som behöver lösas?\nDet som ska planeras?\n\nNär var senaste gången\ndu ställde en fråga utan att veta svaret?\n\nVad i din partner har du inte utforskat på länge?\n\nTesta att ställa en sådan fråga idag.`,
    requiresBoth: false,
    ctaLabel: "Upptäck varandra",
    ctaPath: "/daily",
  },
  {
    day: 3,
    title: "Se det som är bra",
    description: "Din partner gör saker varje dag som påverkar ditt liv. Men hur ofta säger du det? Säg något du inte sagt på länge.",
    deepDive: `Vad gör din partner varje dag\nsom gör ditt liv enklare eller bättre?\n\nVad har blivit så vanligt\natt du slutat tänka på det?\n\nNär slutade du säga det högt?\n\nVad skulle hända\nom du började igen?\n\nTesta att sätta ord på en sak idag.`,
    requiresBoth: false,
    ctaLabel: "Ge uppskattning",
    ctaPath: "/daily",
  },
  {
    day: 4,
    title: "Var här",
    description: "Du lyssnar – men gör ofta något annat samtidigt. Hur ofta är du helt där? Var fullt närvarande i 2 minuter.",
    deepDive: `När din partner pratar med dig\nhur ser din uppmärksamhet ut?\n\nÄr du helt där\neller delad mellan flera saker?\n\nHur känns det i kroppen\nnär du verkligen lyssnar\njämfört med när du bara svarar?\n\nVad händer i samtalet\nnär du är helt närvarande?\n\nTesta att ge två minuter fullt fokus idag.`,
    requiresBoth: false,
    ctaLabel: "Närvaro",
    ctaPath: "/daily",
  },
  {
    day: 5,
    title: "Ta initiativ",
    description: "Ni väntar ibland på att den andra ska ta första steget. Men vem gör det då? Ta ett litet initiativ till kontakt.",
    deepDive: `När uppstår kontakt mellan er?\n\nVäntar ni på rätt tillfälle?\nEller på att den andra ska börja?\n\nHur ofta blir det inget\nför att ingen riktigt tar första steget?\n\nVad händer när du själv initierar?\n\nTesta att ta ett litet initiativ idag.`,
    requiresBoth: false,
    ctaLabel: "Vänd dig mot",
    ctaPath: "/daily",
  },
  {
    day: 6,
    title: "Ta emot",
    description: "Din partner säger saker till dig under dagen. Hur ofta stannar du kvar i det? Ta emot ett initiativ med öppenhet.",
    deepDive: `När din partner tar kontakt\nhur svarar du?\n\nStannar du kvar\neller går du vidare direkt?\n\nHur snabbt avslutas de små ögonblicken?\n\nVad händer om du inte avslutar direkt?\n\nTesta att stanna kvar lite längre idag.`,
    requiresBoth: false,
    ctaLabel: "Vänd dig mot",
    ctaPath: "/daily",
  },
  {
    day: 7,
    title: "Vad har du sett?",
    description: "Du har gjort små saker varje dag. Men vad har du faktiskt lagt märke till? Skriv ner det du sett denna vecka.",
    deepDive: `Vad har du lagt märke till den här veckan?\n\nHur ser dina vanor ut i samtal?\nI närvaro?\nI kontakt?\n\nVad gör du redan\nsom du inte tänkt på tidigare?\n\nVad gör du som du vill justera?\n\nTesta att sätta ord på det idag.`,
    requiresBoth: false,
    ctaLabel: "Reflektion",
    ctaPath: "/evaluate",
  },
  // VECKA 2 – SE MÖNSTER
  {
    day: 8,
    title: "Missade ögonblick",
    description: "Din partner säger något till dig när du är mitt i något annat. Du svarar – men utan att riktigt stanna upp. Lägg märke till ett sådant tillfälle idag.",
    deepDive: `När din partner pratar med dig under dagen\nhur ofta stannar du faktiskt upp?\n\nHur ofta svarar du samtidigt som du tänker på något annat?\n\nDet är små saker.\nSnabba svar.\nFokus kvar någon annanstans.\n\nInte för att du inte bryr dig.\nMen för att tempot är högt.\n\nVad händer i de stunderna?\nHur känns det i kroppen när du verkligen är där jämfört med när du inte är det?\n\nTesta att bara lägga märke till skillnaden idag.`,
    requiresBoth: false,
    ctaLabel: "Vänd dig mot",
    ctaPath: "/daily",
  },
  {
    day: 9,
    title: "Vart är ni på väg?",
    description: "Ni planerar vardagen tillsammans. Men hur ofta pratar ni om vart ni är på väg? Prata om vad ni vill skapa de kommande 3 månaderna.",
    deepDive: `Ni fattar många beslut tillsammans varje vecka.\n\nMen hur ofta handlar de om riktning?\n\nVad vill ni skapa tillsammans?\nVad vill ni uppleva mer av?\n\nEller är det mesta bara det som behöver göras?\n\nOm ni inte sätter riktning tillsammans\nvad är det då som styr vart ni är på väg?\n\nTesta att prata om det idag.`,
    requiresBoth: true,
    ctaLabel: "Samtal",
    ctaPath: "/weekly",
  },
  {
    day: 10,
    title: "Lär känna mer",
    description: "Du vet mycket om din partner. Men hur länge sedan var det du lärde dig något nytt? Ställ en ny fråga idag.",
    deepDive: `Du vet mycket om din partner.\n\nMen vad bygger den kunskapen på?\n\nHur länge sedan var det du faktiskt blev överraskad?\n\nVad har förändrats senaste året?\nSenaste månaderna?\n\nVad har du inte frågat om?\n\nTesta att ställa en fråga idag\nsom du inte vet svaret på.`,
    requiresBoth: false,
    ctaLabel: "Upptäck varandra",
    ctaPath: "/daily",
  },
  {
    day: 11,
    title: "Visa det du ser",
    description: "Gör inte din partner saker varje dag som bidrar till ditt liv? Men hur ofta uppmärksammar du det? Säg något du inte sagt på länge.",
    deepDive: `Vad gör din partner varje dag\nsom gör ditt liv enklare eller bättre?\n\nVad har du börjat ta för givet?\n\nVad brukade du uppskatta i början\nsom du inte längre sätter ord på?\n\nNär slutade du säga det högt?\n\nTesta att säga något idag\nsom du inte sagt på länge.`,
    requiresBoth: false,
    ctaLabel: "Ge uppskattning",
    ctaPath: "/daily",
  },
  {
    day: 12,
    title: "Små signaler",
    description: "Din partner säger små saker för att få kontakt. Hur ofta stannar du kvar i dem? Stanna kvar lite längre i ett sådant ögonblick.",
    deepDive: `Hur ser din partner ut när de söker kontakt?\n\nÄr det en fråga?\nEn kommentar?\nEtt försök att visa något?\n\nHur ofta svarar du snabbt och går vidare?\n\nVad händer om du inte gör det?\n\nTesta att stanna kvar lite längre idag.`,
    requiresBoth: false,
    ctaLabel: "Vänd dig mot",
    ctaPath: "/daily",
  },
  {
    day: 13,
    title: "Var närvarande igen",
    description: "Ett samtal är på väg att ta slut. Du går vidare av vana. Stanna kvar några sekunder längre.",
    deepDive: `Hur ofta avslutar du samtal snabbt?\n\nInte för att det är slut\nutan för att det är dags att gå vidare?\n\nVad händer om du inte gör det?\n\nVad finns kvar i samtalet\nom du stannar några sekunder till?\n\nTesta idag.`,
    requiresBoth: false,
    ctaLabel: "Närvaro",
    ctaPath: "/daily",
  },
  {
    day: 14,
    title: "Veckoreflektion",
    description: "Det finns saker i er relation som fungerar. Men hur ofta tänker du på dem? Skriv ner tre saker som fungerar bra.",
    deepDive: `Vad fungerar i er relation just nu?\n\nVad gör ni bra tillsammans?\n\nVad har blivit så normalt\natt du inte längre tänker på det?\n\nVad skulle du sakna om det försvann?\n\nTesta att sätta ord på det idag.`,
    requiresBoth: false,
    ctaLabel: "Reflektion",
    ctaPath: "/evaluate",
  },
  // VECKA 3 – SE DIG SJÄLV
  {
    day: 15,
    title: "Hur mår du?",
    description: "Lägg märke till din egen energi idag.",
    deepDive: `Hur mår du egentligen just nu?\n\nInte hur du svarar när någon frågar.\nUtan hur det faktiskt känns.\n\nVilken energi har du idag?\nVad tar energi?\nVad ger energi?\n\nNär du börjar se det\nkan du börja göra medvetna val.`,
    requiresBoth: false,
    ctaLabel: "Energi",
    ctaPath: "/evaluate",
  },
  {
    day: 16,
    title: "Vad behöver du?",
    description: "Identifiera ett behov du har idag.",
    deepDive: `Vad behöver du just nu?\n\nInte vad du borde behöva.\nInte vad som vore praktiskt.\n\nUtan vad du faktiskt behöver.\n\nNär du sätter ord på det\nblir det lättare att be om det.\n\nOch lättare att ge det till dig själv.`,
    requiresBoth: false,
    ctaLabel: "Reflektion",
    ctaPath: "/evaluate",
  },
  {
    day: 17,
    title: "Vad vill du?",
    description: "Sätt ord på något du vill uppleva.",
    deepDive: `Vad vill du uppleva mer av?\n\nI relationen?\nI vardagen?\nI dig själv?\n\nNär du vet vad du vill\nkan du börja röra dig mot det.`,
    requiresBoth: false,
    ctaLabel: "Reflektion",
    ctaPath: "/evaluate",
  },
  {
    day: 18,
    title: "Dela något litet",
    description: "Dela en tanke eller känsla med din partner.",
    deepDive: `Vad tänker du på just nu\nsom du inte har delat?\n\nDet behöver inte vara stort.\nBara äkta.\n\nNär du delar\nskapar du kontakt.`,
    requiresBoth: false,
    ctaLabel: "Samtal",
    ctaPath: "/weekly",
  },
  {
    day: 19,
    title: "Ta emot dig själv",
    description: "Lägg märke till vad som händer i dig i mötet.",
    deepDive: `Vad händer i dig\nnär du möter din partner?\n\nVad känner du?\nVad tänker du?\n\nNär du lägger märke till det\nfår du ett val.\n\nAtt reagera som vanligt\neller att göra något annat.`,
    requiresBoth: false,
    ctaLabel: "Reflektion",
    ctaPath: "/evaluate",
  },
  {
    day: 20,
    title: "När stänger du ner?",
    description: "Se när du drar dig undan.",
    deepDive: `När drar du dig undan?\n\nVad triggar det?\n\nHur märker du det i kroppen?\n\nNär du ser mönstret\nkan du välja annorlunda.`,
    requiresBoth: false,
    ctaLabel: "Vänd dig mot",
    ctaPath: "/daily",
  },
  {
    day: 21,
    title: "Veckoreflektion",
    description: "Vad har du lärt dig om dig själv?",
    deepDive: `Vad har du sett den här veckan?\n\nOm dig själv.\nOm dina mönster.\nOm vad du behöver.\n\nSätt ord på det.\n\nDet är så förståelse börjar.`,
    requiresBoth: false,
    ctaLabel: "Reflektion",
    ctaPath: "/evaluate",
  },
  // VECKA 4 – SE RELATIONEN
  {
    day: 22,
    title: "Små insättningar",
    description: "Gör en liten handling som stärker relationen.",
    deepDive: `Vad kan du göra idag\nsom stärker er relation?\n\nDet behöver inte vara stort.\nBara medvetet.\n\nEn insättning.\nEn handling.\n\nSmå saker bygger stora saker.`,
    requiresBoth: false,
    ctaLabel: "Valfri",
    ctaPath: "/daily",
  },
  {
    day: 23,
    title: "Tre dagar i rad",
    description: "Börja en streak tillsammans.",
    deepDive: `Kan ni göra tre dagar i rad?\n\nTre dagar av medvetna insättningar.\n\nInte perfekt.\nBara konsekvent.\n\nDet börjar här.`,
    requiresBoth: true,
    ctaLabel: "Konto",
    ctaPath: "/daily",
  },
  {
    day: 24,
    title: "Fortsätt streak",
    description: "Håll igång insättningarna.",
    deepDive: `Dag två av tre.\n\nHur känns det att göra detta medvetet?\n\nVad märker du?`,
    requiresBoth: true,
    ctaLabel: "Konto",
    ctaPath: "/daily",
  },
  {
    day: 25,
    title: "Fullfölj streak",
    description: "Avsluta tre dagar tillsammans.",
    deepDive: `Tre dagar.\n\nNi har gjort det.\n\nVad har ni byggt?\nVad har ni sett?\n\nDet här är grunden.`,
    requiresBoth: true,
    ctaLabel: "Konto",
    ctaPath: "/daily",
  },
  {
    day: 26,
    title: "Låt din partner påverka",
    description: "Lyssna och låt deras perspektiv spela roll.",
    deepDive: `Hur ofta låter du dig påverkas\nav din partner?\n\nInte bara höra.\nUtan faktiskt låta det spela roll.\n\nNär du gör det\nförändras dynamiken.`,
    requiresBoth: false,
    ctaLabel: "Påverkan",
    ctaPath: "/daily",
  },
  {
    day: 27,
    title: "Hur närd är du?",
    description: "Reflektera över vad som fyller dig med energi.",
    deepDive: `Vad närer dig?\n\nVad fyller på?\nVad tömmer?\n\nNär du vet det\nkan du börja välja mer medvetet.`,
    requiresBoth: false,
    ctaLabel: "Energi",
    ctaPath: "/evaluate",
  },
  {
    day: 28,
    title: "Reglera dig",
    description: "Stanna upp när något triggas i dig.",
    deepDive: `Vad händer när du triggas?\n\nKan du stanna upp?\nAndas?\nVälja hur du svarar?\n\nDet är reglering.\nOch det förändrar allt.`,
    requiresBoth: false,
    ctaLabel: "Reflektion",
    ctaPath: "/evaluate",
  },
  {
    day: 29,
    title: "Planera samtal",
    description: "Sätt en tid för State of the Union.",
    deepDive: `Ni behöver ett regelbundet samtal.\n\nInte för att lösa problem.\nUtan för att hålla kontakten.\n\nSätt en tid.\nGör det till en vana.`,
    requiresBoth: true,
    ctaLabel: "Planera",
    ctaPath: "/weekly",
  },
  {
    day: 30,
    title: "Summera månaden",
    description: "Vad har förändrats i er relation?",
    deepDive: `En månad har gått.\n\nVad har förändrats?\nVad gör ni annorlunda?\nVad har ni sett?\n\nSätt ord på det.\nFira det.\n\nNi har byggt något tillsammans.`,
    requiresBoth: true,
    ctaLabel: "Reflektion",
    ctaPath: "/evaluate",
  },
];

// Generate placeholder days 31-90
for (let d = 31; d <= 90; d++) {
  const week = Math.ceil(d / 7);
  const dayInWeek = ((d - 1) % 7) + 1;

  // Rotating themes for placeholder days
  const themes = [
    { title: "Fortsätt bygga", description: "Gör en medveten handling för relationen idag.", ctaLabel: "Dagens uppdrag", ctaPath: "/daily" },
    { title: "Ställ en fråga", description: "Utforska något nytt om din partner.", ctaLabel: "Upptäck varandra", ctaPath: "/daily" },
    { title: "Visa uppskattning", description: "Sätt ord på något du uppskattar.", ctaLabel: "Ge uppskattning", ctaPath: "/daily" },
    { title: "Var närvarande", description: "Ge din partner din fulla uppmärksamhet.", ctaLabel: "Närvaro", ctaPath: "/daily" },
    { title: "Vänd dig mot", description: "Ta ett steg mot kontakt.", ctaLabel: "Vänd dig mot", ctaPath: "/daily" },
    { title: "Reflektera", description: "Vad har du sett den här veckan?", ctaLabel: "Reflektion", ctaPath: "/evaluate" },
    { title: "Veckoreflektion", description: "Stanna upp och reflektera.", ctaLabel: "Reflektion", ctaPath: "/evaluate" },
  ];

  const theme = themes[(dayInWeek - 1) % themes.length];

  JOURNEY_DAYS.push({
    day: d,
    title: theme.title,
    description: theme.description,
    deepDive: `Dag ${d} av 90.\n\nFortsätt med medvetna handlingar.\nVarje dag bygger ni er hamn.`,
    requiresBoth: dayInWeek === 7,
    ctaLabel: theme.ctaLabel,
    ctaPath: theme.ctaPath,
  });
}

export { JOURNEY_DAYS };

export function getJourneyDay(dayNumber: number): JourneyDay | null {
  return JOURNEY_DAYS.find(d => d.day === dayNumber) || null;
}

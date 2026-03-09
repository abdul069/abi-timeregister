# FastFood POS - Professionele Upgrade Plan

## Gebaseerd op: Lightspeed, Toast, SambaPOS, Untill, Square, TouchBistro, Micros/Oracle, Revel, Vectron, Gastrofix

---

## FASE 1: Boekhouding & Financieel (boekhouding.js + verbeteringen)

### 1.1 Dagafsluiting (Z-Rapport) - UPGRADE
**Huidige staat:** Basis werkperiode open/sluit met simpel rapport
**Upgrade naar:**
- **Z-Rapport** (eindafsluiting) met volledig kassaoverzicht
- **X-Rapport** (tussenrapport) zonder de tellers te resetten
- Kassatelling per coupure (€500, €200, €100, €50, €20, €10, €5, munten)
- Verwacht vs geteld met tolerantie-instelling (bijv. €2.00 verschil OK)
- Kas tekort/overschot historie per medewerker
- PIN/Kaart batch overzicht (gescheiden van contant)
- Automatische BTW-berekening per tarief (9% en 21%)
- Dagrapport afdrukken/exporteren als PDF
- Verplicht kassatelling voor sluiting (geen skip)

### 1.2 Financieel Dashboard (NIEUW: /financieel)
- **Omzet overzicht**: dag, week, maand, kwartaal, jaar
- **Vergelijking**: deze week vs vorige week, deze maand vs vorige maand
- **BTW-aangifte overzicht**: automatisch totaal per BTW-tarief per periode
- **Betaalmethode analyse**: contant vs pin vs online trends
- **Kosten tracking**: inkoop, personeel, overige kosten invoeren
- **Winstmarge berekening**: omzet minus kosten = bruto winst
- **Top/flop producten**: welke producten leveren meest op, welke het minst
- **Grafiek**: omzet per uur, dag, week (lijn + staafdiagram)

### 1.3 Kassalade & Transacties
- **Kasboek**: elke kas in/uit wordt gelogd (storting, opname, wisselgeld, fooi)
- **Kas afromen**: tussentijds geld uit kassa halen → wordt gelogd
- **Fooi tracking**: apart bijhouden per medewerker
- **Retouren & Annuleringen**: apart logboek met reden + autorisatie

---

## FASE 2: Management & Rapportage

### 2.1 Bestellingen - UPGRADE
**Huidige staat:** Basis dagweergave met beperkte stats
**Upgrade naar:**
- **Datumbereik filter**: van/tot datum selectie
- **Export**: CSV en PDF export van rapporten
- **Drilldown**: klik op een uur → zie individuele bestellingen
- **Vergelijking**: vandaag vs gisteren, deze week vs vorige week
- **Productmix rapport**: welke producten samen besteld worden
- **Piekuur analyse**: automatisch piekuren herkennen
- **Annuleringsrapport**: welke items worden meest geannuleerd + reden

### 2.2 Dashboard KPI's - UPGRADE
**Huidige staat:** 3 simpele tellers
**Upgrade naar:**
- **Live tellers**: bestellingen, omzet, gem. bonbedrag, items/uur
- **Sparkline grafieken**: mini omzetgrafiek per uur
- **Doelen**: dagdoel instellen (bijv. €500 omzet) met voortgangsbalk
- **Vergelijking badge**: +12% vs gisteren (groen/rood)
- **Wachttijd indicator**: gemiddelde wachttijd keuken
- **Top product vandaag**: meest verkochte item

### 2.3 Audit Trail (NIEUW)
- Elke actie wordt gelogd: wie, wat, wanneer
- Prijswijzigingen, kortingen, annuleringen, voids
- Onverwijderbaar logboek (alleen admin kan bekijken)
- Filter op medewerker, actie, datum

---

## FASE 3: Personeel & Inkloksysteem

### 3.1 Personeelsbeheer - UPGRADE
**Huidige staat:** Naam + PIN + rol, meer niet
**Upgrade naar:**
- **Uitgebreid profiel**: naam, email, telefoon, adres, BSN/ID, startdatum
- **Contractinfo**: uurloon, contracturen, type (vast/flex/oproep)
- **Rollen & Rechten matrix**:
  - Admin: alles
  - Manager: rapporten, personeel, menu, dagafsluiting
  - Kassier: kassa, bestellingen bekijken
  - Keuken: alleen keuken display
- **Foto upload** of avatar keuze
- **Notities per medewerker**

### 3.2 Inkloksysteem (NIEUW: /inklokken)
- **PIN-klok**: medewerker klopt in/uit met PIN
- **Uurregistratie**: automatisch uren berekenen per shift
- **Pauze tracking**: pauze in/uit registreren
- **Weekoverzicht**: uren per medewerker per week
- **Maandoverzicht**: totaal uren, overuren, kosten
- **Uurloon berekening**: automatisch loonkosten berekenen
- **Export**: urenlijst exporteren voor salarisadministratie

### 3.3 Planning & Roostering (simpele versie)
- **Weekrooster**: wie werkt wanneer
- **Shift templates**: ochtend/middag/avond shifts definiëren
- **Beschikbaarheid**: medewerker kan aangeven wanneer beschikbaar
- **Bezetting indicator**: hoeveel personeel per shift

---

## FASE 4: Kassa & Operationeel

### 4.1 Kassa - UPGRADE
- **Gesplitste betaling**: deel contant, deel pin
- **Tafel/nummer systeem**: voor ter plaatse bestellingen
- **Bonnetje afdrukken**: bon layout met bedrijfsinfo + BTW
- **Klant op scherm**: tweede scherm weergave voor klant
- **Snelknoppen**: favoriete producten als snelknoppen op kassascherm
- **Korting autorisatie**: korting > 10% vereist manager PIN

### 4.2 Keuken Display - UPGRADE
- **Meerdere stations**: bijv. "Grill", "Frituur", "Dranken"
- **Prep-tijd per product**: verwachte bereidingstijd
- **Prioriteit markering**: VIP / spoedbestelling
- **Bump-bar interface**: grote knoppen voor keuken (touch-friendly)

---

## Implementatie Volgorde

| Stap | Onderdeel | Complexiteit |
|------|-----------|-------------|
| 1 | Dagafsluiting Z/X-Rapport upgrade | Gemiddeld |
| 2 | Personeelsprofiel + rechten matrix | Gemiddeld |
| 3 | Inkloksysteem (uren registratie) | Gemiddeld |
| 4 | Financieel dashboard | Hoog |
| 5 | Kasboek & transactie logging | Gemiddeld |
| 6 | Bestellingen rapport upgrade | Gemiddeld |
| 7 | Dashboard KPI upgrade | Laag |
| 8 | Audit trail | Gemiddeld |
| 9 | Kassa split-betaling & tafel | Gemiddeld |
| 10 | Keuken stations | Laag |

---

## Technische Aanpak
- Alle data in Firestore (bestaande structuur uitbreiden)
- Geen externe packages nodig (alles in React/Next.js)
- Responsive design (werkt op tablet + desktop)
- Nederlandse taal consistent
- Dark theme behouden

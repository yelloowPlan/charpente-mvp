import type {
  ParametresProjet,
  ParametresBatiment,
  Couverture,
  ParametresCharpente,
  TypeToiture,
  ZoneNeige,
} from "@charpente/moteur";
import { chargeNeigeSolKNm2 } from "@charpente/moteur";

/** Presets de couverture (pureau + poids surfacique). */
const COUVERTURES: Record<string, { pureauM: number; poidsKgM2: number }> = {
  tuile_mecanique: { pureauM: 0.32, poidsKgM2: 45 },
  tuile_plate: { pureauM: 0.13, poidsKgM2: 65 },
  ardoise: { pureauM: 0.1, poidsKgM2: 30 },
  bac_acier: { pureauM: 0.4, poidsKgM2: 12 },
};

/** Classes de résistance → module d'élasticité E0,mean (MPa). */
const CLASSES_BOIS: Record<string, number> = { C18: 9000, C24: 11000, C30: 12000 };

interface Props {
  projet: ParametresProjet;
  onChange: (p: ParametresProjet) => void;
}

export function ParamForm({ projet, onChange }: Props) {
  const setBat = <K extends keyof ParametresBatiment>(k: K, v: ParametresBatiment[K]) =>
    onChange({ ...projet, batiment: { ...projet.batiment, [k]: v } });

  const setPente = (v: number) =>
    onChange({ ...projet, toiture: { ...projet.toiture, penteDeg: v } });

  const setTypologie = (t: string) =>
    onChange({ ...projet, toiture: { ...projet.toiture, typologie: t as TypeToiture } });

  const setNeige = (zone: string, altitude: number) =>
    onChange({
      ...projet,
      charges: {
        ...projet.charges,
        zoneNeige: zone,
        altitudeM: altitude,
        neigeKNm2: chargeNeigeSolKNm2(zone as ZoneNeige, altitude),
      },
    });

  const setCouv = <K extends keyof Couverture>(k: K, v: Couverture[K]) =>
    onChange({
      ...projet,
      toiture: { ...projet.toiture, couverture: { ...projet.toiture.couverture, [k]: v } },
    });

  const setCouvertureType = (type: string) => {
    const preset = COUVERTURES[type];
    onChange({
      ...projet,
      toiture: {
        ...projet.toiture,
        couverture: {
          type,
          pureauM: preset ? preset.pureauM : projet.toiture.couverture.pureauM,
          poidsKgM2: preset ? preset.poidsKgM2 : projet.toiture.couverture.poidsKgM2,
        },
      },
    });
  };

  const setCharp = <K extends keyof ParametresCharpente>(k: K, v: ParametresCharpente[K]) =>
    onChange({ ...projet, charpente: { ...projet.charpente, [k]: v } });

  const setClasse = (classe: string) =>
    onChange({
      ...projet,
      essence: { ...projet.essence, classe, moduleEMpa: CLASSES_BOIS[classe] ?? projet.essence.moduleEMpa },
    });

  const setPrixM3Euros = (euros: number) =>
    onChange({ ...projet, essence: { ...projet.essence, prixM3Cents: Math.round(euros * 100) } });

  const setPrix = (k: "couvertureM2Cents" | "mainOeuvreHeureCents", euros: number) =>
    onChange({ ...projet, prix: { ...projet.prix, [k]: Math.round(euros * 100) } });

  const setHeuresParM2 = (v: number) =>
    onChange({ ...projet, prix: { ...projet.prix, heuresParM2: v } });

  const setTva = (v: number) =>
    onChange({ ...projet, prix: { ...projet.prix, tauxTvaPct: v } });

  const c = projet.toiture.couverture;

  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <fieldset>
        <legend>Bâtiment</legend>
        <Nombre label="Longueur (m)" value={projet.batiment.longueurM} step={0.5} onChange={(v) => setBat("longueurM", v)} />
        <Nombre label="Largeur / portée (m)" value={projet.batiment.largeurM} step={0.5} onChange={(v) => setBat("largeurM", v)} />
        <Nombre label="Débord rampant (m)" value={projet.batiment.debordRampantM} step={0.05} onChange={(v) => setBat("debordRampantM", v)} />
        <Nombre label="Débord pignon (m)" value={projet.batiment.debordPignonM} step={0.05} onChange={(v) => setBat("debordPignonM", v)} />
      </fieldset>

      <fieldset>
        <legend>Toiture</legend>
        <Select
          label="Type de toiture"
          value={projet.toiture.typologie}
          options={[
            ["deux_pans", "Deux pans"],
            ["appentis", "Appentis (1 pan)"],
            ["croupe", "Croupe (4 pans)"],
          ]}
          onChange={setTypologie}
        />
        <Nombre label="Pente (°)" value={projet.toiture.penteDeg} step={1} onChange={setPente} />
        <Select
          label="Couverture"
          value={c.type}
          options={[
            ["tuile_mecanique", "Tuile mécanique"],
            ["tuile_plate", "Tuile plate"],
            ["ardoise", "Ardoise"],
            ["bac_acier", "Bac acier"],
          ]}
          onChange={setCouvertureType}
        />
        <Nombre label="Pureau (m)" value={c.pureauM} step={0.01} onChange={(v) => setCouv("pureauM", v)} />
        <Nombre label="Poids couverture (kg/m²)" value={c.poidsKgM2} step={1} onChange={(v) => setCouv("poidsKgM2", v)} />
        <Select
          label="Zone neige"
          value={projet.charges.zoneNeige ?? "A1"}
          options={[
            ["A1", "A1"], ["A2", "A2"], ["B1", "B1"], ["B2", "B2"],
            ["C1", "C1"], ["C2", "C2"], ["D", "D"], ["E", "E"],
          ]}
          onChange={(z) => setNeige(z, projet.charges.altitudeM ?? 0)}
        />
        <Nombre
          label="Altitude (m)"
          value={projet.charges.altitudeM ?? 0}
          step={50}
          onChange={(a) => setNeige(projet.charges.zoneNeige ?? "A1", a)}
        />
        <div className="champ">
          <span>Charge neige (auto)</span>
          <strong>{projet.charges.neigeKNm2.toLocaleString("fr-FR")} kN/m²</strong>
        </div>
      </fieldset>

      <fieldset>
        <legend>Charpente</legend>
        <Nombre label="Entraxe chevrons (m)" value={projet.charpente.entraxeChevronM} step={0.05} onChange={(v) => setCharp("entraxeChevronM", v)} />
        <Nombre label="Entraxe fermes (m)" value={projet.charpente.entraxeFermeM} step={0.1} onChange={(v) => setCharp("entraxeFermeM", v)} />
        <Case label="Écran sous-toiture (contre-liteaux)" checked={projet.charpente.ecranSousToiture} onChange={(v) => setCharp("ecranSousToiture", v)} />
      </fieldset>

      <fieldset>
        <legend>Tarifs &amp; bois</legend>
        <Select label="Classe bois" value={projet.essence.classe} options={[["C18", "C18"], ["C24", "C24"], ["C30", "C30"]]} onChange={setClasse} />
        <Nombre label="Prix bois (€/m³)" value={projet.essence.prixM3Cents / 100} step={10} onChange={setPrixM3Euros} />
        <Nombre label="Couverture (€/m²)" value={projet.prix.couvertureM2Cents / 100} step={1} onChange={(v) => setPrix("couvertureM2Cents", v)} />
        <Nombre label="Main-d'œuvre (€/h)" value={projet.prix.mainOeuvreHeureCents / 100} step={1} onChange={(v) => setPrix("mainOeuvreHeureCents", v)} />
        <Nombre label="Main-d'œuvre (h/m²)" value={projet.prix.heuresParM2} step={0.1} onChange={setHeuresParM2} />
        <Select label="TVA (%)" value={String(projet.prix.tauxTvaPct)} options={[["10", "10 % (rénovation)"], ["20", "20 % (neuf)"]]} onChange={(v) => setTva(Number(v))} />
      </fieldset>
    </form>
  );
}

/* ---------- petits composants de champ ---------- */

function Nombre(props: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="champ">
      <span>{props.label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(props.value) ? props.value : 0}
        step={props.step ?? 1}
        onChange={(e) => {
          const v = Number(e.target.value);
          props.onChange(Number.isNaN(v) ? 0 : v);
        }}
      />
    </label>
  );
}

function Case(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="champ champ-case">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

function Select(props: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <label className="champ">
      <span>{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map(([val, lib]) => (
          <option key={val} value={val}>
            {lib}
          </option>
        ))}
      </select>
    </label>
  );
}

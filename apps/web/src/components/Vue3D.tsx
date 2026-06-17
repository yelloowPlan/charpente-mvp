import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Vector3, Quaternion, BufferGeometry, BufferAttribute, DoubleSide } from "three";
import type { Poutre3D, Pan3D, RolePoutre } from "@charpente/moteur";

const UP = new Vector3(0, 1, 0);

/** Teinte bois par rôle. */
const COULEURS: Record<RolePoutre, string> = {
  chevron: "#cda571",
  panne: "#b07c43",
  sabliere: "#b07c43",
  faitiere: "#9a6533",
  aretier: "#8a5a2b",
  noue: "#2f6f8f",
  entrait: "#8a5a2b",
  arbaletrier: "#8a5a2b",
  poincon: "#7d4f25",
  liteau: "#d8b98a",
};

function Poutre({ poutre }: { poutre: Poutre3D }) {
  const calc = useMemo(() => {
    const a = new Vector3(...poutre.a);
    const b = new Vector3(...poutre.b);
    const dir = new Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 1e-6) return null;
    dir.normalize();
    const q = new Quaternion().setFromUnitVectors(UP, dir);
    const mid = new Vector3().addVectors(a, b).multiplyScalar(0.5);
    return {
      position: [mid.x, mid.y, mid.z] as [number, number, number],
      quaternion: [q.x, q.y, q.z, q.w] as [number, number, number, number],
      args: [poutre.largeurMm / 1000, len, poutre.hauteurMm / 1000] as [number, number, number],
    };
  }, [poutre]);

  if (!calc) return null;
  return (
    <mesh position={calc.position} quaternion={calc.quaternion} castShadow receiveShadow>
      <boxGeometry args={calc.args} />
      <meshStandardMaterial color={COULEURS[poutre.role]} roughness={0.75} metalness={0.04} />
    </mesh>
  );
}

function Pan({ pan, couleur }: { pan: Pan3D; couleur: string }) {
  const geom = useMemo(() => {
    const g = new BufferGeometry();
    const verts = new Float32Array(pan.points.flat());
    g.setAttribute("position", new BufferAttribute(verts, 3));
    g.setIndex(pan.points.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]);
    g.computeVertexNormals();
    return g;
  }, [pan]);
  useEffect(() => () => geom.dispose(), [geom]);
  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshStandardMaterial color={couleur} side={DoubleSide} roughness={0.92} metalness={0.02} />
    </mesh>
  );
}

interface Props {
  poutres: Poutre3D[];
  lattage: Poutre3D[];
  pans: Pan3D[];
  couvertureCouleur: string;
  etape: number; // 1 = ossature, 2 = ossature + lattage, 3 = ossature + couverture (lattage masqué)
  largeurM: number;
  hauteurM: number;
  longueurM: number;
}

export default function Vue3D({
  poutres,
  lattage,
  pans,
  couvertureCouleur,
  etape,
  largeurM,
  hauteurM,
  longueurM,
}: Props) {
  const taille = Math.max(longueurM, largeurM, hauteurM, 1);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [taille * 1.15, taille * 0.95, taille * 1.4], fov: 40 }}
    >
      <color attach="background" args={["#f7f5f2"]} />
      <hemisphereLight args={["#ffffff", "#d9cfc2", 0.55]} />
      <directionalLight
        position={[taille, taille * 1.6, taille * 0.7]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <group>
        {poutres.map((p, i) => (
          <Poutre key={`o${i}`} poutre={p} />
        ))}
        {etape === 2 && lattage.map((p, i) => <Poutre key={`l${i}`} poutre={p} />)}
        {etape >= 3 && pans.map((pan, i) => <Pan key={`p${i}`} pan={pan} couleur={couvertureCouleur} />)}
      </group>
      <ContactShadows
        position={[0, -0.02, 0]}
        opacity={0.35}
        scale={taille * 3}
        blur={2.4}
        far={taille * 1.2}
      />
      <OrbitControls
        enablePan={false}
        minDistance={taille * 0.6}
        maxDistance={taille * 4}
        target={[0, hauteurM / 2, 0]}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </Canvas>
  );
}

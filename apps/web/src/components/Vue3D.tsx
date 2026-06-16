import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { Vector3, Quaternion } from "three";
import type { Poutre3D, RolePoutre } from "@charpente/moteur";

const UP = new Vector3(0, 1, 0);

/** Teinte bois par rôle (structure plus foncée, couverture plus claire). */
const COULEURS: Record<RolePoutre, string> = {
  chevron: "#cda571",
  panne: "#b07c43",
  sabliere: "#b07c43",
  faitiere: "#9a6533",
  entrait: "#8a5a2b",
  arbaletrier: "#8a5a2b",
  poincon: "#7d4f25",
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

interface Props {
  poutres: Poutre3D[];
  largeurM: number;
  hauteurM: number;
  longueurM: number;
}

export default function Vue3D({ poutres, largeurM, hauteurM, longueurM }: Props) {
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
          <Poutre key={i} poutre={p} />
        ))}
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

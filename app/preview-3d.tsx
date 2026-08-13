"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { ACCESSORY_COLORS, STONE_COLORS } from "./bead-colors";
import { anglesForWidths } from "./catalog";

export type PreviewPiece = { mm: number; src: string | null; metal: "gold" | "silver"; isCharm: boolean; id: string; kind: "stone" | "accessory" };

// Real WebGL 3D preview: physically-shaded spheres, not the flat top-down
// product photos. A photo mapped onto a sphere would expose the drill hole
// every real strung bead has through its centre (and wouldn't wrap
// correctly around a sphere anyway) — PBR shading with a colour sampled
// from the photo sidesteps both problems entirely, since there's no photo
// on the geometry at all.
//
// Stones whose real mineral character is translucent/transparent get a
// glass-like transmission material; this is judged by mineralogy (a lookup),
// not by the sampled photo colour, which can't tell translucent from opaque
// on its own.
const TRANSLUCENT_STONES = new Set(["clear", "amethyst", "citrine", "rose", "aqua", "smoky", "fluorite", "moon"]);

// World units per physical millimetre — chosen so a typical 14cm-wrist
// strand (~140mm circumference) renders at a comfortable viewing radius.
const UNITS_PER_MM = 0.016;
const CHARM_ORBIT_OFFSET_MM = 5;

function Bead({ piece, angle, radiusUnits }: { piece: PreviewPiece; angle: number; radiusUnits: number }) {
  const orbit = piece.isCharm ? radiusUnits + CHARM_ORBIT_OFFSET_MM * UNITS_PER_MM : radiusUnits;
  const x = Math.cos(angle) * orbit;
  const z = Math.sin(angle) * orbit;
  const sizeUnits = Math.max(piece.mm * UNITS_PER_MM, 0.03);

  const material = useMemo(() => {
    if (piece.kind === "accessory") {
      const color = ACCESSORY_COLORS[piece.id] ?? (piece.metal === "gold" ? "#d8b25a" : "#c9ced0");
      return new THREE.MeshPhysicalMaterial({ color, metalness: 0.92, roughness: 0.22, clearcoat: 0.4, clearcoatRoughness: 0.25 });
    }
    const color = STONE_COLORS[piece.id] ?? "#a8a8a8";
    if (TRANSLUCENT_STONES.has(piece.id)) {
      return new THREE.MeshPhysicalMaterial({
        color, roughness: 0.05, transmission: 0.88, thickness: sizeUnits * 3, ior: 1.54,
        clearcoat: 1, clearcoatRoughness: 0.08, attenuationColor: new THREE.Color(color), attenuationDistance: 0.4,
      });
    }
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, metalness: 0.05, clearcoat: 0.65, clearcoatRoughness: 0.18 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.id, piece.kind, piece.metal, sizeUnits]);

  return <mesh position={[x, piece.isCharm ? -sizeUnits * 0.6 : 0, z]} material={material} castShadow receiveShadow>
    <sphereGeometry args={[sizeUnits / 2, 48, 48]} />
  </mesh>;
}

// A hand-built environment out of a few flat, hard-edged emissive panels
// reflects those hard edges straight onto every glossy sphere as visible
// stripes — that's exactly the artifact this produced on the first pass.
// A smoothly-varying gradient has no edges to reflect, so it can't do that;
// generated on a <canvas> (no HDRI fetch, self-contained on a static site).
function useGradientEnvTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    const vertical = ctx.createLinearGradient(0, 0, 0, canvas.height);
    vertical.addColorStop(0, "#fffaf0");
    vertical.addColorStop(0.4, "#f7f0e4");
    vertical.addColorStop(0.7, "#e7ddcf");
    vertical.addColorStop(1, "#cfc4b4");
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // A soft, blurred key-light glow — a radial gradient has no hard edge,
    // so it can't produce the stripe artifact a flat panel does.
    const glow = ctx.createRadialGradient(46, 7, 0, 46, 7, 16);
    glow.addColorStop(0, "rgba(255,255,255,0.85)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function StudioEnvironment() {
  const map = useGradientEnvTexture();
  return <Environment map={map} resolution={128} />;
}

function Scene({ pieces, capacityMM }: { pieces: PreviewPiece[]; capacityMM: number }) {
  const angles = useMemo(() => anglesForWidths(pieces.map((p) => p.mm), capacityMM), [pieces, capacityMM]);
  const radiusUnits = (capacityMM / (Math.PI * 2)) * UNITS_PER_MM;
  // No visible connecting cord: every bead centre sits on the same radius,
  // but bead sizes vary a lot (5mm spacers next to 20mm focals), so no
  // single cord radius clears every sphere's volume without either piercing
  // the largest beads or reading as a disconnected ring floating well
  // inside the smallest ones. A tightly-strung real bracelet hides its
  // elastic almost entirely anyway — omitting it is the more honest result,
  // not a shortcut.
  //
  // No ground-plane contact shadow either, for the same kind of reason:
  // this preview orbits freely in every direction, so there's no fixed
  // "resting surface" a shadow could sit on — an invisible shadow-catcher
  // plane low enough to stay hidden at the default angle became a visible
  // floating grey smear once the camera tilted enough to look down into the
  // ring's open centre. The beads' own castShadow/receiveShadow already
  // give believable contact shadows at their touch points, and that holds
  // up from any angle since it isn't anchored to an invisible floor.
  return <>
    <StudioEnvironment />
    <ambientLight intensity={0.35} />
    <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[-3, 2, -4]} intensity={0.35} />
    {pieces.map((p, i) => <Bead key={i} piece={p} angle={angles[i]} radiusUnits={radiusUnits} />)}
    <OrbitControls enablePan={false} minDistance={radiusUnits * 1.4} maxDistance={radiusUnits * 6} minPolarAngle={Math.PI * 0.15} maxPolarAngle={Math.PI * 0.82} />
  </>;
}

export default function Preview3D({ pieces, capacityMM, onClose }: { pieces: PreviewPiece[]; capacityMM: number; onClose: () => void }) {
  const radiusUnits = (capacityMM / (Math.PI * 2)) * UNITS_PER_MM;
  return <div className="preview-overlay" role="dialog" aria-label="360 度立體預覽">
    <div className="pv-head"><b>360° PREVIEW</b><span>拖曳旋轉 · 滾輪縮放</span><button className="pv-close" onClick={onClose} aria-label="關閉預覽">✕</button></div>
    <div className="pv-canvas" style={{ position: "relative" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [radiusUnits * 0.2, radiusUnits * 1.5, radiusUnits * 2.6], fov: 35 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Scene pieces={pieces} capacityMM={capacityMM} />
      </Canvas>
    </div>
    <div className="pv-hint">拖曳旋轉 · 滾輪或雙指縮放</div>
  </div>;
}

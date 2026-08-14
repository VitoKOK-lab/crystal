"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
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

// Every stone gets an AI-generated seamless albedo texture wrapped around
// the sphere — a texture map with the lighting deliberately flat, so the 3D
// engine's own lights and reflections stay free to move as the bead
// rotates. This is distinct from the shop's product PHOTOS, which have
// baked lighting and would break under rotation. Flat PBR colour alone made
// every bead read as a plastic candy ball; real mineral character (silk
// banding, pyrite flecks, dendritic moss, colour zoning) lives in these
// maps. Textures live under public/materials/textures/, one per stone id.
const STONE_TEXTURES: Record<string, string> = Object.fromEntries([
  "obsidian", "tiger-eye", "hematite", "smoky", "lava", "goldstone", "rose",
  "clear", "amethyst", "citrine", "aqua", "tourmaline", "sunstone", "moon",
  "moss", "lapis", "garnet", "tiger", "fluorite", "rhodonite", "labradorite",
].map((id) => [id, `/materials/textures/${id}.png`]));

// World units per physical millimetre — chosen so a typical 14cm-wrist
// strand (~140mm circumference) renders at a comfortable viewing radius.
const UNITS_PER_MM = 0.016;
const CHARM_ORBIT_OFFSET_MM = 5;

function beadPlacement(piece: PreviewPiece, angle: number, radiusUnits: number) {
  const orbit = piece.isCharm ? radiusUnits + CHARM_ORBIT_OFFSET_MM * UNITS_PER_MM : radiusUnits;
  const sizeUnits = Math.max(piece.mm * UNITS_PER_MM, 0.03);
  return {
    position: [Math.cos(angle) * orbit, piece.isCharm ? -sizeUnits * 0.6 : 0, Math.sin(angle) * orbit] as [number, number, number],
    sizeUnits,
  };
}

// Textured variant is a separate component because useLoader cannot be
// called conditionally inside the shared one.
function TexturedStoneBead({ piece, angle, radiusUnits, textureUrl }: { piece: PreviewPiece; angle: number; radiusUnits: number; textureUrl: string }) {
  const { position, sizeUnits } = beadPlacement(piece, angle, radiusUnits);
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  // Each bead gets its own deterministic orientation so two beads of the
  // same stone never show the identical face (no Math.random — re-renders
  // must not reshuffle the strand).
  const quaternion = useMemo(() => {
    const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
    const poleToTangent = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    const roll = new THREE.Quaternion().setFromAxisAngle(tangent, angle * 7.313);
    return roll.multiply(poleToTangent);
  }, [angle]);
  const material = useMemo(() => {
    const map = texture.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;
    // The texture carries the stone's true colour; keep the base white so it
    // isn't tinted twice, and let clearcoat supply the polish. The quartz
    // family keeps a milky translucency underneath its texture — that depth
    // is what separates crystal from painted ceramic.
    const translucent = TRANSLUCENT_STONES.has(piece.id);
    const mat = new THREE.MeshPhysicalMaterial({
      map, color: "#ffffff", roughness: translucent ? 0.14 : 0.22, metalness: 0.02,
      clearcoat: translucent ? 1 : 0.8, clearcoatRoughness: 0.12,
      ...(translucent ? { transmission: 0.3, thickness: sizeUnits * 2, ior: 1.54 } : {}),
    });
    // Sphere UVs pinch any texture into a starburst at the two poles, and on
    // a strand some pole always ends up on some bead's visible silhouette.
    // Replace the UV lookup with object-space triplanar projection: the
    // texture is blended from three axis-aligned projections, so there are
    // no poles and no seams from any viewing angle, and because it uses
    // object space the pattern stays glued to the bead as it rotates.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTriScale = { value: 1 / sizeUnits };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTriPos = position;\nvTriNormal = normal;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNormal;\nuniform float uTriScale;")
        .replace("#include <map_fragment>", `
          vec3 triW = pow(abs(normalize(vTriNormal)), vec3(4.0));
          triW /= (triW.x + triW.y + triW.z);
          vec4 triX = texture2D(map, vTriPos.yz * uTriScale + 0.5);
          vec4 triY = texture2D(map, vTriPos.zx * uTriScale + 0.5);
          vec4 triZ = texture2D(map, vTriPos.xy * uTriScale + 0.5);
          diffuseColor *= triX * triW.x + triY * triW.y + triZ * triW.z;
        `);
    };
    // All beads share one shader program; only the uniforms differ.
    mat.customProgramCacheKey = () => "triplanar-bead";
    return mat;
  }, [texture, sizeUnits, piece.id]);
  return <mesh position={position} quaternion={quaternion} material={material} castShadow receiveShadow>
    <sphereGeometry args={[sizeUnits / 2, 48, 48]} />
  </mesh>;
}

function Bead({ piece, angle, radiusUnits }: { piece: PreviewPiece; angle: number; radiusUnits: number }) {
  const { position, sizeUnits } = beadPlacement(piece, angle, radiusUnits);

  const material = useMemo(() => {
    if (piece.kind === "accessory") {
      const color = ACCESSORY_COLORS[piece.id] ?? (piece.metal === "gold" ? "#d8b25a" : "#c9ced0");
      return new THREE.MeshPhysicalMaterial({ color, metalness: 0.92, roughness: 0.22, clearcoat: 0.4, clearcoatRoughness: 0.25 });
    }
    const color = STONE_COLORS[piece.id] ?? "#a8a8a8";
    if (TRANSLUCENT_STONES.has(piece.id)) {
      // Milky-translucent, not window-glass: at transmission 0.88 the white
      // backdrop shone straight through and washed every quartz out to a
      // pale ghost (and moonstone picked up its neighbours' colours like a
      // lens). Real tumbled quartz scatters most of what enters it.
      return new THREE.MeshPhysicalMaterial({
        color, roughness: 0.16, transmission: 0.45, thickness: sizeUnits * 2, ior: 1.54,
        clearcoat: 1, clearcoatRoughness: 0.08, attenuationColor: new THREE.Color(color), attenuationDistance: 0.25,
      });
    }
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, metalness: 0.05, clearcoat: 0.65, clearcoatRoughness: 0.18 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece.id, piece.kind, piece.metal, sizeUnits]);

  return <mesh position={position} material={material} castShadow receiveShadow>
    <sphereGeometry args={[sizeUnits / 2, 48, 48]} />
  </mesh>;
}

function AnyBead(props: { piece: PreviewPiece; angle: number; radiusUnits: number }) {
  const textureUrl = props.piece.kind === "stone" ? STONE_TEXTURES[props.piece.id] : undefined;
  if (textureUrl) return <TexturedStoneBead {...props} textureUrl={textureUrl} />;
  return <Bead {...props} />;
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
  // Mirror the 2D studio's metaphor exactly: the full wrist-circumference
  // cord is always there as a complete ring, and beads occupy however much
  // of it the design has filled so far. The exposed cord along the unfilled
  // arc is the "you have room for more" affordance, same as the 2D ring —
  // an earlier version compressed the strand into a closed loop instead,
  // which read as a different bracelet size every time a bead was added.
  const angles = useMemo(() => anglesForWidths(pieces.map((p) => p.mm), capacityMM), [pieces, capacityMM]);
  const radiusUnits = (capacityMM / (Math.PI * 2)) * UNITS_PER_MM;
  // The cord threads bead CENTRES — through the drill holes, exactly like
  // the real elastic — so inside a bead it's hidden (or a faint shadow
  // inside the milkier quartzes, which real translucent beads show too),
  // and it surfaces only in the wedge gaps between beads and along the
  // whole unfilled arc. An early attempt looked broken not because of this
  // but because heavy transmission (0.88) made it a hard dark band through
  // every glassy bead; at the milky 0.45 the interior cord reads correctly.
  const cordRadius = Math.max(radiusUnits * 0.014, 0.008);
  //
  // No ground-plane contact shadow: this preview orbits freely in every
  // direction, so there's no fixed "resting surface" a shadow could sit on —
  // an invisible shadow-catcher plane became a visible floating grey smear
  // once the camera tilted enough to look down into the ring's open centre.
  // The beads' own castShadow/receiveShadow already give believable contact
  // shadows at their touch points, from any angle.
  return <>
    <StudioEnvironment />
    <ambientLight intensity={0.35} />
    <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[-3, 2, -4]} intensity={0.35} />
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radiusUnits, cordRadius, 12, 128]} />
      <meshStandardMaterial color="#b8ab93" roughness={0.7} metalness={0.05} />
    </mesh>
    {/* Suspense inside the Canvas so a texture still fetching leaves the
        rest of the strand visible instead of blanking the whole overlay. */}
    <Suspense fallback={null}>
      {pieces.map((p, i) => <AnyBead key={i} piece={p} angle={angles[i]} radiusUnits={radiusUnits} />)}
    </Suspense>
    <OrbitControls enablePan={false} minDistance={frameRadius(pieces, capacityMM) * 1.2} maxDistance={frameRadius(pieces, capacityMM) * 8} minPolarAngle={Math.PI * 0.15} maxPolarAngle={Math.PI * 0.82} />
  </>;
}

// The visual outer edge of the piece: ring radius plus the largest bead's
// radius. Framing on the ring radius alone crops the beads themselves out of
// frame, where a 20mm focal bead is a large fraction of the ring radius.
function frameRadius(pieces: PreviewPiece[], capacityMM: number) {
  const ring = (capacityMM / (Math.PI * 2)) * UNITS_PER_MM;
  const maxBead = Math.max(...pieces.map((p) => Math.max(p.mm * UNITS_PER_MM, 0.03)), 0.03) / 2;
  return ring + maxBead;
}

export default function Preview3D({ pieces, capacityMM, onClose }: { pieces: PreviewPiece[]; capacityMM: number; onClose: () => void }) {
  const R = frameRadius(pieces, capacityMM);
  return <div className="preview-overlay" role="dialog" aria-label="360 度立體預覽">
    <div className="pv-head"><b>360° PREVIEW</b><span>拖曳旋轉 · 滾輪縮放</span><button className="pv-close" onClick={onClose} aria-label="關閉預覽">✕</button></div>
    <div className="pv-canvas" style={{ position: "relative" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [R * 0.25, R * 1.7, R * 3.1], fov: 35 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Scene pieces={pieces} capacityMM={capacityMM} />
      </Canvas>
    </div>
    <div className="pv-hint">拖曳旋轉 · 滾輪或雙指縮放</div>
  </div>;
}

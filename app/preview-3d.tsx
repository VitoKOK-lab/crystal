"use client";

import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from "react";
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
// Accessories occupy only 3-5mm of cord but their bodies draw wider, same
// as the 2D studio's sprites: display sizes, not cord footprints. Matched
// to the 2D studio's proportions (spacer ≈ 0.55×, charm ≈ 0.74× of a 20mm
// focal stone) so a piece reads the same in both previews.
const SPACER_DISPLAY_MM = 11;
const CHARM_DISPLAY_MM = 14.5;

function beadPlacement(piece: PreviewPiece, angle: number, radiusUnits: number) {
  const sizeUnits = Math.max(piece.mm * UNITS_PER_MM, 0.03);
  return {
    position: [Math.cos(angle) * radiusUnits, 0, Math.sin(angle) * radiusUnits] as [number, number, number],
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

// Accessories (charms, spacers, figurine beads) are flat product cutouts,
// not spheres — mapping their photo onto a ball made every compass a gold
// marble. Render each as its transparent cutout on a plane that yaw-follows
// the camera (Y-axis billboard): it stays upright like a real hanging piece
// instead of tilting when the camera looks down, and the polar-angle limits
// mean it's never seen edge-on. Charms hang below their cord point with the
// bail overlapping the cord; spacers sit centred on the cord like beads.
function AccessoryPiece({ piece, angle, radiusUnits, cordRadius }: { piece: PreviewPiece; angle: number; radiusUnits: number; cordRadius: number }) {
  const texture = useLoader(THREE.TextureLoader, piece.src as string);
  const map = useMemo(() => {
    const t = texture.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [texture]);
  const side = (piece.isCharm ? CHARM_DISPLAY_MM : SPACER_DISPLAY_MM) * UNITS_PER_MM;
  const x = Math.cos(angle) * radiusUnits;
  const z = Math.sin(angle) * radiusUnits;
  // Charm photos are canonical: bail ring at the top edge. Hang the plane so
  // the bail sits on the cord (slight overlap reads as threaded).
  const y = piece.isCharm ? -side / 2 + side * 0.13 : 0;
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const g = groupRef.current;
    if (g) g.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z);
  });
  return <group ref={groupRef} position={[x, y, z]}>
    {/* Nudged toward the camera so the cord's front half doesn't slice
        through the opaque part of the photo. */}
    <mesh position={[0, 0, cordRadius * 1.6 + 0.002]}>
      <planeGeometry args={[side, side]} />
      {/* Basic material: the photo's lighting is already baked in; letting
          scene lights re-light it would double-shade the metal. */}
      <meshBasicMaterial map={map} transparent alphaTest={0.08} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  </group>;
}

function AnyBead(props: { piece: PreviewPiece; angle: number; radiusUnits: number; cordRadius: number }) {
  if (props.piece.kind === "accessory" && props.piece.src) return <AccessoryPiece {...props} />;
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

// Place the camera so the ring's diameter spans ~60% of the viewport's
// SMALLER dimension. The old fixed-distance camera was tuned on a landscape
// desktop window; on a portrait phone the horizontal field of view is far
// narrower, so the same distance overflowed the ring off both edges.
const CAMERA_FOV = 35;
const FRAME_FRACTION = 0.6;
// Showcase angle: the camera looks down at 45° (y equals the horizontal
// magnitude), the angle a bracelet is naturally admired at on a tray.
const CAMERA_DIR = new THREE.Vector3(0.25, Math.hypot(0.25, 3.1), 3.1).normalize();
const DEFAULT_POLAR = Math.PI / 4;

function fitDistance(R: number, width: number, height: number) {
  const tanV = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const tanEff = Math.min(tanV, tanV * (width / Math.max(height, 1)));
  return R / (FRAME_FRACTION * tanEff);
}

function CameraRig({ R }: { R: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    const d = fitDistance(R, size.width, size.height);
    camera.position.copy(CAMERA_DIR.clone().multiplyScalar(d));
    camera.lookAt(0, 0, 0);
  }, [camera, R, size.width, size.height]);
  return null;
}

// Showcase turntable: the piece spins on its own at the 45° angle; the
// customer can grab it any time, and on release it glides back to the
// default tilt and framing and resumes spinning. Azimuth is left wherever
// the customer put it — rewinding the spin would look like a glitch.
function ShowcaseControls({ R }: { R: number }) {
  const size = useThree((s) => s.size);
  const fitD = fitDistance(R, size.width, size.height);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const modeRef = useRef<"auto" | "user" | "returning">("auto");
  const releasedAt = useRef<number>(0);
  // Wired straight on the controls instance — the drei component's
  // onStart/onEnd props silently dropped these events in testing.
  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    const onStart = () => { modeRef.current = "user"; releasedAt.current = 0; };
    const onEnd = () => { releasedAt.current = performance.now(); };
    c.addEventListener("start", onStart);
    c.addEventListener("end", onEnd);
    return () => { c.removeEventListener("start", onStart); c.removeEventListener("end", onEnd); };
  }, []);
  // The camera is driven directly every frame the customer isn't holding
  // it: azimuth advances at showcase speed while tilt and distance glide
  // exponentially back to the default framing. OrbitControls' built-in
  // autoRotate is NOT used — combined with external camera writes it
  // produced a slow diagonal drift (its internal spherical state fighting
  // ours), so there is exactly one writer per mode.
  useFrame((_, delta) => {
    const c = controlsRef.current;
    if (!c) return;
    if (modeRef.current === "user") {
      if (releasedAt.current && performance.now() - releasedAt.current > 600) modeRef.current = "auto";
      return;
    }
    const cam = c.object;
    const offset = new THREE.Vector3().subVectors(cam.position, c.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    // Frame-rate-independent exponential glide (~1s settle).
    const k = 1 - Math.pow(0.002, delta);
    sph.phi += (DEFAULT_POLAR - sph.phi) * k;
    sph.radius += (fitD - sph.radius) * k;
    sph.theta -= 0.25 * delta; // ~25s per revolution
    cam.position.setFromSpherical(sph).add(c.target);
    cam.lookAt(c.target);
  });
  return <OrbitControls
    ref={controlsRef}
    enablePan={false}
    // drei enables damping by default; its inertia keeps applying decaying
    // rotation after release, fighting the showcase driver above.
    enableDamping={false}
    minDistance={R * 1.2}
    maxDistance={fitD * 2.2}
    // Never let the camera dip below the bracelet's plane: seen from
    // underneath, hanging charms read as upside-down and the strand
    // projects onto itself — the "broken" view. 0.2π–0.55π keeps every
    // reachable angle a presentable one.
    minPolarAngle={Math.PI * 0.2}
    maxPolarAngle={Math.PI * 0.55}
  />;
}

function Scene({ pieces, capacityMM }: { pieces: PreviewPiece[]; capacityMM: number }) {
  // Mirror the 2D studio's metaphor exactly: the full wrist-circumference
  // cord is always there as a complete ring, and beads occupy however much
  // of it the design has filled so far. The exposed cord along the unfilled
  // arc is the "you have room for more" affordance, same as the 2D ring —
  // an earlier version compressed the strand into a closed loop instead,
  // which read as a different bracelet size every time a bead was added.
  const angles = useMemo(() => anglesForWidths(pieces.map((p) => p.mm), capacityMM), [pieces, capacityMM]);
  // Same display-only charm fan as the 2D stage: consecutive charms occupy
  // 3mm of cord each but draw ~13mm wide, so an unfanned run is a single
  // indistinguishable pile. True mm positions are untouched.
  const displayAngles = useMemo(() => {
    const out = [...angles];
    const FAN_STEP = 0.15;
    let runStart = -1;
    for (let i = 0; i <= pieces.length; i++) {
      const inRun = i < pieces.length && pieces[i].isCharm;
      if (inRun && runStart < 0) runStart = i;
      if (!inRun && runStart >= 0) {
        const len = i - runStart;
        if (len > 1) {
          const centre = (out[runStart] + out[i - 1]) / 2;
          for (let j = 0; j < len; j++) out[runStart + j] = centre + (j - (len - 1) / 2) * FAN_STEP;
        }
        runStart = -1;
      }
    }
    return out;
  }, [angles, pieces]);
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
      {pieces.map((p, i) => <AnyBead key={i} piece={p} angle={displayAngles[i]} radiusUnits={radiusUnits} cordRadius={cordRadius} />)}
    </Suspense>
    <CameraRig R={frameRadius(pieces, capacityMM)} />
    <ShowcaseControls R={frameRadius(pieces, capacityMM)} />
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
        camera={{ position: [R * 0.25, R * 1.7, R * 3.1], fov: CAMERA_FOV }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Scene pieces={pieces} capacityMM={capacityMM} />
      </Canvas>
    </div>
    <div className="pv-hint">拖曳旋轉 · 滾輪或雙指縮放</div>
  </div>;
}

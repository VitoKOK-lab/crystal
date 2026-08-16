"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef, type CSSProperties } from "react";
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
// 切面 stones render as real faceted polyhedra (coarse sphere + flat
// shading = diamond-cut facet rows), matching their 2D product photos —
// a smooth ball under a dark texture just read as a plain marble.
const FACETED_STONES = new Set(["obsidian", "tiger-eye", "hematite", "goldstone"]);
// Porous matte stones: no lacquer-gloss clearcoat, high roughness.
const MATTE_STONES = new Set(["lava"]);

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
    const faceted = FACETED_STONES.has(piece.id);
    const matte = MATTE_STONES.has(piece.id);
    const mat = new THREE.MeshPhysicalMaterial({
      map, color: "#ffffff",
      roughness: matte ? 0.78 : translucent ? 0.14 : faceted ? 0.16 : 0.22,
      metalness: piece.id === "hematite" ? 0.55 : 0.02,
      clearcoat: matte ? 0.05 : translucent ? 1 : 0.8, clearcoatRoughness: matte ? 0.6 : 0.12,
      // Flat shading turns the coarse facet geometry into crisp mirror
      // planes — each facet catches its own highlight, like a real cut.
      flatShading: faceted,
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
  // Faceted stones use a deliberately coarse sphere: with flat shading,
  // its quad rows read exactly like the 64-facet diamond cut of the
  // product photos. Smooth stones keep the fine mesh.
  const segments: [number, number] = FACETED_STONES.has(piece.id) ? [14, 10] : [48, 48];
  return <mesh position={position} quaternion={quaternion} material={material} castShadow receiveShadow>
    <sphereGeometry args={[sizeUnits / 2, segments[0], segments[1]]} />
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
// marble. Render each as its transparent cutout on a camera-facing plane,
// ROLLED so its orientation follows the strand's circle exactly like the
// 2D studio: a spacer's top edge points radially outward, a charm's bail
// points at the ring's centre with its body extending outward past the
// cord. As the showcase spins, every accessory turns with the circle
// instead of standing upright like a sticker.
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();

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
  // A charm dangles from its jump ring: gravity decides where it points,
  // so it hangs straight down from its cord point wherever it sits on the
  // ring (matching the 2D stage). Its photo is shot bail-up, so hanging
  // means no in-plane roll at all — just drop it half a body so the bail
  // still meets the cord. Spacers are threaded ON the cord, and their
  // photos are shot with the drill axis vertical, so those roll to follow
  // the TANGENT — a ridged cylinder must lie along the strand, not across
  // it.
  const y = piece.isCharm ? -side / 2 + side * 0.13 : 0;
  const tangent = useMemo(() => new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)), [angle]);
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const g = groupRef.current;
    if (!g) return;
    g.quaternion.copy(camera.quaternion);
    if (piece.isCharm) return; // camera-facing and upright: it hangs
    // Spacers: roll in-plane so the sprite's up-axis tracks the screen
    // projection of the cord's tangent.
    _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    g.rotateZ(Math.atan2(-tangent.dot(_camRight), tangent.dot(_camUp)));
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
    // Spin resumes the instant the customer lets go (mode flips on "end");
    // only the glide back to the default framing waits briefly, so a wheel
    // zoom in progress isn't yanked back between ticks.
    const onStart = () => { modeRef.current = "user"; releasedAt.current = 0; };
    const onEnd = () => { modeRef.current = "auto"; releasedAt.current = performance.now(); };
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
    if (modeRef.current === "user") return;
    const cam = c.object;
    const offset = new THREE.Vector3().subVectors(cam.position, c.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    // Tilt/zoom glide back to the default framing after a short beat
    // (immediate glide would fight a wheel zoom between its ticks);
    // frame-rate-independent exponential settle (~1s).
    if (!releasedAt.current || performance.now() - releasedAt.current > 400) {
      const k = 1 - Math.pow(0.002, delta);
      sph.phi += (DEFAULT_POLAR - sph.phi) * k;
      sph.radius += (fitD - sph.radius) * k;
    }
    sph.theta -= 0.25 * delta; // ~25s per revolution — never pauses
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
  // Soft grounding shadow just below the piece's lowest point. This was
  // once removed because the freely-orbiting camera could dive under the
  // ring and see the shadow plane as a floating smear — but the showcase
  // controls now clamp the camera above the bracelet's plane, so the
  // "resting on a surface" reading always holds.
  const floorY = useMemo(() => {
    let drop = 0.03;
    for (const p of pieces) {
      if (p.kind === "accessory" && p.src) {
        const side = (p.isCharm ? CHARM_DISPLAY_MM : SPACER_DISPLAY_MM) * UNITS_PER_MM;
        drop = Math.max(drop, p.isCharm ? side * 0.87 : side / 2);
      } else {
        drop = Math.max(drop, Math.max(p.mm * UNITS_PER_MM, 0.03) / 2);
      }
    }
    return -(drop + 0.025);
  }, [pieces]);
  return <>
    <StudioEnvironment />
    <ambientLight intensity={0.35} />
    <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[-3, 2, -4]} intensity={0.35} />
    <ContactShadows position={[0, floorY, 0]} opacity={0.3} scale={frameRadius(pieces, capacityMM) * 3.4} blur={2.7} far={Math.abs(floorY) + 0.45} resolution={512} color="#5c4a33" />
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

// Backdrop palettes per dominant energy: same luxury lightness structure,
// hue shifted toward the energy's brand color (catalog ENERGY_META), kept
// pale and desaturated so the stones stay the heroes. Wealth = the
// original champagne, and the CSS fallback when no energy is passed.
const PV_PALETTES: Record<string, Record<string, string>> = {
  wealth: { "--pv-glow": "#fffdf8", "--pv-hi": "#f7f3ea", "--pv-top": "#f4efe6", "--pv-mid": "#ece5d8", "--pv-low": "#ddd2c0", "--pv-floor": "#cfc2ac", "--pv-band": "#b9a88e33", "--pv-pool": "#fff8ea59", "--pv-mark": "#8a6d1f55" },
  love: { "--pv-glow": "#fffafb", "--pv-hi": "#f9f0f2", "--pv-top": "#f7edef", "--pv-mid": "#f0dfe3", "--pv-low": "#e3c9d0", "--pv-floor": "#d5b6bf", "--pv-band": "#c096a233", "--pv-pool": "#fff0f459", "--pv-mark": "#a4626f55" },
  healing: { "--pv-glow": "#fbfdf9", "--pv-hi": "#f2f6ef", "--pv-top": "#eef3ea", "--pv-mid": "#e1eadd", "--pv-low": "#c9d8c4", "--pv-floor": "#b4c7af", "--pv-band": "#93ab8e33", "--pv-pool": "#f2fbef59", "--pv-mark": "#4f7a5e55" },
  protection: { "--pv-glow": "#fbfcfd", "--pv-hi": "#f1f3f6", "--pv-top": "#edf0f4", "--pv-mid": "#e0e5eb", "--pv-low": "#c6cfd9", "--pv-floor": "#b0bcc9", "--pv-band": "#8fa0b233", "--pv-pool": "#f3f8fd59", "--pv-mark": "#4e5f7255" },
  focus: { "--pv-glow": "#fafdfe", "--pv-hi": "#eff5f7", "--pv-top": "#ebf2f4", "--pv-mid": "#dde9ec", "--pv-low": "#c2d5da", "--pv-floor": "#aac3ca", "--pv-band": "#87a7b033", "--pv-pool": "#effbfd59", "--pv-mark": "#3f6f7b55" },
  power: { "--pv-glow": "#fffbf6", "--pv-hi": "#f7f0e7", "--pv-top": "#f4ece1", "--pv-mid": "#ecddcc", "--pv-low": "#dcc3a8", "--pv-floor": "#caa98a", "--pv-band": "#b0885f33", "--pv-pool": "#fff0dd59", "--pv-mark": "#8f5a2e55" },
};

export default function Preview3D({ pieces, capacityMM, onClose, energy }: { pieces: PreviewPiece[]; capacityMM: number; onClose: () => void; energy?: string }) {
  const R = frameRadius(pieces, capacityMM);
  return <div className="preview-overlay" style={PV_PALETTES[energy ?? ""] as CSSProperties} role="dialog" aria-label="360 度立體預覽">
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

"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import type { JerseyDesign } from "@/lib/jersey-art";
import { jerseySvg } from "@/lib/jersey-art";
import { drawJerseyCanvas, fabricNormalCanvas, silhouetteExtents, supportsWebGL, type Personalisation } from "./textures";

const W = 4;
const H = 5;
const SX = 110;
const SY = 140;

/**
 * Builds one garment panel. Depth at each vertex comes from the row's silhouette width so the
 * front (+z) and back (−z) panels meet exactly at the garment edge, forming a closed shirt.
 */
function panelGeometry(ext: { l: number; r: number }[], raw: { l: number; r: number }[], side: 1 | -1) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  // Torso half-width measured near the hem (rows 70–90%), used for the body's rounded profile.
  const torsoRows = raw.slice(Math.floor(SY * 0.7), Math.floor(SY * 0.9));
  const torsoHW = torsoRows.reduce((acc, e) => acc + (e.r - e.l) / 2, 0) / Math.max(1, torsoRows.length);
  for (let j = 0; j <= SY; j++) {
    const t = j / SY;
    const e = ext[j];
    const cx = (e.l + e.r) / 2;
    const depth = 0.44 * (t < 0.12 ? 0.6 + t * 3.3 : 1);
    for (let i = 0; i <= SX; i++) {
      const u = i / SX;
      const dx = Math.abs(u - cx);
      const edge = Math.min(u - raw[j].l, raw[j].r - u);
      let z = 0;
      if (edge > 0) {
        const s = Math.min(1, dx / (torsoHW * 1.12));
        const body = depth * Math.pow(1 - s * s, 0.5);
        // Sleeves: taper from the shoulder value to closed at the sleeve tip.
        const sleeveSpan = Math.max(0.0001, Math.min(u - raw[j].l, raw[j].r - u) / Math.max(0.0001, (raw[j].r - raw[j].l) / 2 - torsoHW));
        const sleeve = dx > torsoHW ? depth * 0.42 * Math.min(1, sleeveSpan) : body;
        z = Math.max(body, dx > torsoHW ? sleeve : 0);
        z *= Math.sqrt(Math.min(1, edge / 0.03));
      }
      positions.push((u - 0.5) * W, (0.5 - t) * H, side * z);
      // Back panel is mirrored so its artwork reads correctly when seen from behind.
      uvs.push(side === 1 ? u : 1 - u, 1 - t);
    }
  }
  for (let j = 0; j < SY; j++) {
    for (let i = 0; i < SX; i++) {
      const a = j * (SX + 1) + i;
      const b = a + 1;
      const c = a + SX + 1;
      const d = c + 1;
      if (side === 1) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function smooth(ext: { l: number; r: number }[], k = 3) {
  return ext.map((_, i) => {
    let l = 0;
    let r = 0;
    let n = 0;
    for (let d = -k; d <= k; d++) {
      const e = ext[Math.min(ext.length - 1, Math.max(0, i + d))];
      if (e.r - e.l > 0.002) {
        l += e.l;
        r += e.r;
        n++;
      }
    }
    return n ? { l: l / n, r: r / n } : ext[i];
  });
}

type Props = {
  design: JerseyDesign;
  personalisation?: Personalisation;
  view?: "front" | "back";
  modelUrl?: string | null;
  autoRotate?: boolean;
  onReady?: (api: { snapshot: () => string | null }) => void;
};

function useJerseyTextures(design: JerseyDesign, p: Personalisation | undefined) {
  const [state, setState] = React.useState<{ front: THREE.CanvasTexture; back: THREE.CanvasTexture; ext: { l: number; r: number }[]; raw: { l: number; r: number }[] } | null>(null);
  const key = JSON.stringify([design, p]);
  React.useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      const [fc, bc] = await Promise.all([drawJerseyCanvas(design, "front", p ?? {}), drawJerseyCanvas(design, "back", p ?? {})]);
      if (cancelled) return;
      const mk = (c: HTMLCanvasElement) => {
        const tx = new THREE.CanvasTexture(c);
        tx.colorSpace = THREE.SRGBColorSpace;
        tx.anisotropy = 8;
        return tx;
      };
      setState((prev) => {
        prev?.front.dispose();
        prev?.back.dispose();
        return { front: mk(fc), back: mk(bc), ...(() => { const raw = silhouetteExtents(fc, SY); return { raw, ext: smooth(raw, 6) }; })() };
      });
    }, 60); // debounce typing
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

function ProceduralJersey({ design, personalisation }: { design: JerseyDesign; personalisation?: Personalisation }) {
  const tex = useJerseyTextures(design, personalisation);
  const invalidate = useThree((s) => s.invalidate);
  const normal = React.useMemo(() => {
    const t = new THREE.CanvasTexture(fabricNormalCanvas());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(48, 60);
    return t;
  }, []);
  const geos = React.useMemo(() => (tex ? { front: panelGeometry(tex.ext, tex.raw, 1), back: panelGeometry(tex.ext, tex.raw, -1) } : null), [tex]);
  React.useEffect(() => () => {
    geos?.front.dispose();
    geos?.back.dispose();
  }, [geos]);
  React.useEffect(() => invalidate(), [tex, invalidate]);
  if (!tex || !geos) return null;
  const mat = (map: THREE.Texture) => (
    <meshPhysicalMaterial
      map={map}
      normalMap={normal}
      normalScale={new THREE.Vector2(0.35, 0.35)}
      alphaTest={0.5}
      side={THREE.DoubleSide}
      roughness={0.78}
      sheen={0.6}
      sheenRoughness={0.5}
      sheenColor={new THREE.Color("#ffffff")}
    />
  );
  return (
    <group position={[0, 0.15, 0]}>
      <mesh geometry={geos.front} castShadow>{mat(tex.front)}</mesh>
      <mesh geometry={geos.back} castShadow>{mat(tex.back)}</mesh>
    </group>
  );
}

/** Optional merchant-supplied, properly licensed GLB/GLTF. The front texture is applied to its materials. */
function GltfJersey({ url, design, personalisation }: { url: string; design: JerseyDesign; personalisation?: Personalisation }) {
  const { scene } = useGLTF(url);
  const tex = useJerseyTextures(design, personalisation);
  React.useEffect(() => {
    if (!tex) return;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const material = (m.material as THREE.MeshStandardMaterial).clone();
        material.map = /back/i.test(m.name) ? tex.back : tex.front;
        material.needsUpdate = true;
        m.material = material;
      }
    });
  }, [scene, tex]);
  return <primitive object={scene} />;
}

function Turntable({ view, children, autoRotate }: { view: "front" | "back"; children: React.ReactNode; autoRotate?: boolean }) {
  const ref = React.useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const target = view === "back" ? Math.PI : 0;
  React.useEffect(() => invalidate(), [view, invalidate]);
  const intro = React.useRef(autoRotate ? -0.9 : 0);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const goal = target + intro.current;
    intro.current = THREE.MathUtils.damp(intro.current, 0, 2.2, dt);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, goal, 5, dt);
    if (Math.abs(g.rotation.y - goal) > 0.0005 || Math.abs(intro.current) > 0.0005) invalidate();
  });
  return <group ref={ref}>{children}</group>;
}

function Snapshot({ onReady }: { onReady?: Props["onReady"] }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  React.useEffect(() => {
    onReady?.({
      snapshot: () => {
        try {
          gl.render(scene, camera);
          return gl.domElement.toDataURL("image/png");
        } catch {
          return null;
        }
      },
    });
  }, [gl, scene, camera, onReady]);
  return null;
}

export function Jersey3DViewer({ design, personalisation, view = "front", modelUrl, autoRotate = true, onReady }: Props) {
  const [webgl, setWebgl] = React.useState<boolean | null>(null);
  const [fallbackView, setFallbackView] = React.useState<"front" | "back">(view);
  React.useEffect(() => setWebgl(supportsWebGL()), []);
  React.useEffect(() => setFallbackView(view), [view]);

  if (webgl === null) return <div className="skeleton h-full w-full" />;
  if (!webgl) {
    // 2D fallback for devices without WebGL.
    const svg = jerseySvg(design, fallbackView, { backdrop: null, name: personalisation?.name, number: personalisation?.number, textColor: personalisation?.textColor });
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
        <div className="w-full max-w-sm [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <button className="text-sm underline" onClick={() => setFallbackView((v) => (v === "front" ? "back" : "front"))}>Show {fallbackView === "front" ? "back" : "front"}</button>
        <p className="text-xs text-muted-foreground">3D preview isn&apos;t supported on this device — showing a 2D preview.</p>
      </div>
    );
  }
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      shadows
      camera={{ position: [0, 0.2, 8.4], fov: 35 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}
      aria-label="Interactive 3D jersey preview"
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, -4]} intensity={0.7} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} position={[0, 3, 4]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1} position={[-5, 0, 1]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={1} position={[5, 0, -1]} scale={[3, 6, 1]} />
      </Environment>
      <Turntable view={view} autoRotate={autoRotate}>
        <React.Suspense fallback={null}>
          {modelUrl ? <GltfJersey url={modelUrl} design={design} personalisation={personalisation} /> : <ProceduralJersey design={design} personalisation={personalisation} />}
        </React.Suspense>
      </Turntable>
      <ContactShadows position={[0, -2.55, 0]} opacity={0.35} scale={9} blur={2.6} far={3} />
      <OrbitControls enablePan={false} minDistance={5} maxDistance={11} minPolarAngle={Math.PI * 0.3} maxPolarAngle={Math.PI * 0.62} enableDamping />
      <Snapshot onReady={onReady} />
    </Canvas>
  );
}

export default Jersey3DViewer;

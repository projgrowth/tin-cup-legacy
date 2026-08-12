import { useEffect, useRef } from "react";
import * as THREE from "three";

import type { Hole, HoleFeatureKind } from "@/lib/courses";
import {
  EXTRUDE_H,
  featuresFor3D,
  holeBounds,
  lineStations,
  smoothOpenPolyline,
  smoothPolygon,
} from "@/lib/hole-geometry";

const FILL: Record<HoleFeatureKind, number> = {
  fw: 0x458f5c,
  gr: 0x62c484,
  tee: 0x529a70,
  bk: 0xedd9a8,
  wa: 0x3d82c4,
};

/**
 * Schematic interactive 3D hole — extrudes the same OSM polygons as 2D.
 * Elevation is stylized for readability, not survey topo.
 */
export function HoleMap3D({
  hole,
  className,
}: {
  hole: Hole;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 400;
    const bounds = holeBounds(hole);
    const scale = 40 / bounds.span;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1410);
    scene.fog = new THREE.Fog(0x0c1410, 80, 220);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 500);
    // Look from tee-ish high angle
    const camDist = 55;
    camera.position.set(camDist * 0.55, camDist * 0.75, camDist * 0.55);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("aria-label", `3D schematic of hole ${hole.h}`);

    // Lights
    scene.add(new THREE.AmbientLight(0xb8d4c4, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2d6, 1.05);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x88aacc, 0.35);
    fill.position.set(-20, 20, -30);
    scene.add(fill);

    const root = new THREE.Group();
    scene.add(root);

    // Ground plate — darker rough
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(bounds.span * scale * 0.78, 64),
      new THREE.MeshStandardMaterial({
        color: 0x15241c,
        roughness: 0.97,
        metalness: 0.02,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    root.add(ground);

    const toLocal = (x: number, y: number) => ({
      x: (x - bounds.cx) * scale,
      z: (y - bounds.cy) * scale,
    });

    // Extruded features — Chaikin-smoothed silhouettes
    for (const feat of featuresFor3D(hole)) {
      if (feat.p.length < 3) continue;
      const ring = smoothPolygon(feat.p, feat.k === "fw" || feat.k === "gr" ? 3 : 2);
      const shape = new THREE.Shape();
      ring.forEach(([px, py], i) => {
        const { x, z } = toLocal(px, py);
        // Shape is X/Y; we map data Y → shape Y then rotate to XZ
        if (i === 0) shape.moveTo(x, -z);
        else shape.lineTo(x, -z);
      });
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: EXTRUDE_H[feat.k],
        bevelEnabled: feat.k === "gr" || feat.k === "fw" || feat.k === "bk",
        bevelThickness: feat.k === "gr" ? 0.22 : 0.12,
        bevelSize: feat.k === "gr" ? 0.18 : 0.1,
        bevelSegments: 2,
      });
      // Extrude goes +Z in shape space; rotate to stand on XZ ground
      geo.rotateX(-Math.PI / 2);

      const mat = new THREE.MeshStandardMaterial({
        color: FILL[feat.k],
        roughness: feat.k === "wa" ? 0.22 : feat.k === "bk" ? 0.92 : 0.68,
        metalness: feat.k === "wa" ? 0.4 : 0.05,
        transparent: feat.k === "wa",
        opacity: feat.k === "wa" ? 0.9 : 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Lift slightly so edges don't z-fight ground
      mesh.position.y = 0.02;
      root.add(mesh);
    }

    // Play line ribbon (smoothed display path)
    if (hole.line.length >= 2) {
      const smoothed = smoothOpenPolyline(hole.line, 2);
      const pts = smoothed.map(([px, py]) => {
        const { x, z } = toLocal(px, py);
        return new THREE.Vector3(x, 3.2, z);
      });
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, 0.35, 8, false),
        new THREE.MeshStandardMaterial({
          color: 0xe8c547,
          emissive: 0x6a5410,
          emissiveIntensity: 0.35,
          roughness: 0.4,
          metalness: 0.3,
        }),
      );
      tube.castShadow = true;
      root.add(tube);

      // Tee + green markers
      const tee = hole.line[0];
      const green = hole.line[hole.line.length - 1];
      const tL = toLocal(tee[0], tee[1]);
      const gL = toLocal(green[0], green[1]);
      const teeBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0x886600, emissiveIntensity: 0.4 }),
      );
      teeBall.position.set(tL.x, 3.6, tL.z);
      root.add(teeBall);

      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xf5f5f0 }),
      );
      pin.position.set(gL.x, 4.5, gL.z);
      root.add(pin);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.0),
        new THREE.MeshStandardMaterial({
          color: 0xc9a227,
          side: THREE.DoubleSide,
          emissive: 0x443300,
          emissiveIntensity: 0.25,
        }),
      );
      flag.position.set(gL.x + 0.8, 6.0, gL.z);
      root.add(flag);
    }

    // Yard stations along line (proportional Black yardage)
    const stations = lineStations(hole, 50);
    const labelSprites: THREE.Sprite[] = [];
    for (const st of stations) {
      if (st.yardsFromTee === 0 || st.yardsToGreen === 0) continue;
      if (st.yardsFromTee % 50 !== 0) continue;
      const { x, z } = toLocal(st.x, st.y);
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 128, 64);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(8, 12, 112, 40, 10);
        ctx.fill();
        ctx.fillStyle = "#f0e6c0";
        ctx.font = "bold 28px system-ui,sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${st.yardsFromTee}`, 64, 32);
      }
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true }),
      );
      sprite.position.set(x, 5.5, z);
      sprite.scale.set(6, 3, 1);
      root.add(sprite);
      labelSprites.push(sprite);
    }

    // Interaction: orbit + pinch
    let azimuth = Math.PI / 4;
    let polar = Math.PI / 3.2;
    let radius = camDist;
    const target = new THREE.Vector3(0, 1.5, 0);
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStartDist = 0;
    let pinchStartRadius = camDist;

    function applyCamera() {
      const sinP = Math.sin(polar);
      camera.position.set(
        target.x + radius * sinP * Math.cos(azimuth),
        target.y + radius * Math.cos(polar),
        target.z + radius * sinP * Math.sin(azimuth),
      );
      camera.lookAt(target);
    }
    applyCamera();

    function onPointerDown(e: PointerEvent) {
      renderer.domElement.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      } else if (pointers.size === 2) {
        dragging = false;
        const [a, b] = [...pointers.values()];
        pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y);
        pinchStartRadius = radius;
      }
    }
    function onPointerMove(e: PointerEvent) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStartDist > 0) {
          radius = Math.min(120, Math.max(22, pinchStartRadius * (pinchStartDist / dist)));
          applyCamera();
        }
        return;
      }
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      azimuth -= dx * 0.008;
      polar = Math.min(Math.PI / 2.15, Math.max(0.25, polar + dy * 0.006));
      applyCamera();
    }
    function onPointerUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {
        pinchStartDist = 0;
      }
      if (pointers.size === 0) dragging = false;
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      radius = Math.min(120, Math.max(22, radius + e.deltaY * 0.04));
      applyCamera();
    }
    function onDblClick() {
      azimuth = Math.PI / 4;
      polar = Math.PI / 3.2;
      radius = camDist;
      applyCamera();
    }

    const el = renderer.domElement;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onDblClick);

    let frame = 0;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      frame = requestAnimationFrame(tick);
      // Gentle idle spin when not dragging
      if (!dragging && pointers.size === 0) {
        azimuth += 0.0012;
        applyCamera();
      }
      renderer.render(scene, camera);
    };
    tick();

    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w < 2 || h < 2) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    ro.observe(mount);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onDblClick);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        }
        if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [hole]);

  return <div ref={mountRef} className={className ?? "size-full min-h-[280px]"} />;
}

export default HoleMap3D;

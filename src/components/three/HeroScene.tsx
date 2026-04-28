"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * 控えめなワイヤーフレーム住宅 + 床面ドットグリッド。
 * - 画面内のときだけアニメーション、prefers-reduced-motion を尊重。
 * - 透過背景でページの淡いブルーに自然に溶け込む。
 */
export function HeroScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(5.5, 3.8, 6.5);
    camera.lookAt(0, 0.4, 0);

    // ── House group ──────────────────────────────────────
    const house = new THREE.Group();
    scene.add(house);

    const lineColor = 0x3b6cd9;   // primary blue
    const accentColor = 0x60a5fa; // accent
    const groundDot = 0xa3b8d9;

    // 本体（直方体ワイヤー）
    const bodyGeom = new THREE.BoxGeometry(2.2, 1.4, 1.6);
    const bodyEdges = new THREE.EdgesGeometry(bodyGeom);
    const bodyLine = new THREE.LineSegments(
      bodyEdges,
      new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.85 })
    );
    bodyLine.position.y = 0.7;
    house.add(bodyLine);

    // 半透明の面（ガラス感）
    const bodyFaceMat = new THREE.MeshBasicMaterial({
      color: 0x6c9bff,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });
    const bodyFace = new THREE.Mesh(bodyGeom, bodyFaceMat);
    bodyFace.position.y = 0.7;
    house.add(bodyFace);

    // 屋根（三角プリズム = 押し出し三角形）
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-1.2, 0);
    roofShape.lineTo(1.2, 0);
    roofShape.lineTo(0, 0.9);
    roofShape.closePath();
    const roofGeom = new THREE.ExtrudeGeometry(roofShape, { depth: 1.6, bevelEnabled: false });
    roofGeom.translate(0, 0, -0.8);
    const roofEdges = new THREE.EdgesGeometry(roofGeom);
    const roofLine = new THREE.LineSegments(
      roofEdges,
      new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.9 })
    );
    roofLine.position.y = 1.4;
    house.add(roofLine);

    const roofFace = new THREE.Mesh(
      roofGeom,
      new THREE.MeshBasicMaterial({ color: 0x8fb6ff, transparent: true, opacity: 0.08, depthWrite: false })
    );
    roofFace.position.y = 1.4;
    house.add(roofFace);

    // 太陽光パネル（屋根南斜面に小さく）
    const panelGeom = new THREE.PlaneGeometry(0.9, 0.5);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x1e40af, transparent: true, opacity: 0.55 });
    const panel = new THREE.Mesh(panelGeom, panelMat);
    panel.rotation.x = -Math.PI / 2 + Math.atan2(0.9, 1.2);
    panel.rotation.y = 0;
    panel.position.set(0.55, 1.85, 0.4);
    house.add(panel);

    // ── Ground dot grid ──────────────────────────────────
    const gridSize = 16;
    const gridSpacing = 0.6;
    const gridPositions: number[] = [];
    for (let x = -gridSize / 2; x <= gridSize / 2; x++) {
      for (let z = -gridSize / 2; z <= gridSize / 2; z++) {
        gridPositions.push(x * gridSpacing, 0, z * gridSpacing);
      }
    }
    const gridGeom = new THREE.BufferGeometry();
    gridGeom.setAttribute("position", new THREE.Float32BufferAttribute(gridPositions, 3));
    const gridMat = new THREE.PointsMaterial({
      color: groundDot,
      size: 0.04,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
    });
    const grid = new THREE.Points(gridGeom, gridMat);
    grid.position.y = -0.01;
    scene.add(grid);

    // 床の中心ライン (地面感)
    const ringGeom = new THREE.RingGeometry(2.6, 2.62, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: lineColor, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    scene.add(ring);

    // ── Resize handling ──────────────────────────────────
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ── Animation loop with visibility gate ──────────────
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible = e.isIntersecting;
      },
      { threshold: 0.05 }
    );
    io.observe(mount);

    const start = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = (performance.now() - start) / 1000;
      if (!reduceMotion) {
        house.rotation.y = t * 0.18;
        house.position.y = Math.sin(t * 0.6) * 0.04;
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      bodyGeom.dispose();
      bodyEdges.dispose();
      roofGeom.dispose();
      roofEdges.dispose();
      panelGeom.dispose();
      gridGeom.dispose();
      ringGeom.dispose();
      bodyFaceMat.dispose();
      panelMat.dispose();
      gridMat.dispose();
      ringMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      aria-hidden="true"
      role="presentation"
    />
  );
}

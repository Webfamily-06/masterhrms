import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function CyberMeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const width = window.innerWidth;
    const height = window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, -2, 4.5);
    camera.rotation.x = 0.5;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // Plane Wave Geometry
    const planeWidth = 20;
    const planeHeight = 20;
    const widthSegments = 50;
    const heightSegments = 50;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, widthSegments, heightSegments);

    const material = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2.8;
    mesh.position.y = -2.5;
    scene.add(mesh);

    // Resize handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime() * 0.8;

      const positionAttr = geometry.attributes.position;
      for (let i = 0; i < positionAttr.count; i++) {
        const u = positionAttr.getX(i);
        const v = positionAttr.getY(i);
        const z = Math.sin(u * 0.5 + time) * 0.4 + Math.cos(v * 0.5 + time * 0.7) * 0.4;
        positionAttr.setZ(i, z);
      }
      positionAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1] opacity-70 dark:opacity-40"
    />
  );
}

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface Feature3DGlobeProps {
  className?: string;
}

export function Feature3DGlobe({ className = "" }: Feature3DGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeCluster, setActiveCluster] = useState<string>("Asia-South (Mumbai)");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Global Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const light1 = new THREE.DirectionalLight(0xa855f7, 3);
    light1.position.set(5, 3, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x06b6d4, 4, 10);
    light2.position.set(-5, -3, 3);
    scene.add(light2);

    // 3. 3D Wireframe Cyber Globe Mesh
    const sphereRadius = 1.8;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 36, 36);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      emissive: 0x3b0764,
      emissiveIntensity: 0.5,
    });
    const globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(globeMesh);

    // Inner glowing sphere
    const innerGeo = new THREE.SphereGeometry(sphereRadius * 0.96, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x4c1d95,
      transparent: true,
      opacity: 0.4,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerSphere);

    // 4. Dot Cloud on Globe Surface (Cyber Landmass)
    const dotCount = 1000;
    const dotGeo = new THREE.BufferGeometry();
    const dotPositions = new Float32Array(dotCount * 3);
    const dotColors = new Float32Array(dotCount * 3);

    const c1 = new THREE.Color(0xa855f7);
    const c2 = new THREE.Color(0x38bdf8);

    for (let i = 0; i < dotCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = sphereRadius * 1.01;

      dotPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      dotPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      dotPositions[i * 3 + 2] = r * Math.cos(phi);

      const color = Math.random() > 0.5 ? c1 : c2;
      dotColors[i * 3] = color.r;
      dotColors[i * 3 + 1] = color.g;
      dotColors[i * 3 + 2] = color.b;
    }

    dotGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    dotGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));

    const dotMat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    const dots = new THREE.Points(dotGeo, dotMat);
    globeMesh.add(dots);

    // 5. Cluster Data Nodes (Pins)
    const clusterLocations = [
      { name: "Asia-South (Mumbai)", lat: 19.076, lon: 72.877, color: 0x10b981 },
      { name: "US-East (Virginia)", lat: 37.431, lon: -78.656, color: 0x3b82f6 },
      { name: "EU-Central (Frankfurt)", lat: 50.11, lon: 8.682, color: 0xa855f7 },
      { name: "Middle-East (Dubai)", lat: 25.204, lon: 55.27, color: 0xf59e0b },
      { name: "APAC (Singapore)", lat: 1.352, lon: 103.819, color: 0xec4899 },
    ];

    const clusterGroup = new THREE.Group();
    globeMesh.add(clusterGroup);

    const latLonToVector3 = (lat: number, lon: number, radius: number) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
    };

    const pinMeshes: THREE.Mesh[] = [];

    clusterLocations.forEach((loc) => {
      const pos = latLonToVector3(loc.lat, loc.lon, sphereRadius * 1.02);

      // Pin head
      const pinGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: loc.color });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);
      pinMesh.userData = { name: loc.name };
      clusterGroup.add(pinMesh);
      pinMeshes.push(pinMesh);

      // Glowing Pulse Wave
      const waveGeo = new THREE.RingGeometry(0.09, 0.14, 24);
      const waveMat = new THREE.MeshBasicMaterial({ color: loc.color, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const waveMesh = new THREE.Mesh(waveGeo, waveMat);
      waveMesh.position.copy(pos);
      waveMesh.lookAt(new THREE.Vector3(0, 0, 0));
      clusterGroup.add(waveMesh);
    });

    // 6. Orbital Rings
    const orbitRingGeom = new THREE.RingGeometry(2.4, 2.44, 64);
    const orbitRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const orbitRing = new THREE.Mesh(orbitRingGeom, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2.5;
    scene.add(orbitRing);

    // 7. Mouse Interactivity
    let targetRotationX = 0;
    let targetRotationY = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        targetRotationY += deltaX * 0.01;
        targetRotationX += deltaY * 0.01;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    // Resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    // 8. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Auto rotation
      if (!isDragging) {
        globeMesh.rotation.y += delta * 0.25;
      } else {
        globeMesh.rotation.y += (targetRotationY - globeMesh.rotation.y) * 0.1;
        globeMesh.rotation.x += (targetRotationX - globeMesh.rotation.x) * 0.1;
      }

      orbitRing.rotation.z -= delta * 0.2;

      // Pulse pin scales
      const scale = 1 + Math.sin(time * 4) * 0.25;
      pinMeshes.forEach((p) => {
        p.scale.set(scale, scale, scale);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      sphereGeo.dispose();
      sphereMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      orbitRingGeom.dispose();
      orbitRingMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative w-full h-full min-h-[380px] rounded-3xl overflow-hidden ${className}`}>
      {/* 3D WebGL Globe Canvas */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Cluster Node HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="p-2 px-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px] text-slate-200 font-bold">5 Global Multi-Tenant Regions Active</span>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-center gap-1.5 p-2 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/10 text-xs">
        {["Mumbai", "Virginia", "Frankfurt", "Dubai", "Singapore"].map((city) => (
          <button
            key={city}
            onClick={() => setActiveCluster(city)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
              activeCluster.includes(city)
                ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30"
                : "bg-white/5 hover:bg-white/10 text-slate-300"
            }`}
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}

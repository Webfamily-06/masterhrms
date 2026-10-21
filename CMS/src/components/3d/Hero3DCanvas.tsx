import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface Hero3DCanvasProps {
  className?: string;
}

export function Hero3DCanvas({ className = "" }: Hero3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [geometryType, setGeometryType] = useState<"torusKnot" | "icosahedron" | "torus">("torusKnot");

  const wireframeRef = useRef(wireframe);
  wireframeRef.current = wireframe;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const geomTypeRef = useRef(geometryType);
  geomTypeRef.current = geometryType;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0x8b5cf6, 1.2);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xec4899, 4, 20);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x6366f1, 4, 20);
    pointLight2.position.set(-5, -5, 3);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x06b6d4, 3, 15);
    pointLight3.position.set(0, 4, -3);
    scene.add(pointLight3);

    // 3. Central Hologram Mesh
    const createGeometry = (type: "torusKnot" | "icosahedron" | "torus") => {
      switch (type) {
        case "torusKnot":
          return new THREE.TorusKnotGeometry(1.4, 0.42, 128, 32, 2, 3);
        case "icosahedron":
          return new THREE.IcosahedronGeometry(1.8, 2);
        case "torus":
          return new THREE.TorusGeometry(1.6, 0.45, 30, 100);
      }
    };

    let mainGeometry = createGeometry(geomTypeRef.current);
    const mainMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9333ea,
      emissive: 0x4c1d95,
      emissiveIntensity: 0.4,
      metalness: 0.85,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0.6,
      opacity: 0.95,
      transparent: true,
      wireframe: wireframeRef.current,
    });

    const mainMesh = new THREE.Mesh(mainGeometry, mainMaterial);
    scene.add(mainMesh);

    // Inner glowing core
    const coreGeometry = new THREE.SphereGeometry(0.7, 32, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 2.0,
      roughness: 0.2,
      metalness: 0.5,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 4. Surrounding Orbital Hologram Rings
    const ring1Geom = new THREE.RingGeometry(2.3, 2.36, 64);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0xec4899, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const ring1 = new THREE.Mesh(ring1Geom, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ring2Geom = new THREE.RingGeometry(2.8, 2.85, 64);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const ring2 = new THREE.Mesh(ring2Geom, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    // 5. Star Particle Cloud
    const particleCount = 1200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0xa855f7);
    const color2 = new THREE.Color(0x06b6d4);
    const color3 = new THREE.Color(0xec4899);

    for (let i = 0; i < particleCount; i++) {
      const radius = 3 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);

      const chosenColor = Math.random() > 0.6 ? color1 : Math.random() > 0.3 ? color2 : color3;
      particleColors[i * 3] = chosenColor.r;
      particleColors[i * 3 + 1] = chosenColor.g;
      particleColors[i * 3 + 2] = chosenColor.b;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Mouse Tracking & Interactivity
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      mouseX = x;
      mouseY = y;

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

    // 7. Resize Observer
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
      const elapsedTime = clock.getElapsedTime();
      const currentSpeed = speedRef.current;

      // Update wireframe state dynamically
      if (mainMaterial.wireframe !== wireframeRef.current) {
        mainMaterial.wireframe = wireframeRef.current;
      }

      // Check geometry type changes
      if (mainMesh.userData.currentType !== geomTypeRef.current) {
        mainMesh.geometry.dispose();
        mainMesh.geometry = createGeometry(geomTypeRef.current);
        mainMesh.userData.currentType = geomTypeRef.current;
      }

      // Rotation & Floating Physics
      const autoRotateSpeed = 0.5 * currentSpeed;
      mainMesh.rotation.x += delta * autoRotateSpeed * 0.6;
      mainMesh.rotation.y += delta * autoRotateSpeed;
      mainMesh.position.y = Math.sin(elapsedTime * 1.5) * 0.15;

      coreMesh.position.y = mainMesh.position.y;
      coreMesh.rotation.y -= delta * 0.8;
      const coreScale = 0.9 + Math.sin(elapsedTime * 3) * 0.08;
      coreMesh.scale.set(coreScale, coreScale, coreScale);

      // Rings spin in opposite axes
      ring1.rotation.z += delta * 0.4 * currentSpeed;
      ring2.rotation.z -= delta * 0.3 * currentSpeed;

      // Particle cloud gentle rotation
      particles.rotation.y += delta * 0.08 * currentSpeed;
      particles.rotation.x += delta * 0.03 * currentSpeed;

      // Mouse influence interpolation (smooth damping)
      if (!isDragging) {
        targetRotationY += (mouseX * 0.6 - targetRotationY) * 0.03;
        targetRotationX += (mouseY * 0.6 - targetRotationX) * 0.03;
      }

      scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.08;
      scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      mainGeometry.dispose();
      mainMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      ring1Geom.dispose();
      ring1Mat.dispose();
      ring2Geom.dispose();
      ring2Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative w-full h-full min-h-[420px] rounded-3xl overflow-hidden ${className}`}>
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Interactive Control HUD */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto flex flex-wrap items-center gap-2 p-2 px-3 rounded-2xl bg-slate-950/70 backdrop-blur-xl border border-white/10 shadow-2xl text-xs z-10">
        <span className="text-[10px] font-mono text-purple-400 uppercase font-black tracking-wider flex items-center gap-1.5 mr-1">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> 3D WebGL Core
        </span>

        <button
          onClick={() => setWireframe(!wireframe)}
          className={`px-2.5 py-1 rounded-xl font-semibold transition-all ${
            wireframe
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold"
              : "bg-white/5 hover:bg-white/10 text-slate-300"
          }`}
        >
          {wireframe ? "Solid Mesh" : "Holo Wireframe"}
        </button>

        <button
          onClick={() => {
            const types: ("torusKnot" | "icosahedron" | "torus")[] = ["torusKnot", "icosahedron", "torus"];
            const nextIdx = (types.indexOf(geometryType) + 1) % types.length;
            setGeometryType(types[nextIdx]);
          }}
          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all capitalize"
        >
          Morph: {geometryType}
        </button>

        <button
          onClick={() => setSpeed(speed === 1 ? 2.5 : speed === 2.5 ? 0.4 : 1)}
          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-all"
        >
          Speed: {speed}x
        </button>
      </div>
    </div>
  );
}

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { Edges } from "@react-three/drei";
import { useTheme } from "next-themes";

/**
 * HeroScene  -  ambient 3D background for the landing hero.
 * Theme-aware: re-resolves CSS variable colors when the theme changes
 * so the wireframes stay visible in both light & dark mode.
 */

const LINE_W = 1.5; // Increased slightly for better tactical visibility

function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // Ensure we handle HSL variable formats correctly for Three.js
  if (v && !v.includes("hsl")) return `hsl(${v})`;
  return v || fallback;
}

function useThemeColors() {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState(() => ({
    line: "#888",
    accent: "#6366f1",
  }));
  
  useEffect(() => {
    // Wait for the DOM and theme class to settle
    const id = setTimeout(() => {
      const isDark = resolvedTheme === "dark";
      // BIAS: In light mode, we want slightly darker lines than pure foreground for contrast
      const foreground = readVar("--foreground", isDark ? "#fff" : "#000");
      const primary = readVar("--primary", "#6366f1");
      
      setColors({
        line: foreground,
        accent: primary,
      });
    }, 100);
    return () => clearTimeout(id);
  }, [resolvedTheme]);
  return colors;
}

function FloatRotate({
  children,
  speed = 0.15,
  drift = 0.4,
  phase = 0,
}: {
  children: React.ReactNode;
  speed?: number;
  drift?: number;
  phase?: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * speed * 0.6;
    ref.current.rotation.y += delta * speed;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5 + phase) * drift;
  });
  return <group ref={ref}>{children}</group>;
}

function Wire({
  geometry,
  color,
}: {
  geometry: React.ReactNode;
  color: string;
}) {
  return (
    <mesh>
      {geometry}
      <meshBasicMaterial transparent opacity={0} />
      <Edges lineWidth={LINE_W} color={color} />
    </mesh>
  );
}

function Scene({ line, accent }: { line: string; accent: string }) {
  return (
    <>
      <group position={[0, 0, 0]} scale={1.6}>
        <FloatRotate speed={0.12} drift={0.15}>
          <group rotation={[Math.PI * 0.18, Math.PI * 0.25, 0]}>
            <Wire geometry={<boxGeometry args={[1.6, 1.6, 1.6]} />} color={accent} />
          </group>
        </FloatRotate>
      </group>

      <group position={[-4.8, 1.6, -1]}>
        <FloatRotate speed={0.18} drift={0.5} phase={1.1}>
          <Wire geometry={<octahedronGeometry args={[0.9, 0]} />} color={line} />
        </FloatRotate>
      </group>

      <group position={[4.5, 1.2, -1.5]}>
        <FloatRotate speed={0.14} drift={0.6} phase={2.4}>
          <Wire geometry={<icosahedronGeometry args={[0.85, 0]} />} color={line} />
        </FloatRotate>
      </group>

      <group position={[-3.6, -1.8, 0.5]}>
        <FloatRotate speed={0.22} drift={0.45} phase={0.4}>
          <Wire geometry={<tetrahedronGeometry args={[0.95, 0]} />} color={line} />
        </FloatRotate>
      </group>

      <group position={[-1.6, 2.2, 0.8]} scale={0.55}>
        <FloatRotate speed={0.25} drift={0.4} phase={1.7}>
          <Wire geometry={<boxGeometry args={[1.2, 1.2, 1.2]} />} color={line} />
        </FloatRotate>
      </group>

      <group position={[1.8, -2.3, 1]} scale={0.6}>
        <FloatRotate speed={0.2} drift={0.35} phase={2.9}>
          <Wire geometry={<octahedronGeometry args={[1, 0]} />} color={line} />
        </FloatRotate>
      </group>
    </>
  );
}

export function HeroScene({ className = "", mode = "signup" }: { className?: string; mode?: "signin" | "signup" | string }) {
  const { line, accent } = useThemeColors();
  // Force-remount the canvas on theme change so Edges re-evaluate cleanly
  const { resolvedTheme } = useTheme();

  return (
    <div className={className}>
      <Canvas
        key={resolvedTheme}
        flat
        orthographic
        dpr={[1, 2]}
        camera={{ position: [0, 0, 10], zoom: 60 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene line={line} accent={accent} />
      </Canvas>
    </div>
  );
}


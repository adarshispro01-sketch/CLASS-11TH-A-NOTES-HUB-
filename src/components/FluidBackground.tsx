import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  originalColor: string;
  pulseSpeed: number;
  pulsePhase: number;
}

interface FluidBackgroundProps {
  theme?: "dark" | "light";
}

export default function FluidBackground({ theme = "dark" }: FluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false, targetX: 0, targetY: 0, radius: 180 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = Math.max(window.innerWidth, 200));
    let height = (canvas.height = Math.max(window.innerHeight, 200));

    // High visibility cybernetic/holographic colors
    const darkColors = [
      "rgba(245, 158, 11, 0.95)",  // Vivid Amber
      "rgba(6, 182, 212, 0.95)",  // Cyber Cyan
      "rgba(168, 85, 247, 0.9)",   // Radiant Purple
      "rgba(244, 63, 94, 0.95)"    // Neon Plasma Rose
    ];

    const lightColors = [
      "rgba(217, 119, 6, 0.8)",   // Rich Gold/Amber
      "rgba(8, 145, 178, 0.8)",   // Soft Deep Cyan
      "rgba(109, 40, 217, 0.75)", // Electric Royal Violet
      "rgba(190, 24, 74, 0.8)"    // Velvet Red
    ];

    const currentColors = theme === "dark" ? darkColors : lightColors;

    // Initialize interactive quantum floating particles
    const particles: Particle[] = [];
    const particleCount = Math.min(85, Math.floor((width * height) / 15000) + 35);

    for (let i = 0; i < particleCount; i++) {
      const color = currentColors[i % currentColors.length];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.9,
        vy: (Math.random() - 0.5) * 0.9,
        radius: 1.5 + Math.random() * 3.5,
        color,
        originalColor: color,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = Math.max(window.innerWidth, 200);
      height = canvas.height = Math.max(window.innerHeight, 200);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    let frame = 0;
    const render = () => {
      frame++;
      
      // Interpolate mouse coordinates gently
      if (mouseRef.current.active) {
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;
      }

      // Draw high-end space-void backdrop
      if (theme === "dark") {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#07080c");
        bgGrad.addColorStop(0.5, "#0a0c13");
        bgGrad.addColorStop(1, "#030406");
        ctx.fillStyle = bgGrad;
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#fbfbfa");
        bgGrad.addColorStop(0.5, "#f4f4f3");
        bgGrad.addColorStop(1, "#e6e4e2");
        ctx.fillStyle = bgGrad;
      }
      ctx.fillRect(0, 0, width, height);

      // Draw interactive holographic mouse vortex/aura highlight
      if (mouseRef.current.active) {
        try {
          const mouseGlow = ctx.createRadialGradient(
            mouseRef.current.x, mouseRef.current.y, 10,
            mouseRef.current.x, mouseRef.current.y, mouseRef.current.radius
          );
          if (theme === "dark") {
            mouseGlow.addColorStop(0, "rgba(245, 158, 11, 0.16)"); // Rich Amber glow
            mouseGlow.addColorStop(0.4, "rgba(6, 182, 212, 0.06)");  // Cyan border highlight
            mouseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
          } else {
            mouseGlow.addColorStop(0, "rgba(253, 230, 138, 0.55)"); // Luxurious Gold Leaf glow
            mouseGlow.addColorStop(0.5, "rgba(224, 242, 254, 0.3)");  // Sky Blue
            mouseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
          }
          ctx.fillStyle = mouseGlow;
          ctx.beginPath();
          ctx.arc(mouseRef.current.x, mouseRef.current.y, mouseRef.current.radius, 0, Math.PI * 2);
          ctx.fill();

          // Delicate high-tech targeting crosshair orbits
          ctx.strokeStyle = theme === "dark" ? "rgba(245, 158, 11, 0.22)" : "rgba(217, 119, 6, 0.32)";
          ctx.lineWidth = 0.5;
          ctx.setLineDash([4, 12]);
          ctx.beginPath();
          ctx.arc(mouseRef.current.x, mouseRef.current.y, 45, frame * 0.005, frame * 0.005 + Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = theme === "dark" ? "rgba(6, 182, 212, 0.15)" : "rgba(8, 145, 178, 0.22)";
          ctx.beginPath();
          ctx.arc(mouseRef.current.x, mouseRef.current.y, 85, -frame * 0.003, -frame * 0.003 + Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]); // Reset line dash
        } catch (e) {}
      }

      // Draw high-tech background blueprint grid
      ctx.strokeStyle = theme === "dark" ? "rgba(255, 255, 255, 0.025)" : "rgba(0, 0, 0, 0.035)";
      ctx.lineWidth = 0.75;
      const gridSize = 60;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Cybernetic corner ticks
      ctx.strokeStyle = theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 20); ctx.lineTo(40, 20);
      ctx.moveTo(20, 20); ctx.lineTo(20, 40);
      ctx.moveTo(width - 20, 20); ctx.lineTo(width - 40, 20);
      ctx.moveTo(width - 20, 20); ctx.lineTo(width - 20, 40);
      ctx.moveTo(20, height - 20); ctx.lineTo(40, height - 20);
      ctx.moveTo(20, height - 20); ctx.lineTo(20, height - 40);
      ctx.moveTo(width - 20, height - 20); ctx.lineTo(width - 40, height - 20);
      ctx.moveTo(width - 20, height - 20); ctx.lineTo(width - 20, height - 40);
      ctx.stroke();

      // Render quantum fluid particle connections (vector constellations)
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const limit = 115;

          if (dist < limit) {
            const alpha = (1 - dist / limit) * 0.22;
            ctx.strokeStyle = theme === "dark" 
              ? `rgba(6, 182, 212, ${alpha * 1.6})` 
              : `rgba(8, 145, 178, ${alpha * 1.3})`;
            ctx.lineWidth = 0.5 + (1 - dist / limit) * 0.9;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Move particles
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Bounce walls
        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        // Interactive mouse magnetic pull/push
        if (mouseRef.current.active) {
          const dx = p1.x - mouseRef.current.x;
          const dy = p1.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseRef.current.radius) {
            const force = (1 - dist / mouseRef.current.radius) * 1.5;
            const angle = Math.atan2(dy, dx);
            // Apply orbit swirl math
            p1.x += Math.cos(angle) * force + Math.sin(angle) * (force * 0.7);
            p1.y += Math.sin(angle) * force - Math.cos(angle) * (force * 0.7);
          }
        }

        // Pulse radius
        p1.pulsePhase += p1.pulseSpeed;
        const currentRadius = p1.radius * (1 + Math.sin(p1.pulsePhase) * 0.3);

        // Draw outer fluorescent glow
        ctx.fillStyle = p1.color;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // White core highlight to make it pop 3D high-tech
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, currentRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tech details/telemetry HUD lines
      ctx.fillStyle = theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.35)";
      ctx.font = "8px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillText("SYS_STATUS: OPTIMAL", 32, 32);
      ctx.fillText(`TARGET_X: ${Math.floor(mouseRef.current.x)} | TARGET_Y: ${Math.floor(mouseRef.current.y)}`, 32, 44);
      ctx.fillText("SECTOR: PANDEY_HUB_GRID_11A", width - 180, 32);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-screen h-screen -z-50 pointer-events-none block"
      id="fluid-high-tech-quantum-canvas"
    />
  );
}

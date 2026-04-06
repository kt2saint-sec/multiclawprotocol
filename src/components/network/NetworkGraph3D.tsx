import { useRef, useEffect, useState } from "react";
import { useAgentRegistryStore } from "../../stores/agentRegistryStore";

const TEAM_COLORS: Record<string, string> = {
  blue: "#1B3A6B",
  green: "#1A5632",
  amber: "#FFB347",
  purple: "#6B21A8",
  red: "#DC2626",
};

const TEAM_GLOW: Record<string, string> = {
  blue: "rgba(27,58,107,0.6)",
  green: "rgba(26,86,50,0.6)",
  amber: "rgba(255,179,71,0.6)",
  purple: "rgba(107,33,168,0.6)",
  red: "rgba(220,38,38,0.6)",
};

// Predefined connections between agents
const CONNECTIONS: [string, string][] = [
  ["orchestrator", "strategist"],
  ["orchestrator", "sales-closer"],
  ["orchestrator", "codereview"],
  ["orchestrator", "designer"],
  ["orchestrator", "spec-loader"],
  ["builder", "boris"],
  ["builder", "codereview"],
  ["builder", "forge-supervisor"],
  ["codereview", "forge-supervisor"],
  ["strategist", "intel"],
  ["strategist", "legal-expert"],
  ["strategist", "brain-supervisor"],
  ["sales-closer", "marketer"],
  ["sales-closer", "dtf-expert"],
  ["sales-closer", "hustle-supervisor"],
  ["proxy", "sentinel"],
  ["proxy", "boris"],
  ["sentinel", "orchestrator"],
  ["github-scout", "builder"],
  ["designer", "builder"],
  ["spec-loader", "builder"],
];

interface NodePosition {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  glow: string;
  name: string;
  team: string;
}

interface AgentEntry {
  id: string;
  display: { name: string; color_class: string };
}

function initializePositions(agents: AgentEntry[]): NodePosition[] {
  return agents.map((a, i) => {
    const angle = (i / agents.length) * Math.PI * 2;
    const radius = 250 + Math.random() * 100;
    return {
      id: a.id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
      vz: 0,
      color: TEAM_COLORS[a.display.color_class] ?? "#4B5563",
      glow: TEAM_GLOW[a.display.color_class] ?? "rgba(75,85,99,0.6)",
      name: a.display.name,
      team: a.display.color_class,
    };
  });
}

function applyForces(nodes: NodePosition[], edges: [string, string][]) {
  const dt = 0.3;
  const repulsion = 8000;
  const attraction = 0.005;
  const damping = 0.92;
  const centerPull = 0.001;

  // Repulsion between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1;
      const force = repulsion / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      nodes[i].vx += fx * dt;
      nodes[i].vy += fy * dt;
      nodes[i].vz += fz * dt;
      nodes[j].vx -= fx * dt;
      nodes[j].vy -= fy * dt;
      nodes[j].vz -= fz * dt;
    }
  }

  // Attraction on edges
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const [srcId, tgtId] of edges) {
    const src = nodeMap.get(srcId);
    const tgt = nodeMap.get(tgtId);
    if (!src || !tgt) continue;
    const dx = tgt.x - src.x;
    const dy = tgt.y - src.y;
    const dz = tgt.z - src.z;
    src.vx += dx * attraction * dt;
    src.vy += dy * attraction * dt;
    src.vz += dz * attraction * dt;
    tgt.vx -= dx * attraction * dt;
    tgt.vy -= dy * attraction * dt;
    tgt.vz -= dz * attraction * dt;
  }

  // Center pull + damping + update positions
  for (const n of nodes) {
    n.vx -= n.x * centerPull;
    n.vy -= n.y * centerPull;
    n.vz -= n.z * centerPull;
    n.vx *= damping;
    n.vy *= damping;
    n.vz *= damping;
    n.x += n.vx;
    n.y += n.vy;
    n.z += n.vz;
  }
}

export function NetworkGraph3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsMap = useAgentRegistryStore((s) => s.agents);
  const agents = Object.values(agentsMap);
  const [rotation, setRotation] = useState({ rx: 0.3, ry: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const nodesRef = useRef<NodePosition[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Initialize nodes once agents are loaded
  useEffect(() => {
    if (agents.length > 0 && nodesRef.current.length === 0) {
      nodesRef.current = initializePositions(agents);
    }
  }, [agents]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const dpr = window.devicePixelRatio;
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;

      // Resize backing store to match display size at device pixel ratio
      if (
        canvas.width !== Math.round(cw * dpr) ||
        canvas.height !== Math.round(ch * dpr)
      ) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }

      // Reset transform before every frame — ctx.scale accumulates otherwise
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = "#0F1117";
      ctx.fillRect(0, 0, cw, ch);

      if (nodesRef.current.length === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Apply physics
      applyForces(nodesRef.current, CONNECTIONS);

      const cosRx = Math.cos(rotation.rx);
      const sinRx = Math.sin(rotation.rx);
      const cosRy = Math.cos(rotation.ry);
      const sinRy = Math.sin(rotation.ry);

      // Project 3D → 2D with perspective
      const project = (x: number, y: number, z: number) => {
        // Rotate around Y axis
        const x1 = x * cosRy - z * sinRy;
        const z1 = x * sinRy + z * cosRy;
        // Rotate around X axis
        const y1 = y * cosRx - z1 * sinRx;
        const z2 = y * sinRx + z1 * cosRx;
        const scale = (600 * zoom) / (600 + z2);
        return {
          sx: cw / 2 + x1 * scale,
          sy: ch / 2 + y1 * scale,
          scale,
          depth: z2,
        };
      };

      const nodeMap = new Map(nodesRef.current.map((n) => [n.id, n]));

      // Draw edges
      for (const [srcId, tgtId] of CONNECTIONS) {
        const src = nodeMap.get(srcId);
        const tgt = nodeMap.get(tgtId);
        if (!src || !tgt) continue;
        const p1 = project(src.x, src.y, src.z);
        const p2 = project(tgt.x, tgt.y, tgt.z);
        const alpha = Math.max(
          0.08,
          Math.min(0.35, 1 - (p1.depth + p2.depth) / 1200),
        );
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.strokeStyle = `rgba(125,211,252,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Sort by depth for painter's algorithm (far → near)
      const sorted = [...nodesRef.current].sort((a, b) => {
        const za = a.x * sinRy + a.z * cosRy;
        const zb = b.x * sinRy + b.z * cosRy;
        return zb - za;
      });

      // Draw nodes
      for (const node of sorted) {
        const p = project(node.x, node.y, node.z);
        const r = Math.max(6, 14 * p.scale);
        const isHovered = hoveredNode === node.id;

        // Glow halo on hover
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 2.5, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(
            p.sx,
            p.sy,
            r * 0.5,
            p.sx,
            p.sy,
            r * 2.5,
          );
          grad.addColorStop(0, node.glow);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Sphere with radial gradient for pseudo-3D sheen
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        const sphereGrad = ctx.createRadialGradient(
          p.sx - r * 0.3,
          p.sy - r * 0.3,
          r * 0.1,
          p.sx,
          p.sy,
          r,
        );
        sphereGrad.addColorStop(0, isHovered ? "#ffffff" : node.color + "ff");
        sphereGrad.addColorStop(1, node.color + "88");
        ctx.fillStyle = sphereGrad;
        ctx.fill();
        ctx.strokeStyle = isHovered ? "#7dd3fc" : node.color;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Label above sphere
        const fontSize = Math.max(9, 13 * p.scale);
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = isHovered
          ? "#ffffff"
          : `rgba(255,255,255,${Math.max(0.4, p.scale)})`;
        ctx.fillText(node.name, p.sx, p.sy - r - 6);
      }

      // Subtle grid floor
      ctx.globalAlpha = 0.03;
      for (let i = -5; i <= 5; i++) {
        const p1 = project(i * 80, 200, -400);
        const p2 = project(i * 80, 200, 400);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.strokeStyle = "#7dd3fc";
        ctx.lineWidth = 1;
        ctx.stroke();

        const p3 = project(-400, 200, i * 80);
        const p4 = project(400, 200, i * 80);
        ctx.beginPath();
        ctx.moveTo(p3.sx, p3.sy);
        ctx.lineTo(p4.sx, p4.sy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [rotation, zoom, hoveredNode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setRotation((r) => ({ rx: r.rx + dy * 0.005, ry: r.ry + dx * 0.005 }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }

    // Hit-test for hover
    const canvas = canvasRef.current;
    if (!canvas || nodesRef.current.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cosRx = Math.cos(rotation.rx);
    const sinRx = Math.sin(rotation.rx);
    const cosRy = Math.cos(rotation.ry);
    const sinRy = Math.sin(rotation.ry);

    let closest: string | null = null;
    let closestDist = 30;
    for (const node of nodesRef.current) {
      const x1 = node.x * cosRy - node.z * sinRy;
      const z1 = node.x * sinRy + node.z * cosRy;
      const y1 = node.y * cosRx - z1 * sinRx;
      const z2 = node.y * sinRx + z1 * cosRx;
      const scale = (600 * zoom) / (600 + z2);
      const sx = rect.width / 2 + x1 * scale;
      const sy = rect.height / 2 + y1 * scale;
      const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closest = node.id;
      }
    }
    setHoveredNode(closest);
  };

  const handleMouseUp = () => setDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
  };

  const hoveredNodeData = nodesRef.current.find((n) => n.id === hoveredNode);

  return (
    <div className="w-full h-full relative bg-[#0F1117]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Team color legend */}
      <div className="absolute bottom-4 left-4 flex gap-3 bg-[#0F1117]/80 backdrop-blur rounded-node px-3 py-2">
        {[
          { label: "Brain", color: "#1B3A6B" },
          { label: "Forge", color: "#1A5632" },
          { label: "Hustle", color: "#FFB347" },
          { label: "Solo", color: "#6B21A8" },
          { label: "Supervisors", color: "#DC2626" },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: t.color }}
            />
            <span className="text-[0.65rem] text-gray-400">{t.label}</span>
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute top-4 right-4 text-[0.65rem] text-gray-600">
        Drag to rotate · Scroll to zoom
      </div>

      {/* Hovered agent info panel */}
      {hoveredNode && hoveredNodeData && (
        <div className="absolute top-4 left-4 bg-[#1A1C24] border border-gray-700/50 rounded-node px-4 py-3 shadow-lg">
          <p className="text-sm font-bold text-white">{hoveredNodeData.name}</p>
          <p className="text-[0.65rem] text-gray-400">
            {hoveredNodeData.team} team
          </p>
        </div>
      )}
    </div>
  );
}

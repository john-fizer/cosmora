import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls, Text } from "@react-three/drei";
import { fetchScene, type ScenePayload } from "./api.js";

const SCALE = 1 / 40;

function nodePosition(node: ScenePayload["nodes"][number]): [number, number, number] {
  return [node.x * SCALE, node.y * SCALE, node.z];
}

function SceneNode({ node }: { node: ScenePayload["nodes"][number] }) {
  const color = node.type === "event" ? "#c8a55b" : "#7b6fd4";
  const size = node.type === "event" ? 0.5 : 0.3;
  return (
    <group position={nodePosition(node)}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text position={[0, size + 0.3, 0]} fontSize={0.25} color="#eae6f4">
        {node.label}
      </Text>
    </group>
  );
}

function SceneEdge({
  edge,
  positions,
}: {
  edge: ScenePayload["edges"][number];
  positions: Map<string, [number, number, number]>;
}) {
  const from = positions.get(edge.from);
  const to = positions.get(edge.to);
  if (!from || !to) {
    return null;
  }
  const midpoint: [number, number, number] = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ];
  return (
    <group>
      <Line points={[from, to]} color="#c8a55b" opacity={0.25 + edge.weight * 0.75} transparent lineWidth={1 + edge.weight * 2} />
      <Text position={midpoint} fontSize={0.18} color="#c8a55b">
        {`${edge.type} (${edge.weight.toFixed(2)})`}
      </Text>
    </group>
  );
}

export function ObservatoryScene({
  tenantId,
  profileId,
  eventId,
}: {
  tenantId: string;
  profileId: string;
  eventId: string;
}) {
  const [scene, setScene] = useState<ScenePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScene(tenantId, profileId, eventId)
      .then(setScene)
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "Failed to load scene"));
  }, [tenantId, profileId, eventId]);

  if (error) {
    return <p style={{ color: "#e07a7a" }}>{error}</p>;
  }
  if (!scene) {
    return <p>Reading the cosmos...</p>;
  }

  const positions = new Map(scene.nodes.map((node) => [node.id, nodePosition(node)]));
  const activeFilters = Object.entries(scene.filters)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  return (
    <div style={{ width: "100%", height: "80vh" }}>
      <p style={{ color: "#8d87ab", fontSize: "0.9rem" }}>
        {scene.timeWindow.start} &rarr; {scene.timeWindow.end}
        {activeFilters.length > 0 ? ` · ${activeFilters.join(", ")}` : null}
      </p>
      <Canvas camera={{ position: [0, 0, 12] }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        {scene.nodes.map((node) => (
          <SceneNode key={node.id} node={node} />
        ))}
        {scene.edges.map((edge) => (
          <SceneEdge key={edge.id} edge={edge} positions={positions} />
        ))}
        <OrbitControls />
      </Canvas>
    </div>
  );
}

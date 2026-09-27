import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { fetchScene, type ScenePayload } from "./api.js";

const SCALE = 1 / 40;

function SceneNode({ node }: { node: ScenePayload["nodes"][number] }) {
  const color = node.type === "event" ? "#c8a55b" : "#7b6fd4";
  const size = node.type === "event" ? 0.5 : 0.3;
  return (
    <group position={[node.x * SCALE, node.y * SCALE, node.z]}>
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

  return (
    <div style={{ width: "100%", height: "80vh" }}>
      <Canvas camera={{ position: [0, 0, 12] }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        {scene.nodes.map((node) => (
          <SceneNode key={node.id} node={node} />
        ))}
        <OrbitControls />
      </Canvas>
    </div>
  );
}

import React from "react";
import { seedFixtures } from "./seedFixtures";
import { installFixtureFetch } from "./fetchMock";

let seeded = false;

/**
 * Wrap any mounted real app page with this. Seeds localStorage + fetch
 * synchronously during render (not in an effect) so by the time the child
 * page's own mount effect reads storage/fetches data, it's already there —
 * matching the real commit order (children's effects fire before parents').
 */
export function FixtureSeeder({ children }: { children: React.ReactNode }) {
  if (!seeded) {
    installFixtureFetch();
    seedFixtures();
    seeded = true;
  }
  return <>{children}</>;
}

import { useState } from "react";
import { OnboardingForm, type OnboardingResult } from "./OnboardingForm.js";
import { ObservatoryScene } from "./ObservatoryScene.js";

export default function App() {
  const [onboarding, setOnboarding] = useState<OnboardingResult | null>(null);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", color: "#eae6f4", background: "#08080f", minHeight: "100vh" }}>
      <h1>Cosmos Engine — Observatory</h1>
      {!onboarding && <OnboardingForm onComplete={setOnboarding} />}
      {onboarding && (
        <ObservatoryScene
          tenantId={onboarding.tenantId}
          profileId={onboarding.profileId}
          eventId={onboarding.eventId}
        />
      )}
    </main>
  );
}

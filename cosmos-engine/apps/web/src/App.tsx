import { useState } from "react";
import { OnboardingForm, type OnboardingResult } from "./OnboardingForm.js";

export default function App() {
  const [onboarding, setOnboarding] = useState<OnboardingResult | null>(null);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", color: "#eae6f4", background: "#08080f", minHeight: "100vh" }}>
      <h1>Cosmos Engine — Observatory</h1>
      {!onboarding && <OnboardingForm onComplete={setOnboarding} />}
      {onboarding && <p>Profile {onboarding.profileId} and event {onboarding.eventId} created. Scene rendering arrives in Task 7.</p>}
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import HrCandidateOnboardingPage from "./candidate-onboarding";

export const Route = createFileRoute("/_authenticated/hr/recruitment/onboarding")({
  component: HrCandidateOnboardingPage,
  head: () => ({
    meta: [{ title: "Candidate Onboarding — Master HRMS" }],
  }),
});

export default HrCandidateOnboardingPage;

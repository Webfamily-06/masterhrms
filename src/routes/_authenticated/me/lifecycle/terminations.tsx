import { createFileRoute } from "@tanstack/react-router";
import MeExitClearancePage from "./exit";

export const Route = createFileRoute("/_authenticated/me/lifecycle/terminations")({
  component: MeExitClearancePage,
  head: () => ({
    meta: [{ title: "My Exit & Clearances — Master HRMS" }],
  }),
});

export default MeExitClearancePage;

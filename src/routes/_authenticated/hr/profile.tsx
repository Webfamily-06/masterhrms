import { createFileRoute } from "@tanstack/react-router";
import { MyProfilePage } from "../me/profile";

export const Route = createFileRoute("/_authenticated/hr/profile")({
  component: MyProfilePage,
  head: () => ({
    meta: [{ title: "My Profile — HR Management — Master HRMS" }],
  }),
});

export default MyProfilePage;

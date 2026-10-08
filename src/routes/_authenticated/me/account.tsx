import { createFileRoute } from "@tanstack/react-router";
import { MyProfilePage } from "./profile";

export const Route = createFileRoute("/_authenticated/me/account")({
  component: MyProfilePage,
  head: () => ({
    meta: [{ title: "My Account & Security — Master HRMS" }],
  }),
});

export default MyProfilePage;

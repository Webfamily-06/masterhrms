import { createFileRoute } from "@tanstack/react-router";
import { TenantMediaPage } from "@/components/media/tenant-media-page";

export const Route = createFileRoute("/_authenticated/me/media")({
  component: TenantMediaPage,
  head: () => ({
    meta: [{ title: "Media Library — Employee Portal — Master HRMS" }],
  }),
});

export default TenantMediaPage;

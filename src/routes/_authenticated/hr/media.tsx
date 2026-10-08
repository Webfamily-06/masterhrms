import { createFileRoute } from "@tanstack/react-router";
import { TenantMediaPage } from "@/components/media/tenant-media-page";

export const Route = createFileRoute("/_authenticated/hr/media")({
  component: TenantMediaPage,
  head: () => ({
    meta: [{ title: "Media Library — HR Management — Master HRMS" }],
  }),
});

export default TenantMediaPage;

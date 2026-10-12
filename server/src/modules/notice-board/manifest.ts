import { AddonManifest } from "../manifest.types";

export const noticeBoardManifest: AddonManifest = {
  slug: "notice-board",
  name: "Notice Board & Announcements",
  version: "1.0.0",
  type: "module",
  surface: "hr-module",
  engine: "E12",
  wave: 1,
  entitlementKey: "notice-board",
  routePrefix: "/hr/notice-board",
  description: "Company-wide and targeted broadcast notices, priority badges, policy compliance, and employee acknowledgement tracking.",
  provides: {
    nav: [
      {
        id: "notice-board",
        label: "Notice Board",
        path: "/hr/notice-board",
        icon: "Megaphone",
      },
    ],
    permissions: [
      "notice-board.view",
      "notice-board.manage",
      "notice-board.acknowledge",
    ],
    events: [
      "notice-board.notice.created",
      "notice-board.notice.acknowledged",
      "notice-board.notice.deleted",
    ],
  },
  marketplace: {
    category: "Mobility and Communication",
    badge: "wave-1",
    rating: 4.8,
    reviewsCount: 34,
    isPopular: true,
  },
};

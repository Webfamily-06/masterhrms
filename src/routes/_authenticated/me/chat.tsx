import { createFileRoute } from "@tanstack/react-router";
import { TeamWhatsAppChatAddon } from "@/components/chat/team-whatsapp-chat-addon";

export const Route = createFileRoute("/_authenticated/me/chat")({
  component: TeamWhatsAppChatAddon,
  head: () => ({
    meta: [{ title: "Team Chat — Employee Portal — Master HRMS" }],
  }),
});

export default TeamWhatsAppChatAddon;

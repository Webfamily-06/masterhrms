import { createFileRoute } from "@tanstack/react-router";
import { TeamWhatsAppChatAddon } from "@/components/chat/team-whatsapp-chat-addon";

export const Route = createFileRoute("/_authenticated/hr/chat")({
  component: TeamWhatsAppChatAddon,
  head: () => ({
    meta: [{ title: "Team Chat — HR Management — Master HRMS" }],
  }),
});

export default TeamWhatsAppChatAddon;

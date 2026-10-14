import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.record(z.any());

export const Route = createFileRoute("/register")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/auth",
      search: {
        ...search,
        mode: "signup",
      },
      replace: true,
    });
  },
  component: () => null,
});

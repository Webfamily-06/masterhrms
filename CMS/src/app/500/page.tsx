'use client';

import { ServerErrorView } from "@/components/error-pages/server-error-view";

export default function ServerErrorPage() {
  return (
    <ServerErrorView
      customTitle="Oops, something went wrong"
      customMessage="Server Error 500. We apologise and are fixing the problem. Please try again at a later stage"
    />
  );
}

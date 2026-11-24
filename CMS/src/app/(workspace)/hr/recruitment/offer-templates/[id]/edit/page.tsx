"use client";

import { useParams } from "next/navigation";
import { OfferTemplateForm } from "../../_components/offer-template-form";

export default function EditOfferTemplatePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  return <OfferTemplateForm mode="edit" templateId={id} />;
}

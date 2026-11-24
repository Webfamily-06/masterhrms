"use client";

import { useParams } from "next/navigation";
import { JobPostingWizard } from "../../_components/job-posting-wizard";

export default function EditJobPostingPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  return <JobPostingWizard mode="edit" jobId={id} />;
}

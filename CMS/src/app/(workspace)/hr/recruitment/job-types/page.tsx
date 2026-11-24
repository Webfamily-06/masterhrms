"use client";

import { SplitMasterCrud } from "../_components/split-master-crud";

export default function HrJobTypesPage() {
  return (
    <SplitMasterCrud
      config={{
        pageTitle: "Job Types",
        pageSubtitle: "Manage job types such as full-time, part-time, and contract.",
        formCreateTitle: "Add New Job Type",
        formCreateSubtitle: "Fill in the details to create a new job type",
        formEditTitle: "Edit Job Type",
        nameLabel: "Job Type Name",
        namePlaceholder: "e.g., Full-time, Part-time, Contract",
        descriptionPlaceholder: "Brief description of the job type",
        addButtonLabel: "Add Job Type",
        updateButtonLabel: "Update Job Type",
        searchPlaceholder: "Search job types...",
        endpoint: "/hr/recruitment/job-types",
        queryKey: "hr-recruitment-job-types",
        iconClass: "ph-stack",
        iconBoxClass: "bg-purple-500/10 text-purple-600",
      }}
    />
  );
}

"use client";

import { SplitMasterCrud } from "../_components/split-master-crud";

export default function HrCandidateSourcesPage() {
  return (
    <SplitMasterCrud
      config={{
        pageTitle: "Candidate Sources",
        pageSubtitle: "Manage sources used to track where candidates come from.",
        formCreateTitle: "Add New Candidate Source",
        formCreateSubtitle: "Fill in the details to create a new candidate source",
        formEditTitle: "Edit Candidate Source",
        nameLabel: "Source Name",
        namePlaceholder: "e.g., LinkedIn, Referral, Job Board",
        descriptionPlaceholder: "Brief description of the candidate source",
        addButtonLabel: "Add Candidate Source",
        updateButtonLabel: "Update Candidate Source",
        searchPlaceholder: "Search candidate sources...",
        endpoint: "/hr/recruitment/candidate-sources",
        queryKey: "hr-recruitment-candidate-sources",
        iconClass: "ph-globe",
        iconBoxClass: "bg-emerald-500/10 text-emerald-600",
      }}
    />
  );
}

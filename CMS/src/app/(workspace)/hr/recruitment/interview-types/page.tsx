"use client";

import { SplitMasterCrud } from "../_components/split-master-crud";

export default function HrInterviewTypesPage() {
  return (
    <SplitMasterCrud
      config={{
        pageTitle: "Interview Types",
        pageSubtitle: "Manage interview types used in your recruitment process.",
        formCreateTitle: "Add New Interview Type",
        formCreateSubtitle: "Fill in the details to create a new interview type",
        formEditTitle: "Edit Interview Type",
        nameLabel: "Interview Type Name",
        namePlaceholder: "e.g., Technical, HR, Panel, Phone Screen",
        descriptionPlaceholder: "Brief description of the interview type",
        addButtonLabel: "Add Interview Type",
        updateButtonLabel: "Update Interview Type",
        searchPlaceholder: "Search interview types...",
        endpoint: "/hr/recruitment/interview-types",
        queryKey: "hr-recruitment-interview-types",
        iconClass: "ph-chat-text",
        iconBoxClass: "bg-purple-500/10 text-purple-600",
      }}
    />
  );
}

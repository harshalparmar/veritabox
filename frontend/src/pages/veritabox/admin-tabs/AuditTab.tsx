import React from "react";
import ProctorAuditDashboard from "@/components/VeritaBox/ProctorAuditDashboard";

interface AuditTabProps {
  id: string;
}

export default function AuditTab({ id }: AuditTabProps) {
  return <ProctorAuditDashboard hackathonId={id} />;
}

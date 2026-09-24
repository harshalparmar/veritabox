import React from "react";
import ProctorAuditDashboard from "@/components/veritabox/ProctorAuditDashboard";

interface AuditTabProps {
  id: string;
}

export default function AuditTab({ id }: AuditTabProps) {
  return <ProctorAuditDashboard hackathonId={id} />;
}

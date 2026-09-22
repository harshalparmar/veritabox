import { AdminLayout } from "@/components/VeritaBox/AdminLayout";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { Surface, SectionTitle } from "@/components/VeritaBox/UI";

export default function AdminJobs() {
  return (
    <AdminLayout>
      <PageContent>
        <Surface className="p-6 text-center text-muted-foreground">
          <SectionTitle>Recruiter Job Management</SectionTitle>
          <p>Job postings, candidate matches, and application pipelines will appear here.</p>
        </Surface>
      </PageContent>
    </AdminLayout>
  );
}

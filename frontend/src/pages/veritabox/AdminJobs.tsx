import { AdminLayout } from "@/components/veritabox/AdminLayout";
import { PageContent } from "@/components/veritabox/VeritaBoxLayout";
import { Surface, SectionTitle } from "@/components/veritabox/UI";

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

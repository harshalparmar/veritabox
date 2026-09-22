import { VeritaBoxLayout, PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { ComingSoon } from "@/components/VeritaBox/UI";

/** Generic placeholder for routes that are scaffolded but not yet built out. */
export function VeritaBoxPlaceholder({
  title, note,
}: { title: string; note?: string }) {
  return (
    <VeritaBoxLayout>
      <PageContent>
        <ComingSoon title={title} note={note} />
      </PageContent>
    </VeritaBoxLayout>
  );
}

import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/VeritaBox/AdminLayout";
import { PageContent } from "@/components/VeritaBox/VeritaBoxLayout";
import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "@/lib/api";
import { Loader2, ArrowLeft, Download, Mail } from "lucide-react";
import { format } from "date-fns";

export default function AdminEventManagement() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: event, isLoading: loadingEvent } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsApi.getById(id!),
  });

  const { data: registrations, isLoading: loadingRegs } = useQuery({
    queryKey: ["event-registrations", id],
    queryFn: () => eventsApi.getRegistrations(id!),
  });

  if (loadingEvent || loadingRegs) {
    return (
      <AdminLayout>
        <PageContent>
          <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        </PageContent>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageContent>
        <div className="mb-6 border-b border-border pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <button 
              onClick={() => navigate(`/cmd/events`)}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Events
            </button>
            <h1 className="text-[28px] font-semibold tracking-tight mt-1">{event.title}</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Manage attendees and registrations.</p>
          </div>
          <button className="h-9 px-4 bg-secondary border border-border rounded text-[11px] font-bold uppercase tracking-widest hover:bg-border transition-colors flex items-center gap-1.5 self-start sm:self-auto">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>

        <div className="bg-card border border-border rounded overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/30 border-b border-border">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Attendee</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Organization</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Registered On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-[13px]">
              {registrations?.map((reg: any) => (
                <tr key={reg._id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{reg.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" /> {reg.email}
                      <span className="ml-2">{reg.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      reg.status === 'Student' ? 'bg-blue-500/10 text-blue-400 border-blue-400/30' : 'bg-purple-500/10 text-purple-400 border-purple-400/30'
                    }`}>
                      {reg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {reg.institutionOrCompany}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-[12px]">
                    {format(new Date(reg.createdAt), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
              {registrations?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No registrations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PageContent>
    </AdminLayout>
  );
}

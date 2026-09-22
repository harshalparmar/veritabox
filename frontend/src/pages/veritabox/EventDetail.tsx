import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PublicShell } from "@/components/VeritaBox/PublicShell";
import { Surface } from "@/components/VeritaBox/UI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, Loader2, Info } from "lucide-react";
import { eventsApi, resolveAssetUrl, getToken } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    status: "Student", // 'Student' or 'Professional'
    institutionOrCompany: ""
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      // Find event by slug or ID
      const events = await eventsApi.getAll();
      const match = events.find(e => e.slug === slug || e._id === slug);
      if (!match) throw new Error("Event not found");
      return eventsApi.getById(match._id);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) => eventsApi.register(event._id, data),
    onSuccess: (res) => {
      toast.success("Registration successful! Check your email.");
      navigate(`/events/${event._id}/id-card/${res.ticketToken}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to register");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.institutionOrCompany) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    registerMutation.mutate({
      ...formData,
      userId: user?._id
    });
  };

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </PublicShell>
    );
  }

  if (!event) {
    return (
      <PublicShell>
        <div className="py-32 text-center text-muted-foreground">Event not found.</div>
      </PublicShell>
    );
  }

  const isLiveOrUpcoming = event.status === "Live" || event.status === "Upcoming";

  return (
    <PublicShell>
      {/* Hero Section */}
      <div className="relative border-b border-border bg-card/30">
        {event.coverUrl && (
          <div className="absolute inset-0 z-0 opacity-20">
            <img 
              src={resolveAssetUrl(event.coverUrl)} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}
        <div className="relative z-10 mx-auto max-w-[1300px] px-6 py-16 lg:py-24">
          <div className="flex gap-2 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-card text-foreground">
              {event.category}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-400/30">
              {event.status || 'Upcoming'}
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {event.eventDate ? format(new Date(event.eventDate), "PPP p") : "TBA"}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {event.location || "TBA"}</span>
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Max Capacity: {event.capacity || 50}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-lg font-semibold tracking-tight mb-4">About the Event</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </div>
            </section>
            
            {event.rulebookUrl && (
              <section>
                <h2 className="text-lg font-semibold tracking-tight mb-4">Resources</h2>
                <a href={resolveAssetUrl(event.rulebookUrl)} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                  Download Rulebook / Brochure
                </a>
              </section>
            )}
          </div>

          <div>
            <Surface className="p-6 sticky top-24">
              <h3 className="text-base font-semibold tracking-tight mb-2">Registration</h3>
              
              {!isLiveOrUpcoming ? (
                <div className="p-4 rounded bg-muted/20 text-muted-foreground text-sm text-center border border-border/50">
                  Registration is closed for this event.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Full Name</label>
                    <Input 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Email Address</label>
                    <Input 
                      type="email"
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Phone Number</label>
                    <Input 
                      type="tel"
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="+1 234 567 8900"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input 
                        type="radio" 
                        checked={formData.status === "Student"} 
                        onChange={() => setFormData({...formData, status: "Student", institutionOrCompany: ""})}
                      /> Student
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input 
                        type="radio" 
                        checked={formData.status === "Professional"} 
                        onChange={() => setFormData({...formData, status: "Professional", institutionOrCompany: ""})}
                      /> Professional
                    </label>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      {formData.status === "Student" ? "Institute / University" : "Company / Profession"}
                    </label>
                    <Input 
                      value={formData.institutionOrCompany} 
                      onChange={e => setFormData({...formData, institutionOrCompany: e.target.value})}
                      placeholder={formData.status === "Student" ? "MIT" : "Acme Corp"}
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Confirm Registration
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
                    <Info className="h-3 w-3" /> A digital ID card will be sent to your email.
                  </p>
                </form>
              )}
            </Surface>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

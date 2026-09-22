import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download, Ticket } from "lucide-react";
import { eventsApi } from "@/lib/api";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

export default function EventIdCard() {
  const { token } = useParams();

  const { data: registration, isLoading, isError } = useQuery({
    queryKey: ["event-registration", token],
    queryFn: () => eventsApi.getRegistration(token!),
    enabled: !!token
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (isError || !registration) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 text-gray-500 flex-col gap-4">
        <Ticket className="h-12 w-12 opacity-20" />
        <p>Invalid or expired ticket token.</p>
      </div>
    );
  }

  const { event, name, institutionOrCompany, ticketToken } = registration;
  const eventDate = event.eventDate ? format(new Date(event.eventDate), "MMM d, yyyy · p") : "TBA";
  const shortToken = ticketToken.split('-')[0].toUpperCase();

  return (
    <>
      <style>{`
        :root { --bg: #eef2f5; --paper: #f7faff; --ink: #0f2030; --line: #b8c7d4; --navy: #163a5f; --orange: #ee7c30; --muted: #5a6e7f; }
        body { margin: 0; background: var(--bg); color: var(--ink); font-family: 'Inter', system-ui, sans-serif; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
        .id-container { display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .card { width: min(360px, 92vw); aspect-ratio: 54 / 86; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 18px; position: relative; overflow: hidden; box-shadow: 0 20px 50px -20px rgba(22, 58, 95, 0.25); background-image: linear-gradient(rgba(22, 58, 95, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(22, 58, 95, 0.06) 1px, transparent 1px); background-size: 18px 18px; background-position: -1px -1px; display: flex; flex-direction: column; }
        .card-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding-bottom: 80px; }
        .strap { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 12px; background: var(--navy); border-radius: 0 0 6px 6px; }
        .head { display: flex; justify-content: space-between; align-items: center; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 10px; }
        .logo { display: flex; align-items: center; gap: 6px; color: var(--navy); font-weight: 700; letter-spacing: 0.06em; }
        .logo .glyph { width: 14px; height: 14px; border: 1.5px solid var(--navy); transform: rotate(45deg); position: relative; }
        .logo .glyph::after { content: ""; position: absolute; inset: 2.5px; background: var(--orange); }
        .role { padding: 3px 8px; background: var(--orange); color: #fff; border-radius: 2px; font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; }
        .scheme { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--orange); letter-spacing: 0.22em; text-transform: uppercase; }
        .card h1 { margin: 4px 0 0; font-size: 26px; font-weight: 700; line-height: 1.05; letter-spacing: -0.01em; color: var(--navy); }
        .sub { margin-top: 6px; font-size: 12px; color: var(--muted); margin-bottom: 24px; }
        .name { text-align: center; font-size: 18px; font-weight: 700; color: var(--ink); }
        .college { text-align: center; font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .meta { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .meta b { display: block; color: var(--ink); font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 500; letter-spacing: 0; text-transform: none; margin-top: 2px; }
        .foot { position: absolute; left: 18px; right: 18px; bottom: 14px; display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
        .qr { width: 72px; height: 72px; background: #fff; border: 1px solid var(--line); padding: 4px; border-radius: 4px; display: grid; place-items: center; }
        .verify { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; color: var(--muted); text-align: right; line-height: 1.5; }
        .verify .id { color: var(--navy); font-weight: 700; font-size: 11px; }
        .verify b { color: var(--orange); }
        .print-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: var(--navy); color: white; border: none; border-radius: 6px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .print-btn:hover { opacity: 0.9; }
        @media print { body { background: #fff; padding: 0; } .card { box-shadow: none; border: 1px solid #000; } .print-btn { display: none; } }
      `}</style>
      <div className="id-container">
        <div className="card">
          <div className="strap"></div>
          <div className="head">
            <div className="logo"><span className="glyph"></span> VeritaBox · LAB</div>
            <div className="role">Visitor's Pass</div>
          </div>
          
          <div className="card-body">
            <div className="scheme">▤ EVENT</div>
            <h1>{event.title}</h1>
            <div className="sub">{event.category || "Event"} · {event.status || "Upcoming"}</div>

            <div className="name">{name}</div>
            <div className="college">{institutionOrCompany}</div>

            <div className="meta">
              <div>Date & Time<b>{eventDate}</b></div>
              <div>Venue<b>{event.location || "TBA"}</b></div>
              <div>Seat<b>General</b></div>
              <div>Type<b>{event.category || "Pass"}</b></div>
            </div>
          </div>

          <div className="foot">
            <div className="qr">
              <QRCodeSVG value={ticketToken} size={62} level="M" fgColor="#163a5f" />
            </div>
            <div className="verify">
              <span className="id">TKT-{shortToken}</span><br/>
              verify · <b>veritabox.com</b><br/>
              scan to authenticate
            </div>
          </div>
        </div>
        
        <button className="print-btn" onClick={handlePrint}>
          <Download size={16} /> Download ID Card
        </button>
      </div>
    </>
  );
}

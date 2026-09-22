import { 
  Radar, RadarChart as RechartsRadar, PolarGrid, 
  PolarAngleAxis, ResponsiveContainer 
} from 'recharts';

interface RadarData {
  subject: string;
  A: number;
  fullMark: number;
}

export function RadarChart({ data }: { data: RadarData[] }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }} 
          />
          <Radar
            name="Skills"
            dataKey="A"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}

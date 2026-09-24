import re

with open('src/pages/kernbox/JobDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { KernBoxLayout, PageHeader, PageContent } from "@/components/kernbox/KernBoxLayout";', 'import { PublicShell } from "@/components/kernbox/PublicShell";\nimport { Link } from "react-router-dom";')

content = content.replace('''    return (
      <KernBoxLayout>
        <div className="flex justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </KernBoxLayout>
    );''', '''    return (
      <PublicShell>
        <div className="flex justify-center py-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </PublicShell>
    );''')

start_idx = content.find('  return (\n    <KernBoxLayout>')

if start_idx != -1:
    header_end = content.find('              {/* Meta grid */}', start_idx)
    if header_end != -1:
        new_header = '''  return (
    <PublicShell>
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-[1300px] px-6 py-10">
          <button
            onClick={() => navigate("/jobs")}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-6 flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Jobs
          </button>
          
          <div className="mt-3 flex items-center gap-2">
            <Pill variant={typeVariant}>
              {job.type === "Job" ? "Full-time" : job.type}
            </Pill>
            {job.isRemote && (
              <span className="text-[11px] font-mono text-success uppercase">
                Remote
              </span>
            )}
          </div>
          <h1 className="mt-3 text-[32px] font-semibold tracking-tight">{job.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
             <span className="flex items-center gap-1">
               <Building2 className="h-4 w-4" />
               {job.company}
             </span>
             {job.location && (
               <span className="flex items-center gap-1">
                 <MapPin className="h-4 w-4" />
                 {job.location}
               </span>
             )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1300px] px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            <Surface className="p-5 sm:p-6">
'''
        content = content[:start_idx] + new_header + content[header_end:]
        content = content.replace('    </KernBoxLayout>', '    </PublicShell>')
        content = content.replace('      </PageContent>\n', '      </div>\n')
        
        with open('src/pages/kernbox/JobDetail.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated JobDetail.tsx")
    else:
        print("Could not find Meta grid")
else:
    print("Could not find start of return block")

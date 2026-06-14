import AppLayout from "@/components/layout/AppLayout";
import { BookOpen, Info } from "lucide-react";

export default function Admin() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-tight">About UStud</h1>
          <p className="text-[#666666] text-sm mt-1">Offline learning stack</p>
        </div>

        <div className="space-y-6 text-sm">
          <div className="flex gap-3 p-4 border border-[#e5e5e5] bg-white">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-2">Content</p>
              <p className="text-muted-foreground">
                Courses live in the <code className="text-xs bg-[#f5f5f5] px-1">modules/</code> folder (YAML + content
                packs). Wikipedia articles come from a Kiwix <code className="text-xs bg-[#f5f5f5] px-1">.zim</code> file in{" "}
                <code className="text-xs bg-[#f5f5f5] px-1">%APPDATA%\UStud\content\zim</code>.
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-4 border border-[#e5e5e5] bg-white">
            <BookOpen className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-2">AI</p>
              <p className="text-muted-foreground mb-2">
                The tutor uses <strong>Ollama</strong> on this computer (<code className="text-xs">ollama serve</code>).
                Configure the model in <code className="text-xs">USTUD_LLM_MODEL</code> or <code className="text-xs">src/ustud/config.py</code>.
              </p>
              <p className="text-muted-foreground">
                In development, run <code className="text-xs">python run.py</code> then{" "}
                <code className="text-xs">npm run dev</code> inside <code className="text-xs">boiler/</code>. For production,{" "}
                <code className="text-xs">npm run build</code> in <code className="text-xs">boiler/</code> and open the app via the Python server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

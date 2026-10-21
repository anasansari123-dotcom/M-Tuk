import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  error: { icon: XCircle, className: "border-destructive/30 bg-destructive/5 text-destructive" },
  warning: { icon: AlertTriangle, className: "border-warning/30 bg-warning-soft text-warning" },
  info: { icon: Info, className: "border-info/25 bg-info-soft text-info" },
  success: { icon: CheckCircle2, className: "border-success/30 bg-success-soft text-success" },
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = tones[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm", toneClass, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-0.5">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={cn(title && "text-foreground/80")}>{children}</div>
      </div>
    </div>
  );
}

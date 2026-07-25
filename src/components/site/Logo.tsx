import { GraduationCap } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 font-semibold text-lg ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-primary)" }}>
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="tracking-tight">
        SmartSchool <span className="text-primary">RDC</span>
      </span>
    </Link>
  );
}
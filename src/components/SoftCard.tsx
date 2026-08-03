import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SoftCard({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <Tag className={cn("soft-card rounded-3xl p-5", className)}>{children}</Tag>;
}

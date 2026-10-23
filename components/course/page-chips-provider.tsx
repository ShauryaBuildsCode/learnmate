"use client";

import type { ReactNode } from "react";
import { SourceProvider } from "@/components/source/source-context";

/** Lets every page chip under a course open the matching passage of the uploaded material. */
export function PageChipsProvider({
  pages,
  children,
}: {
  pages: Record<number, string>;
  children: ReactNode;
}) {
  return <SourceProvider pages={pages}>{children}</SourceProvider>;
}

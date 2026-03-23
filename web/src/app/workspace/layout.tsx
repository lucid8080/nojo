import { WorkspaceDocumentLock } from "@/components/workspace/WorkspaceDocumentLock";
import type { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <WorkspaceDocumentLock />
      {children}
    </>
  );
}

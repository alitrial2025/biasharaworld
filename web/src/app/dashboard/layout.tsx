import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace/shell";
export const metadata: Metadata = {
  title: {
    default: "Your workspace | BiasharaOS",
    template: "%s | BiasharaOS workspace",
  },
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WorkspaceShell>{children}</WorkspaceShell>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  saveFreeToolHandoff,
  type FreeToolHandoff,
} from "@/lib/free-tools/handoff";

export function WorkspaceHandoffButton({
  handoff,
  children = "Continue in Workspace",
  className = "",
}: {
  handoff: FreeToolHandoff;
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          try {
            saveFreeToolHandoff(handoff);
            router.push("/workspace/import");
          } catch {
            setError("This result could not be prepared for Workspace. Please try again.");
          }
        }}
        className={className}
      >
        {children}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

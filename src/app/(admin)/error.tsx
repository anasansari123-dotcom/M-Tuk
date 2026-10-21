"use client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/admin/notice";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-12">
      <Notice tone="error" title="This page could not load">
        The server or database did not respond as expected. No changes were made. Try again, and if it keeps failing check the System
        status page.
      </Notice>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

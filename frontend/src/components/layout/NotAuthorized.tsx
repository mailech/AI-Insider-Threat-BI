import React from "react";
import { ShieldAlert } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import Link from "next/link";

export function NotAuthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full flex flex-col items-center text-center p-12">
        <ShieldAlert className="w-12 h-12 text-fog mb-6 stroke-[1.5]" />
        <h2 className="text-subheading font-sans font-medium text-bone mb-2">
          Access Restricted
        </h2>
        <p className="text-body text-ash mb-8">
          Your current role does not have permission to view this page. If you believe this is an error, please contact your security administrator.
        </p>
        <Link href="/">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}

import { Suspense } from "react";
import PasswordClient from "./PasswordClient";

export default function PasswordPage() {
  return (
    <Suspense fallback={null}>
      <PasswordClient />
    </Suspense>
  );
}

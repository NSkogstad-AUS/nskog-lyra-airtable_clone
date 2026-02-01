import { Suspense } from "react";
import CreateProfileClient from "./CreateProfileClient";

export default function CreateProfilePage() {
  return (
    <Suspense fallback={null}>
      <CreateProfileClient />
    </Suspense>
  );
}

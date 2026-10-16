import "server-only";
import { redirect } from "next/navigation";
import { requireUser, HttpError } from "./server";
export async function protectPage() {
  try {
    return await requireUser();
  } catch (e) {
    if (e instanceof HttpError && [401, 503].includes(e.status))
      redirect("/auth");
    throw e;
  }
}

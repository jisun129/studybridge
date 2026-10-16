export const dynamic = "force-dynamic";
import { protectPage } from "@/lib/protected";
import Reading from "@/components/reading";
export default async function ReadingPage() {
  await protectPage();
  return <Reading />;
}

export const dynamic = "force-dynamic";
import { protectPage } from "@/lib/protected";
import Vocabulary from "@/components/vocabulary";
export default async function VocabularyPage() {
  await protectPage();
  return <Vocabulary />;
}

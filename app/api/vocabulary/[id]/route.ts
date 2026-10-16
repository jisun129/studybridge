import {
  requireUser,
  sameOrigin,
  failure,
  json,
  HttpError,
} from "@/lib/server";
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const { db, user } = await requireUser();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new HttpError(400, "잘못된 항목 ID입니다.");
    const { data, error } = await db
      .from("vocabulary")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");
    if (error) throw error;
    if (!data.length) throw new HttpError(404, "항목을 찾을 수 없습니다.");
    return json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}

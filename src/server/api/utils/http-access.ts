import type { Session } from "next-auth";

import { getServerAuthSession } from "@/server/auth";
import { getUserAccess } from "@/server/api/utils/access";
import { Role } from "@/server/db/enums";

export type AdminSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: 401 | 403; error: "Unauthorized" | "Forbidden" };

export const requireAdminOrOwnerSession = async (): Promise<AdminSessionResult> => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const access = await getUserAccess(session.user.id, session.user.email);
  if (access.role !== Role.ADMIN && access.role !== Role.OWNER) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, session };
};

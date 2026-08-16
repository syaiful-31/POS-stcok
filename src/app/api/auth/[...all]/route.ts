import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Handler Better Auth untuk semua endpoint /api/auth/*.
export const { GET, POST } = toNextJsHandler(auth);

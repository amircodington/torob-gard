import { proxy } from "../../../lib/proxy";

export const dynamic = "force-dynamic";

const go = (req: Request) => proxy(req, process.env.API_URL ?? "http://localhost:8000");
export { go as GET, go as POST, go as PUT, go as PATCH, go as DELETE };

import { SiteHeader } from "../../components/SiteHeader";
import { Loader } from "../../components/ui/Loader";

// The landing only (a route group): a root loading.tsx would wrap every route and stream it, so a
// notFound() on a catalog page would answer 200 instead of 404.
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <Loader />
      </main>
    </>
  );
}

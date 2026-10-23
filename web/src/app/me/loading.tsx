import { SiteHeader } from "../../components/SiteHeader";
import { Loader } from "../../components/ui/Loader";

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

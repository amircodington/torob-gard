import { Loader } from "../../components/ui/Loader";
import { SkeletonBar } from "../../components/ui/Skeleton";

// The consult chat has no list to sketch: the loader, under the journey bar.
export default function Loading() {
  return (
    <>
      <SkeletonBar />
      <main className="page pt-2">
        <Loader />
      </main>
    </>
  );
}

import { Skeleton, SkeletonCard, SkeletonPage, SkeletonTitle } from "../../components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage label="در حال جستجو">
      <SkeletonTitle className="w-28" />
      <Skeleton className="h-11 rounded-pill" />
      <SkeletonCard rows={4} thumb="size-14" lines={["h-5", "h-5", "h-6", "h-4"]} />
    </SkeletonPage>
  );
}

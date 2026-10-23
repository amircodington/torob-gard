import { Skeleton, SkeletonBar, TierSkeletons } from "../../components/ui/Skeleton";

// The desk's own layout: page head (measured 208 px phone / 88 px lg), then the three tier cards.
export default function Loading() {
  return (
    <>
      <SkeletonBar />
      <main className="page pb-32 pt-2">
        <p role="status" className="sr-only">در حال آماده کردن میز تصمیم</p>
        <div className="mt-4 flex h-[208px] animate-loader-in flex-col gap-3 lg:h-[88px]">
          <Skeleton className="h-7 w-40 rounded-pill" />
          <Skeleton className="h-4 w-4/5 rounded-pill lg:w-2/5" />
          <Skeleton className="h-4 w-3/5 rounded-pill lg:hidden" />
          <Skeleton className="mt-auto h-11 w-3/5 rounded-pill lg:hidden" />
        </div>
        <TierSkeletons />
      </main>
    </>
  );
}

import { RowSkeletons, Skeleton, SkeletonBar } from "../../../components/ui/Skeleton";

// The radar's column at its measured heights: head (80 / lg 56), anchor picker (172 / lg 76), the list|map switch
// (phone only), the 60 px toolbar band and the count line, then shop rows in the 440 px list column.
export default function Loading() {
  return (
    <>
      <SkeletonBar />
      <main role="status" aria-label="در حال پیدا کردن فروشگاه‌ها" className="page animate-loader-in pb-32 pt-2">
        <div className="mt-4 flex h-20 flex-col gap-3 lg:h-14">
          <Skeleton className="h-6 w-36 rounded-pill" />
          <Skeleton className="h-4 w-3/5 rounded-pill" />
        </div>
        <Skeleton className="mt-3 h-[172px] rounded-lg lg:h-[76px]" />
        <Skeleton className="mt-4 h-[52px] w-44 rounded-pill md:hidden" />
        <div className="mt-2 flex h-[60px] items-center gap-2">
          <Skeleton className="h-11 w-64 rounded-pill" />
          <Skeleton className="size-11 rounded-full" />
        </div>
        <div className="mt-2 h-[26px] lg:w-[440px]" />
        <div className="lg:w-[440px]">
          <RowSkeletons />
        </div>
      </main>
    </>
  );
}

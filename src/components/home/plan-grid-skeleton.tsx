import { Card } from "@/components/ui/card";

export function PlanGridSkeleton() {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4"
      aria-label="正在加载学习计划"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={index}
          tone="soft"
          className="min-h-[280px] animate-pulse gap-5 rounded-none border-ink p-5"
          aria-hidden="true"
        >
          <div className="h-6 w-2/3 bg-bd-card" />
          <div className="h-3 w-1/2 bg-bd-card" />
          <div className="flex items-center gap-4 py-5">
            <div className="size-[70px] rounded-full bg-bd-card" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 bg-bd-card" />
              <div className="h-3 w-2/3 bg-bd-card" />
            </div>
          </div>
          <div className="mt-auto h-2.5 bg-bd-card" />
        </Card>
      ))}
    </div>
  );
}

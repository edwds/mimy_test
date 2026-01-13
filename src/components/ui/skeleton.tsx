import { cn } from "@/lib/utils"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-[var(--color-gray-100)]", className)}
            {...props}
        />
    )
}

export { Skeleton }

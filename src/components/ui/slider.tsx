import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
    HTMLInputElement,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
        value: number[]
        onValueChange: (value: number[]) => void
        max?: number
        min?: number
        step?: number
    }
>(({ className, value, onValueChange, max = 100, min = 0, step = 1, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange([parseFloat(e.target.value)])
    }

    return (
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value[0]}
            onChange={handleChange}
            ref={ref}
            className={cn(
                "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary",
                className
            )}
            {...props}
        />
    )
})
Slider.displayName = "Slider"

export { Slider }

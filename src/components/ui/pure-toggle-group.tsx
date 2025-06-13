import * as React from "react"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants, type ToggleProps } from "@/components/ui/toggle"

type ToggleGroupContextType = VariantProps<typeof toggleVariants> & {
  value?: string[]
  onValueChange?: (value: string[]) => void
  type?: 'single' | 'multiple'
}

const ToggleGroupContext = React.createContext<ToggleGroupContextType>({
  size: "default",
  variant: "default",
  type: 'multiple',
  value: [],
})

interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof toggleVariants> {
  type?: 'single' | 'multiple'
  value?: string[]
  onValueChange?: (value: string[]) => void
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className, variant, size, children, type = 'multiple', value, onValueChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string[]>(value || [])

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value)
      }
    }, [value])

    const handleValueChange = React.useCallback((newValue: string[]) => {
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }, [onValueChange])

    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center gap-1", className)}
        {...props}
      >
        <ToggleGroupContext.Provider value={{ 
          variant, 
          size, 
          type, 
          value: internalValue, 
          onValueChange: handleValueChange 
        }}>
          {children}
        </ToggleGroupContext.Provider>
      </div>
    )
  }
)

ToggleGroup.displayName = "ToggleGroup"

interface ToggleGroupItemProps extends Omit<ToggleProps, 'pressed' | 'onPressedChange'> {
  value: string
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, children, variant, size, value, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)
    const isActive = context.value?.includes(value)

    const handleClick = () => {
      if (!context.onValueChange || !context.value) return

      if (context.type === 'single') {
        context.onValueChange([value])
      } else {
        if (isActive) {
          context.onValueChange(context.value.filter(v => v !== value))
        } else {
          context.onValueChange([...context.value, value])
        }
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={isActive}
        data-state={isActive ? "on" : "off"}
        className={cn(
          toggleVariants({
            variant: context.variant || variant,
            size: context.size || size,
          }),
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)

ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem, type ToggleGroupProps, type ToggleGroupItemProps }
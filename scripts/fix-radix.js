#!/usr/bin/env node

/**
 * This script ensures the toggle components have no Radix UI dependencies
 * by directly overwriting them with our pure implementations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the file paths
const componentsDir = path.join(__dirname, '..', 'src', 'components', 'ui');
const togglePath = path.join(componentsDir, 'toggle.tsx');
const toggleGroupPath = path.join(componentsDir, 'toggle-group.tsx');

console.log('Starting fix-radix.js...');
console.log('Fixing Radix UI dependencies in toggle components...');

// Pure Toggle Implementation (without Radix UI)
const pureToggle = `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof toggleVariants> {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, variant, size, pressed, onPressedChange, ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState(pressed || false)

    React.useEffect(() => {
      if (pressed !== undefined) {
        setIsPressed(pressed)
      }
    }, [pressed])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const newPressed = !isPressed
      setIsPressed(newPressed)
      onPressedChange?.(newPressed)
      props.onClick?.(e)
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={isPressed}
        data-state={isPressed ? "on" : "off"}
        className={cn(toggleVariants({ variant, size, className }))}
        onClick={handleClick}
        {...props}
      />
    )
  }
)

Toggle.displayName = "Toggle"

export { Toggle, toggleVariants, type ToggleProps }`;

// Pure Toggle Group Implementation (without Radix UI)
const pureToggleGroup = `import * as React from "react"
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

export { ToggleGroup, ToggleGroupItem, type ToggleGroupProps, type ToggleGroupItemProps }`;

// Write the fixed files
try {
  // Check if the current toggle has Radix UI imports
  let currentToggle = '';
  try {
    currentToggle = fs.readFileSync(togglePath, 'utf8');
  } catch (err) {
    console.log(`Toggle file not found at ${togglePath}, creating new file...`);
  }

  if (currentToggle.includes('@radix-ui/react-toggle') || !currentToggle) {
    console.log('Fixing toggle.tsx (removing Radix UI dependencies)...');
    fs.writeFileSync(togglePath, pureToggle);
    console.log('✅ toggle.tsx fixed and saved!');
  } else {
    console.log('✅ toggle.tsx already looks good!');
  }

  // Check if the current toggle-group has Radix UI imports
  let currentToggleGroup = '';
  try {
    currentToggleGroup = fs.readFileSync(toggleGroupPath, 'utf8');
  } catch (err) {
    console.log(`Toggle group file not found at ${toggleGroupPath}, creating new file...`);
  }

  if (currentToggleGroup.includes('@radix-ui/react-toggle-group') || !currentToggleGroup) {
    console.log('Fixing toggle-group.tsx (removing Radix UI dependencies)...');
    fs.writeFileSync(toggleGroupPath, pureToggleGroup);
    console.log('✅ toggle-group.tsx fixed and saved!');
  } else {
    console.log('✅ toggle-group.tsx already looks good!');
  }

  console.log('All files fixed successfully!');
} catch (error) {
  console.error('Error fixing files:', error);
  process.exit(1);
}
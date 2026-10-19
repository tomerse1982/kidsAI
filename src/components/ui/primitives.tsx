/* shadcn/ui-style primitives (owned source, cva + tailwind-merge), tuned to the app palette. */
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 min-h-11",
  {
    variants: {
      variant: {
        primary: "bg-sky-700 text-white hover:bg-sky-500",
        soft: "bg-sky-100 text-sky-700 hover:bg-sky-200",
        pink: "bg-blush-100 text-blush-700 hover:bg-blush-200",
        sage: "bg-sage-100 text-sage-700 hover:bg-sage-200",
        ghost: "text-ink hover:bg-sky-50",
        outline: "border border-sky-200 bg-white text-ink hover:bg-sky-50",
        danger: "bg-red-50 text-red-700 hover:bg-red-100",
      },
      size: { sm: "px-3 text-sm min-h-9", md: "px-4 text-base", lg: "px-6 text-lg", icon: "w-11 px-0" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-card)] bg-white p-4 shadow-[0_2px_14px_rgba(45,49,66,0.07)] ring-1 ring-black/[0.03]", className)} {...props} />;
}

export function SectionTitle({ icon, children, className }: { icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 flex items-center gap-2 text-lg font-semibold text-ink", className)}>
      {icon ? <span aria-hidden className="text-sky-700">{icon}</span> : null}
      {children}
    </h2>
  );
}

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      sky: "bg-sky-100 text-sky-700",
      pink: "bg-blush-100 text-blush-700",
      sage: "bg-sage-100 text-sage-700",
      gray: "bg-gray-100 text-gray-700",
      amber: "bg-amber-100 text-amber-800",
    },
  },
  defaultVariants: { tone: "sky" },
});

export function Badge({ tone, className, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Identifiers such as "1.1.3" or URLs inside RTL text: isolate direction. */
export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={cn("font-mono text-[0.85em] tabular-nums", className)}>
      {children}
    </bdi>
  );
}

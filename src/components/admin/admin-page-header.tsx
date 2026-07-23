"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  iconClassName?: string;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  iconClassName,
  action,
  backHref,
  backLabel = "返回",
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("mb-10", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div className="flex items-start gap-5">
          {Icon && (
            <div
              className={cn(
                "w-14 h-14 rounded-2xl gradient-navy flex items-center justify-center shadow-premium flex-shrink-0 mt-0.5",
                iconClassName
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="space-y-2 pt-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0 pb-0.5">{action}</div>}
      </div>
    </div>
  );
}

interface AdminPageContainerProps {
  children: ReactNode;
  className?: string;
}

export function AdminPageContainer({ children, className }: AdminPageContainerProps) {
  return (
    <div
      className={cn(
        "min-h-[calc(100vh-4rem)] pt-8 pb-12 px-5 sm:px-8 lg:pt-12 lg:pb-16 lg:px-12 max-w-[2400px] mx-auto animate-fadeIn",
        className
      )}
    >
      {children}
    </div>
  );
}

interface AdminSectionCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  titleIcon?: React.ElementType;
  titleAction?: ReactNode;
}

export function AdminSectionCard({
  children,
  className,
  title,
  titleIcon: TitleIcon,
  titleAction,
}: AdminSectionCardProps) {
  return (
    <div className={cn("card-premium overflow-hidden", className)}>
      {(title || TitleIcon || titleAction) && (
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60 bg-gradient-to-r from-card to-sand-50/30">
          <div className="flex items-center gap-2.5 section-title !text-base !before:hidden">
            {TitleIcon && <TitleIcon className="h-4 w-4 text-navy-700" />}
            {title}
          </div>
          {titleAction && <div className="flex-shrink-0">{titleAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

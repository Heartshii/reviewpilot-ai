import type { ReactNode } from "react";
import { AppIcon, IconBadge } from "@/components/ui/premium-icon";

type IconName = Parameters<typeof AppIcon>[0]["name"];

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  scope,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  scope?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(7,17,29,0.35)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-[3rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/52 sm:text-[15px]">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {scope ? (
        <div className="mt-5 inline-flex rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs tracking-[0.16em] text-white/42">
          {scope}
        </div>
      ) : null}
    </section>
  );
}

export function WorkspaceHeroStat({
  eyebrow,
  label,
  value,
  note,
  icon,
}: {
  eyebrow: string;
  label: string;
  value: string;
  note: string;
  icon: IconName;
}) {
  return (
    <div className="flex min-h-[12.75rem] flex-col rounded-[1.85rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-[14rem]">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/26">
            {eyebrow}
          </p>
          <p className="mt-3 font-display text-[1.05rem] font-medium leading-6 tracking-[-0.03em] text-white/92">
            {label}
          </p>
        </div>
        <IconBadge
          name={icon}
          className="h-11 w-11 shrink-0 border-white/10 bg-white/[0.04] text-white/76"
          iconClassName="h-[18px] w-[18px]"
        />
      </div>
      <p className="mt-8 font-display text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white">
        {value}
      </p>
      <p className="mt-auto pt-4 text-sm leading-6 text-white/42">{note}</p>
    </div>
  );
}

export function WorkspaceSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/26">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-display text-[1.65rem] font-semibold tracking-[-0.04em] text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-7 text-white/46">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}

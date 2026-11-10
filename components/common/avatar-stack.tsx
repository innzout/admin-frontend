import { AvatarInitials } from "@/components/common/avatar-initials";

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((name) => (
        <AvatarInitials key={name} name={name} className="size-7 ring-2 ring-card" />
      ))}
      {overflow > 0 && (
        <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
          +{overflow}
        </div>
      )}
    </div>
  );
}

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarColor, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function AvatarInitials({
  name,
  className,
  fallbackClassName,
}: {
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback className={cn("text-xs font-medium", avatarColor(name), fallbackClassName)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

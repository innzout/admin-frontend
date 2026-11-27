"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-auth";
import { notificationHref } from "@/lib/notification-links";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/types";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ notifications: AppNotification[] }>("/api/v1/notifications").then((r) => r.notifications),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api("/api/v1/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/** Click on a notification: mark it read and open the record it is about. */
export function useOpenNotification() {
  const router = useRouter();
  const markRead = useMarkNotificationRead();
  const { data: me } = useMe();
  return (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const href = me ? notificationHref(n, me.role) : null;
    if (href) router.push(href);
  };
}

/** Whether clicking leads anywhere, so the row can say so. */
export function useNotificationHasLink() {
  const { data: me } = useMe();
  return (n: AppNotification) => !!me && notificationHref(n, me.role) !== null;
}

import { useCallback, useEffect, useState } from "react";

import { getUnreadNotificationCount } from "../services/notificationService";

export function usePersonaNotifications(participantId?: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!participantId) {
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const count = await getUnreadNotificationCount(participantId);
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    unreadCount,
    loading,
    refresh,
  };
}

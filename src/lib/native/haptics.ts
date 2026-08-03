import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

import { safeNative } from "./platform";

export const haptic = {
  light: () => void safeNative(() => Haptics.impact({ style: ImpactStyle.Light })),
  medium: () => void safeNative(() => Haptics.impact({ style: ImpactStyle.Medium })),
  heavy: () => void safeNative(() => Haptics.impact({ style: ImpactStyle.Heavy })),
  success: () => void safeNative(() => Haptics.notification({ type: NotificationType.Success })),
  warning: () => void safeNative(() => Haptics.notification({ type: NotificationType.Warning })),
  select: () => void safeNative(() => Haptics.selectionChanged()),
};
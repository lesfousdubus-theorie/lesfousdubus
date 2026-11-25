import type { PassengerAvatarId } from "@/lib/passenger-avatar";

export interface PassengerProfile {
  seatIndex: number;
  entryNumber?: number;
  displayName: string;
  comment: string | null;
  avatarId?: PassengerAvatarId | null;
  joinedAt?: string | null;
}

export interface PassengerManifestEntry {
  seatIndex: number;
  entryNumber?: number;
  displayName: string | null;
  hasComment: boolean;
  joinedAt?: string | null;
}

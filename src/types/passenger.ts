export interface PassengerProfile {
  seatIndex: number;
  displayName: string;
  comment: string | null;
}

export interface PassengerManifestEntry {
  seatIndex: number;
  displayName: string | null;
  hasComment: boolean;
}

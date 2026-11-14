"use client";

interface IconProps {
  className?: string;
}

export function ScrollIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h10a3 3 0 0 0 3-3v-1H11v1a3 3 0 0 1-3 3Zm0 0a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v12" />
      <path d="M9 7h7M9 11h7" />
    </svg>
  );
}

export function PersonIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </svg>
  );
}

export function SeatTicketIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
      <path d="M13 6v2m0 4v2m0 4v0" />
    </svg>
  );
}

export function FullscreenExpandIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />
    </svg>
  );
}

export function BusFrontIcon({ className = "h-5 w-5 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
      <path d="M4 11h16M8 18v2M16 18v2M7.5 14.5h.01M16.5 14.5h.01M9 6h6" />
    </svg>
  );
}

export function MoonIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1Z" />
    </svg>
  );
}

export function SunIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

export function CrosshairResetIcon({ className = "h-5 w-5 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
    </svg>
  );
}

export function MusicNoteIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function EqualizerDetailsIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h12M3 12h8M3 18h10" />
      <path d="M17 17V8l4-1v9" />
      <circle cx="15.5" cy="17.5" r="2" />
    </svg>
  );
}

export function VolumeOffIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="m22 9-6 6M16 9l6 6" />
    </svg>
  );
}

export function VolumeLowIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

export function VolumeHighIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function SlowSpeedIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16a8.5 8.5 0 1 1 15 0" />
      <path d="m12 13-3.5-2.5" />
      <circle cx="12" cy="13.5" r="1.25" fill="currentColor" stroke="none" />
      <path d="M6 19h12" />
    </svg>
  );
}

export function FastBoltIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.2 2 4.8 13.1h6.1L9.8 22l9.4-12.3h-6.4L13.2 2Z" />
    </svg>
  );
}

export function HeadlightsIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

export function HornIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 14-5v12L3 13v-2Z" />
      <path d="M17 9.5a3 3 0 0 1 0 5" />
      <path d="M6 14v4a2 2 0 0 0 2 2h1" />
    </svg>
  );
}

export function PartyIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
      <path d="M5 17v4M3 19h4M19 16v3M17.5 17.5h3" />
    </svg>
  );
}

export function TvIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="13" rx="2.5" />
      <path d="M8 21h8M12 18v3" />
      <polygon points="10.5 9 15 11.5 10.5 14 10.5 9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function EnterBusIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </svg>
  );
}

export function ExitBusIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function UserBadgeIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="12" r="2.2" />
      <path d="M14 10h4M14 14h3" />
    </svg>
  );
}

export function CommentBubbleIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L4 21l1.4-4.7A8.5 8.5 0 1 1 21 12Z" />
      <path d="M8.5 11.5h7M8.5 14.5h4.5" />
    </svg>
  );
}

export function EyeViewIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5-9.5-6.5-9.5-6.5Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function CompassExploreIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polygon points="15.8 8.2 13.7 13.7 8.2 15.8 10.3 10.3 15.8 8.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HelpCircleIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 3.7" />
      <circle cx="12" cy="17.2" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HandshakeIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ExternalArrowIcon({ className = "h-3.5 w-3.5 shrink-0" }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

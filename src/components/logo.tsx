import Image from "next/image";

export function LogoMark({
  size = 40,
  className = "",
  priority = false,
}: {
  /** Visual height of the logo mark in pixels */
  size?: number;
  className?: string;
  /** Only the above-the-fold navbar logo should be preloaded — not the footer/auth copies. */
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-vanja.svg"
      alt="ون جا"
      width={size}
      height={size}
      sizes={`${size}px`}
      className={`object-contain shrink-0 ${className}`}
      // The navbar logo is above the fold on every page: load it eagerly with high
      // fetch priority (a full <link rel=preload> is reserved for the real LCP image).
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}

export function Logo({
  size = 40,
  withText = true,
  priority = false,
}: {
  size?: number;
  withText?: boolean;
  priority?: boolean;
}) {
  return (
    <div className="flex items-center">
      <LogoMark size={size} priority={priority} />

      {withText && (
        <span
          className="font-extrabold gradient-text tracking-tight leading-none"
          style={{ fontSize: Math.round(size * 0.62) }}
        >
          ون جا
        </span>
      )}
    </div>
  );
}

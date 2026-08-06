"use client";

import {
  APP_VERSION,
} from "../lib/version";

type Props = {
  prefix?: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function AppVersion({
  prefix = "Version",
  className,
  style,
}: Props) {
  return (
    <span
      className={className}
      style={style}
    >
      {prefix
        ? `${prefix} `
        : ""}
      {APP_VERSION}
    </span>
  );
}
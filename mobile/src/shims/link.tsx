import { Link as RouterLink } from 'react-router-dom';
import type { AnchorHTMLAttributes } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { publicAppOrigin } from '@/lib/platform';
export default function Link({ href, children, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const external = !href.startsWith('/') || href.startsWith('/r/');
  const url = href.startsWith('/r/') ? publicAppOrigin() + href : href;
  if (!external) return <RouterLink to={href} onClick={onClick} {...props}>{children}</RouterLink>;
  return <a href={url} {...props} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && Capacitor.isNativePlatform()) {
      event.preventDefault(); void Browser.open({ url });
    }
  }}>{children}</a>;
}

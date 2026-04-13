'use client';

import { useEffect, useRef } from 'react';

type LodgifyEmbedProps = {
  html: string;
  className?: string;
  shouldGuardReserve?: boolean;
  onGuardedReserveClick?: () => void;
};

const DEFAULT_LODGIFY_WIDGET_SCRIPT =
  'https://app.lodgify.com/portable-search-bar/stable/renderPortableSearchBar.js';

const RESERVE_TEXT_MATCHERS = [
  'reserve',
  'book',
  'request',
  'checkout',
  'check out',
  'confirm',
];

const isReserveActionElement = (element: HTMLElement | null) => {
  if (!element) return false;

  const target = element.closest(
    'button, a, [role="button"], input[type="submit"], input[type="button"]'
  ) as HTMLElement | null;

  if (!target) return false;

  const text = [
    target.textContent,
    target.getAttribute('aria-label'),
    target.getAttribute('title'),
    target.getAttribute('value'),
    target.getAttribute('name'),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return RESERVE_TEXT_MATCHERS.some((matcher) => text.includes(matcher));
};

export default function LodgifyEmbed({
  html,
  className,
  shouldGuardReserve = false,
  onGuardedReserveClick,
}: LodgifyEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    const template = document.createElement('template');
    template.innerHTML = html;
    let hasExternalLodgifyScript = false;

    Array.from(template.content.childNodes).forEach((node) => {
      if (node.nodeName.toLowerCase() === 'script') {
        const sourceScript = node as HTMLScriptElement;
        if (sourceScript.src?.includes('lodgify.com/portable-search-bar/')) {
          hasExternalLodgifyScript = true;
        }
        const script = document.createElement('script');
        Array.from(sourceScript.attributes).forEach((attribute) => {
          script.setAttribute(attribute.name, attribute.value);
        });
        script.text = sourceScript.text;
        container.appendChild(script);
        return;
      }

      container.appendChild(node.cloneNode(true));
    });

    if (!hasExternalLodgifyScript) {
      const existingScript = document.querySelector(
        `script[src="${DEFAULT_LODGIFY_WIDGET_SCRIPT}"]`
      ) as HTMLScriptElement | null;

      if (!existingScript) {
        const script = document.createElement('script');
        script.src = DEFAULT_LODGIFY_WIDGET_SCRIPT;
        script.defer = true;
        script.setAttribute('data-lodgify-widget-script', 'true');
        document.body.appendChild(script);
      } else if (!existingScript.hasAttribute('data-lodgify-widget-script')) {
        existingScript.setAttribute('data-lodgify-widget-script', 'true');
      }
    }

    return () => {
      container.innerHTML = '';
    };
  }, [html]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldGuardReserve || !onGuardedReserveClick) {
      return;
    }

    const handleClickCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!isReserveActionElement(target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onGuardedReserveClick();
    };

    container.addEventListener('click', handleClickCapture, true);
    return () => {
      container.removeEventListener('click', handleClickCapture, true);
    };
  }, [onGuardedReserveClick, shouldGuardReserve]);

  return <div ref={containerRef} className={className} />;
}

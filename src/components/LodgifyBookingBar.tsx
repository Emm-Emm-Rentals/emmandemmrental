'use client';

import LodgifyEmbed from '@/components/LodgifyEmbed';
import { useUi } from '@/context/UiContext';
import { useSession } from 'next-auth/react';

type LodgifyBookingBarProps = {
  bookingUrl?: string | null;
  widgetEmbed?: string | null;
};

export default function LodgifyBookingBar({
  bookingUrl,
  widgetEmbed,
}: LodgifyBookingBarProps) {
  const { data: session } = useSession();
  const { isLoginModalOpen, setIsLoginModalOpen, showToast } = useUi();
  const hasWidget = typeof widgetEmbed === 'string' && widgetEmbed.trim().length > 0;
  const requiresLogin = !session;

  const handleLoginPrompt = () => {
    showToast('Please log in to continue booking.', 'info');
    setIsLoginModalOpen(true);
  };

  return (
    <div className="fixed bottom-0 md:bottom-8 left-0 right-0 z-30 px-0 md:px-4 pointer-events-none flex justify-center">
      <div className="w-full max-w-[1050px] pointer-events-auto">
        {hasWidget ? (
          <div
            className={`relative lodgify-booking-shell rounded-t-[28px] md:rounded-[32px] bg-white/96 backdrop-blur-sm border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.12)] p-2 md:p-3 transition-all duration-300 ${
              isLoginModalOpen ? 'opacity-40 pointer-events-none filter grayscale-[0.5]' : 'opacity-100'
            }`}
          >
            <LodgifyEmbed
              html={widgetEmbed!.trim()}
              shouldGuardReserve={requiresLogin}
              onGuardedReserveClick={handleLoginPrompt}
            />
          </div>
        ) : bookingUrl ? null : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            Add the Lodgify widget embed code in admin to show the live booking widget here.
          </div>
        )}
      </div>
    </div>
  );
}

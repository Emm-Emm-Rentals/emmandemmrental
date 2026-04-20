import React, { useState } from 'react';
import { XCircle, FileText, ShieldCheck, X, Clock3, Users, Ban, Siren } from 'lucide-react';

type ModalType = 'cancellation' | 'house' | 'safety' | null;

interface Policy {
  key: Exclude<ModalType, null>;
  title: string;
  icon: React.ReactNode;
  summary: React.ReactNode;
}

interface ImportantThingsToKnowProps {
  rules?: string[];
  cancellationPolicy?: string | null;
  paymentPolicyContent?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  maxGuests?: number | null;
  selectedCheckInDate?: Date | null;
}

const renderPolicyContent = (content: string) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-3 text-sm text-gray-800 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        // Section headers like "1. TITLE" or "TITLE" in all caps
        if (/^\d+\.\s+[A-Z\s]+$/.test(trimmed) || /^[A-Z][A-Z\s]{4,}$/.test(trimmed)) {
          return <p key={i} className="font-bold text-gray-900 mt-4">{trimmed}</p>;
        }
        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
};

const ImportantThingsToKnow = ({
  rules = [],
  paymentPolicyContent,
  checkInTime = '5:00 PM',
  checkOutTime = '10:00 AM',
  maxGuests = 8,
}: ImportantThingsToKnowProps) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const policies: Policy[] = [
    {
      key: 'cancellation',
      title: 'Cancellation policy',
      icon: <XCircle className="text-[#004D4D]" size={32} strokeWidth={1.5} />,
      summary: 'Review our payment and cancellation policy before booking.',
    },
    {
      key: 'house',
      title: 'House rules',
      icon: <FileText className="text-[#004D4D]" size={32} strokeWidth={1.5} />,
      summary: (
        <>
          Check-in after {checkInTime}. Checkout before {checkOutTime}. {maxGuests} guests maximum.
        </>
      ),
    },
    {
      key: 'safety',
      title: 'Safety & property',
      icon: <ShieldCheck className="text-[#004D4D]" size={32} strokeWidth={1.5} />,
      summary: 'Important safety details and property devices are listed before you reserve.',
    },
  ];

  return (
    <>
      <section className="py-8 max-w-7xl mx-auto px-6 border-t border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-10">Important Things to Know</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {policies.map((policy) => (
            <div key={policy.key} className="flex gap-6 items-start">
              <div className="shrink-0 mt-1">{policy.icon}</div>
              <div className="flex flex-col gap-2">
                <h3 className="text-md font-bold text-gray-900">{policy.title}</h3>
                <p className="text-[15px] text-gray-500 leading-relaxed">{policy.summary}</p>
                <button
                  type="button"
                  onClick={() => setActiveModal(policy.key)}
                  className="text-left text-sm font-semibold underline text-gray-900 mt-1"
                >
                  Learn more
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/45 p-0 md:p-4">
          <div className="w-full bg-white rounded-t-3xl md:rounded-3xl md:max-w-2xl max-h-[88vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden shadow-[0_18px_60px_rgba(0,0,0,0.18)] p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {activeModal === 'cancellation'
                  ? 'Cancellation & Payment Policy'
                  : activeModal === 'house'
                  ? 'House rules'
                  : 'Safety & property'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 text-gray-700 hover:bg-gray-50 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {activeModal === 'cancellation' && (
              <div>
                {paymentPolicyContent
                  ? renderPolicyContent(paymentPolicyContent)
                  : <p className="text-sm text-gray-500">Policy details not available.</p>}
              </div>
            )}

            {activeModal === 'house' && (
              <div className="space-y-8">
                <p className="text-lg text-gray-700">You'll be staying in someone's home, so please treat it with care and respect.</p>

                <div className="text-black">
                  <h4 className="text-xl font-black text-gray-900 mb-4">Checking in and out</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-md border-b border-gray-200 pb-4">
                      <Clock3 size={24} />
                      <span>Check-in after {checkInTime}</span>
                    </div>
                    <div className="flex items-center gap-3 text-md border-b border-gray-200 pb-4">
                      <Clock3 size={24} />
                      <span>Checkout before {checkOutTime}</span>
                    </div>
                  </div>
                </div>

                <div className="text-black">
                  <h4 className="text-xl font-black text-gray-900 mb-4">During your stay</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-md border-b border-gray-200 pb-4">
                      <Users size={24} />
                      <span>{maxGuests} guests maximum</span>
                    </div>
                    {rules.length === 0 && (
                      <div className="flex items-center gap-3 text-md border-b border-gray-200 pb-4">
                        <Ban size={24} />
                        <span>No additional house rules listed</span>
                      </div>
                    )}
                    {rules.map((rule, idx) => (
                      <div key={`${rule}-${idx}`} className="flex items-center gap-3 text-md border-b border-gray-200 pb-4">
                        <Ban size={24} />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'safety' && (
              <div className="space-y-8">
                <p className="text-lg text-gray-700">Avoid surprises by looking over these important safety details about your host's property.</p>

                <div>
                  <h4 className="text-xl font-black text-gray-900 mb-4">Safety devices</h4>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 text-md border-b border-gray-200 pb-4">
                      <Siren size={24} className="mt-1" />
                      <div>
                        <p className="font-semibold text-gray-900">Carbon monoxide alarm</p>
                        <p className="text-sm text-gray-600">Host-reported device status shown in listing details.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-md border-b border-gray-200 pb-4">
                      <Siren size={24} className="mt-1" />
                      <div>
                        <p className="font-semibold text-gray-900">Smoke alarm</p>
                        <p className="text-sm text-gray-600">Host-reported device status shown in listing details.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImportantThingsToKnow;

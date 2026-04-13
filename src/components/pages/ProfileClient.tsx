'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Map, Shield, Mail, ChevronRight, CircleOff } from 'lucide-react';
import EditProfileModal from '@/components/EditProfileModal';
import Link from 'next/link';

type ProfileUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type ProfileBooking = {
  id: string;
  source?: 'lodgify' | 'local';
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  totalPrice: number;
  currency?: string;
  listing: {
    title: string;
    imageSrc: string;
  };
};

const ProfileClient = ({ user, bookings }: { user: ProfileUser; bookings: ProfileBooking[] }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <main className="min-h-screen bg-white pb-32 md:pb-24">
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-8 md:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">Profile</h1>
          <p className="text-sm md:text-base text-gray-500 font-medium leading-relaxed">Manage your personal information and travel history.</p>
        </motion.div>

        <div className="space-y-10 md:space-y-12">
          <section>
            <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
              <h2 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">About me</h2>
            </div>

            <motion.div
              whileHover={{ y: -2 }}
              className="bg-white border-2 border-blue-400 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="flex flex-col md:flex-row items-center gap-6 flex-1 text-center md:text-left">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-lg shrink-0 border-4 border-white">
                  {user.image ? (
                    <img src={user.image} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="text-left w-full md:w-auto">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{user.name || 'Guest User'}</h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                      <Mail size={14} className="shrink-0" />
                      <span className="truncate">{user.email || 'No email provided'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full md:w-auto flex items-center justify-center gap-2 md:block p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95 shrink-0"
              >
                <Edit2 size={20} />
                <span className="md:hidden font-bold">Edit Profile</span>
              </button>
            </motion.div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
              <h2 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Activity</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/trips/past" className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-[#f44786] group-hover:text-white transition-colors">
                    <Map size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm md:text-base">Past Trips</p>
                    <p className="text-xs text-gray-500 font-medium">View your travel history</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </Link>

              <Link href="/trips/upcoming" className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-[#f44786] group-hover:text-white transition-colors">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm md:text-base">Upcoming Trips</p>
                    <p className="text-xs text-gray-500 font-medium">View your upcoming bookings</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </Link>

              <Link href="/trips/cancelled" className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-[#f44786] group-hover:text-white transition-colors">
                    <CircleOff size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm md:text-base">Cancelled Trips</p>
                    <p className="text-xs text-gray-500 font-medium">View declined or cancelled bookings</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </Link>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4 md:mb-6 px-2">
              <h2 className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Bookings</h2>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">
                You do not have any bookings yet.
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                    <img src={booking.listing?.imageSrc || '/banner.png'} alt={booking.listing?.title} className="w-full md:w-28 h-20 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{booking.listing?.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(booking.startDate).toLocaleDateString()}{' -> '}{new Date(booking.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Guests: {booking.adults} Adults{booking.children ? `, ${booking.children} Children` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {booking.currency || 'USD'} {booking.totalPrice.toFixed(2)}
                      </div>
                      {booking.source === 'lodgify' && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                          Lodgify
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={() => {
          window.location.reload();
        }}
      />
    </main>
  );
};

export default ProfileClient;

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Menu, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUi } from '@/context/UiContext';
import LoginModal from './LoginModal';
import Link from 'next/link';

const Navbar = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { isLoginModalOpen, setIsLoginModalOpen } = useUi();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAuthAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <>
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-100 bg-white relative z-40">
        <div className="flex items-center gap-4 md:gap-12">
          {/* Replace with your actual logo image */}
          <Link href={'/'} className="flex items-center gap-2 cursor-pointer">
            <Image src={'/logo.png'} width={60} height={40} className='object-contain md:w-[100px] md:h-[50px]' alt='logo' />
          </Link>

          
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* <button className="hidden sm:block px-4 md:px-6 py-2 border border-black text-black rounded-lg text-xs md:text-sm font-semibold hover:bg-gray-50 transition">
            Contact Us
          </button> */}

          <div className="relative" ref={menuRef}>
            <div
              onClick={toggleMenu}
              className="flex items-center gap-2 border border-gray-300 rounded-full p-1 pl-2 md:pl-3 hover:shadow-md cursor-pointer transition select-none"
            >
              <div className="md:block hidden">
                <Menu size={18} className="text-gray-600" />
              </div>
              <div className="block md:hidden">
                <Menu size={16} className="text-gray-600" />
              </div>
              <div className="bg-gray-500 overflow-hidden rounded-full w-7 h-7 md:w-8 md:h-8 relative">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <User size={16} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-12 w-[60vw] md:w-[15vw] min-w-[220px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] py-2 border border-gray-100 overflow-hidden flex flex-col">
                {session ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-sm truncate">{session.user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                    </div>

                    <div className="py-2">
                      <MenuItem onClick={() => handleAuthAction(() => { router.push('/profile'); })} label="Profile" icon={<User size={16} />} />
                    </div>

                    <div className="border-t border-gray-100 pt-2">
                      <MenuItem
                        onClick={() => handleAuthAction(() => signOut())}
                        label="Logout"
                        icon={<LogOut size={16} />}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <MenuItem
                      onClick={() => handleAuthAction(() => setIsLoginModalOpen(true))}
                      label="Login"
                      bold
                    />
                    <MenuItem
                      onClick={() => handleAuthAction(() => setIsLoginModalOpen(true))}
                      label="Sign up"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
};

interface MenuItemProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  bold?: boolean;
}

const MenuItem = ({ onClick, label, icon, bold }: MenuItemProps) => {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 hover:bg-gray-50 transition cursor-pointer flex items-center gap-3 text-sm ${bold ? 'font-semibold' : 'font-medium'} text-gray-700`}
    >
      {icon && <span className="text-gray-500">{icon}</span>}
      {label}
    </div>
  );
}

export default Navbar;
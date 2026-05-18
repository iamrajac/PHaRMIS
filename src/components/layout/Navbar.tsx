import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  User, 
  LogOut, 
  Settings,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Focus search input when active
  useEffect(() => {
    if (isSearchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchActive]);

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick} 
          className="md:hidden p-2 hover:bg-neutral-100 rounded-lg"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        
        <h1 className="text-primary-600 text-xl font-semibold hidden md:block">
          PHARMIS
        </h1>
      </div>
      
      {/* Center section - Search */}
      <AnimatePresence>
        {isSearchActive ? (
          <motion.div 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            exit={{ opacity: 0, width: 0 }}
            className="absolute inset-0 bg-white px-4 flex items-center"
          >
            <div className="relative w-full flex items-center">
              <Search size={18} className="absolute left-3 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                className="w-full py-2 pl-10 pr-10 border rounded-lg"
                onBlur={() => setIsSearchActive(false)}
              />
              <button
                onClick={() => setIsSearchActive(false)}
                className="absolute right-3 text-neutral-400 hover:text-neutral-700"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="hidden md:block">
            <button
              onClick={() => setIsSearchActive(true)}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg"
            >
              <Search size={16} />
              <span className="text-sm">Search...</span>
            </button>
          </div>
        )}
      </AnimatePresence>
      
      {/* Right section */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsSearchActive(true)}
          className="md:hidden p-2 hover:bg-neutral-100 rounded-lg"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
        
        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 hover:bg-neutral-100 rounded-lg relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full"></span>
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg overflow-hidden border border-neutral-200 z-20"
              >
                <div className="p-4 border-b border-neutral-200">
                  <h3 className="font-medium">Notifications</h3>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <div className="py-2 px-4 hover:bg-neutral-50 border-b border-neutral-100">
                    <p className="text-sm font-medium">Daily log reminder</p>
                    <p className="text-xs text-neutral-500">Don't forget to log your symptoms today</p>
                    <p className="text-xs text-neutral-400 mt-1">2 hours ago</p>
                  </div>
                  
                  <div className="py-2 px-4 hover:bg-neutral-50 border-b border-neutral-100 bg-neutral-50">
                    <p className="text-sm font-medium">New insight available</p>
                    <p className="text-xs text-neutral-500">AI has generated new insights based on your logs</p>
                    <p className="text-xs text-neutral-400 mt-1">Yesterday</p>
                  </div>
                  
                  <div className="py-2 px-4 hover:bg-neutral-50">
                    <p className="text-sm font-medium">Profile updated</p>
                    <p className="text-xs text-neutral-500">Your profile details were updated successfully</p>
                    <p className="text-xs text-neutral-400 mt-1">3 days ago</p>
                  </div>
                </div>
                
                <div className="p-2 border-t border-neutral-200">
                  <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-1">
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-neutral-100 p-1 pl-2 pr-3 rounded-lg"
          >
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium">
              {user?.name || 'User'}
            </span>
          </button>
          
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg overflow-hidden border border-neutral-200 z-20"
              >
                <div className="p-4 border-b border-neutral-200">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-neutral-500 truncate">{user?.email}</p>
                </div>
                
                <div className="py-1">
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 text-sm"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </Link>
                  
                  <Link 
                    to="/settings" 
                    className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 text-sm"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                  
                  <button 
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 text-sm text-error-600 w-full text-left"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
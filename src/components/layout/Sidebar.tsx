import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  User, 
  ClipboardList, 
  FileText, 
  Upload, 
  BarChart2, 
  Coffee,
  ActivitySquare, 
  X 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();
  
  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Daily Log', path: '/daily-log', icon: ClipboardList },
    { name: 'Health Insights', path: '/insights', icon: BarChart2 },
    { name: 'Medical Files', path: '/medical-files', icon: FileText },
    { name: 'Lifestyle Tracker', path: '/lifestyle', icon: Coffee },
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <motion.div
        className="fixed inset-y-0 left-0 w-64 bg-white border-r border-neutral-200 z-30 md:hidden"
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ duration: 0.2 }}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <ActivitySquare className="h-6 w-6 text-primary-600" />
            <h1 className="text-lg font-semibold text-primary-600">PHARMIS</h1>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-neutral-100 rounded-lg"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="py-4 px-2">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link group mb-1 ${isActive(item.path) ? 'active' : ''}`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
              
              {isActive(item.path) && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 w-1 h-8 bg-primary-600 rounded-r-md"
                  initial={false}
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          ))}
        </nav>
        
        <div className="absolute bottom-8 left-0 right-0 px-4">
          <div className="bg-primary-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-primary-700 mb-1">Daily Reminder</h3>
            <p className="text-xs text-primary-600">Don't forget to log your symptoms and mood today.</p>
            <Link 
              to="/daily-log"
              className="mt-2 text-xs font-medium text-primary-700 hover:text-primary-800 inline-block"
            >
              Log now →
            </Link>
          </div>
        </div>
      </motion.div>
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 bg-white border-r border-neutral-200 min-h-screen">
        <div className="h-16 flex items-center justify-center px-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <ActivitySquare className="h-6 w-6 text-primary-600" />
            <h1 className="text-lg font-semibold text-primary-600">PHARMIS</h1>
          </div>
        </div>
        
        <nav className="py-6 px-3">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link group mb-1 relative ${isActive(item.path) ? 'active' : ''}`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.name}</span>
              
              {isActive(item.path) && (
                <motion.div
                  layoutId="activeIndicator-desktop"
                  className="absolute left-0 w-1 h-8 bg-primary-600 rounded-r-md"
                  initial={false}
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          ))}
        </nav>
        
        <div className="absolute bottom-8 left-0 right-0 px-6 max-w-64">
          <div className="bg-primary-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-primary-700 mb-1">Daily Reminder</h3>
            <p className="text-xs text-primary-600">Don't forget to log your symptoms and mood today.</p>
            <Link 
              to="/daily-log"
              className="mt-2 text-xs font-medium text-primary-700 hover:text-primary-800 inline-block"
            >
              Log now →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
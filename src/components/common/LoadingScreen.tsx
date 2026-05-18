import { motion } from 'framer-motion';
import { ActivitySquare } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <ActivitySquare 
          size={48} 
          className="text-primary-600 mb-4" 
          strokeWidth={1.5} 
        />
        
        <h1 className="text-2xl font-semibold text-neutral-800 mb-2">
          PHARMIS
        </h1>
        
        <p className="text-sm text-neutral-500 mb-6">
          Your healthcare companion
        </p>
        
        <div className="w-12 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary-600"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  Coffee, 
  Dumbbell, 
  Cigarette, 
  Beer,
  CalendarDays,
  Clock,
  PlusCircle,
  Check,
  Search,
  Activity,
  BarChart2,
  Filter,
  X,
  CalendarIcon
} from 'lucide-react';
import { lifestyleAPI } from '../services/api';
import { ACTIVITY_TYPES } from '../config/constants';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// Form validation schema for exercise
const exerciseSchema = z.object({
  date: z.string(),
  activity_type: z.literal('EXERCISE'),
  activity_name: z.string().min(1, 'Activity name is required'),
  duration: z.number().min(1, 'Duration is required'),
  intensity: z.string().min(1, 'Intensity is required'),
  notes: z.string().optional(),
});

// Form validation schema for smoking
const smokingSchema = z.object({
  date: z.string(),
  activity_type: z.literal('SMOKING'),
  activity_name: z.string().min(1, 'Type is required'),
  quantity: z.number().min(1, 'Quantity is required'),
  notes: z.string().optional(),
});

// Form validation schema for drinking
const drinkingSchema = z.object({
  date: z.string(),
  activity_type: z.literal('DRINKING'),
  activity_name: z.string().min(1, 'Type is required'),
  quantity: z.number().min(1, 'Quantity is required'),
  notes: z.string().optional(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;
type SmokingFormData = z.infer<typeof smokingSchema>;
type DrinkingFormData = z.infer<typeof drinkingSchema>;

interface LifestyleLog {
  id: number;
  date: string;
  activity_type: 'EXERCISE' | 'SMOKING' | 'DRINKING';
  activity_name: string;
  duration?: number;
  intensity?: string;
  quantity?: number;
  notes?: string;
  created_at: string;
}

interface ChartData {
  name: string;
  Exercise: number;
  Smoking: number;
  Drinking: number;
}

export default function LifestyleTracker() {
  const [activeTab, setActiveTab] = useState<'EXERCISE' | 'SMOKING' | 'DRINKING' | 'HISTORY' | 'STATS'>('EXERCISE');
  const [logs, setLogs] = useState<LifestyleLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogType, setSelectedLogType] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7'); // days
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  const { control: exerciseControl, register: exerciseRegister, handleSubmit: handleExerciseSubmit, reset: resetExercise, formState: { errors: exerciseErrors } } = 
    useForm<ExerciseFormData>({
      resolver: zodResolver(exerciseSchema),
      defaultValues: {
        date: today,
        activity_type: 'EXERCISE',
        activity_name: '',
        duration: 30,
        intensity: 'Moderate',
        notes: '',
      },
    });

  const { control: smokingControl, register: smokingRegister, handleSubmit: handleSmokingSubmit, reset: resetSmoking, formState: { errors: smokingErrors } } = 
    useForm<SmokingFormData>({
      resolver: zodResolver(smokingSchema),
      defaultValues: {
        date: today,
        activity_type: 'SMOKING',
        activity_name: '',
        quantity: 1,
        notes: '',
      },
    });

  const { control: drinkingControl, register: drinkingRegister, handleSubmit: handleDrinkingSubmit, reset: resetDrinking, formState: { errors: drinkingErrors } } = 
    useForm<DrinkingFormData>({
      resolver: zodResolver(drinkingSchema),
      defaultValues: {
        date: today,
        activity_type: 'DRINKING',
        activity_name: '',
        quantity: 1,
        notes: '',
      },
    });

  // Fetch lifestyle logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await lifestyleAPI.getLogs({
          type: selectedLogType || undefined,
          startDate: getStartDate(parseInt(dateRange)),
        });
        setLogs(response.data || []);
        console.log('[DEBUG] Fetched logs:', response.data);
        if (response.data) {
          response.data.forEach((log: any) => {
            console.log(`[DEBUG] Log: date=${log.date}, type=${log.activity_type}`);
          });
        }
      } catch (error) {
        console.error('Error fetching lifestyle logs:', error);
        setError('Failed to load lifestyle data. Please try again later.');
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLogs();
  }, [selectedLogType, dateRange]);

  const getStartDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const onSubmitExercise = async (data: ExerciseFormData) => {
    await submitLifestyleLog(data);
    resetExercise({ date: today, activity_type: 'EXERCISE', activity_name: '', duration: 30, intensity: 'Moderate', notes: '' });
  };

  const onSubmitSmoking = async (data: SmokingFormData) => {
    await submitLifestyleLog(data);
    resetSmoking({ date: today, activity_type: 'SMOKING', activity_name: '', quantity: 1, notes: '' });
  };

  const onSubmitDrinking = async (data: DrinkingFormData) => {
    await submitLifestyleLog(data);
    resetDrinking({ date: today, activity_type: 'DRINKING', activity_name: '', quantity: 1, notes: '' });
  };

  const submitLifestyleLog = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await lifestyleAPI.createLog(data);
      
      // Update the local logs state
      const response = await lifestyleAPI.getLogs({
        type: selectedLogType || undefined,
        startDate: getStartDate(parseInt(dateRange)),
      });
      setLogs(response.data || []);
      
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to submit lifestyle log', error);
      setError('Failed to save activity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter logs based on search query
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.activity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      
    return matchesSearch;
  });

  // Prepare chart data
  const prepareWeeklyChartData = (): ChartData[] => {
    // Get last 7 days as YYYY-MM-DD in local time
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0); // zero out time
      d.setDate(d.getDate() - (6 - i));
      // Format as YYYY-MM-DD in local time
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    });
    console.log('[DEBUG] last7Days:', last7Days);

    // Debug: print normalized log dates
    logs.forEach(log => {
      const logDate = new Date(log.date);
      const yyyy = logDate.getFullYear();
      const mm = String(logDate.getMonth() + 1).padStart(2, '0');
      const dd = String(logDate.getDate()).padStart(2, '0');
      const normalizedLogDate = `${yyyy}-${mm}-${dd}`;
      console.log(`[DEBUG] log.date: ${log.date}, normalized: ${normalizedLogDate}`);
    });

    const chartData = last7Days.map(dateStr => {
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        const yyyy = logDate.getFullYear();
        const mm = String(logDate.getMonth() + 1).padStart(2, '0');
        const dd = String(logDate.getDate()).padStart(2, '0');
        const normalizedLogDate = `${yyyy}-${mm}-${dd}`;
        return normalizedLogDate === dateStr;
      });
      const exerciseCount = dayLogs.filter(log => log.activity_type === 'EXERCISE').length;
      const smokingCount = dayLogs.filter(log => log.activity_type === 'SMOKING')
        .reduce((sum, log) => sum + (log.quantity || 0), 0);
      const drinkingCount = dayLogs.filter(log => log.activity_type === 'DRINKING')
        .reduce((sum, log) => sum + (log.quantity || 0), 0);
      // Use local weekday name
      const weekday = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
      return {
        name: weekday,
        date: dateStr,
        Exercise: exerciseCount || 0,
        Smoking: smokingCount || 0,
        Drinking: drinkingCount || 0,
      };
    });
    console.log('[DEBUG] chartData:', chartData);
    return chartData;
  };
  
  const prepareExerciseTypesData = () => {
    const exerciseLogs = logs.filter(log => log.activity_type === 'EXERCISE');
    
    const exerciseTypes: Record<string, number> = {};
    exerciseLogs.forEach(log => {
      exerciseTypes[log.activity_name] = (exerciseTypes[log.activity_name] || 0) + 1;
    });
    
    return Object.entries(exerciseTypes).map(([name, value]) => ({ name, value }));
  };

  const chartData = prepareWeeklyChartData();
  const exerciseTypesData = prepareExerciseTypesData();

  const COLORS = ['#4F46E5', '#0D9488', '#F59E0B', '#DC2626', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    console.log('[DEBUG] chartData before render:', chartData);
  }, [chartData]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Lifestyle Tracker</h1>
        <p className="text-neutral-500">
          Track your exercise, smoking, and drinking habits to understand their impact on your health
        </p>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 mb-6 overflow-x-auto">
        <button
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeTab === 'EXERCISE' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
          onClick={() => setActiveTab('EXERCISE')}
        >
          <div className="flex items-center">
            <Dumbbell size={18} className="mr-2" />
            Exercise
          </div>
        </button>
        
        <button
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeTab === 'SMOKING' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
          onClick={() => setActiveTab('SMOKING')}
        >
          <div className="flex items-center">
            <Cigarette size={18} className="mr-2" />
            Smoking
          </div>
        </button>
        
        <button
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeTab === 'DRINKING' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
          onClick={() => setActiveTab('DRINKING')}
        >
          <div className="flex items-center">
            <Beer size={18} className="mr-2" />
            Drinking
          </div>
        </button>
        
        <button
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeTab === 'HISTORY' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
          onClick={() => setActiveTab('HISTORY')}
        >
          <div className="flex items-center">
            <CalendarDays size={18} className="mr-2" />
            History
          </div>
        </button>
        
        <button
          className={`py-3 px-4 font-medium text-sm border-b-2 ${
            activeTab === 'STATS' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
          onClick={() => setActiveTab('STATS')}
        >
          <div className="flex items-center">
            <BarChart2 size={18} className="mr-2" />
            Statistics
          </div>
        </button>
      </div>
      
      {/* Tab content */}
      {activeTab === 'EXERCISE' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Dumbbell size={20} className="mr-2 text-primary-600" />
            Log Exercise Activity
          </h2>
          
          <form onSubmit={handleExerciseSubmit(onSubmitExercise)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                  <input
                    type="date"
                    className="input pl-10"
                    max={today}
                    {...exerciseRegister('date')}
                  />
                </div>
              </div>
              
              <div>
                <label className="form-label">Exercise Type</label>
                <select
                  className={`input ${exerciseErrors.activity_name ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
                  {...exerciseRegister('activity_name')}
                >
                  <option value="">Select exercise type</option>
                  {ACTIVITY_TYPES.EXERCISE.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {exerciseErrors.activity_name && (
                  <p className="form-error">{exerciseErrors.activity_name.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Duration (minutes)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                  <input
                    type="number"
                    className={`input pl-10 ${exerciseErrors.duration ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
                    placeholder="Enter duration in minutes"
                    {...exerciseRegister('duration', { valueAsNumber: true })}
                  />
                </div>
                {exerciseErrors.duration && (
                  <p className="form-error">{exerciseErrors.duration.message}</p>
                )}
              </div>
              
              <div>
                <label className="form-label">Intensity</label>
                <select
                  className={`input ${exerciseErrors.intensity ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
                  {...exerciseRegister('intensity')}
                >
                  <option value="">Select intensity</option>
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                </select>
                {exerciseErrors.intensity && (
                  <p className="form-error">{exerciseErrors.intensity.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Any additional details about your exercise..."
                {...exerciseRegister('notes')}
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary relative"
              >
                {isSubmitting ? 'Saving...' : 'Log Exercise'}
                
                {submitSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -right-10 -top-10 bg-success-500 text-white p-2 rounded-full"
                  >
                    <Check size={16} />
                  </motion.div>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {activeTab === 'SMOKING' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Cigarette size={20} className="mr-2 text-primary-600" />
            Log Smoking Activity
          </h2>
          
          <form onSubmit={handleSmokingSubmit(onSubmitSmoking)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                  <input
                    type="date"
                    className="input pl-10"
                    max={today}
                    {...smokingRegister('date')}
                  />
                </div>
              </div>
              
              <div>
                <label className="form-label">Type</label>
                <select
                  className={`input ${smokingErrors.activity_name ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
                  {...smokingRegister('activity_name')}
                >
                  <option value="">Select type</option>
                  {ACTIVITY_TYPES.SMOKING.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {smokingErrors.activity_name && (
                  <p className="form-error">{smokingErrors.activity_name.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="form-label">Quantity</label>
              <input
                type="number"
                className={`input ${smokingErrors.quantity ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
                placeholder="Enter quantity"
                {...smokingRegister('quantity', { valueAsNumber: true })}
              />
              {smokingErrors.quantity && (
                <p className="form-error">{smokingErrors.quantity.message}</p>
              )}
            </div>
            
            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Any additional details..."
                {...smokingRegister('notes')}
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary relative"
              >
                {isSubmitting ? 'Saving...' : 'Log Smoking'}
                
                {submitSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -right-10 -top-10 bg-success-500 text-white p-2 rounded-full"
                  >
                    <Check size={16} />
                  </motion.div>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {activeTab === 'DRINKING' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Beer size={20} className="mr-2 text-primary-600" />
            Log Drinking Activity
          </h2>
          
          <form onSubmit={handleDrinkingSubmit(onSubmitDrinking)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                  <input
                    type="date"
                    className="input pl-10"
                    max={today}
                    {...drinkingRegister('date')}
                  />
                </div>
              </div>
              
              <div>
                <label className="form-label">Type</label>
                <select
                  className={`input ${drinkingErrors.activity_name ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
                  {...drinkingRegister('activity_name')}
                >
                  <option value="">Select type</option>
                  {ACTIVITY_TYPES.DRINKING.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {drinkingErrors.activity_name && (
                  <p className="form-error">{drinkingErrors.activity_name.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="form-label">Quantity (drinks)</label>
              <input
                type="number"
                className={`input ${drinkingErrors.quantity ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
                placeholder="Enter number of drinks"
                {...drinkingRegister('quantity', { valueAsNumber: true })}
              />
              {drinkingErrors.quantity && (
                <p className="form-error">{drinkingErrors.quantity.message}</p>
              )}
            </div>
            
            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Any additional details..."
                {...drinkingRegister('notes')}
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary relative"
              >
                {isSubmitting ? 'Saving...' : 'Log Drinking'}
                
                {submitSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -right-10 -top-10 bg-success-500 text-white p-2 rounded-full"
                  >
                    <Check size={16} />
                  </motion.div>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {activeTab === 'HISTORY' && (
        <div>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search activities..."
                className="input pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <button
                  className="btn btn-outline flex items-center"
                  onClick={() => setSelectedLogType(null)}
                >
                  <Filter size={16} className="mr-2" />
                  <span>{selectedLogType || 'All Activities'}</span>
                </button>
                
                {selectedLogType && (
                  <button
                    className="absolute right-2 top-2.5"
                    onClick={() => setSelectedLogType(null)}
                  >
                    <X size={16} className="text-neutral-500 hover:text-neutral-700" />
                  </button>
                )}
              </div>
              
              <select
                className="input min-w-32"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="180">Last 6 months</option>
              </select>
            </div>
          </div>
          
          {/* Activity filters */}
          <div className="flex overflow-x-auto pb-2 mb-6 gap-2">
            <button
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedLogType === null
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              onClick={() => setSelectedLogType(null)}
            >
              All Activities
            </button>
            
            <button
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
                selectedLogType === 'EXERCISE'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              onClick={() => setSelectedLogType(selectedLogType === 'EXERCISE' ? null : 'EXERCISE')}
            >
              <Dumbbell size={16} className="mr-2" />
              Exercise
            </button>
            
            <button
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
                selectedLogType === 'SMOKING'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              onClick={() => setSelectedLogType(selectedLogType === 'SMOKING' ? null : 'SMOKING')}
            >
              <Cigarette size={16} className="mr-2" />
              Smoking
            </button>
            
            <button
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
                selectedLogType === 'DRINKING'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
              onClick={() => setSelectedLogType(selectedLogType === 'DRINKING' ? null : 'DRINKING')}
            >
              <Beer size={16} className="mr-2" />
              Drinking
            </button>
          </div>
          
          {/* Activity logs */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Activity History</h2>
            
            {filteredLogs.length > 0 ? (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className={`p-2 rounded-lg mr-3 ${
                          log.activity_type === 'EXERCISE' 
                            ? 'bg-primary-100 text-primary-600' 
                            : log.activity_type === 'SMOKING'
                            ? 'bg-error-100 text-error-600'
                            : 'bg-accent-100 text-accent-600'
                        }`}>
                          {log.activity_type === 'EXERCISE' && <Dumbbell size={20} />}
                          {log.activity_type === 'SMOKING' && <Cigarette size={20} />}
                          {log.activity_type === 'DRINKING' && <Beer size={20} />}
                        </div>
                        
                        <div>
                          <div className="flex items-center">
                            <h3 className="font-medium">{log.activity_name}</h3>
                            <span className="ml-2 text-xs px-2 py-0.5 bg-neutral-100 rounded-full">
                              {log.activity_type}
                            </span>
                          </div>
                          
                          <p className="text-sm text-neutral-500 mt-0.5">
                            {new Date(log.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          
                          <div className="mt-2 text-sm">
                            {log.activity_type === 'EXERCISE' && (
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="text-neutral-500">Duration: </span>
                                  <span>{log.duration} minutes</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Intensity: </span>
                                  <span>{log.intensity}</span>
                                </div>
                              </div>
                            )}
                            
                            {(log.activity_type === 'SMOKING' || log.activity_type === 'DRINKING') && (
                              <div>
                                <span className="text-neutral-500">Quantity: </span>
                                <span>{log.quantity} {log.activity_type === 'SMOKING' ? 'units' : 'drinks'}</span>
                              </div>
                            )}
                          </div>
                          
                          {log.notes && (
                            <p className="mt-2 text-sm text-neutral-600 bg-neutral-50 p-2 rounded">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <span className="text-xs text-neutral-400">
                        {new Date(log.created_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity size={36} className="mx-auto mb-4 text-neutral-300" />
                <h3 className="text-lg font-medium mb-2">No activities found</h3>
                <p className="text-neutral-500 mb-4">
                  {searchQuery || selectedLogType 
                    ? 'Try adjusting your filters to see more results'
                    : 'Start tracking your lifestyle activities to see them here'}
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveTab('EXERCISE')}
                >
                  <PlusCircle size={16} className="mr-2" />
                  Log New Activity
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'STATS' && (
        <div>
          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-error-600">{error}</p>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-neutral-500">Loading statistics...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Weekly activity chart */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">Weekly Activity Overview</h2>
                  
                  {logs.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Exercise" fill="#4F46E5" />
                          <Bar dataKey="Smoking" fill="#DC2626" />
                          <Bar dataKey="Drinking" fill="#F59E0B" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64">
                      <Activity size={36} className="text-neutral-300 mb-2" />
                      <p className="text-neutral-500">No activity data available</p>
                    </div>
                  )}
                  
                  <p className="text-sm text-neutral-500 mt-2">
                    Overview of your activity patterns over the past week.
                  </p>
                </div>
                
                {/* Exercise types distribution */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4">Exercise Types Distribution</h2>
                  
                  {exerciseTypesData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={exerciseTypesData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {exerciseTypesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64">
                      <Dumbbell size={36} className="text-neutral-300 mb-2" />
                      <p className="text-neutral-500">No exercise data available</p>
                    </div>
                  )}
                  
                  <p className="text-sm text-neutral-500 mt-2">
                    Distribution of different types of exercises you've performed.
                  </p>
                </div>
              </div>
              
              {/* Activity trends */}
              <div className="card mb-6">
                <h2 className="text-lg font-semibold mb-4">Activity Trends Over Time</h2>
                
                {logs.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Exercise"
                          stroke="#4F46E5"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Smoking"
                          stroke="#DC2626"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Drinking"
                          stroke="#F59E0B"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-72">
                    <BarChart2 size={36} className="text-neutral-300 mb-2" />
                    <p className="text-neutral-500">No activity data available</p>
                  </div>
                )}
                
                <p className="text-sm text-neutral-500 mt-2">
                  Visualize how your lifestyle habits have changed over time.
                </p>
              </div>
              
              {/* Stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-primary-50 border border-primary-100">
                  <div className="flex items-center">
                    <div className="p-3 bg-primary-100 rounded-lg">
                      <Dumbbell className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-neutral-500">Exercise Activity</h3>
                      <p className="text-2xl font-semibold text-primary-700">
                        {logs.filter(log => log.activity_type === 'EXERCISE').length || 0}
                      </p>
                      <p className="text-xs text-primary-600 mt-1">
                        Total exercise sessions logged
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="card bg-error-50 border border-error-100">
                  <div className="flex items-center">
                    <div className="p-3 bg-error-100 rounded-lg">
                      <Cigarette className="h-6 w-6 text-error-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-neutral-500">Smoking Activity</h3>
                      <p className="text-2xl font-semibold text-error-700">
                        {logs.filter(log => log.activity_type === 'SMOKING')
                          .reduce((sum, log) => sum + (log.quantity || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-error-600 mt-1">
                        Total smoking units recorded
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="card bg-accent-50 border border-accent-100">
                  <div className="flex items-center">
                    <div className="p-3 bg-accent-100 rounded-lg">
                      <Beer className="h-6 w-6 text-accent-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-neutral-500">Drinking Activity</h3>
                      <p className="text-2xl font-semibold text-accent-700">
                        {logs.filter(log => log.activity_type === 'DRINKING')
                          .reduce((sum, log) => sum + (log.quantity || 0), 0) || 0}
                      </p>
                      <p className="text-xs text-accent-600 mt-1">
                        Total drinks consumed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
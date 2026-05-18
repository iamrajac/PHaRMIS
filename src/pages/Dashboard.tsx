import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart2, 
  ClipboardList, 
  Activity, 
  Upload,
  ArrowUpRight,
  Frown,
  Meh,
  Smile,
  Calendar,
  PlusCircle,
  Droplets,
  Dumbbell,
  LucideIcon,
  ChevronRight
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardStats {
  moodAverage: number;
  symptomsCount: number;
  logsStreak: number;
  filesCount: number;
}

interface WidgetProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  color: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const Widget = ({ title, value, description, icon: Icon, color, change, trend }: WidgetProps) => {
  // Format the value based on its type
  const formattedValue = (() => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') {
      // For mood average, show one decimal place
      if (title === 'Mood Average') return value.toFixed(1);
      // For other numbers, show as is
      return value.toString();
    }
    return value;
  })();

  return (
    <div className="card h-full">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="text-white" size={20} />
        </div>
        
        {trend && (
          <div className={`flex items-center text-xs font-medium ${
            trend === 'up' ? 'text-success-600' : 
            trend === 'down' ? 'text-error-600' : 
            'text-neutral-500'
          }`}>
            {change}
            {trend === 'up' && <ArrowUpRight size={14} className="ml-0.5" />}
          </div>
        )}
      </div>
      
      <h3 className="text-2xl font-semibold mb-1">{formattedValue}</h3>
      <h4 className="text-sm font-medium text-neutral-700">{title}</h4>
      <p className="text-xs text-neutral-500 mt-1">{description}</p>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [moodData, setMoodData] = useState<any[]>([]);
  const [symptomsData, setSymptomsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [statsResponse, moodResponse, symptomsResponse] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getMoodChart(),
        dashboardAPI.getTopSymptoms()
      ]);

      setStats(statsResponse.data);
      setMoodData(moodResponse.data);
      setSymptomsData(symptomsResponse.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
      setStats(null);
      setMoodData([]);
      setSymptomsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Get current date and format it
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-error-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-6"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Hello, {user?.name || 'User'}</h1>
        <p className="text-neutral-500">{formattedDate}</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link to="/daily-log" className="card bg-primary-50 hover:bg-primary-100 transition-colors flex flex-col items-center justify-center py-4 text-center">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mb-2">
            <ClipboardList className="text-primary-600" size={20} />
          </div>
          <h3 className="text-sm font-medium text-primary-700">Log Today</h3>
        </Link>
        
        <Link to="/medical-files" className="card bg-secondary-50 hover:bg-secondary-100 transition-colors flex flex-col items-center justify-center py-4 text-center">
          <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center mb-2">
            <Upload className="text-secondary-600" size={20} />
          </div>
          <h3 className="text-sm font-medium text-secondary-700">Upload Files</h3>
        </Link>
        
        <Link to="/insights" className="card bg-accent-50 hover:bg-accent-100 transition-colors flex flex-col items-center justify-center py-4 text-center">
          <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center mb-2">
            <BarChart2 className="text-accent-600" size={20} />
          </div>
          <h3 className="text-sm font-medium text-accent-700">View Insights</h3>
        </Link>
        
        <Link to="/lifestyle" className="card bg-success-50 hover:bg-success-100 transition-colors flex flex-col items-center justify-center py-4 text-center">
          <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center mb-2">
            <Activity className="text-success-600" size={20} />
          </div>
          <h3 className="text-sm font-medium text-success-700">Track Lifestyle</h3>
        </Link>
      </div>

      {/* Stats widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats ? (
          <>
            <Widget 
              title="Mood Average" 
              value={stats.moodAverage} 
              description="Based on 7-day mood logs" 
              icon={Smile} 
              color="bg-primary-600"
            />
            <Widget 
              title="Symptoms Logged" 
              value={stats.symptomsCount} 
              description="Total symptoms recorded this month" 
              icon={ClipboardList} 
              color="bg-secondary-600"
            />
            <Widget 
              title="Daily Log Streak" 
              value={stats.logsStreak} 
              description="Consecutive days of logging" 
              icon={Calendar} 
              color="bg-accent-600"
            />
            <Widget 
              title="Medical Files" 
              value={stats.filesCount} 
              description="Total documents in your records" 
              icon={Upload} 
              color="bg-success-600"
            />
          </>
        ) : (
          <div className="col-span-4 text-center text-neutral-400">No data yet</div>
        )}
      </div>

      {/* Charts and insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Mood Chart */}
        {moodData.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold">Weekly Mood Trends</h3>
            <Link to="/insights" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
              View details
              <ChevronRight size={16} className="ml-1" />
            </Link>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moodData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                <XAxis dataKey="day" />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="mood" 
                  stroke="#4F46E5" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#4F46E5', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#4F46E5', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-between mt-2">
            <div className="flex items-center">
              <Frown className="text-error-500 mr-1" size={16} />
              <span className="text-xs text-neutral-600">Bad</span>
            </div>
            <div className="flex items-center">
              <Meh className="text-neutral-500 mr-1" size={16} />
              <span className="text-xs text-neutral-600">Neutral</span>
            </div>
            <div className="flex items-center">
              <Smile className="text-success-500 mr-1" size={16} />
              <span className="text-xs text-neutral-600">Good</span>
            </div>
          </div>
        </div>
        )}
        
        {/* Top Symptoms */}
        {symptomsData.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold">Most Reported Symptoms</h3>
            <Link to="/daily-log" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
              Log symptoms
              <ChevronRight size={16} className="ml-1" />
            </Link>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symptomsData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 70 }}>
                <XAxis type="number" domain={[0, 5]} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
                <Tooltip />
                <Bar 
                  dataKey="count" 
                  fill="#4F46E5" 
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <h4 className="text-sm font-medium mb-2">Potential Triggers</h4>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs py-1 px-2 bg-neutral-100 rounded-full">Stress</span>
              <span className="text-xs py-1 px-2 bg-neutral-100 rounded-full">Lack of sleep</span>
              <span className="text-xs py-1 px-2 bg-neutral-100 rounded-full">Dehydration</span>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Recent Activity and AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="card col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Recent Activity</h3>
            <button className="text-sm text-primary-600 hover:text-primary-700">View all</button>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex-shrink-0 flex items-center justify-center">
                <ClipboardList className="text-primary-600" size={18} />
              </div>
              <div>
                <h4 className="text-sm font-medium">You logged your symptoms</h4>
                <p className="text-xs text-neutral-500">Today, 9:30 AM</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors">
              <div className="w-10 h-10 rounded-full bg-secondary-100 flex-shrink-0 flex items-center justify-center">
                <Upload className="text-secondary-600" size={18} />
              </div>
              <div>
                <h4 className="text-sm font-medium">You uploaded a medical report</h4>
                <p className="text-xs text-neutral-500">Yesterday, 2:15 PM</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors">
              <div className="w-10 h-10 rounded-full bg-accent-100 flex-shrink-0 flex items-center justify-center">
                <Droplets className="text-accent-600" size={18} />
              </div>
              <div>
                <h4 className="text-sm font-medium">You logged drinking 8 glasses of water</h4>
                <p className="text-xs text-neutral-500">Yesterday, 8:45 AM</p>
              </div>
            </div>
            
            <div className="flex gap-3 p-3 hover:bg-neutral-50 rounded-lg transition-colors">
              <div className="w-10 h-10 rounded-full bg-success-100 flex-shrink-0 flex items-center justify-center">
                <Dumbbell className="text-success-600" size={18} />
              </div>
              <div>
                <h4 className="text-sm font-medium">You completed a 30-minute workout</h4>
                <p className="text-xs text-neutral-500">2 days ago, 6:20 PM</p>
              </div>
            </div>
          </div>
          
          <button className="w-full mt-4 py-2 border border-dashed border-neutral-300 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center justify-center">
            <PlusCircle size={16} className="mr-2" />
            Add new activity
          </button>
        </div>
        
        {/* AI Insights */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Health Insights</h3>
            <div className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">AI Generated</div>
          </div>
          
          <div className="space-y-4">
            <div className="p-3 bg-primary-50 rounded-lg">
              <h4 className="text-sm font-medium text-primary-700 mb-1">Sleep Pattern Correlation</h4>
              <p className="text-xs text-primary-600">Your headaches appear to occur more frequently on days following less than 7 hours of sleep.</p>
            </div>
            
            <div className="p-3 bg-secondary-50 rounded-lg">
              <h4 className="text-sm font-medium text-secondary-700 mb-1">Hydration Impact</h4>
              <p className="text-xs text-secondary-600">Increasing your water intake has correlated with a 30% reduction in reported fatigue levels.</p>
            </div>
            
            <div className="p-3 bg-neutral-50 rounded-lg">
              <h4 className="text-sm font-medium text-neutral-700 mb-1">Exercise Benefits</h4>
              <p className="text-xs text-neutral-600">Days with 20+ minutes of exercise show improved mood scores by an average of 1.2 points.</p>
            </div>
          </div>
          
          <Link to="/insights" className="mt-4 w-full btn btn-outline flex items-center justify-center">
            View all insights
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart2, 
  TrendingUp, 
  Brain, 
  Activity,
  Search,
  Calendar,
  Sun,
  Droplets,
  Dumbbell,
  Heart,
  BedDouble,
  Pill,
  Filter,
  RefreshCw
} from 'lucide-react';
import { insightsAPI, logsAPI, dashboardAPI } from '../services/api';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { Link } from 'react-router-dom';

interface Insight {
  id: number | string;
  title: string;
  content: string;
  category: string;
  generated_date: string;
  date?: string;
}

interface MoodData {
  date: string;
  mood: number;
}

interface SymptomData {
  name: string;
  count: number;
}

export default function HealthInsights() {
  const [insights, setInsights] = useState<any[]>([]);
  const [moodData, setMoodData] = useState<MoodData[]>([]);
  const [symptomsData, setSymptomsData] = useState<SymptomData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('30'); // days
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [hasNewData, setHasNewData] = useState(false);
  const [lastInsightTime, setLastInsightTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  
  const categories = [
    { name: 'Sleep', icon: BedDouble, color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Exercise', icon: Dumbbell, color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Hydration', icon: Droplets, color: 'bg-blue-100 text-blue-600' },
    { name: 'Mood', icon: Sun, color: 'bg-amber-100 text-amber-600' },
    { name: 'Symptoms', icon: Activity, color: 'bg-red-100 text-red-600' },
    { name: 'Medication', icon: Pill, color: 'bg-purple-100 text-purple-600' },
  ];

  // Function to check if there's new health data
  const checkForNewData = async () => {
    try {
      const response = await logsAPI.getLatestLogTimestamp();
      const latestLogTime = new Date(response.data.timestamp).getTime();
      setHasNewData(latestLogTime > lastFetchTime);
    } catch (error) {
      console.error('Error checking for new data:', error);
    }
  };

  const fetchLatestInsight = async () => {
    try {
      setIsRefreshing(true);
      const response = await insightsAPI.getLatestInsight();
      if (response.data) {
        setInsights([response.data]);
        setLastInsightTime(new Date(response.data.generated_date).getTime());
      } else {
        setInsights([]);
      }
    } catch (error) {
      console.error('Error fetching latest AI insight:', error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      // Check if there is new data since the last insight
      const latestLogResponse = await logsAPI.getLatestLogTimestamp();
      const latestLogTime = new Date(latestLogResponse.data.timestamp).getTime();
      
      if (latestLogTime > lastInsightTime) {
        // There is new data, generate a new insight
        try {
          const generateResponse = await insightsAPI.generateInsight();
          if (generateResponse.data) {
            // Fetch the updated insights history after generating new insight
            const historyResponse = await insightsAPI.getInsightsHistory(days);
            // Sort insights by date in descending order
            const sortedInsights = (historyResponse.data || []).sort((a: Insight, b: Insight) => {
              const dateA = new Date(a.date || a.generated_date).getTime();
              const dateB = new Date(b.date || b.generated_date).getTime();
              return dateB - dateA;
            });
            setInsights(sortedInsights);
            setLastInsightTime(new Date(generateResponse.data.generated_date).getTime());
          }
        } catch (error) {
          console.error('Error generating new insight:', error);
          // If generation fails, still try to fetch existing insights
          const historyResponse = await insightsAPI.getInsightsHistory(days);
          const sortedInsights = (historyResponse.data || []).sort((a: Insight, b: Insight) => {
            const dateA = new Date(a.date || a.generated_date).getTime();
            const dateB = new Date(b.date || b.generated_date).getTime();
            return dateB - dateA;
          });
          setInsights(sortedInsights);
        }
      } else {
        // No new data, fetch the latest insights
        const historyResponse = await insightsAPI.getInsightsHistory(days);
        const sortedInsights = (historyResponse.data || []).sort((a: Insight, b: Insight) => {
          const dateA = new Date(a.date || a.generated_date).getTime();
          const dateB = new Date(b.date || b.generated_date).getTime();
          return dateB - dateA;
        });
        setInsights(sortedInsights);
      }
      
      // Fetch mood and symptoms data
      const moodResponse = await dashboardAPI.getMoodChart({ days: parseInt(timeRange) });
      setMoodData(moodResponse.data);
      const symptomsResponse = await dashboardAPI.getTopSymptoms();
      setSymptomsData(symptomsResponse.data);
      
      setLastFetchTime(Date.now());
      setHasNewData(false);
    } catch (error) {
      console.error('Error fetching health insights data:', error);
      setError('Failed to load insights. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Check for new data every 5 minutes
  useEffect(() => {
    const interval = setInterval(checkForNewData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lastFetchTime]);
  
  useEffect(() => {
    fetchData();
  }, [selectedCategory, timeRange]);
  
  useEffect(() => {
    const fetchInsightsHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await insightsAPI.getInsightsHistory(days);
        // Sort insights by date in descending order
        const sortedInsights = (response.data || []).sort((a: Insight, b: Insight) => {
          const dateA = new Date(a.date || a.generated_date).getTime();
          const dateB = new Date(b.date || b.generated_date).getTime();
          return dateB - dateA;
        });
        setInsights(sortedInsights);
      } catch (err) {
        setError('Failed to load AI insights. Please try again later.');
        setInsights([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInsightsHistory();
  }, [days]);
  
  // Filter insights based on search query
  const filteredInsights = insights.filter(insight => 
    insight.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    insight.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (category: string) => {
    const found = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
    return found ? found.color : 'bg-neutral-100 text-neutral-600';
  };

  const getCategoryIcon = (category: string) => {
    const found = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
    return found ? found.icon : Brain;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Health Insights</h1>
        <p className="text-neutral-500">
          AI-powered analysis of your health patterns and trends
        </p>
      </div>
      
      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search insights..."
            className="input pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <select
            className="input"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="180">Last 6 months</option>
          </select>
          
          <button 
            className={`btn btn-outline flex items-center ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''} ${
              hasNewData ? 'bg-primary-50 border-primary-200' : ''
            }`}
            onClick={fetchData}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {hasNewData ? 'New Data Available' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* Categories */}
      <div className="flex overflow-x-auto pb-2 mb-6 gap-2">
        <button
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-primary-100 text-primary-700'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
          onClick={() => setSelectedCategory(null)}
        >
          All Insights
        </button>
        
        {categories.map((category) => (
          <button
            key={category.name}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
              selectedCategory === category.name
                ? 'bg-primary-100 text-primary-700'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
            onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
          >
            <category.icon size={16} className="mr-2" />
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Charts section */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Mood trends chart */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp size={20} className="mr-2 text-primary-600" />
              Mood Trends
            </h2>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={moodData}
                  margin={{ top: 5, right: 20, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    minTickGap={15}
                  />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                  <Tooltip 
                    formatter={(value) => [`Mood: ${value}`, 'Mood Level']}
                    labelFormatter={(label) => `Date: ${formatDate(label as string)}`}
                  />
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
            
            <div className="mt-2 text-sm text-neutral-500">
              Your mood variations over the selected time period
            </div>
          </div>
          
          {/* Top reported symptoms chart */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Activity size={20} className="mr-2 text-secondary-600" />
              Top Reported Symptoms
            </h2>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={symptomsData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 5, left: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 'dataMax + 1']} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12 }} 
                    width={70} 
                  />
                  <Tooltip 
                    formatter={(value) => [`Count: ${value}`, 'Occurrences']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#0D9488"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-2 text-sm text-neutral-500">
              Most frequently reported symptoms in your daily logs
            </div>
          </div>
        </div>
      )}
      
      {/* AI Insights section */}
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Brain size={22} className="mr-2 text-primary-600" />
        AI-Generated Health Insights
      </h2>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
                <div className="ml-3">
                  <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-neutral-200 rounded w-full"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-error-600">{error}</div>
      ) : (
        <div className="space-y-6">
          {insights.length === 0 ? (
            <div className="text-neutral-500">No insights available.</div>
          ) : (
            insights.map((insight, idx) => (
              <div key={insight.id || idx} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-primary-700">
                    {(insight.date || insight.generated_date).slice(0, 10)}
                  </span>
                  <span className="text-xs text-neutral-400">{insight.title}</span>
                </div>
                <div className="text-neutral-800 whitespace-pre-line">
                  {insight.content && insight.content.trim().length > 10 && !/here is the insight/i.test(insight.content)
                    ? insight.content
                    : <span className="text-neutral-500 italic">No actionable health insight could be generated for this day.</span>
                  }
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
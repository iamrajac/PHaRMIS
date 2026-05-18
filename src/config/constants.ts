// API endpoints
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Mood options for daily log
export const MOOD_OPTIONS = [
  { value: 1, label: 'Very Bad', emoji: '😣' },
  { value: 2, label: 'Bad', emoji: '😞' },
  { value: 3, label: 'Neutral', emoji: '😐' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 5, label: 'Very Good', emoji: '😁' },
];

// Symptom severity options
export const SEVERITY_OPTIONS = [
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'Severe' },
];

// Common symptom suggestions
export const COMMON_SYMPTOMS = [
  'Headache',
  'Fatigue',
  'Nausea',
  'Fever',
  'Cough',
  'Shortness of breath',
  'Dizziness',
  'Stomach pain',
  'Muscle aches',
  'Joint pain',
  'Sore throat',
  'Insomnia',
  'Anxiety',
  'Depression',
  'Rash',
];

// Lifestyle activity types
export const ACTIVITY_TYPES = {
  EXERCISE: [
    'Walking',
    'Running',
    'Swimming',
    'Cycling',
    'Yoga',
    'Strength training',
    'Hiking',
    'Dancing',
    'Other',
  ],
  SMOKING: [
    'Cigarettes',
    'E-cigarettes',
    'Pipe',
    'Cigars',
    'Other',
  ],
  DRINKING: [
    'Beer',
    'Wine',
    'Spirits',
    'Cocktails',
    'Other',
  ],
};

// File categories for medical files
export const FILE_CATEGORIES = [
  'Lab Results',
  'Prescriptions',
  'Imaging Reports',
  'Medical Records',
  'Insurance Documents',
  'Other',
];

// Max file upload size in bytes (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

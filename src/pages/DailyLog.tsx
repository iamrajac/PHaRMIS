import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  PlusCircle, 
  Calendar,
  ThermometerSun,
  Check,
  X
} from 'lucide-react';
import { MOOD_OPTIONS, SEVERITY_OPTIONS, COMMON_SYMPTOMS } from '../config/constants';
import axios from 'axios';
import { API_URL } from '../config/constants';

// Form validation schema
const dailyLogSchema = z.object({
  date: z.string(),
  mood: z.number().min(1).max(5),
  symptoms: z.array(
    z.object({
      name: z.string().min(1, 'Symptom name is required'),
      severity: z.number().min(1).max(3),
      notes: z.string().optional(),
    })
  ).optional(),
  medications: z.array(
    z.object({
      name: z.string().min(1, 'Medication name is required'),
      dosage: z.string().optional(),
      taken: z.boolean().default(false),
    })
  ).optional(),
  notes: z.string().optional(),
});

type DailyLogFormData = z.infer<typeof dailyLogSchema>;

interface SymptomInput {
  id: string;
  name: string;
  severity: number;
  notes: string;
}

interface MedicationInput {
  id: string;
  name: string;
  dosage: string;
  taken: boolean;
}

export default function DailyLog() {
  const [symptoms, setSymptoms] = useState<SymptomInput[]>([
    { id: '1', name: '', severity: 1, notes: '' },
  ]);
  
  const [medications, setMedications] = useState<MedicationInput[]>([
    { id: '1', name: '', dosage: '', taken: false },
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  const { control, register, handleSubmit, formState: { errors } } = useForm<DailyLogFormData>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: {
      date: today,
      mood: 3,
      symptoms: [],
      medications: [],
      notes: '',
    },
  });

  const addSymptom = () => {
    setSymptoms([
      ...symptoms,
      { id: Date.now().toString(), name: '', severity: 1, notes: '' },
    ]);
  };

  const removeSymptom = (id: string) => {
    setSymptoms(symptoms.filter(symptom => symptom.id !== id));
  };

  const addMedication = () => {
    setMedications([
      ...medications,
      { id: Date.now().toString(), name: '', dosage: '', taken: false },
    ]);
  };

  const removeMedication = (id: string) => {
    setMedications(medications.filter(medication => medication.id !== id));
  };

  const onSubmit = async (data: DailyLogFormData) => {
    try {
      setIsSubmitting(true);
      
      // Format the form data
      const formattedData = {
        ...data,
        symptoms: symptoms
          .filter(s => s.name.trim() !== '')
          .map(({ id, ...symptom }) => symptom),
        medications: medications
          .filter(m => m.name.trim() !== '')
          .map(({ id, ...medication }) => medication),
      };
      
      // Send to the API
      await axios.post(`${API_URL}/logs`, formattedData);
      
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to submit daily log', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Daily Health Log</h1>
        <p className="text-neutral-500">
          Track your symptoms, mood, and medications to monitor your health patterns
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Date selection */}
          <div className="card">
            <label className="form-label">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
              <input
                type="date"
                className="input pl-10"
                max={today}
                {...register('date')}
              />
            </div>
          </div>
          
          {/* Mood tracker */}
          <div className="card">
            <label className="form-label">Overall Mood</label>
            <Controller
              control={control}
              name="mood"
              render={({ field }) => (
                <div className="flex justify-between mt-2">
                  {MOOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                        field.value === option.value
                          ? 'bg-primary-100 text-primary-700'
                          : 'hover:bg-neutral-100'
                      }`}
                    >
                      <span className="text-2xl mb-1">{option.emoji}</span>
                      <span className="text-xs">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
        </div>
        
        {/* Symptoms section */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Symptoms</h2>
            <button
              type="button"
              onClick={addSymptom}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <PlusCircle size={16} className="mr-1" />
              Add Symptom
            </button>
          </div>
          
          <div className="space-y-4">
            {symptoms.map((symptom, index) => (
              <div key={symptom.id} className="p-4 border border-neutral-200 rounded-lg">
                <div className="flex justify-between mb-3">
                  <h3 className="text-sm font-medium">Symptom {index + 1}</h3>
                  {symptoms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSymptom(symptom.id)}
                      className="text-neutral-400 hover:text-error-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="form-label">Symptom Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Headache, Nausea"
                      value={symptom.name}
                      onChange={(e) => {
                        const newSymptoms = [...symptoms];
                        newSymptoms[index].name = e.target.value;
                        setSymptoms(newSymptoms);
                      }}
                      list="symptoms-list"
                    />
                    <datalist id="symptoms-list">
                      {COMMON_SYMPTOMS.map((symptom) => (
                        <option key={symptom} value={symptom} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div>
                    <label className="form-label">Severity</label>
                    <div className="flex gap-2">
                      {SEVERITY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`flex-1 py-2 rounded-lg border transition-colors ${
                            symptom.severity === option.value
                              ? 'bg-primary-100 border-primary-300 text-primary-700'
                              : 'border-neutral-300 hover:bg-neutral-50'
                          }`}
                          onClick={() => {
                            const newSymptoms = [...symptoms];
                            newSymptoms[index].severity = option.value;
                            setSymptoms(newSymptoms);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    placeholder="Describe when it started, what makes it better/worse..."
                    value={symptom.notes}
                    onChange={(e) => {
                      const newSymptoms = [...symptoms];
                      newSymptoms[index].notes = e.target.value;
                      setSymptoms(newSymptoms);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Medications section */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Medications</h2>
            <button
              type="button"
              onClick={addMedication}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <PlusCircle size={16} className="mr-1" />
              Add Medication
            </button>
          </div>
          
          <div className="space-y-4">
            {medications.map((medication, index) => (
              <div key={medication.id} className="p-4 border border-neutral-200 rounded-lg">
                <div className="flex justify-between mb-3">
                  <h3 className="text-sm font-medium">Medication {index + 1}</h3>
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedication(medication.id)}
                      className="text-neutral-400 hover:text-error-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="form-label">Medication Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Tylenol, Vitamin D"
                      value={medication.name}
                      onChange={(e) => {
                        const newMedications = [...medications];
                        newMedications[index].name = e.target.value;
                        setMedications(newMedications);
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Dosage (Optional)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., 250mg, 2 pills"
                      value={medication.dosage}
                      onChange={(e) => {
                        const newMedications = [...medications];
                        newMedications[index].dosage = e.target.value;
                        setMedications(newMedications);
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`taken-${medication.id}`}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                    checked={medication.taken}
                    onChange={(e) => {
                      const newMedications = [...medications];
                      newMedications[index].taken = e.target.checked;
                      setMedications(newMedications);
                    }}
                  />
                  <label htmlFor={`taken-${medication.id}`} className="ml-2 text-sm text-neutral-700">
                    I have taken this medication today
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Additional notes */}
        <div className="card mb-6">
          <label className="form-label">Additional Notes (Optional)</label>
          <textarea
            className="input resize-none"
            rows={4}
            placeholder="Anything else you'd like to note about your health today..."
            {...register('notes')}
          />
        </div>
        
        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary min-w-32 relative"
          >
            {isSubmitting ? 'Saving...' : 'Save Daily Log'}
            
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
    </motion.div>
  );
}
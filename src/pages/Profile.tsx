import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Users, 
  Heart,
  AlertTriangle,
  Pill,
  PlusCircle,
  Check,
  X,
  UserCircle,
  Upload
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

// Form validation schema
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  blood_type: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string().optional(),
  })).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ListItemProps {
  value: string;
  onRemove: () => void;
}

const ListItem = ({ value, onRemove }: ListItemProps) => (
  <div className="flex items-center justify-between bg-neutral-50 px-3 py-2 rounded-lg mb-2">
    <span className="text-sm">{value}</span>
    <button 
      type="button" 
      onClick={onRemove}
      className="text-neutral-400 hover:text-error-500"
    >
      <X size={16} />
    </button>
  </div>
);

interface MedicationItemProps {
  name: string;
  dosage?: string;
  onRemove: () => void;
}

const MedicationItem = ({ name, dosage, onRemove }: MedicationItemProps) => (
  <div className="flex items-center justify-between bg-neutral-50 px-3 py-2 rounded-lg mb-2">
    <div>
      <span className="text-sm font-medium">{name}</span>
      {dosage && <span className="text-sm text-neutral-500 ml-2">({dosage})</span>}
    </div>
    <button 
      type="button" 
      onClick={onRemove}
      className="text-neutral-400 hover:text-error-500"
    >
      <X size={16} />
    </button>
  </div>
);

export default function Profile() {
  const { user } = useAuth();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<Array<{ name: string; dosage?: string }>>([]);
  
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newMedicationDosage, setNewMedicationDosage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      date_of_birth: '',
      gender: '',
      height: '',
      weight: '',
      blood_type: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
    },
  });

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get('/api/profile');
      const { 
        name, 
        email, 
        phone, 
        date_of_birth, 
        gender, 
        height, 
        weight, 
        blood_type, 
        emergencyContact, 
        allergies: userAllergies, 
        conditions: userConditions, 
        medications: userMedications 
      } = response.data;

      // Set form values
      setValue('name', name || '');
      setValue('email', email || '');
      setValue('phone', phone || '');
      setValue('date_of_birth', date_of_birth || '');
      setValue('gender', gender || '');
      setValue('height', height || '');
      setValue('weight', weight || '');
      setValue('blood_type', blood_type || '');

      // Set emergency contact
      if (emergencyContact) {
        setValue('emergencyContact.name', emergencyContact.name || '');
        setValue('emergencyContact.relationship', emergencyContact.relationship || '');
        setValue('emergencyContact.phone', emergencyContact.phone || '');
      }

      // Set arrays
      setAllergies(userAllergies || []);
      setConditions(userConditions || []);
      setMedications(userMedications || []);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const addAllergy = async () => {
    if (newAllergy.trim()) {
      try {
        const res = await axios.post('/api/profile/allergies', { allergy: newAllergy });
        setAllergies(res.data.allergies || []);
        setNewAllergy('');
        await fetchProfileData();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to add allergy');
      }
    }
  };

  const removeAllergy = async (index: number) => {
    try {
      await axios.delete(`/api/profile/allergies/${allergies[index]}`);
      await fetchProfileData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove allergy');
    }
  };

  const addCondition = async () => {
    if (newCondition.trim()) {
      try {
        const res = await axios.post('/api/profile/conditions', { condition: newCondition });
        setConditions(res.data.conditions || []);
        setNewCondition('');
        await fetchProfileData();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to add condition');
      }
    }
  };

  const removeCondition = async (index: number) => {
    try {
      await axios.delete(`/api/profile/conditions/${conditions[index]}`);
      await fetchProfileData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove condition');
    }
  };

  const addMedication = async () => {
    if (newMedication.trim()) {
      try {
        const res = await axios.post('/api/profile/medications', { 
          medication: {
            name: newMedication,
            dosage: newMedicationDosage.trim() || undefined
          }
        });
        setMedications(res.data.medications || []);
        setNewMedication('');
        setNewMedicationDosage('');
        await fetchProfileData();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to add medication');
      }
    }
  };

  const removeMedication = async (index: number) => {
    try {
      await axios.delete(`/api/profile/medications/${medications[index].name}`);
      await fetchProfileData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove medication');
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Format the data for submission
      const formattedData = {
        ...data,
        allergies,
        conditions,
        medications: medications.map(med => ({
          name: med.name,
          dosage: med.dosage || null
        }))
      };

      console.log('Submitting profile data:', formattedData);
      
      const response = await axios.put('/api/profile', formattedData);
      console.log('Profile update response:', response.data);
      
      // Show success message
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      
      // Refresh profile data
      await fetchProfileData();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Profile</h1>
        <p className="text-neutral-500">
          Manage your personal health information
        </p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-error-50 text-error-700 rounded-lg">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Profile picture */}
        <div className="card mb-6 flex flex-col items-center sm:flex-row sm:items-start">
          <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center mb-4 sm:mb-0 sm:mr-6">
            <UserCircle className="h-16 w-16 text-primary-400" />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-medium mb-2">{user?.name || 'Your Name'}</h2>
            <p className="text-neutral-500 mb-4">{user?.email || 'your.email@example.com'}</p>
            <button type="button" className="btn btn-outline">
              <Upload size={16} className="mr-2" />
              Upload Photo
            </button>
          </div>
        </div>
        
        {/* Personal Information */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="name" className="form-label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                <input
                  id="name"
                  type="text"
                  className={`input pl-10 ${errors.name ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
                  placeholder="Your full name"
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p className="form-error">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  className={`input pl-10 ${errors.email ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : ''}`}
                  placeholder="Your email address"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="phone" className="form-label">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                <input
                  id="phone"
                  type="tel"
                  className="input pl-10"
                  placeholder="Your phone number"
                  {...register('phone')}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="date_of_birth" className="form-label">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                <input
                  id="date_of_birth"
                  type="date"
                  className="input pl-10"
                  {...register('date_of_birth')}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="gender" className="form-label">Gender</label>
              <select
                id="gender"
                className="input"
                {...register('gender')}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="blood_type" className="form-label">Blood Type</label>
              <select
                id="blood_type"
                className="input"
                {...register('blood_type')}
              >
                <option value="">Select blood type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="height" className="form-label">Height (cm)</label>
              <input
                id="height"
                type="number"
                className="input"
                placeholder="Height in centimeters"
                {...register('height')}
              />
            </div>
            
            <div>
              <label htmlFor="weight" className="form-label">Weight (kg)</label>
              <input
                id="weight"
                type="number"
                className="input"
                placeholder="Weight in kilograms"
                {...register('weight')}
              />
            </div>
          </div>
        </div>
        
        {/* Emergency Contact */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emergencyName" className="form-label">Contact Name</label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                <input
                  id="emergencyName"
                  type="text"
                  className="input pl-10"
                  placeholder="Emergency contact name"
                  {...register('emergencyContact.name')}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="emergencyRelationship" className="form-label">Relationship</label>
              <input
                id="emergencyRelationship"
                type="text"
                className="input"
                placeholder="e.g., Spouse, Parent, Friend"
                {...register('emergencyContact.relationship')}
              />
            </div>
            
            <div>
              <label htmlFor="emergencyPhone" className="form-label">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                <input
                  id="emergencyPhone"
                  type="tel"
                  className="input pl-10"
                  placeholder="Emergency contact phone"
                  {...register('emergencyContact.phone')}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Medical Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Allergies */}
          <div className="card">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-5 w-5 text-error-500 mr-2" />
              <h2 className="text-lg font-semibold">Allergies</h2>
            </div>
            
            <div className="mb-4">
              {allergies.map((allergy, index) => (
                <ListItem 
                  key={index} 
                  value={allergy} 
                  onRemove={() => removeAllergy(index)} 
                />
              ))}
            </div>
            
            <div className="flex">
              <input
                type="text"
                className="input rounded-r-none flex-1"
                placeholder="Add allergy"
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
              />
              <button
                type="button"
                onClick={addAllergy}
                className="btn btn-primary rounded-l-none"
              >
                <PlusCircle size={16} />
              </button>
            </div>
          </div>
          
          {/* Medical Conditions */}
          <div className="card">
            <div className="flex items-center mb-4">
              <Heart className="h-5 w-5 text-primary-500 mr-2" />
              <h2 className="text-lg font-semibold">Medical Conditions</h2>
            </div>
            
            <div className="mb-4">
              {conditions.map((condition, index) => (
                <ListItem 
                  key={index} 
                  value={condition} 
                  onRemove={() => removeCondition(index)} 
                />
              ))}
            </div>
            
            <div className="flex">
              <input
                type="text"
                className="input rounded-r-none flex-1"
                placeholder="Add condition"
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
              />
              <button
                type="button"
                onClick={addCondition}
                className="btn btn-primary rounded-l-none"
              >
                <PlusCircle size={16} />
              </button>
            </div>
          </div>
          
          {/* Current Medications */}
          <div className="card">
            <div className="flex items-center mb-4">
              <Pill className="h-5 w-5 text-secondary-500 mr-2" />
              <h2 className="text-lg font-semibold">Current Medications</h2>
            </div>
            
            <div className="mb-4">
              {medications.map((medication, index) => (
                <MedicationItem 
                  key={index} 
                  name={medication.name}
                  dosage={medication.dosage}
                  onRemove={() => removeMedication(index)} 
                />
              ))}
            </div>
            
            <div className="space-y-2">
              <input
                type="text"
                className="input w-full"
                placeholder="Medication name"
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
              />
              <input
                type="text"
                className="input w-full"
                placeholder="Dosage (optional)"
                value={newMedicationDosage}
                onChange={(e) => setNewMedicationDosage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
              />
              <button
                type="button"
                onClick={addMedication}
                className="btn btn-primary w-full"
              >
                <PlusCircle size={16} className="mr-2" />
                Add Medication
              </button>
            </div>
          </div>
        </div>
        
        {/* Submit button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary min-w-32 relative"
          >
            {isSubmitting ? 'Saving...' : 'Save Profile'}
            
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
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, FileText, Send, CheckCircle, AlertCircle } from 'lucide-react';

// Form validation schema
const complaintSchema = z.object({
  district_id: z.string().min(1, 'Please select a district'),
  municipality_id: z.string().min(1, 'Please select a municipality'),
  ward_id: z.string().min(1, 'Please select a ward'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000, 'Description must be less than 1000 characters'),
});

type ComplaintFormData = z.infer<typeof complaintSchema>;

interface District {
  id: number;
  name: string;
}

interface Municipality {
  id: number;
  name: string;
  district_id: number;
}

interface Ward {
  id: number;
  ward_number: number;
  municipality_id: number;
}

export default function FileComplaintPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Location data
  const [districts, setDistricts] = useState<District[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
  });

  const selectedDistrictId = watch('district_id');
  const selectedMunicipalityId = watch('municipality_id');

  // Load districts on mount
  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const response = await apiClient.get('/locations/districts/');
        setDistricts(response.data);
      } catch (err) {
        console.error('Failed to load districts:', err);
        setError('Failed to load districts');
      } finally {
        setLoadingDistricts(false);
      }
    };
    loadDistricts();
  }, []);

  // Load municipalities when district changes
  useEffect(() => {
    if (selectedDistrictId) {
      setLoadingMunicipalities(true);
      apiClient
        .get(`/locations/municipalities/?district_id=${selectedDistrictId}`)
        .then((response) => {
          setMunicipalities(response.data);
          setValue('municipality_id', '');
          setValue('ward_id', '');
          setWards([]);
        })
        .catch((err) => {
          console.error('Failed to load municipalities:', err);
          setError('Failed to load municipalities');
        })
        .finally(() => {
          setLoadingMunicipalities(false);
        });
    } else {
      setMunicipalities([]);
      setWards([]);
    }
  }, [selectedDistrictId, setValue]);

  // Load wards when municipality changes
  useEffect(() => {
    if (selectedMunicipalityId) {
      setLoadingWards(true);
      apiClient
        .get(`/locations/wards/?municipality_id=${selectedMunicipalityId}`)
        .then((response) => {
          setWards(response.data);
          setValue('ward_id', '');
        })
        .catch((err) => {
          console.error('Failed to load wards:', err);
          setError('Failed to load wards');
        })
        .finally(() => {
          setLoadingWards(false);
        });
    } else {
      setWards([]);
    }
  }, [selectedMunicipalityId, setValue]);

  const onSubmit = async (data: ComplaintFormData) => {
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await apiClient.post('/complaints', {
        citizen_id: user?.id || null,
        ward_id: parseInt(data.ward_id),
        municipality_id: parseInt(data.municipality_id),
        district_id: parseInt(data.district_id),
        message: data.description,
        department: 0, // Unclassified - will be classified by ML
        urgency: 0, // Will be classified by ML
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/complaints');
      }, 2000);
    } catch (err: any) {
      console.error('Complaint submission error:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      
      // Handle different error formats
      let errorMessage = 'Failed to submit complaint. Please try again.';
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // Validation errors from FastAPI
          errorMessage = detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ');
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail);
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Complaint Submitted Successfully!
          </h2>
          <p className="text-gray-600 mb-4">
            Your grievance has been registered and is being processed.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to My Complaints...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <FileText className="h-6 w-6 mr-2" />
            File a Complaint
          </h2>
          <p className="text-indigo-100 mt-1">
            Submit your grievance with accurate location details
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Location Section */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-indigo-600" />
                Location Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* District Dropdown */}
                <div>
                  <label htmlFor="district_id" className="block text-sm font-medium text-gray-700 mb-1">
                    District *
                  </label>
                  <select
                    {...register('district_id')}
                    id="district_id"
                    disabled={loadingDistricts}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingDistricts ? 'Loading...' : 'Select District'}
                    </option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                  {errors.district_id && <p className="mt-1 text-xs text-red-600">{errors.district_id.message}</p>}
                </div>

                {/* Municipality Dropdown */}
                <div>
                  <label htmlFor="municipality_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Municipality *
                  </label>
                  <select
                    {...register('municipality_id')}
                    id="municipality_id"
                    disabled={!selectedDistrictId || loadingMunicipalities}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingMunicipalities ? 'Loading...' : 'Select Municipality'}
                    </option>
                    {municipalities.map((municipality) => (
                      <option key={municipality.id} value={municipality.id}>
                        {municipality.name}
                      </option>
                    ))}
                  </select>
                  {errors.municipality_id && <p className="mt-1 text-xs text-red-600">{errors.municipality_id.message}</p>}
                </div>

                {/* Ward Dropdown */}
                <div>
                  <label htmlFor="ward_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Ward *
                  </label>
                  <select
                    {...register('ward_id')}
                    id="ward_id"
                    disabled={!selectedMunicipalityId || loadingWards}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingWards ? 'Loading...' : 'Select Ward'}
                    </option>
                    {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>
                        Ward {ward.ward_number}
                      </option>
                    ))}
                  </select>
                  {errors.ward_id && <p className="mt-1 text-xs text-red-600">{errors.ward_id.message}</p>}
                </div>
              </div>
            </div>

            {/* Complaint Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Complaint Description *
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={6}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Describe your grievance in detail. Please provide as much information as possible..."
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Minimum 20 characters, maximum 1000 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit Complaint
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

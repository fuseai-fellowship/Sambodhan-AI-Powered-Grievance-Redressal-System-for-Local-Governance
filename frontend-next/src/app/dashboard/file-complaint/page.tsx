'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '../../lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, FileText, Send, CheckCircle, AlertCircle, Info, ChevronDown } from 'lucide-react';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-600" strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Success!
            </h2>
            <p className="text-lg text-gray-700 mb-2">
              Your complaint has been submitted
            </p>
            <p className="text-sm text-gray-500 mb-6">
              We'll process your grievance and get back to you soon.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">
                Redirecting to My Complaints...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#E8214A] rounded-lg shadow-sm mb-4">
            <FileText className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit Your Grievance
          </h1>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            Report your concerns and we'll work to resolve them. Your voice matters.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          {/* Info Banner */}
          <div className="bg-[#E8214A] px-6 py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <div className="text-white">
                <p className="font-semibold text-sm">Quick Tip</p>
                <p className="text-xs text-red-100 mt-0.5">
                  Provide accurate location details and a clear description for faster resolution
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md flex items-start gap-3 shadow-sm">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Location Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <div className="bg-red-50 p-2 rounded-lg">
                    <MapPin className="h-5 w-5 text-[#E8214A]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Location Details
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* District Dropdown */}
                  <div className="group">
                    <label htmlFor="district_id" className="block text-sm font-semibold text-gray-700 mb-2">
                      District <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <select
                        {...register('district_id')}
                        id="district_id"
                        disabled={loadingDistricts}
                        className="block w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E8214A] focus:bg-white disabled:bg-gray-50 disabled:cursor-not-allowed transition-all appearance-none text-gray-900 font-medium hover:border-gray-300"
                      >
                        <option value="" className="text-gray-500">
                          {loadingDistricts ? 'Loading districts...' : 'Select your district'}
                        </option>
                        {districts.map((district) => (
                          <option key={district.id} value={district.id} className="text-gray-900">
                            {district.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.district_id && (
                      <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                        {errors.district_id.message}
                      </p>
                    )}
                  </div>

                  {/* Municipality Dropdown */}
                  <div className="group">
                    <label htmlFor="municipality_id" className="block text-sm font-semibold text-gray-700 mb-2">
                      Municipality <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <select
                        {...register('municipality_id')}
                        id="municipality_id"
                        disabled={!selectedDistrictId || loadingMunicipalities}
                        className="block w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E8214A] focus:bg-white disabled:bg-gray-50 disabled:cursor-not-allowed transition-all appearance-none text-gray-900 font-medium hover:border-gray-300"
                      >
                        <option value="" className="text-gray-500">
                          {loadingMunicipalities ? 'Loading...' : selectedDistrictId ? 'Select municipality' : 'Select district first'}
                        </option>
                        {municipalities.map((municipality) => (
                          <option key={municipality.id} value={municipality.id} className="text-gray-900">
                            {municipality.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.municipality_id && (
                      <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                        {errors.municipality_id.message}
                      </p>
                    )}
                  </div>

                  {/* Ward Dropdown */}
                  <div className="group">
                    <label htmlFor="ward_id" className="block text-sm font-semibold text-gray-700 mb-2">
                      Ward <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <select
                        {...register('ward_id')}
                        id="ward_id"
                        disabled={!selectedMunicipalityId || loadingWards}
                        className="block w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E8214A] focus:bg-white disabled:bg-gray-50 disabled:cursor-not-allowed transition-all appearance-none text-gray-900 font-medium hover:border-gray-300"
                      >
                        <option value="" className="text-gray-500">
                          {loadingWards ? 'Loading...' : selectedMunicipalityId ? 'Select ward' : 'Select municipality first'}
                        </option>
                        {wards.map((ward) => (
                          <option key={ward.id} value={ward.id} className="text-gray-900">
                            Ward {ward.ward_number}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.ward_id && (
                      <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                        <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                        {errors.ward_id.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Complaint Description */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                  <div className="bg-red-50 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-[#E8214A]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Describe Your Grievance
                  </h3>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                    Complaint Description <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    {...register('description')}
                    id="description"
                    rows={6}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E8214A] focus:bg-white resize-none transition-all hover:border-gray-300 text-gray-900"
                    placeholder="Please provide a detailed description of your grievance. Include what happened, when it occurred, and any other relevant information that will help us address your concern effectively..."
                  />
                  {errors.description && (
                    <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-600 rounded-full"></span>
                      {errors.description.message}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Minimum 20 characters required</span>
                    <span className="text-gray-400">Maximum 1000 characters</span>
                  </div>
                </div>
              </div>

              {/* Submit Section */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-[#E8214A] hover:bg-[#c81940] text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E8214A] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting Your Complaint...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Submit Complaint
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact support at{' '}
            <a href="mailto:info@grievance.gov.np" className="text-[#E8214A] hover:underline font-medium">
              info@grievance.gov.np
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

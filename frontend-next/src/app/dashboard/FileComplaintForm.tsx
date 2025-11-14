import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { MapPin, FileText, ChevronDown, CheckCircle, Info, Send, AlertCircle } from 'lucide-react';
// Types for location objects
type District = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Municipality = {
  id: number;
  name: string;
  district_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  district?: District;
};

type Ward = {
  id: number;
  ward_number: number;
  municipality_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  municipality?: Municipality;
};
import apiClient from '../lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

export default function FileComplaintForm() {
  const { user } = useAuth ? useAuth() : { user: null };
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [districtsError, setDistrictsError] = useState('');
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [form, setForm] = useState({
    department: '',
    urgency: '',
    current_status: 'Pending',
    message: '',
    ward_id: '',
    municipality_id: '',
    district_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDistrictsLoading(true);
    setDistrictsError('');
    apiClient.get('/locations/districts/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setDistricts(data);
        setDistrictsLoading(false);
      })
      .catch(err => {
        setDistrictsError('Failed to load districts. Please try again.');
        setDistricts([]);
        setDistrictsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (form.district_id) {
        apiClient.get(`/locations/municipalities/?district_id=${form.district_id}`).then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setMunicipalities(data);
      });
    } else {
      setMunicipalities([]);
    }
    setForm(f => ({ ...f, municipality_id: '', ward_id: '' }));
  }, [form.district_id]);

  useEffect(() => {
    if (form.municipality_id) {
        apiClient.get(`/locations/wards/?municipality_id=${form.municipality_id}`).then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        setWards(data);
      });
    } else {
      setWards([]);
    }
    setForm(f => ({ ...f, ward_id: '' }));
  }, [form.municipality_id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // 1. Call HuggingFace APIs
      // Urgency classifier
      const urgencyRes = await fetch('https://sambodhan-urgency-classifier-space.hf.space/predict_urgency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: form.message })
      });
  const urgencyData = await urgencyRes.json();
  const urgency = urgencyData?.label || 'Normal';
  console.log('Urgency API response:', urgencyData);
  console.log('Urgency value used in payload:', urgency);

      // Department classifier
      const deptRes = await fetch('https://sambodhan-department-classifier-space.hf.space/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: form.message })
      });
      const deptData = await deptRes.json();
      const department = deptData?.label || 'General';

      // 2. Build payload with ward_id
      const now = new Date().toISOString();
      const payload = {
        citizen_id: user?.id,
        department,
        urgency,
        current_status: form.current_status,
        message: form.message,
        ward_id: Number(form.ward_id) || null,
        date_submitted: now,
      };

      console.log('Submitting payload:', payload);
    // 4. Send to backend
    await apiClient.post('http://localhost:8000/api/complaints', payload)
        .catch(err => {
          if (err?.response) {
            console.error('API error:', {
              status: err.response.status,
              data: err.response.data,
              message: err.message,
              payload,
            });
          } else {
            console.error('API error:', err);
          }
          throw err;
        });
      setSuccess('Complaint submitted successfully!');
      setForm({
        department: '',
        urgency: '',
        current_status: 'Pending',
        message: '',
        ward_id: '',
        municipality_id: '',
        district_id: '',
      });
    } catch (err) {
      setError('Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {success ? (
          // Success Screen
          <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Complaint Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your grievance has been registered and will be reviewed by the concerned department shortly.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>What's Next?</strong> You'll receive updates on your registered mobile number and email. Track your complaint status in the "My Grievances" section.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess('');
                setForm({
                  department: '',
                  urgency: '',
                  current_status: 'Pending',
                  message: '',
                  ward_id: '',
                  municipality_id: '',
                  district_id: '',
                });
              }}
              className="bg-[#E8214A] hover:bg-[#c81940] text-white px-8 py-3 rounded-lg font-semibold transition shadow-sm"
            >
              Submit Another Complaint
            </button>
          </div>
        ) : (
          // Form Screen
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-[#E8214A] p-8 text-white">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Submit Your Grievance</h1>
                  <p className="text-red-100 mt-1 text-sm">We're here to help resolve your concerns</p>
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-6 rounded-r-md">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Tips for a Better Response:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Be specific about the location and issue</li>
                    <li>Provide as many details as possible</li>
                    <li>Include relevant dates and times if applicable</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Location Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <MapPin className="w-5 h-5 text-[#E8214A]" />
                  <h2 className="text-lg font-semibold text-gray-900">Location Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* District Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      District <span className="text-red-600">*</span>
                    </label>
                    {districtsLoading ? (
                      <div className="text-gray-500 py-3 px-4 border border-gray-200 rounded-lg bg-gray-50">
                        Loading districts...
                      </div>
                    ) : districtsError ? (
                      <div className="text-red-600 py-3 px-4 border border-red-200 rounded-lg bg-red-50">
                        {districtsError}
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          name="district_id"
                          value={form.district_id}
                          onChange={handleChange}
                          className="w-full border border-gray-200 p-3 pr-10 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E8214A] focus:bg-white transition appearance-none cursor-pointer hover:border-gray-300"
                          required
                          title="Select your district"
                        >
                          <option value="">Select District</option>
                          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Municipality Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Municipality <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="municipality_id"
                        value={form.municipality_id}
                        onChange={handleChange}
                        className="w-full border border-gray-200 p-3 pr-10 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E8214A] focus:bg-white transition appearance-none cursor-pointer hover:border-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                        required
                        disabled={!form.district_id}
                        title="Select your municipality"
                      >
                        <option value="">Select Municipality</option>
                        {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Ward Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ward <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <select
                        name="ward_id"
                        value={form.ward_id}
                        onChange={handleChange}
                        className="w-full border border-gray-200 p-3 pr-10 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E8214A] focus:bg-white transition appearance-none cursor-pointer hover:border-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                        required
                        disabled={!form.municipality_id}
                        title="Select your ward"
                      >
                        <option value="">Select Ward</option>
                        {wards.map(w => <option key={w.id} value={w.id}>Ward {w.ward_number}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Description Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <FileText className="w-5 h-5 text-[#E8214A]" />
                  <h2 className="text-lg font-semibold text-gray-900">Grievance Details</h2>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Describe Your Grievance <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Please provide detailed information about your grievance including specific location, nature of the problem, and any relevant details..."
                    className="w-full border border-gray-200 p-4 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E8214A] focus:bg-white transition resize-none hover:border-gray-300"
                    rows={6}
                    required
                  />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Be as specific as possible for faster resolution</span>
                    <span className="text-gray-400">{form.message.length} characters</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200"></div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#E8214A] hover:bg-[#c81940] text-white py-3 px-6 rounded-lg font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Grievance
                    </>
                  )}
                </button>
              </div>

              {/* Help Section */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#E8214A]" />
                  Need Help?
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  If you're facing any issues submitting your grievance or need assistance, please contact our support team.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-medium">Helpline:</span>
                    <span className="text-[#E8214A] font-semibold">+977-1-XXXXXXX</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-medium">Email:</span>
                    <span className="text-[#E8214A] font-semibold">info@grievance.gov.np</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}


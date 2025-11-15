import React, { useState } from 'react';
import { Info, Send } from 'lucide-react';
import { Button } from './ui/button';

export default function SubmitGrievanceForm() {
  const [formData, setFormData] = useState({
    district: '',
    municipality: '',
    ward_id: '', // store ward_id as string, convert to number for payload
    description: '',
  });
  const [wards, setWards] = useState([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  // Fetch wards when municipality changes
  React.useEffect(() => {
    if (formData.municipality) {
      setWardsLoading(true);
      (async () => {
        try {
          const apiClient = (await import('@/lib/api-client')).default;
          const res = await apiClient.get(`/location/wards/?municipality_id=${formData.municipality}`);
          setWards(res.data);
        } catch {
          setWards([]);
        } finally {
          setWardsLoading(false);
        }
      })();
    } else {
      setWards([]);
    }
  }, [formData.municipality]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [urgencyDebug, setUrgencyDebug] = useState<{response?: any, predicted?: string}>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    if (!formData.ward_id || isNaN(Number(formData.ward_id))) {
      setError('Please select a valid ward.');
      setLoading(false);
      return;
    }
    try {
      // 1. Call urgency classifier
      const urgencyRes = await fetch('https://sambodhan-urgency-classifier-space.hf.space/predict_urgency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formData.description })
      });
      const urgencyData = await urgencyRes.json();
      const predictedUrgency = urgencyData?.label || '';
      setUrgencyDebug({response: urgencyData, predicted: predictedUrgency});
      if (!predictedUrgency || typeof predictedUrgency !== 'string') {
        setError('Failed to classify urgency. Please try again.');
        setLoading(false);
        return;
      }

      // 2. Call department classifier
      const deptRes = await fetch('https://sambodhan-department-classifier-space.hf.space/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formData.description })
      });
      const deptData = await deptRes.json();
      const predictedDepartment = deptData?.department || deptData?.label || '';

      // 3. Prepare payload for backend
      const payload = {
        district: formData.district,
        municipality: formData.municipality,
        ward_id: Number(formData.ward_id),
        message: formData.description,
        urgency: predictedUrgency,
        department: predictedDepartment,
      };
  // POST to backend (correct endpoint)
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('sambodhan_token') : null;
  const res = await (await import('@/lib/api-client')).default.post('/api/complaints', payload, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
      setSuccess('Grievance submitted successfully!');
      setFormData({
        district: '',
        municipality: '',
        ward_id: '',
        description: '',
      });
    } catch (err) {
      setError('Failed to submit grievance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 min-h-screen flex items-center justify-center">
      <div className="w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-indigo-700 mb-2">Submit Grievance</h2>
        <p className="text-base text-gray-500 mb-6">Describe your issue in detail for faster resolution.</p>

        <form onSubmit={handleSubmit} className="space-y-7">
          {urgencyDebug.response && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
              <div className="font-bold text-yellow-700 mb-1">Urgency API Debug Info</div>
              <div className="text-xs text-gray-700 mb-1">Raw response: <pre>{JSON.stringify(urgencyDebug.response, null, 2)}</pre></div>
              <div className="text-sm text-yellow-800">Predicted urgency: <b>{urgencyDebug.predicted}</b></div>
            </div>
          )}
          {success && <div className="text-green-600 font-medium mb-2">{success}</div>}
          {error && <div className="text-red-600 font-medium mb-2">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
            <select
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              title="Select District"
            >
              <option value="">Select District</option>
              <option>Kathmandu</option>
              <option>Lalitpur</option>
              <option>Bhaktapur</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Municipality *</label>
            <select
              name="municipality"
              value={formData.municipality}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              title="Select Municipality"
            >
              <option value="">Select Municipality</option>
              <option>KMC</option>
              <option>LMC</option>
              <option>BMC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ward *</label>
            <select
              name="ward_id"
              value={formData.ward_id}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              title="Select Ward"
            >
              <option value="">Select Ward</option>
              {wardsLoading ? (
                <option disabled>Loading...</option>
              ) : (
                wards.map((ward: any) => (
                  <option key={ward.id} value={ward.id}>{`Ward ${ward.ward_number}`}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grievance Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your grievance in detail..."
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-800 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="bg-gray-50 text-gray-600 text-sm rounded-lg px-4 py-3 flex items-start gap-2 border border-gray-200">
            <Info className="w-4 h-4 text-indigo-400 mt-0.5" />
            <p>You will receive a confirmation SMS and email with your grievance ID. Average response time is 24 hours.</p>
          </div>

          <div className="flex flex-col md:flex-row justify-end items-center gap-4 mt-4">
            <Button
              type="submit"
              disabled={loading}
              variant="default"
              size="lg"
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Submit Grievance'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

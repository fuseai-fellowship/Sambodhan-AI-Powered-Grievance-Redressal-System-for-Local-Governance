import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
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
import apiClient from '@/lib/api-client';
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

      // 2. Fetch full ward, municipality, district objects
      const wardObj = wards.find(w => w.id === Number(form.ward_id));
      const municipalityObj = municipalities.find(m => m.id === Number(form.municipality_id));
      const districtObj = districts.find(d => d.id === Number(form.district_id));

      // 3. Build nested payload
      const now = new Date().toISOString();
      const payload = {
  citizen_id: user?.id,
  department,
  urgency,
        current_status: form.current_status,
        message: form.message,
        ward: {
          ward_number: wardObj?.ward_number || 0,
          municipality_id: municipalityObj?.id || 0,
          id: wardObj?.id || 0,
          is_active: wardObj?.is_active ?? true,
          created_at: wardObj?.created_at || now,
          updated_at: wardObj?.updated_at || now,
          municipality: {
            name: municipalityObj?.name || '',
            district_id: districtObj?.id || 0,
            id: municipalityObj?.id || 0,
            is_active: municipalityObj?.is_active ?? true,
            created_at: municipalityObj?.created_at || now,
            updated_at: municipalityObj?.updated_at || now,
            district: {
              // ...existing code...
              id: districtObj?.id || 0,
              is_active: districtObj?.is_active ?? true,
              created_at: districtObj?.created_at || now,
              updated_at: districtObj?.updated_at || now
            }
          }
        },
        date_submitted: now,
        created_at: now,
        updated_at: now
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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div className="w-full">
        {districtsLoading ? (
          <div className="text-gray-500 py-2">Loading districts...</div>
        ) : districtsError ? (
          <div className="text-red-600 py-2">{districtsError}</div>
        ) : (
          <select name="district_id" value={form.district_id} onChange={handleChange} className="w-full border p-2 rounded" required title="Select District">
            <option value="">Select District</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {form.district_id && (
        <select name="municipality_id" value={form.municipality_id} onChange={handleChange} className="w-full border p-2 rounded" required title="Select Municipality">
          <option value="">Select Municipality</option>
          {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}

      {form.municipality_id && (
        <select name="ward_id" value={form.ward_id} onChange={handleChange} className="w-full border p-2 rounded" required title="Select Ward">
          <option value="">Select Ward</option>
          {wards.map(w => <option key={w.id} value={w.id}>Ward {w.ward_number}</option>)}
        </select>
      )}

      <textarea name="message" value={form.message} onChange={handleChange} placeholder="Describe your grievance" className="w-full border p-2 rounded" required />
      <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded">{loading ? 'Submitting...' : 'Submit Complaint'}</button>
      {success && <p className="text-green-600">{success}</p>}
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}


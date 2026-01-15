import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';

// Template for empty form fields
const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  societyId: ''
};

const AdminsPage = () => {
  const { user } = useAuth(); // Get the current authenticated user
  const [admins, setAdmins] = useState([]); // Stores the list of admin users
  const [societies, setSocieties] = useState([]); // Stores list of societies for dropdown
  const [form, setForm] = useState(emptyForm); // Form input values
  const [editingId, setEditingId] = useState(null); // Tracks if we're editing an existing admin
  const [loading, setLoading] = useState(false); // Loader state for API actions
  const [error, setError] = useState(''); // General error message
  const [phoneError, setPhoneError] = useState(''); // Phone-specific validation error
  const [emailError, setEmailError] = useState(''); // Email-specific validation error
  const [passwordError, setPasswordError] = useState(''); // Password-specific validation error

  // Restrict access if user is not a super admin
  if (user?.role !== 'super_admin') return <div>Access Denied</div>;

  // Helper: Adds authorization header to API requests
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  // Fetch list of all admins from API
  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load admins');
      const data = await res.json();
      // Only keep users with role "admin"
      setAdmins(data.filter(a => a.role === 'admin'));
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch all societies from API
  const fetchSocieties = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/societies`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load societies');
      setSocieties(await res.json());
    } catch (err) {
      setSocieties([]); // Fallback to empty if failed
    }
  };

  // On page load, fetch admins and societies
  useEffect(() => { fetchAdmins(); fetchSocieties(); }, []);

  // Handle changes in form inputs
  const handleChange = e => {
    const { name, value } = e.target;

    // Phone validation (only numbers, max 10 digits)
    if (name === 'phone') {
      if (!/^\d{0,10}$/.test(value)) return;
      setPhoneError(value.length === 10 ? '' : 'Phone number must be exactly 10 digits');
    }

    // Email validation
    if (name === 'email') {
      setEmailError(value.includes('@') && value.endsWith('.com') ? '' : 'Email must contain @ and end with .com');
    }

    // Password validation (must have uppercase, lowercase, number, special char)
    if (name === 'password') {
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
      setPasswordError(passwordPattern.test(value)
        ? ''
        : 'Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character');
    }

    setForm({ ...form, [name]: value });
  };

  // Handle form submission for adding/updating admins
  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Manual validation checks
    if (!/^\d{10}$/.test(form.phone)) {
      setError('Phone number must be exactly 10 digits');
      setLoading(false);
      return;
    }
    if (!form.email.includes('@') || !form.email.endsWith('.com')) {
      setError('Email must contain @ and end with .com');
      setLoading(false);
      return;
    }
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
    if (!editingId && !passwordPattern.test(form.password)) {
      setError('Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character');
      setLoading(false);
      return;
    }

    try {
      // Build request payload
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: 'admin',
        societyId: form.societyId ? parseInt(form.societyId, 10) : null
      };

      // Determine API method and URL based on whether editing or adding
      let url = `${API_BASE_URL}/users`;
      let method = 'POST';
      if (editingId) {
        url = `${API_BASE_URL}/users/${editingId}`;
        method = 'PUT';
        payload.userId = editingId;
        delete payload.password; // Don't send password in update
      }

      // API request
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save admin');

      // Reset form and reload admins
      setForm(emptyForm);
      setEditingId(null);
      fetchAdmins();
    } catch {
      setError('Failed to save admin');
    }
    setLoading(false);
  };

  // Fill form with admin data for editing
  const handleEdit = admin => {
    setForm({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      password: '',
      societyId: admin.societyId ? String(admin.societyId) : ''
    });
    setEditingId(admin.userId);
  };

  // Delete an admin (with confirmation)
  const handleDelete = async id => {
    if (!window.confirm('Delete this admin?')) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchAdmins();
    } catch {
      setError('Failed to delete admin');
    }
    setLoading(false);
  };

  // Toggle admin verification status
  const handleVerify = async (admin) => {
    setLoading(true);
    setError('');
    try {
      const payload = { ...admin, isVerified: !admin.isVerified };
      await fetch(`${API_BASE_URL}/users/${admin.userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      fetchAdmins();
    } catch {
      setError('Failed to update verification status');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Admins Management</h1>
      <div className="bg-white rounded-lg shadow p-6">

        {/* Form for adding/updating admins */}
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mb-4 items-end">

          {/* Name */}
          <div className="flex flex-col">
            <label htmlFor="admin-name" className="font-semibold mb-1">Name</label>
            <Input id="admin-name" name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label htmlFor="admin-email" className="font-semibold mb-1">Email</label>
            <Input id="admin-email" name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" required />
            {emailError && <span className="text-red-600 text-xs mt-1">{emailError}</span>}
          </div>

          {/* Phone */}
          <div className="flex flex-col">
            <label htmlFor="admin-phone" className="font-semibold mb-1">Phone</label>
            <Input id="admin-phone" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" required />
            {phoneError && <span className="text-red-600 text-xs mt-1">{phoneError}</span>}
          </div>

          {/* Password (only for adding new admins) */}
          {!editingId && (
            <div className="flex flex-col">
              <label htmlFor="admin-password" className="font-semibold mb-1">Password</label>
              <Input id="admin-password" name="password" value={form.password} onChange={handleChange} placeholder="Password" type="password" required />
              {passwordError && <span className="text-red-600 text-xs mt-1">{passwordError}</span>}
            </div>
          )}

          {/* Society dropdown */}
          <div className="flex flex-col">
            <label htmlFor="admin-societyId" className="font-semibold mb-1">Society</label>
            <select id="admin-societyId" name="societyId" value={form.societyId} onChange={handleChange} className="border rounded px-2 py-1" required>
              <option value="">Select Society</option>
              {societies.map(s => (
                <option key={s.societyId} value={s.societyId}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Submit and Cancel buttons */}
          <Button type="submit" variant="primary" disabled={loading}>{editingId ? 'Update' : 'Add'}</Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</Button>
          )}
        </form>

        {/* Display general errors */}
        {error && <div className="text-red-600 mb-2">{error}</div>}

        {/* Admins table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Name</th>
                <th className="px-4 py-2 border">Email</th>
                <th className="px-4 py-2 border">Phone</th>
                <th className="px-4 py-2 border">Society</th>
                <th className="px-4 py-2 border">Verified</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.userId}>
                  <td className="border px-4 py-2">{admin.name}</td>
                  <td className="border px-4 py-2">{admin.email}</td>
                  <td className="border px-4 py-2">{admin.phone}</td>
                  <td className="border px-4 py-2">{societies.find(s => s.societyId === admin.societyId)?.name || '-'}</td>
                  <td className="border px-4 py-2">{admin.isVerified ? 'Yes' : 'No'}</td>
                  <td className="border px-4 py-2 space-x-2">
                    {/* Action buttons */}
                    <Button type="button" variant="secondary" onClick={() => handleEdit(admin)} size="sm">Edit</Button>
                    <Button type="button" variant="danger" onClick={() => handleDelete(admin.userId)} size="sm">Delete</Button>
                    <Button type="button" size="sm" variant={admin.isVerified ? 'secondary' : 'success'} onClick={() => handleVerify(admin)}>
                      {admin.isVerified ? 'Unverify' : 'Verify'}
                    </Button>
                  </td>
                </tr>
              ))}
              {/* No admins fallback */}
              {admins.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4">No admins found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminsPage;

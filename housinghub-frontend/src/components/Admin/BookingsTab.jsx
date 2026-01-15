import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../UI/Button';

// Available booking statuses
const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Completed'];

const BookingsTab = () => {
  const { user } = useAuth(); // Get logged-in user data from AuthContext
  const [bookings, setBookings] = useState([]); // List of bookings
  const [amenities, setAmenities] = useState([]); // List of amenities for lookup
  const [loading, setLoading] = useState(false); // Loading state for API calls
  const [error, setError] = useState(''); // Error messages
  const [statusEdit, setStatusEdit] = useState({}); // Tracks edited status per booking ID

  // Prepare authorization headers for API requests
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  // Fetch all bookings from the API
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bookings`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load bookings');
      const data = await res.json();
      setBookings(data);
    } catch {
      setError('Failed to load bookings');
    }
    setLoading(false);
  };

  // Fetch list of amenities (used to show amenity name instead of ID)
  const fetchAmenities = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/amenities`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load amenities');
      const data = await res.json();
      setAmenities(data);
    } catch {
      setAmenities([]); // In case of error, set amenities list to empty
    }
  };

  // Load bookings and amenities on first render
  useEffect(() => { 
    fetchBookings(); 
    fetchAmenities(); 
  }, []);

  // Track status changes in dropdown without immediately saving
  const handleStatusChange = (bookingId, status) => {
    setStatusEdit(prev => ({ ...prev, [bookingId]: status }));
  };

  // Update booking status on the server
  const handleStatusUpdate = async (booking) => {
    const newStatus = statusEdit[booking.bookingId] || booking.status;

    // Skip update if status hasn't changed
    if (newStatus === booking.status) return;

    setLoading(true);
    try {
      // Only send the fields required for update
      const payload = {
        status: newStatus,
        paid: booking.paid,
        transactionId: booking.transactionId,
        userId: booking.userId,
        flatId: booking.flatId,
        amenityId: booking.amenityId,
        createdAt: booking.createdAt,
        startDate: booking.startDate,
        endDate: booking.endDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        amount: booking.amount
      };

      const res = await fetch(`${API_BASE_URL}/bookings/${booking.bookingId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to update status');
      fetchBookings(); // Refresh list after update
    } catch {
      setError('Failed to update status');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Amenity Bookings</h2>

      {/* Display error message if any */}
      {error && <div className="text-red-600 mb-2">{error}</div>}

      {/* Table for booking data */}
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Booking ID</th>
              <th className="px-4 py-2 border">Amenity</th>
              <th className="px-4 py-2 border">User ID</th>
              <th className="px-4 py-2 border">Date</th>
              <th className="px-4 py-2 border">Start Time</th>
              <th className="px-4 py-2 border">End Time</th>
              <th className="px-4 py-2 border">Status</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => {
              // Find amenity name by matching amenityId
              const amenity = amenities.find(a => a.amenityId === b.amenityId);

              return (
                <tr key={b.bookingId}>
                  <td className="border px-4 py-2">{b.bookingId}</td>
                  <td className="border px-4 py-2">{amenity ? amenity.name : b.amenityId}</td>
                  <td className="border px-4 py-2">{b.userId}</td>
                  <td className="border px-4 py-2">{b.startDate}</td>
                  <td className="border px-4 py-2">{b.startTime}</td>
                  <td className="border px-4 py-2">{b.endTime}</td>
                  <td className="border px-4 py-2">
                    {/* Dropdown for selecting booking status */}
                    <select
                      value={statusEdit[b.bookingId] || b.status}
                      onChange={e => handleStatusChange(b.bookingId, e.target.value)}
                      className="border rounded px-2 py-1"
                      disabled={b.status === 'Cancelled'}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border px-4 py-2">
                    {/* Button to update booking status */}
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={b.status === 'Cancelled' || (statusEdit[b.bookingId] || b.status) === b.status}
                      onClick={() => handleStatusUpdate(b)}
                    >
                      Update
                    </Button>
                  </td>
                </tr>
              );
            })}

            {/* If no bookings exist */}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4">No bookings found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingsTab;

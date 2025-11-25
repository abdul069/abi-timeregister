'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const Dashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [workStarted, setWorkStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [restaurantName, setRestaurantName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user data on mount
  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(user);
    setCurrentUser(userData);

    // Load existing attendance log
    const log = localStorage.getItem('attendanceLog') || '[]';
    setAttendanceLog(JSON.parse(log));

    // Load restaurant name
    const restaurant = localStorage.getItem('restaurantName') || '';
    setRestaurantName(restaurant);

    setLoading(false);
  }, [router]);

  const handleStartWork = () => {
    const now = new Date();
    setStartTime(now);
    setWorkStarted(true);
  };

  const handleEndWork = () => {
    if (!startTime) return;

    const endTime = new Date();
    const hoursWorked = Math.round((endTime - startTime) / (1000 * 60 * 60) * 2) / 2; // Round to nearest 0.5 hour

    const newRecord = {
      date: new Date().toISOString().split('T')[0],
      startTime: startTime.toLocaleTimeString(),
      endTime: endTime.toLocaleTimeString(),
      hoursWorked: hoursWorked,
      restaurant: restaurantName || 'Default',
    };

    const updatedLog = [...attendanceLog, newRecord];
    localStorage.setItem('attendanceLog', JSON.stringify(updatedLog));
    setAttendanceLog(updatedLog);
    setWorkStarted(false);
    setStartTime(null);
  };

  const handleSaveRestaurant = () => {
    localStorage.setItem('restaurantName', restaurantName);
    alert('Restaurant name saved!');
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/');
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          borderBottom: '1px solid #ddd',
          paddingBottom: '20px',
        }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0' }}>ABI TimeRegister</h1>
            <p style={{ margin: '0', color: '#666' }}>
              Welcome, {currentUser?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Logout
          </button>
        </div>

        {/* Restaurant Section */}
        <div style={{
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
        }}>
          <h3 style={{ marginTop: '0' }}>Restaurant/Location</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Enter restaurant/location name"
              style={{
                flex: '1',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
            <button
              onClick={handleSaveRestaurant}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Work Session Controls */}
        <div style={{
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#e8f4f8',
          borderRadius: '4px',
          textAlign: 'center',
        }}>
          <h3 style={{ marginTop: '0' }}>Work Session</h3>
          {!workStarted ? (
            <button
              onClick={handleStartWork}
              style={{
                padding: '15px 40px',
                fontSize: '18px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Start Work
            </button>
          ) : (
            <div>
              <p style={{ color: '#28a745', fontSize: '16px', fontWeight: 'bold' }}>
                ⏱️ Work Session Active
              </p>
              <button
                onClick={handleEndWork}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                End Work
              </button>
            </div>
          )}
        </div>

        {/* Attendance Log */}
        <div>
          <h3>Attendance Log</h3>
          {attendanceLog.length === 0 ? (
            <p style={{ color: '#666' }}>No work sessions recorded yet.</p>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '10px',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Start Time</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>End Time</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Hours</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {attendanceLog.map((record, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid #ddd',
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9',
                    }}
                  >
                    <td style={{ padding: '10px' }}>{record.date}</td>
                    <td style={{ padding: '10px' }}>{record.startTime}</td>
                    <td style={{ padding: '10px' }}>{record.endTime}</td>
                    <td style={{ padding: '10px' }}>{record.hoursWorked}h</td>
                    <td style={{ padding: '10px' }}>{record.restaurant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

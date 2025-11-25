import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [workStarted, setWorkStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [restaurantName, setRestaurantName] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadAttendanceLog(currentUser.uid);
      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, []);

  const loadAttendanceLog = async (userId) => {
    const q = query(collection(db, 'attendance'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setAttendanceLog(logs);
  };

  const handleStartWork = async () => {
    const now = new Date();
    setStartTime(now);
    setWorkStarted(true);

    try {
      await addDoc(collection(db, 'attendance'), {
        userId: user.uid,
        email: user.email,
        startTime: now.toISOString(),
        endTime: null,
        hoursWorked: 0,
        restaurantName: restaurantName || 'Not specified',
        status: 'In Progress',
      });
    } catch (error) {
      console.error('Error logging start time:', error);
    }
  };

  const handleEndWork = async () => {
    if (!startTime) return;

    const now = new Date();
    const hours = Math.round((now - startTime) / (1000 * 60 * 60));

    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', user.uid),
        where('endTime', '==', null)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.docs.length > 0) {
        const docId = querySnapshot.docs[0].id;
        const attendanceRef = doc(db, 'attendance', docId);
        await setDoc(
          attendanceRef,
          {
            endTime: now.toISOString(),
            hoursWorked: hours,
            status: 'Completed',
          },
          { merge: true }
        );
      }

      setWorkStarted(false);
      setStartTime(null);
      loadAttendanceLog(user.uid);
    } catch (error) {
      console.error('Error logging end time:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>ABI TimeRegister Dashboard</h1>
      {user && <p>Welcome, {user.email}</p>}

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Clock In/Out</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>Restaurant Name:</label>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Enter restaurant name"
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <button
          onClick={handleStartWork}
          disabled={workStarted}
          style={{
            width: '48%',
            padding: '10px',
            marginRight: '2%',
            backgroundColor: workStarted ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: workStarted ? 'not-allowed' : 'pointer',
          }}
        >
          Start Work
        </button>
        <button
          onClick={handleEndWork}
          disabled={!workStarted}
          style={{
            width: '48%',
            padding: '10px',
            backgroundColor: !workStarted ? '#6c757d' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !workStarted ? 'not-allowed' : 'pointer',
          }}
        >
          End Work
        </button>
        {startTime && <p>Work started at: {startTime.toLocaleTimeString()}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Attendance Log</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Date</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Start Time</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>End Time</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Hours Worked</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceLog.map((log, index) => (
              <tr key={index}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {new Date(log.startTime).toLocaleDateString()}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {new Date(log.startTime).toLocaleTimeString()}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {log.endTime ? new Date(log.endTime).toLocaleTimeString() : 'In Progress'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{log.hoursWorked}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{log.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;

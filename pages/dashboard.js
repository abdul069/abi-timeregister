import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

const Dashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [workStarted, setWorkStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [restaurantName, setRestaurantName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/');
        return;
      }
      setCurrentUser(user);

      // Load attendance log for this user
      try {
        const snap = await getDocs(
          query(
            collection(db, 'attendance'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
          )
        );
        setAttendanceLog(snap.docs.map(d => d.data()));
      } catch (err) {
        console.error('Error loading attendance:', err);
      }

      // Load restaurant name
      try {
        const settingsSnap = await getDoc(doc(db, 'users', user.uid));
        if (settingsSnap.exists()) {
          setRestaurantName(settingsSnap.data().restaurantName || '');
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleStartWork = () => {
    const now = new Date();
    setStartTime(now);
    setWorkStarted(true);
  };

  const handleEndWork = async () => {
    if (!startTime) return;

    const endTime = new Date();
    const hoursWorked = Math.round((endTime - startTime) / (1000 * 60 * 60) * 2) / 2;

    const newRecord = {
      userId: currentUser.uid,
      date: new Date().toISOString().split('T')[0],
      startTime: startTime.toLocaleTimeString(),
      endTime: endTime.toLocaleTimeString(),
      hoursWorked: hoursWorked,
      restaurant: restaurantName || 'Default',
      timestamp: Date.now(),
    };

    try {
      await addDoc(collection(db, 'attendance'), newRecord);
      setAttendanceLog(prev => [newRecord, ...prev]);
    } catch (err) {
      console.error('Error saving attendance:', err);
    }

    setWorkStarted(false);
    setStartTime(null);
  };

  const handleSaveRestaurant = async () => {
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { restaurantName }, { merge: true });
      alert('Restaurantnaam opgeslagen!');
    } catch (err) {
      console.error('Error saving restaurant:', err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Laden...</div>;
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
              Welkom, {currentUser?.email}
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
            Uitloggen
          </button>
        </div>

        {/* Restaurant Section */}
        <div style={{
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
        }}>
          <h3 style={{ marginTop: '0' }}>Restaurant/Locatie</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Voer restaurant/locatienaam in"
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
              Opslaan
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
          <h3 style={{ marginTop: '0' }}>Werksessie</h3>
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
              Start Werk
            </button>
          ) : (
            <div>
              <p style={{ color: '#28a745', fontSize: '16px', fontWeight: 'bold' }}>
                Werksessie Actief
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
                Stop Werk
              </button>
            </div>
          )}
        </div>

        {/* Attendance Log */}
        <div>
          <h3>Aanwezigheidslog</h3>
          {attendanceLog.length === 0 ? (
            <p style={{ color: '#666' }}>Nog geen werksessies geregistreerd.</p>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '10px',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Datum</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Starttijd</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Eindtijd</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Uren</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Locatie</th>
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
                    <td style={{ padding: '10px' }}>{record.hoursWorked}u</td>
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

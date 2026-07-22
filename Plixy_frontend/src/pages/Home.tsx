import { useState, useEffect } from 'react';
import styles from '../styles/App.module.scss';

interface HomeData {
  service: string;
  message: string;
  availableEndpoints: string[];
  timestamp: string;
}

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL;

const Home = () => {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/iiotassistant/home`);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to fetch services");
        }

        const jsonData = await res.json();
        setData(jsonData);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchHome();
  }, []);

  return (
    <div className={styles.card}>
      <h2>Welcome to iiotassistant</h2>
      <p>This is a remote module that can be loaded into the host application.</p>
      
      {error && <p className={styles.errorText}>Error: {error}</p>}
      
      {data && (
        <div className={styles.infoContainer}>
          <h3 className={styles.infoTitle}>Service Info</h3>
          <p><strong>Name:</strong> {data.service}</p>
          <p><strong>Message:</strong> {data.message}</p>
          <p><strong>Timestamp:</strong> {data.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}</p>
          
          <div className={styles.endpointsSection}>
            <h4 className={styles.endpointsTitle}>Endpoints Data:</h4>
            <p className={styles.endpointsData}>{JSON.stringify(data.availableEndpoints)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

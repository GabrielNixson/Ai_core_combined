import { useState, useEffect } from 'react';
import styles from '../styles/App.module.scss';

interface ServiceData {
  service: string;
  description: string;
  version: string;
  features: string[];
  timestamp: string;
}

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL;

const About = () => {
  const [data, setData] = useState<ServiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/iiotassistant/about`);

        console.log("Response:", res);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to fetch services");
        }

        const jsonData = await res.json();
        console.log("Services:", jsonData);
        setData(jsonData);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message);
      }
    };

    fetchServices();
  }, []);

  return (
    <div className={styles.card}>
      <h2>About iiotassistant</h2>
      <p>This is a sample route to demonstrate navigation within the remote app.</p>
      <p>You can add more routes as needed.</p>
      
      {error && <p className={styles.errorText}>Error: {error}</p>}
      
      {data && (
        <div className={styles.infoContainer}>
          <h3 className={styles.infoTitle}>Service Details (About)</h3>
          <p><strong>Name:</strong> {data.service}</p>
          <p><strong>Description:</strong> {data.description}</p>
          <p><strong>Version:</strong> {data.version}</p>
          <div className={styles.featuresSection}>
            <strong>Features:</strong>
            <ul className={styles.featuresList}>
              {data.features?.map((feature, idx) => (
                <li key={idx} className={styles.featureItem}>{feature}</li>
              ))}
            </ul>
          </div>
          <p className={styles.featuresSection}><strong>Timestamp:</strong> {new Date(data.timestamp).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default About;

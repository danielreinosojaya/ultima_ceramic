import { createContext, useContext, useState, useEffect, useRef } from 'react';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Solo ejecutar una vez al montar
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchData = async () => {
      try {
        const [customersRes, instructorsRes] = await Promise.all([
          fetch('/api/data?action=getCustomers'),
          fetch('/api/data?action=instructors')
        ]);
        
        if (customersRes.ok) {
          const data = await customersRes.json();
          setCustomers(data);
        }
        if (instructorsRes.ok) {
          const data = await instructorsRes.json();
          setInstructors(data);
        }
      } catch (error) {
        console.error('[DataProvider] Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []); // ✅ Sin dependencias - solo una vez al montar

  return (
    <DataContext.Provider value={{ customers, instructors }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
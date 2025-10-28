import { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [instructors, setInstructors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (customers.length === 0) {
        const response = await fetch('/data?action=getCustomers');
        const data = await response.json();
        setCustomers(data);
      }
      if (instructors.length === 0) {
        const response = await fetch('/data?action=instructors');
        const data = await response.json();
        setInstructors(data);
      }
    };
    fetchData();
  }, [customers, instructors]);

  return (
    <DataContext.Provider value={{ customers, instructors }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
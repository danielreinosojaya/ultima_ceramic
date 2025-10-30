import { useData } from './DataProvider';

const AdminPanel = () => {
  const { customers, instructors } = useData();

  return (
    <div>
      <h1>Clientes</h1>
      {customers.map(customer => (
        <p key={customer.id}>{customer.name}</p>
      ))}
      <h1>Instructores</h1>
      {instructors.map(instructor => (
        <p key={instructor.id}>{instructor.name}</p>
      ))}
    </div>
  );
};

export default AdminPanel;
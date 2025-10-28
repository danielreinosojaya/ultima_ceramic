import fetch from 'node-fetch';

(async () => {
    const customerId = 'example-customer-id'; // Cambia esto por el ID del cliente que deseas eliminar

    try {
        const response = await fetch('http://localhost:4000/api/deleteCustomer', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ customerId }),
        });

        const result = await response.json();
        console.log('Respuesta del servidor:', result);
    } catch (error) {
        console.error('Error al realizar la petición:', error);
    }
})();
import { updateProducts } from '../services/dataService';
import { DEFAULT_PRODUCTS } from '../constants';

async function syncProducts() {
  try {
    const result = await updateProducts(DEFAULT_PRODUCTS);
    if (result.success) {
      console.log('Productos sincronizados correctamente.');
    } else {
      console.error('Error al sincronizar productos:', result);
    }
  } catch (error) {
    console.error('Error en la sincronización:', error);
  }
}

syncProducts();

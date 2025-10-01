// Script para sincronizar productos con la base de datos
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const constantsPath = path.join(__dirname, '../constants.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf-8');
const productsMatch = constantsContent.match(/export const DEFAULT_PRODUCTS: Product\[] = (\[.*?\]);/s);
if (!productsMatch) {
  console.error('No se encontraron productos en constants.ts');
  process.exit(1);
}
const productsArrayStr = productsMatch[1];
// Evalúa el array de productos como JS
const products = eval(productsArrayStr.replace(/\n/g, ''));

async function seedProducts() {
  try {
    const res = await fetch('http://localhost:3000/api/data?key=products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products)
    });
    const result = await res.text();
    console.log('Resultado:', result);
  } catch (err) {
    console.error('Error al sincronizar productos:', err);
  }
}

seedProducts();

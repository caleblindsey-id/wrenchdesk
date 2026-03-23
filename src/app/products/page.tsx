import { getProducts } from '@/lib/db/products'
import ProductList from './ProductList'

export default async function ProductsPage() {
  const products = await getProducts()
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-1">Synced from SynergyERP — read only</p>
      </div>
      <ProductList products={products} />
    </div>
  )
}

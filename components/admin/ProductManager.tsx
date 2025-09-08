import React, { useState, useEffect, useRef } from 'react';
import type { Product, ClassPackage, IntroductoryClass, OpenStudioSubscription } from '../../types';
import * as dataService from '../../services/dataService';
import { useLanguage } from '../../context/LanguageContext';
import { ToggleLeftIcon } from '../icons/ToggleLeftIcon';
import { ToggleRightIcon } from '../icons/ToggleRightIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { EditIcon } from '../icons/EditIcon';
import { CubeIcon } from '../icons/CubeIcon';
import { ClassPackageModal } from './ClassPackageModal';
import { IntroClassModal } from './IntroClassModal';
import { OpenStudioModal } from './OpenStudioModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface ProductManagerProps {
  products: Product[];
  onDataChange: () => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ products, onDataChange }) => {
  const { t } = useLanguage();
  
  const [isClassPackageModalOpen, setIsClassPackageModalOpen] = useState(false);
  const [classPackageToEdit, setClassPackageToEdit] = useState<ClassPackage | null>(null);
  
  const [isIntroClassModalOpen, setIsIntroClassModalOpen] = useState(false);
  const [introClassToEdit, setIntroClassToEdit] = useState<IntroductoryClass | null>(null);
  
  const [isOpenStudioModalOpen, setIsOpenStudioModalOpen] = useState(false);
  const [openStudioToEdit, setOpenStudioToEdit] = useState<OpenStudioSubscription | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productIdToUpdateImage, setProductIdToUpdateImage] = useState<number | null>(null);

  const handleStatusToggle = async (id: number) => {
    const currentProducts = await dataService.getProducts();
    const updatedProducts = currentProducts.map((p) =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    );
    await dataService.updateProducts(updatedProducts);
    onDataChange();
  };

  const handleOpenEditModal = (product: Product) => {
    if (product.type === 'CLASS_PACKAGE') {
      setClassPackageToEdit(product);
      setIsClassPackageModalOpen(true);
    } else if (product.type === 'INTRODUCTORY_CLASS') {
      setIntroClassToEdit(product);
      setIsIntroClassModalOpen(true);
    } else if (product.type === 'OPEN_STUDIO_SUBSCRIPTION') {
      setOpenStudioToEdit(product);
      setIsOpenStudioModalOpen(true);
    }
  };

  const handleOpenDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };
  
  const handleSaveClassPackage = async (pkgData: Omit<ClassPackage, 'id' | 'isActive' | 'type'>, id?: number) => {
    const currentProducts = await dataService.getProducts();
    let updatedProducts;
    if (id) {
      updatedProducts = currentProducts.map(p => (p.id === id && p.type === 'CLASS_PACKAGE' ? { ...p, ...pkgData } : p));
    } else {
      const newProduct: Product = { ...pkgData, id: Date.now(), isActive: true, type: 'CLASS_PACKAGE' };
      updatedProducts = [...currentProducts, newProduct];
    }
    await dataService.updateProducts(updatedProducts);
    onDataChange();
    setIsClassPackageModalOpen(false);
  };

  const handleSaveIntroClass = async (classData: Omit<IntroductoryClass, 'id' | 'isActive' | 'type'>, id?: number) => {
    const currentProducts = await dataService.getProducts();
    let updatedProducts;
    if (id) {
        updatedProducts = currentProducts.map(p => (p.id === id && p.type === 'INTRODUCTORY_CLASS' ? { ...p, ...classData } : p));
    } else {
        const newProduct: Product = { ...classData, id: Date.now(), isActive: true, type: 'INTRODUCTORY_CLASS' };
        updatedProducts = [...currentProducts, newProduct];
    }
    await dataService.updateProducts(updatedProducts);
    onDataChange();
    setIsIntroClassModalOpen(false);
  };
  
  const handleSaveOpenStudio = async (subData: Omit<OpenStudioSubscription, 'id' | 'isActive' | 'type'>, id?: number) => {
    const currentProducts = await dataService.getProducts();
    let updatedProducts;
    if (id) {
        updatedProducts = currentProducts.map(p => (p.id === id && p.type === 'OPEN_STUDIO_SUBSCRIPTION' ? { ...p, ...subData } : p));
    } else {
        const newProduct: Product = { ...subData, id: Date.now(), isActive: true, type: 'OPEN_STUDIO_SUBSCRIPTION' };
        updatedProducts = [...currentProducts, newProduct];
    }
    await dataService.updateProducts(updatedProducts);
    onDataChange();
    setIsOpenStudioModalOpen(false);
  };


  const handleDeleteConfirm = async () => {
    if (productToDelete) {
        await dataService.deleteProduct(productToDelete.id);
        onDataChange();
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
    }
  };
  
  const handleTriggerImageUpload = (id: number) => {
    setProductIdToUpdateImage(id);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || productIdToUpdateImage === null) return;
    const file = event.target.files[0];
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert("Image is too large. Please select an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const currentProducts = await dataService.getProducts();
      const updatedProducts = currentProducts.map(p =>
        p.id === productIdToUpdateImage ? { ...p, imageUrl: base64String } : p
      );
      await dataService.updateProducts(updatedProducts);
      onDataChange();
      setProductIdToUpdateImage(null);
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset file input
  };
  
  const handleCreateNew = (type: Product['type']) => {
    if (type === 'CLASS_PACKAGE') {
        setClassPackageToEdit(null);
        setIsClassPackageModalOpen(true);
    } else if (type === 'INTRODUCTORY_CLASS') {
        setIntroClassToEdit(null);
        setIsIntroClassModalOpen(true);
    } else if (type === 'OPEN_STUDIO_SUBSCRIPTION') {
        setOpenStudioToEdit(null);
        setIsOpenStudioModalOpen(true);
    }
  };

  return (
    <div>
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept="image/png, image/jpeg, image/webp" className="hidden"/>
      {isClassPackageModalOpen && (
        <ClassPackageModal 
          isOpen={isClassPackageModalOpen}
          onClose={() => setIsClassPackageModalOpen(false)}
          onSave={handleSaveClassPackage}
          packageToEdit={classPackageToEdit}
        />
      )}
      {isIntroClassModalOpen && (
          <IntroClassModal
            isOpen={isIntroClassModalOpen}
            onClose={() => setIsIntroClassModalOpen(false)}
            onSave={handleSaveIntroClass}
            classToEdit={introClassToEdit}
          />
      )}
      {isOpenStudioModalOpen && (
          <OpenStudioModal
            isOpen={isOpenStudioModalOpen}
            onClose={() => setIsOpenStudioModalOpen(false)}
            onSave={handleSaveOpenStudio}
            subscriptionToEdit={openStudioToEdit}
          />
      )}
      {isDeleteModalOpen && productToDelete && (
        <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            title={t('admin.productManager.deleteConfirmTitle')}
            message={t('admin.productManager.deleteConfirmText')}
        />
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-serif text-brand-text mb-2">{t('admin.productManager.title')}</h2>
            <p className="text-brand-secondary">{t('admin.productManager.subtitle')}</p>
        </div>
        <div className="relative group">
            <button
                className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors"
            >
                <PlusIcon className="w-5 h-5"/>
                {t('admin.productManager.createButton')}
            </button>
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-md shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                <button 
                  onClick={() => handleCreateNew('INTRODUCTORY_CLASS')} 
                  className="block w-full text-left px-4 py-3 text-sm text-brand-text hover:bg-gray-100"
                >
                  {t('admin.productManager.introClass')}
                </button>
                <button 
                  onClick={() => handleCreateNew('CLASS_PACKAGE')} 
                  className="block w-full text-left px-4 py-3 text-sm text-brand-text hover:bg-gray-100"
                >
                  {t('admin.productManager.classPackage')}
                </button>
                <button 
                  onClick={() => handleCreateNew('OPEN_STUDIO_SUBSCRIPTION')} 
                  className="block w-full text-left px-4 py-3 text-sm text-brand-text hover:bg-gray-100"
                >
                  {t('admin.productManager.openStudioSubscription')}
                </button>
            </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-brand-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.productManager.imageLabel')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.productManager.productType')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.productManager.priceLabel')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.productManager.statusLabel')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">{t('admin.productManager.actionsLabel')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                   <button onClick={() => handleTriggerImageUpload(product.id)} className="w-12 h-12 rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary group relative" title={t('admin.productManager.changeImageLabel')}>
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-gray-300 transition-colors"><CubeIcon className="w-6 h-6"/></div>}
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><EditIcon className="w-5 h-5 text-white" /></div>
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-bold text-brand-text">{product.name}</div>
                  <div className="text-sm text-brand-secondary">{product.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-secondary">
                    {t(`admin.productManager.productType_${product.type}`)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-brand-text">
                  {'price' in product && product.price ? `$${product.price.toFixed(2)}` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <button onClick={() => handleStatusToggle(product.id)} className="mr-2">
                      {product.isActive ? <ToggleRightIcon className="w-10 h-10 text-brand-success" /> : <ToggleLeftIcon className="w-10 h-10 text-gray-400" />}
                    </button>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.isActive ? t('admin.productManager.active') : t('admin.productManager.inactive')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => handleOpenEditModal(product)} className="text-brand-accent hover:text-brand-text p-1 rounded-md hover:bg-gray-100" title={t('admin.productManager.editButton')}><EditIcon className="w-5 h-5"/></button>
                        <button onClick={() => handleOpenDeleteModal(product)} className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50" title={t('admin.productManager.deleteButton')}><TrashIcon className="w-5 h-5"/></button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
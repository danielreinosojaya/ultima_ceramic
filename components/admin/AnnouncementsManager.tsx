import React, { useState } from 'react';
import type { Announcement } from '../../types';
import * as dataService from '../../services/dataService';
// import { useLanguage } from '../../context/LanguageContext';
import { PlusIcon } from '../icons/PlusIcon';
import { EditIcon } from '../icons/EditIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { AnnouncementModal } from './AnnouncementModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { MegaphoneIcon } from '../icons/MegaphoneIcon';

interface AnnouncementsManagerProps {
  announcements: Announcement[];
  onDataChange: () => void;
}

const TimeAgo: React.FC<{ isoDate: string }> = ({ isoDate }) => {
    // const { language } = useLanguage();
    return new Date(isoDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const AnnouncementsManager: React.FC<AnnouncementsManagerProps> = ({ announcements, onDataChange }) => {
  // const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const handleOpenCreateModal = () => {
    setAnnouncementToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ann: Announcement) => {
    setAnnouncementToEdit(ann);
    setIsModalOpen(true);
  };
  
  const handleOpenDeleteModal = (ann: Announcement) => {
    setAnnouncementToDelete(ann);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (data: Omit<Announcement, 'id' | 'createdAt'>, id?: string) => {
    let updatedAnnouncements;
    if (id) {
      updatedAnnouncements = announcements.map(ann => 
        ann.id === id ? { ...ann, ...data } : ann
      );
    } else {
      const newAnnouncement: Announcement = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() };
      updatedAnnouncements = [...announcements, newAnnouncement];
    }
    await dataService.updateAnnouncements(updatedAnnouncements);
    onDataChange();
    setIsModalOpen(false);
    setAnnouncementToEdit(null);
  };
  
  const handleDeleteConfirm = async () => {
    if (announcementToDelete) {
        await dataService.deleteAnnouncement(announcementToDelete.id);
        onDataChange();
        setIsDeleteModalOpen(false);
        setAnnouncementToDelete(null);
    }
  };

  return (
    <div>
      {isModalOpen && (
        <AnnouncementModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          announcementToEdit={announcementToEdit}
        />
      )}
      {isDeleteModalOpen && announcementToDelete && (
        <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            title="Eliminar Anuncio"
            message="¿Estás seguro de que deseas eliminar este anuncio? Esta acción no se puede deshacer."
        />
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-serif text-brand-text mb-2 flex items-center gap-3">
            <MegaphoneIcon className="w-6 h-6 text-brand-accent" />
            Anuncios
          </h2>
          <p className="text-brand-secondary">Gestiona los anuncios que aparecen en el tablero principal</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Crear Anuncio
        </button>
      </div>

      <div className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((ann) => (
            <div key={ann.id} className="bg-brand-background p-4 rounded-lg flex justify-between items-start">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                    ${ann.urgency === 'urgent' ? 'bg-red-100 text-red-800' : ann.urgency === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                  {ann.urgency === 'urgent' ? 'Urgente' : ann.urgency === 'warning' ? 'Aviso' : 'Información'}
                </span>
                <h3 className="text-lg font-bold text-brand-text mt-2">{ann.title}</h3>
                <p className="text-brand-secondary text-sm">{ann.content}</p>
                <p className="text-xs text-gray-400 mt-2">Posted: <TimeAgo isoDate={ann.createdAt} /></p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                <button onClick={() => handleOpenEditModal(ann)} className="text-brand-accent hover:text-brand-text p-1 rounded-md hover:bg-gray-200" title="Editar">
                  <EditIcon className="w-5 h-5" />
                </button>
                <button onClick={() => handleOpenDeleteModal(ann)} className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50" title="Eliminar">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-brand-secondary py-8">No hay anuncios disponibles</p>
        )}
      </div>
    </div>
  );
};

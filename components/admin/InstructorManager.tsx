import React, { useState, useEffect } from 'react';
import * as dataService from '../../services/dataService';
// Eliminado useLanguage, la app ahora es monolingüe en español
import type { Instructor } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { EditIcon } from '../icons/EditIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { InstructorTag } from '../InstructorTag';
import { InstructorModal } from './InstructorModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ReassignModal } from './ReassignModal';

interface InstructorManagerProps {
    onInstructorsUpdate: () => void;
    instructors: Instructor[];
}

export const InstructorManager: React.FC<InstructorManagerProps> = ({ onInstructorsUpdate, instructors: initialInstructors }) => {
    // Monolingüe español, textos hardcodeados
    const [instructors, setInstructors] = useState<Instructor[]>(initialInstructors);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [instructorToEdit, setInstructorToEdit] = useState<Instructor | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [instructorToDelete, setInstructorToDelete] = useState<Instructor | null>(null);
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

    useEffect(() => {
        setInstructors(initialInstructors);
    }, [initialInstructors]);

    const handleOpenCreateModal = () => {
        setInstructorToEdit(null);
        setIsModalOpen(true);
    };
    
    const handleOpenEditModal = (instructor: Instructor) => {
        setInstructorToEdit(instructor);
        setIsModalOpen(true);
    };

    const handleSave = async (data: Omit<Instructor, 'id'>, id?: number) => {
        const currentInstructors = await dataService.getInstructors();
        let updatedInstructors;
        if (id) {
            updatedInstructors = currentInstructors.map(i => i.id === id ? { ...data, id } : i);
        } else {
            const newId = Math.max(0, ...currentInstructors.map(i => i.id)) + 1;
            updatedInstructors = [...currentInstructors, { ...data, id: newId }];
        }
        await dataService.updateInstructors(updatedInstructors);
        onInstructorsUpdate();
        setIsModalOpen(false);
    };
    
    const handleDeleteRequest = async (instructor: Instructor) => {
        setInstructorToDelete(instructor);
        const { hasUsage } = await dataService.checkInstructorUsage(instructor.id);
        if (hasUsage) {
            setIsReassignModalOpen(true);
        } else {
            setIsDeleteModalOpen(true);
        }
    };
    
    const handleDeleteConfirm = async () => {
        if (instructorToDelete) {
           await dataService.deleteInstructor(instructorToDelete.id);
           onInstructorsUpdate();
           setIsDeleteModalOpen(false);
           setInstructorToDelete(null);
        }
    };
    
    const handleReassignAndDelete = async (replacementInstructorId: number) => {
        if (instructorToDelete) {
            await dataService.reassignAnddeleteInstructor(instructorToDelete.id, replacementInstructorId);
            onInstructorsUpdate();
            setIsReassignModalOpen(false);
            setInstructorToDelete(null);
        }
    };

    return (
        <div className="bg-brand-background p-4 rounded-lg">
            {isModalOpen && (
                <InstructorModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    instructorToEdit={instructorToEdit}
                />
            )}
            {isDeleteModalOpen && instructorToDelete && (
                 <DeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDeleteConfirm}
                    title="¿Eliminar instructor?"
                    message={`¿Estás seguro de que deseas eliminar a ${instructorToDelete.name}?`}
                />
            )}
            {isReassignModalOpen && instructorToDelete && (
                <ReassignModal
                    isOpen={isReassignModalOpen}
                    onClose={() => setIsReassignModalOpen(false)}
                    onConfirm={handleReassignAndDelete}
                    instructorToDelete={instructorToDelete}
                />
            )}

            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-brand-accent">Gestión de instructores</h3>
                <button 
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-1 bg-white text-brand-secondary font-bold py-1 px-3 rounded-md border border-brand-secondary hover:bg-brand-secondary hover:text-white text-sm transition-colors"
                >
                    <PlusIcon className="w-4 h-4" />
                    Agregar instructor
                </button>
            </div>
            <div className="space-y-2">
                {instructors.length > 0 ? (
                    instructors.map(inst => (
                        <div key={inst.id} className="flex items-center justify-between bg-white p-2 rounded-md border border-gray-200">
                            <InstructorTag instructorId={inst.id} instructors={instructors} />
                            <div className="flex items-center space-x-1">
                                <button onClick={() => handleOpenEditModal(inst)} className="text-brand-secondary hover:text-brand-accent p-1 rounded-md hover:bg-gray-100">
                                    <EditIcon className="w-4 h-4" />
                                </button>
                                {instructors.length > 1 && (
                                    <button onClick={() => handleDeleteRequest(inst)} className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-brand-secondary text-center p-2">No hay instructores configurados.</p>
                )}
            </div>
        </div>
    )
}
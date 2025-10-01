import React, { useState, useEffect } from 'react';
import type { GroupInquiry, InquiryStatus } from '../../types';
import * as dataService from '../../services/dataService';
import { ChatBubbleLeftRightIcon } from '../icons/ChatBubbleLeftRightIcon';

const STATUS_OPTIONS: InquiryStatus[] = ['New', 'Contacted', 'Proposal Sent', 'Confirmed', 'Archived'];
const STATUS_COLORS: Record<InquiryStatus, string> = {
    New: 'bg-blue-100 text-blue-800',
    Contacted: 'bg-yellow-100 text-yellow-800',
    'Proposal Sent': 'bg-purple-100 text-purple-800',
    Confirmed: 'bg-green-100 text-green-800',
    Archived: 'bg-gray-100 text-gray-800',
};

interface InquiryManagerProps {
    navigateToId?: string;
    inquiries: GroupInquiry[];
    onDataChange: () => void;
}

export const InquiryManager: React.FC<InquiryManagerProps> = ({ navigateToId, inquiries = [], onDataChange }) => {
    const language = 'es-ES';
    const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);
    const [highlightedInquiryId, setHighlightedInquiryId] = useState<string | null>(null);

    useEffect(() => {
        if (navigateToId) {
            setExpandedInquiryId(navigateToId);
            setHighlightedInquiryId(navigateToId);
            const row = document.getElementById(`inquiry-${navigateToId}`);
            row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => setHighlightedInquiryId(null), 2500); // Highlight for 2.5 seconds
        }
    }, [navigateToId]);

    const handleStatusChange = async (id: string, newStatus: InquiryStatus) => {
        const inquiryToUpdate = inquiries.find(inq => inq.id === id);
        if (inquiryToUpdate) {
            const updatedInquiry = { ...inquiryToUpdate, status: newStatus };
            await dataService.updateGroupInquiry(updatedInquiry);
            onDataChange();
        }
    };
    const handleDelete = async (id: string) => {
        const confirmed = window.confirm('¿Seguro que quieres eliminar esta consulta?');
        if (confirmed) {
            try {
                await dataService.deleteGroupInquiry(id);
                onDataChange();
            } catch (error) {
                console.error('Error al eliminar la consulta:', error);
                alert('Error al eliminar la consulta.');
            }
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedInquiryId(prevId => (prevId === id ? null : id));
    };

    const formatDate = (dateInput: string | Date | null | undefined, options: Intl.DateTimeFormatOptions): string => {
        const notApplicableText = 'N/A';
        if (!dateInput) {
            return notApplicableText;
        }

        let date: Date;

        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            const [year, month, day] = dateInput.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(dateInput);
        }

        if (isNaN(date.getTime())) {
            return 'Fecha inválida';
        }

        return date.toLocaleDateString(language, options);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-serif text-brand-text mb-2 flex items-center gap-3">
                        <ChatBubbleLeftRightIcon className="w-6 h-6 text-brand-accent" />
                        Consultas grupales
                    </h2>
                    <p className="text-brand-secondary">Gestión de consultas recibidas</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-brand-background">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Recibido</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-brand-secondary uppercase tracking-wider">Participantes</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-secondary uppercase tracking-wider">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {inquiries.length > 0 ? inquiries.map((inquiry) => (
                          <React.Fragment key={inquiry.id}>
                            <tr
                                id={`inquiry-${inquiry.id}`}
                                onClick={() => toggleExpand(inquiry.id)}
                                className={`cursor-pointer transition-colors duration-500 ${highlightedInquiryId === inquiry.id ? 'bg-yellow-100' : 'hover:bg-gray-50'}`}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    {formatDate(inquiry.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-brand-text">{inquiry.name}</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${inquiry.inquiryType === 'couple' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'}`}> 
                                            {inquiry.inquiryType === 'couple' ? 'Pareja' : 'Grupo'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-brand-secondary">{inquiry.email}</div>
                                    <div className="text-sm text-brand-secondary">{inquiry.countryCode} {inquiry.phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text text-center font-semibold">
                                    {inquiry.participants}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text">
                                    <div>{formatDate(inquiry.tentativeDate, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                    {inquiry.tentativeTime && (
                                        <div className="text-xs text-brand-secondary font-semibold">{new Date(`1970-01-01T${inquiry.tentativeTime}`).toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                     <select
                                        value={inquiry.status}
                                        onChange={(e) => handleStatusChange(inquiry.id, e.target.value as InquiryStatus)}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`p-1.5 rounded-md text-xs font-semibold border-0 focus:ring-2 focus:ring-brand-accent ${STATUS_COLORS[inquiry.status]}`}
                                    >
                                        {STATUS_OPTIONS.map(status => (
                                            <option key={status} value={status}>
                                                {status === 'New' ? 'Nueva' : status === 'Contacted' ? 'Contactado' : status === 'Proposal Sent' ? 'Propuesta enviada' : status === 'Confirmed' ? 'Confirmada' : 'Archivada'}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
    <button
        onClick={(e) => {
            e.stopPropagation();
            handleDelete(inquiry.id);
        }}
        className="text-red-600 hover:text-red-900"
    >
        Eliminar
    </button>
</td>

                            </tr>
                            {expandedInquiryId === inquiry.id && (
                                <tr className="bg-brand-background animate-fade-in-fast">
                                    <td colSpan={5} className="px-6 py-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <h5 className="font-bold text-brand-secondary mb-1">Mensaje</h5>
                                                <p className="text-brand-text whitespace-pre-wrap">{inquiry.message || 'Sin mensaje.'}</p>
                                            </div>
                                             <div>
                                                <h5 className="font-bold text-brand-secondary mb-1">Tipo de evento</h5>
                                                <p className="text-brand-text">
                                                    {inquiry.eventType 
                                                        ? inquiry.eventType 
                                                        : 'No especificado'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                          </React.Fragment>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-brand-secondary">
                                    No hay consultas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
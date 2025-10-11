import React from 'react';
import type { GiftcardRequest } from '../../services/dataService';
import * as dataService from '../../services/dataService';
import { useAdminData } from '../../context/AdminDataContext';

const GiftcardsManager: React.FC = () => {
  const adminData = useAdminData();
  const [selected, setSelected] = React.useState<GiftcardRequest | null>(null);
  return (
    <div className="w-full flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-brand-primary mb-4">Gestión de Giftcards</h2>
      <p className="text-brand-secondary text-center mb-2">Aquí podrás gestionar todas las solicitudes de giftcard recibidas.</p>
      {adminData.loading ? (
        <div className="w-full text-center text-brand-border italic">Cargando solicitudes...</div>
      ) : adminData.giftcardRequests.length === 0 ? (
        <div className="w-full text-center text-brand-border italic">No hay solicitudes de giftcard registradas.</div>
      ) : (
        <table className="w-full max-w-3xl mx-auto border rounded-xl overflow-hidden shadow">
          <thead className="bg-brand-background">
            <tr>
              <th className="px-4 py-2 text-left text-brand-secondary">Comprador</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Destinatario</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Monto</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Código</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Estado</th>
              <th className="px-4 py-2 text-left text-brand-secondary">Fecha</th>
              <th className="px-4 py-2 text-left text-brand-secondary"></th>
            </tr>
          </thead>
          <tbody>
            {adminData.giftcardRequests.map(req => (
              <tr key={req.id} className="border-t">
                <td className="px-4 py-2">{req.buyerName} <br /><span className="text-xs text-brand-secondary">{req.buyerEmail}</span></td>
                <td className="px-4 py-2">{req.recipientName} <br /><span className="text-xs text-brand-secondary">{req.recipientEmail || req.recipientWhatsapp}</span></td>
                <td className="px-4 py-2 font-bold text-brand-primary">${req.amount}</td>
                <td className="px-4 py-2 font-mono text-xs">{req.code}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{req.status}</span>
                </td>
                <td className="px-4 py-2 text-xs text-brand-secondary">{new Date(req.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <button
                    className="px-3 py-1 rounded-full bg-brand-primary text-white text-xs font-semibold shadow hover:bg-brand-primary/90 transition-colors"
                    onClick={() => setSelected(req)}
                  >Ver detalles</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-brand-border relative">
            <button
              className="absolute top-3 right-3 text-brand-secondary hover:text-brand-primary text-xl font-bold"
              onClick={() => setSelected(null)}
              aria-label="Cerrar"
            >×</button>
            <h3 className="text-xl font-bold text-brand-primary mb-2">Detalles de la Giftcard</h3>
            <div className="flex flex-col gap-2 text-brand-secondary text-sm">
              <div><span className="font-semibold">Comprador:</span> {selected.buyerName} ({selected.buyerEmail})</div>
              <div><span className="font-semibold">Destinatario:</span> {selected.recipientName} ({selected.recipientEmail || selected.recipientWhatsapp})</div>
              <div><span className="font-semibold">Monto:</span> <span className="font-bold text-brand-primary">${selected.amount}</span></div>
              <div><span className="font-semibold">Código:</span> <span className="font-mono">{selected.code}</span></div>
              <div><span className="font-semibold">Estado:</span> <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selected.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : selected.status === 'approved' ? 'bg-green-100 text-green-700' : selected.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{selected.status}</span></div>
              <div><span className="font-semibold">Fecha:</span> {new Date(selected.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftcardsManager;

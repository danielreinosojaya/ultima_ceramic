import { deleteCustomerHandler } from '../deleteCustomer';
import { deleteCustomerById } from '../db';
import { Request, Response } from 'express';

jest.mock('../db', () => ({
    deleteCustomerById: jest.fn(),
}));

describe('deleteCustomerHandler', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = {
            method: 'DELETE',
            body: { customerId: 'test-customer-id' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('should return 405 for non-DELETE methods', async () => {
        req.method = 'GET';
        await deleteCustomerHandler(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('should return 400 if customerId is missing', async () => {
        req.body = {};
        await deleteCustomerHandler(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Missing customer ID' });
    });

    it('should return 404 if customer is not found', async () => {
        (deleteCustomerById as jest.Mock).mockResolvedValue(false);
        await deleteCustomerHandler(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Customer not found' });
    });

    it('should return 200 if customer is deleted successfully', async () => {
        (deleteCustomerById as jest.Mock).mockResolvedValue(true);
        await deleteCustomerHandler(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Customer and related data deleted successfully' });
    });

    it('should return 500 if an error occurs', async () => {
        (deleteCustomerById as jest.Mock).mockRejectedValue(new Error('Database error'));
        await deleteCustomerHandler(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete customer' });
    });
});
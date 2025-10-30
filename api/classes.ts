import { Request, Response } from 'express';
import { deleteClassesByIds } from './db';

/**
 * API endpoint to handle batch deletion of classes.
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 */
export async function deleteClassesHandler(req: Request, res: Response) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { classIds } = req.body;

    if (!Array.isArray(classIds) || classIds.length === 0) {
        return res.status(400).json({ error: 'Invalid or missing class IDs' });
    }

    try {
        const deletedCount = await deleteClassesByIds(classIds);
        return res.status(200).json({ message: 'Classes deleted successfully', deletedCount });
    } catch (error) {
        console.error('Error in batch deletion:', error);
        return res.status(500).json({ error: 'Failed to delete classes' });
    }
}
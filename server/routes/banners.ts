import { Router } from 'express';
import { db } from '../db/index.js';
import { banners } from '../db/schema.js';
import { eq, and, lte, gte, or, isNull, desc, asc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/banners
 * Get active banners (public endpoint)
 */
router.get('/', async (req, res) => {
    try {
        const now = new Date();

        const activeBanners = await db
            .select()
            .from(banners)
            .where(
                and(
                    eq(banners.is_active, true),
                    or(
                        isNull(banners.start_date),
                        lte(banners.start_date, now)
                    ),
                    or(
                        isNull(banners.end_date),
                        gte(banners.end_date, now)
                    )
                )
            )
            .orderBy(asc(banners.display_order), desc(banners.created_at));

        res.json(activeBanners);
    } catch (error) {
        console.error('Failed to fetch banners:', error);
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

/**
 * GET /api/banners/all
 * Get all banners (admin endpoint)
 */
router.get('/all', async (req, res) => {
    try {
        const allBanners = await db
            .select()
            .from(banners)
            .orderBy(asc(banners.display_order), desc(banners.created_at));

        res.json(allBanners);
    } catch (error) {
        console.error('Failed to fetch all banners:', error);
        res.status(500).json({ error: 'Failed to fetch all banners' });
    }
});

/**
 * POST /api/banners
 * Create a new banner (admin endpoint)
 */
router.post('/', async (req, res) => {
    try {
        const {
            title,
            description,
            action_type,
            action_value,
            background_gradient,
            icon_type,
            icon_url,
            is_active,
            display_order,
            start_date,
            end_date
        } = req.body;

        if (!title || !action_type) {
            return res.status(400).json({ error: 'Title and action_type are required' });
        }

        if (!['write', 'link', 'navigate'].includes(action_type)) {
            return res.status(400).json({ error: 'Invalid action_type. Must be write, link, or navigate' });
        }

        const [newBanner] = await db
            .insert(banners)
            .values({
                title,
                description,
                action_type,
                action_value,
                background_gradient,
                icon_type,
                icon_url,
                is_active: is_active ?? true,
                display_order: display_order ?? 0,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            })
            .returning();

        res.status(201).json(newBanner);
    } catch (error) {
        console.error('Failed to create banner:', error);
        res.status(500).json({ error: 'Failed to create banner' });
    }
});

/**
 * PATCH /api/banners/:id
 * Update a banner (admin endpoint)
 */
router.patch('/:id', async (req, res) => {
    try {
        const bannerId = parseInt(req.params.id);

        if (isNaN(bannerId)) {
            return res.status(400).json({ error: 'Invalid banner ID' });
        }

        const {
            title,
            description,
            action_type,
            action_value,
            background_gradient,
            icon_type,
            icon_url,
            is_active,
            display_order,
            start_date,
            end_date
        } = req.body;

        if (action_type && !['write', 'link', 'navigate'].includes(action_type)) {
            return res.status(400).json({ error: 'Invalid action_type. Must be write, link, or navigate' });
        }

        const updateData: any = { updated_at: new Date() };

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (action_type !== undefined) updateData.action_type = action_type;
        if (action_value !== undefined) updateData.action_value = action_value;
        if (background_gradient !== undefined) updateData.background_gradient = background_gradient;
        if (icon_type !== undefined) updateData.icon_type = icon_type;
        if (icon_url !== undefined) updateData.icon_url = icon_url;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : null;
        if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;

        const [updatedBanner] = await db
            .update(banners)
            .set(updateData)
            .where(eq(banners.id, bannerId))
            .returning();

        if (!updatedBanner) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        res.json(updatedBanner);
    } catch (error) {
        console.error('Failed to update banner:', error);
        res.status(500).json({ error: 'Failed to update banner' });
    }
});

/**
 * DELETE /api/banners/:id
 * Delete a banner (admin endpoint)
 */
router.delete('/:id', async (req, res) => {
    try {
        const bannerId = parseInt(req.params.id);

        if (isNaN(bannerId)) {
            return res.status(400).json({ error: 'Invalid banner ID' });
        }

        const [deletedBanner] = await db
            .delete(banners)
            .where(eq(banners.id, bannerId))
            .returning();

        if (!deletedBanner) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        res.json({ message: 'Banner deleted successfully', banner: deletedBanner });
    } catch (error) {
        console.error('Failed to delete banner:', error);
        res.status(500).json({ error: 'Failed to delete banner' });
    }
});

export default router;

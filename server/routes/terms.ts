import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { terms } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getOrSetCache } from '../redis.js';

const router = Router();

// Cache TTL: 1 hour (terms don't change often)
const TERMS_CACHE_TTL = 3600;

// GET /api/terms - Get all active terms for a country
router.get('/', async (req: Request, res: Response) => {
    try {
        const countryCode = (req.query.country_code as string) || 'ALL';
        const cacheKey = `terms:list:${countryCode}`;

        const result = await getOrSetCache(cacheKey, async () => {
            const activeTerms = await db
                .select({
                    id: terms.id,
                    code: terms.code,
                    title: terms.title,
                    summary: terms.summary,
                    is_required: terms.is_required,
                    version: terms.version,
                    effective_date: terms.effective_date,
                })
                .from(terms)
                .where(
                    and(
                        eq(terms.is_active, true),
                        eq(terms.country_code, countryCode)
                    )
                );

            // If no terms found for specific country, fallback to 'ALL'
            if (activeTerms.length === 0 && countryCode !== 'ALL') {
                return await db
                    .select({
                        id: terms.id,
                        code: terms.code,
                        title: terms.title,
                        summary: terms.summary,
                        is_required: terms.is_required,
                        version: terms.version,
                        effective_date: terms.effective_date,
                    })
                    .from(terms)
                    .where(
                        and(
                            eq(terms.is_active, true),
                            eq(terms.country_code, 'ALL')
                        )
                    );
            }

            return activeTerms;
        }, TERMS_CACHE_TTL);

        res.json(result);
    } catch (error) {
        console.error('Error fetching terms:', error);
        res.status(500).json({ error: 'Failed to fetch terms' });
    }
});

// GET /api/terms/:code - Get specific term by code (for detail view)
router.get('/:code', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const countryCode = (req.query.country_code as string) || 'ALL';
        const cacheKey = `terms:detail:${code}:${countryCode}`;

        const result = await getOrSetCache(cacheKey, async () => {
            // First try to find term for specific country
            let term = await db
                .select()
                .from(terms)
                .where(
                    and(
                        eq(terms.code, code),
                        eq(terms.is_active, true),
                        eq(terms.country_code, countryCode)
                    )
                )
                .limit(1);

            // Fallback to 'ALL' if not found
            if (term.length === 0 && countryCode !== 'ALL') {
                term = await db
                    .select()
                    .from(terms)
                    .where(
                        and(
                            eq(terms.code, code),
                            eq(terms.is_active, true),
                            eq(terms.country_code, 'ALL')
                        )
                    )
                    .limit(1);
            }

            return term.length > 0 ? term[0] : null;
        }, TERMS_CACHE_TTL);

        if (!result) {
            return res.status(404).json({ error: 'Term not found' });
        }

        res.json(result);
    } catch (error) {
        console.error('Error fetching term:', error);
        res.status(500).json({ error: 'Failed to fetch term' });
    }
});

export default router;

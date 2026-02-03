import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { notifications, users, content, comments } from '../db/schema.js';
import { eq, and, desc, sql, lt } from 'drizzle-orm';

const router = Router();

// 알림 조회
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.query.user_id as string);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        if (!userId) {
            return res.status(400).json({ error: 'user_id required' });
        }

        // 최대 1개월치만 조회
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // 알림 조회 (최신순)
        const notifs = await db
            .select({
                id: notifications.id,
                type: notifications.type,
                actor_id: notifications.actor_id,
                content_id: notifications.content_id,
                comment_id: notifications.comment_id,
                metadata: notifications.metadata,
                is_read: notifications.is_read,
                created_at: notifications.created_at,
                actor_nickname: users.nickname,
                actor_profile_image: users.profile_image,
                actor_account_id: users.account_id,
            })
            .from(notifications)
            .leftJoin(users, eq(notifications.actor_id, users.id))
            .where(
                and(
                    eq(notifications.user_id, userId),
                    sql`${notifications.created_at} > ${oneMonthAgo.toISOString()}`
                )
            )
            .orderBy(desc(notifications.created_at))
            .limit(limit)
            .offset(offset);

        // 관련 콘텐츠 정보 가져오기
        const contentIds = notifs
            .filter(n => n.content_id)
            .map(n => n.content_id!);

        let contentMap: Record<number, any> = {};
        if (contentIds.length > 0) {
            const contents = await db
                .select({
                    id: content.id,
                    img: content.img,
                    review_prop: content.review_prop,
                })
                .from(content)
                .where(sql`${content.id} IN (${sql.join(contentIds.map(id => sql`${id}`), sql`, `)})`);

            contentMap = contents.reduce((acc, c) => {
                acc[c.id] = c;
                return acc;
            }, {} as Record<number, any>);
        }

        // 관련 댓글 정보 가져오기
        const commentIds = notifs
            .filter(n => n.comment_id)
            .map(n => n.comment_id!);

        let commentMap: Record<number, any> = {};
        if (commentIds.length > 0) {
            const commentsData = await db
                .select({
                    id: comments.id,
                    text: comments.text,
                })
                .from(comments)
                .where(sql`${comments.id} IN (${sql.join(commentIds.map(id => sql`${id}`), sql`, `)})`);

            commentMap = commentsData.reduce((acc, c) => {
                acc[c.id] = c;
                return acc;
            }, {} as Record<number, any>);
        }

        // 결과 포맷팅
        const result = notifs.map(notif => {
            const contentData = notif.content_id ? contentMap[notif.content_id] : null;
            const commentData = notif.comment_id ? commentMap[notif.comment_id] : null;

            let thumbnail = null;
            let shopName = null;

            if (contentData) {
                // 이미지 추출
                if (contentData.img && Array.isArray(contentData.img) && contentData.img.length > 0) {
                    thumbnail = contentData.img[0];
                }

                // 샵 이름 추출
                if (contentData.review_prop?.shop_name) {
                    shopName = contentData.review_prop.shop_name;
                }
            }

            return {
                id: notif.id,
                type: notif.type,
                actor: {
                    id: notif.actor_id,
                    nickname: notif.actor_nickname,
                    profile_image: notif.actor_profile_image,
                    account_id: notif.actor_account_id,
                },
                content_id: notif.content_id,
                comment_id: notif.comment_id,
                comment_preview: commentData?.text ? commentData.text.slice(0, 30) : null,
                thumbnail,
                shop_name: shopName,
                metadata: notif.metadata,
                is_read: notif.is_read,
                created_at: notif.created_at,
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// 최신 알림 시간 조회 (뱃지 표시용)
router.get('/latest', async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.query.user_id as string);

        if (!userId) {
            return res.status(400).json({ error: 'user_id required' });
        }

        const latest = await db
            .select({ created_at: notifications.created_at })
            .from(notifications)
            .where(eq(notifications.user_id, userId))
            .orderBy(desc(notifications.created_at))
            .limit(1);

        res.json({
            latest_notification: latest.length > 0 ? latest[0].created_at : null,
        });
    } catch (error) {
        console.error('Error fetching latest notification:', error);
        res.status(500).json({ error: 'Failed to fetch latest notification' });
    }
});

// 알림 생성 (프론트엔드에서 호출 가능)
router.post('/', async (req: Request, res: Response) => {
    try {
        const { user_id, type, actor_id, content_id, comment_id, metadata } = req.body;

        if (!user_id || !type) {
            return res.status(400).json({ error: 'user_id and type required' });
        }

        await db.insert(notifications).values({
            user_id,
            type,
            actor_id: actor_id || null,
            content_id: content_id || null,
            comment_id: comment_id || null,
            metadata: metadata || null,
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// 알림 읽음 처리 (전체)
router.post('/mark-read', async (req: Request, res: Response) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'user_id required' });
        }

        await db
            .update(notifications)
            .set({ is_read: true })
            .where(eq(notifications.user_id, user_id));

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
});

// 알림 생성 유틸리티 함수
export async function createNotification(data: {
    user_id: number;
    type: 'follow' | 'like' | 'comment' | 'milestone';
    actor_id?: number;
    content_id?: number;
    comment_id?: number;
    metadata?: any;
}) {
    try {
        // 자신의 행동은 알림 생성하지 않음
        if (data.actor_id === data.user_id) {
            return null;
        }

        await db.insert(notifications).values({
            user_id: data.user_id,
            type: data.type,
            actor_id: data.actor_id || null,
            content_id: data.content_id || null,
            comment_id: data.comment_id || null,
            metadata: data.metadata || null,
        });

        return true;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

// 오래된 알림 삭제 (1개월 이상)
router.delete('/cleanup', async (req: Request, res: Response) => {
    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        await db
            .delete(notifications)
            .where(lt(notifications.created_at, oneMonthAgo));

        res.json({ success: true });
    } catch (error) {
        console.error('Error cleaning up notifications:', error);
        res.status(500).json({ error: 'Failed to cleanup notifications' });
    }
});

export default router;

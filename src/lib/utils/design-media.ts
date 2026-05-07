import type { DesignItem } from '$lib/types/domain';

export function designCoverImageUrl(item: DesignItem): string | null {
	const urls = item.imageUrls?.filter(Boolean);
	if (urls?.length) return urls[0] ?? null;
	if (item.imageUrl) return item.imageUrl;
	return null;
}

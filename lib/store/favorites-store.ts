/**
 * Favorites Store - Manages user's favorite videos
 * Uses Zustand with localStorage persistence.
 *
 * Vanilla store APIs (favoritesApi / premiumFavoritesApi) are exported so that:
 *  - the useFavorites helper can subscribe to a single store dynamically,
 *    instead of subscribing to BOTH normal and premium stores unconditionally;
 *  - high-frequency consumers (e.g. FavoriteButton, rendered once per search
 *    card) can subscribe to a fine-grained slice via useStore(api, selector)
 *    and avoid re-rendering on unrelated favorites changes.
 */

import { createStore, useStore } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FavoriteItem } from '@/lib/types';
import { profiledKey } from '@/lib/utils/profile-storage';

const MAX_FAVORITES = 100;

interface FavoritesState {
    favorites: FavoriteItem[];
}

interface FavoritesActions {
    addFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => void;
    removeFavorite: (videoId: string | number, source: string) => void;
    toggleFavorite: (item: Omit<FavoriteItem, 'addedAt'>) => boolean;
    isFavorite: (videoId: string | number, source: string) => boolean;
    clearFavorites: () => void;
    importFavorites: (favorites: FavoriteItem[]) => void;
}

interface FavoritesStore extends FavoritesState, FavoritesActions { }

/**
 * Generate unique identifier for a favorite item
 */
function generateFavoriteId(
    videoId: string | number,
    source: string
): string {
    return `${source}:${videoId}`;
}

const createFavoritesStore = (name: string) =>
    createStore<FavoritesStore>()(
        persist(
            (set, get) => ({
                favorites: [],

                addFavorite: (item) => {
                    const favoriteId = generateFavoriteId(item.videoId, item.source);

                    set((state) => {
                        // Check if already exists
                        const exists = state.favorites.some(
                            (fav) => generateFavoriteId(fav.videoId, fav.source) === favoriteId
                        );

                        if (exists) {
                            return state;
                        }

                        const newFavorite: FavoriteItem = {
                            ...item,
                            addedAt: Date.now(),
                        };

                        let newFavorites = [newFavorite, ...state.favorites];

                        // Limit favorites size
                        if (newFavorites.length > MAX_FAVORITES) {
                            newFavorites = newFavorites.slice(0, MAX_FAVORITES);
                        }

                        return { favorites: newFavorites };
                    });
                },

                removeFavorite: (videoId, source) => {
                    const favoriteId = generateFavoriteId(videoId, source);

                    set((state) => ({
                        favorites: state.favorites.filter(
                            (fav) => generateFavoriteId(fav.videoId, fav.source) !== favoriteId
                        ),
                    }));
                },

                toggleFavorite: (item) => {
                    const state = get();
                    const favoriteId = generateFavoriteId(item.videoId, item.source);
                    const exists = state.favorites.some(
                        (fav) => generateFavoriteId(fav.videoId, fav.source) === favoriteId
                    );

                    if (exists) {
                        state.removeFavorite(item.videoId, item.source);
                        return false;
                    } else {
                        state.addFavorite(item);
                        return true;
                    }
                },

                isFavorite: (videoId, source) => {
                    const state = get();
                    const favoriteId = generateFavoriteId(videoId, source);
                    return state.favorites.some(
                        (fav) => generateFavoriteId(fav.videoId, fav.source) === favoriteId
                    );
                },

                clearFavorites: () => {
                    set({ favorites: [] });
                },

                importFavorites: (favorites) => {
                    set({ favorites });
                },
            }),
            {
                name,
            }
        )
    );

// Vanilla store APIs — used by useStore(api, selector) for fine-grained subscriptions.
export const favoritesApi = createFavoritesStore(profiledKey('kvideo-favorites-store'));
export const premiumFavoritesApi = createFavoritesStore(profiledKey('kvideo-premium-favorites-store'));

// Bound hooks. Callable as a hook with an optional selector (no selector
// returns the full state, same shape as the previous `create`-based hook), and
// also expose the vanilla store methods (getState/setState/subscribe) for
// non-React callers (AutoSync, useCloudSync) that read or subscribe outside
// components.
type FavoritesBoundHook = {
    <T = FavoritesStore>(selector?: (s: FavoritesStore) => T): T;
    getState: typeof favoritesApi.getState;
    setState: typeof favoritesApi.setState;
    subscribe: typeof favoritesApi.subscribe;
};

function bindFavoritesHook(api: typeof favoritesApi): FavoritesBoundHook {
    return Object.assign(
        function useBoundFavorites<T = FavoritesStore>(selector?: (s: FavoritesStore) => T) {
            return useStore(api, (state) => (selector ? selector(state) : (state as unknown as T)));
        },
        {
            getState: api.getState,
            setState: api.setState,
            subscribe: api.subscribe,
        }
    );
}

export const useFavoritesStore = bindFavoritesHook(favoritesApi);
export const usePremiumFavoritesStore = bindFavoritesHook(premiumFavoritesApi);

/**
 * Helper hook: subscribe to the selected store only (not both).
 * For high-frequency consumers prefer useStore(favoritesApi, selector) directly
 * to subscribe to a narrow slice and avoid unrelated re-renders.
 */
export function useFavorites(isPremium = false) {
    const api = isPremium ? premiumFavoritesApi : favoritesApi;
    return useStore(api);
}

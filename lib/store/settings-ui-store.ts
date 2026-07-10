/**
 * Settings UI Store — 控制设置抽屉的开闭状态（纯内存 UI 状态，不持久化）。
 * 入口组件调用 openSettings()/closeSettings()；SettingsDrawer 通过 useSettingsOpen() 订阅重渲染。
 * 复用 createListenerSet 的 subscribe/notify 机制，与 settings-store / user-sources-store 风格一致。
 */

import { useSyncExternalStore } from 'react';
import { createListenerSet } from './settings-helpers';

const listenerSet = createListenerSet();
let isOpen = false;

export const settingsUI = {
    getSnapshot: (): boolean => isOpen,
    subscribe: listenerSet.subscribe,
    open(): void {
        if (isOpen) return;
        isOpen = true;
        listenerSet.notifyListeners();
    },
    close(): void {
        if (!isOpen) return;
        isOpen = false;
        listenerSet.notifyListeners();
    },
    toggle(): void {
        isOpen = !isOpen;
        listenerSet.notifyListeners();
    },
};

export function openSettings(): void {
    settingsUI.open();
}

export function closeSettings(): void {
    settingsUI.close();
}

/** 订阅设置抽屉开闭状态，供 SettingsDrawer 使用 */
export function useSettingsOpen(): boolean {
    return useSyncExternalStore(
        settingsUI.subscribe,
        settingsUI.getSnapshot,
        settingsUI.getSnapshot,
    );
}

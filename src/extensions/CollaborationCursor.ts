/**
 * CollaborationCursor Extension for TipTap
 * 
 * Tracks local cursor position and renders remote cursors from collaborators.
 * Integrates with the presence service for real-time cursor synchronization.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';

// ============================================
// Types
// ============================================

export interface CursorData {
    id: string;
    name: string;
    color: string;
    position: number;
    selection?: {
        from: number;
        to: number;
    };
}

export interface CollaborationCursorOptions {
    /**
     * Callback when local cursor position changes
     */
    onCursorUpdate?: (position: number, selection?: { from: number; to: number }) => void;
    
    /**
     * Remote cursors to render
     */
    cursors?: CursorData[];
    
    /**
     * Throttle delay for cursor updates in ms
     */
    throttleDelay?: number;
    
    /**
     * Current user ID (to filter out own cursor)
     */
    currentUserId?: string;
}

// ============================================
// Plugin Key
// ============================================

export const collaborationCursorPluginKey = new PluginKey('collaborationCursor');

// ============================================
// Decoration Builders
// ============================================

function createCursorDecoration(cursor: CursorData, pos: number): Decoration {
    const cursorElement = document.createElement('span');
    cursorElement.className = 'collaboration-cursor';
    cursorElement.setAttribute('data-user-id', cursor.id);
    cursorElement.style.cssText = `
        position: relative;
        margin-left: -1px;
        margin-right: -1px;
        border-left: 2px solid ${cursor.color};
        pointer-events: none;
    `;
    
    // Add name label
    const label = document.createElement('span');
    label.className = 'collaboration-cursor-label';
    label.textContent = cursor.name;
    label.style.cssText = `
        position: absolute;
        top: -1.4em;
        left: -1px;
        font-size: 10px;
        font-weight: 500;
        line-height: 1;
        padding: 2px 4px;
        border-radius: 3px 3px 3px 0;
        white-space: nowrap;
        background-color: ${cursor.color};
        color: white;
        pointer-events: none;
        user-select: none;
        z-index: 10;
    `;
    cursorElement.appendChild(label);
    
    return Decoration.widget(pos, cursorElement, {
        key: `cursor-${cursor.id}`,
        side: 1, // Place after the character at this position
    });
}

function createSelectionDecoration(cursor: CursorData, from: number, to: number): Decoration {
    return Decoration.inline(from, to, {
        class: 'collaboration-selection',
        style: `background-color: ${cursor.color}25;`, // 25 = ~15% opacity in hex
    }, {
        key: `selection-${cursor.id}`,
    });
}

// ============================================
// Throttle Utility
// ============================================

function throttle<T extends (...args: Parameters<T>) => void>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<T>) => {
        const now = Date.now();
        const remaining = delay - (now - lastCall);
        
        if (remaining <= 0) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            lastCall = now;
            func(...args);
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                timeoutId = null;
                func(...args);
            }, remaining);
        }
    };
}

// ============================================
// Extension
// ============================================

export const CollaborationCursor = Extension.create<CollaborationCursorOptions>({
    name: 'collaborationCursor',
    
    addOptions() {
        return {
            onCursorUpdate: undefined,
            cursors: [],
            throttleDelay: 100,
            currentUserId: undefined,
        };
    },
    
    addProseMirrorPlugins() {
        const { onCursorUpdate, throttleDelay, currentUserId } = this.options;
        
        // Create throttled cursor update function
        const throttledUpdate = onCursorUpdate
            ? throttle(onCursorUpdate, throttleDelay || 100)
            : undefined;
        
        return [
            new Plugin({
                key: collaborationCursorPluginKey,
                
                state: {
                    init: () => DecorationSet.empty,
                    
                    apply: (tr, _decorationSet, _oldState, newState) => {
                        // Get cursors from plugin meta or use existing
                        const cursors: CursorData[] = tr.getMeta(collaborationCursorPluginKey)?.cursors 
                            || this.options.cursors 
                            || [];
                        
                        // Filter out current user's cursor
                        const remoteCursors = currentUserId
                            ? cursors.filter(c => c.id !== currentUserId)
                            : cursors;
                        
                        // Build decorations for remote cursors
                        const decorations: Decoration[] = [];
                        
                        for (const cursor of remoteCursors) {
                            // Validate position is within document bounds
                            const docSize = newState.doc.content.size;
                            const cursorPos = Math.min(Math.max(0, cursor.position), docSize);
                            
                            // Add cursor decoration
                            decorations.push(createCursorDecoration(cursor, cursorPos));
                            
                            // Add selection decoration if present
                            if (cursor.selection) {
                                const from = Math.min(Math.max(0, cursor.selection.from), docSize);
                                const to = Math.min(Math.max(0, cursor.selection.to), docSize);
                                
                                if (from !== to) {
                                    decorations.push(createSelectionDecoration(cursor, from, to));
                                }
                            }
                        }
                        
                        return DecorationSet.create(newState.doc, decorations);
                    },
                },
                
                props: {
                    decorations(state) {
                        return this.getState(state);
                    },
                },
                
                view(editorView: EditorView) {
                    // Track cursor position changes
                    const handleSelectionChange = () => {
                        if (!throttledUpdate) return;
                        
                        const { from, to } = editorView.state.selection;
                        const selection = from !== to ? { from, to } : undefined;
                        
                        throttledUpdate(from, selection);
                    };
                    
                    return {
                        update(view, prevState) {
                            // Check if selection changed
                            if (!view.state.selection.eq(prevState.selection)) {
                                handleSelectionChange();
                            }
                        },
                    };
                },
            }),
        ];
    },
});

// ============================================
// Helper to Update Cursors
// ============================================

/**
 * Update remote cursors in the editor
 * Call this when presence data updates
 */
export function updateCollaborationCursors(
    editor: { view: EditorView },
    cursors: CursorData[]
): void {
    const tr = editor.view.state.tr;
    tr.setMeta(collaborationCursorPluginKey, { cursors });
    editor.view.dispatch(tr);
}

export default CollaborationCursor;


import { publishMoveElement } from '../../events/publish';
import { assignUniqueId, getDomElement, restoreElementStyle, saveTimestamp } from '../helpers';
import { getDisplayDirection, moveElToIndex } from './helpers';
import { createStub, getCurrentStubIndex, moveStub, removeStub } from './stub';
import { EditorAttributes } from '/common/constants';
import { getOnlookUniqueSelector, getUniqueSelector, isValidHtmlElement } from '/common/helpers';

export function startDrag(selector: string): number {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
        console.error(`Start drag element not found: ${selector}`);
        return -1;
    }
    const parent = el.parentElement;
    if (!parent) {
        console.error('Start drag parent not found');
        return -1;
    }
    const htmlChildren = Array.from(parent.children).filter(isValidHtmlElement);
    const originalIndex = htmlChildren.indexOf(el);
    prepareElementForDragging(el, originalIndex);
    createStub(el);
    const pos = getAbsolutePosition(el);
    el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAG_START_POSITION, JSON.stringify(pos));
    return originalIndex;
}

export function drag(dx: number, dy: number, x: number, y: number) {
    const el = getDragElement();
    if (!el) {
        console.error('Dragging element not found');
        return;
    }
    const styles = window.getComputedStyle(el);
    el.style.width = styles.width;
    el.style.height = styles.height;
    el.style.position = 'fixed';

    const pos = JSON.parse(
        el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_START_POSITION) || '{}',
    );
    const left = pos.left + dx;
    const top = pos.top + dy;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    moveStub(el, x, y);
}

export function endDrag(): { newSelector: string; newIndex: number } | undefined {
    const el = getDragElement();
    if (!el) {
        console.error('End drag element not found');
        return;
    }

    const parent = el.parentElement;
    if (!parent) {
        console.error('End drag parent not found');
        return;
    }

    const stubIndex = getCurrentStubIndex(parent);
    const elIndex = Array.from(parent.children).indexOf(el);

    if (stubIndex !== -1 && stubIndex !== elIndex) {
        moveElToIndex(el, stubIndex);
    }
    removeStub();

    const htmlChildren = Array.from(parent.children).filter(isValidHtmlElement);
    const newIndex = htmlChildren.indexOf(el);

    cleanUpElementAfterDragging(el, newIndex);

    if (stubIndex !== -1 && stubIndex !== elIndex) {
        publishMoveElement(getDomElement(el, true));
    }
    const newSelector = getOnlookUniqueSelector(el) || getUniqueSelector(el);
    return { newSelector, newIndex };
}

function prepareElementForDragging(el: HTMLElement, originalIndex: number) {
    const saved = el.getAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    if (saved) {
        return;
    }

    const style = {
        position: el.style.position,
        transform: el.style.transform,
        width: el.style.width,
        height: el.style.height,
        left: el.style.left,
        top: el.style.top,
    };

    el.setAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE, JSON.stringify(style));
    el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAGGING, 'true');

    if (el.getAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX) === null) {
        el.setAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX, originalIndex.toString());
    }

    if (el.getAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION) !== null) {
        const parent = el.parentElement;
        if (parent) {
            const displayDirection = getDisplayDirection(parent);
            el.setAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION, displayDirection);
        }
    }
}

function getDragElement(): HTMLElement | undefined {
    const el = document.querySelector(
        `[${EditorAttributes.DATA_ONLOOK_DRAGGING}]`,
    ) as HTMLElement | null;
    if (!el) {
        return;
    }
    return el;
}

function cleanUpElementAfterDragging(el: HTMLElement, newIndex: number) {
    restoreElementStyle(el);
    removeDragAttributes(el);
    saveElementIndex(el, newIndex);
    assignUniqueId(el);
    saveTimestamp(el);
}

function removeDragAttributes(el: HTMLElement) {
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_SAVED_STYLE);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DRAGGING);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DRAG_DIRECTION);
    el.removeAttribute(EditorAttributes.DATA_ONLOOK_DRAG_START_POSITION);
}

function saveElementIndex(el: HTMLElement, newIndex: number) {
    const originalIndex = parseInt(
        el.getAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX) || '-1',
        10,
    );
    if (originalIndex !== newIndex) {
        el.setAttribute(EditorAttributes.DATA_ONLOOK_NEW_INDEX, newIndex.toString());
    } else {
        el.removeAttribute(EditorAttributes.DATA_ONLOOK_ORIGINAL_INDEX);
        el.removeAttribute(EditorAttributes.DATA_ONLOOK_NEW_INDEX);
    }
}

function getAbsolutePosition(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
    };
}
